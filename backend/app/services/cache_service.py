"""Cache service using Redis with SQLite disk fallback."""

import os
import json
import sqlite3
import time
import asyncio
import hashlib
import logging
import threading
from typing import Optional, Any
from datetime import timedelta

logger = logging.getLogger(__name__)


def _safe_key(key: str) -> str:
    """Hash the variable part of a cache key so PII (names, birth data)
    never lands in Redis/SQLite keyspace. The `prefix:` is preserved so
    pattern clears like `horoscope:*` keep working."""
    if ":" in key:
        prefix, rest = key.split(":", 1)
        digest = hashlib.sha256(rest.encode("utf-8")).hexdigest()[:32]
        return f"{prefix}:{digest}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:32]

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class SQLiteCache:
    """Disk-backed SQLite cache (used when Redis is unavailable)."""

    def __init__(self, db_path: str = "cache_fallback.db"):
        self.db_path = os.path.join(os.path.dirname(__file__), "..", db_path)
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.execute("CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT, expires_at REAL)")
        self.conn.commit()
        self._lock = threading.Lock()

    def _get_sync(self, key: str) -> Optional[Any]:
        with self._lock:
            row = self.conn.execute("SELECT value, expires_at FROM cache WHERE key = ?", (key,)).fetchone()
            if row is None:
                return None
            value, expires_at = row
            if expires_at and time.time() > expires_at:
                self.conn.execute("DELETE FROM cache WHERE key = ?", (key,))
                self.conn.commit()
                return None
            return json.loads(value)

    def _set_sync(self, key: str, value: Any, expiry: int = 3600) -> bool:
        expires_at = time.time() + expiry if expiry else None
        with self._lock:
            self.conn.execute(
                "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
                (key, json.dumps(value, default=str), expires_at),
            )
            self.conn.commit()
        return True

    def _delete_sync(self, key: str) -> bool:
        with self._lock:
            self.conn.execute("DELETE FROM cache WHERE key = ?", (key,))
            self.conn.commit()
        return True

    def _clear_pattern_sync(self, pattern: str) -> int:
        import fnmatch
        with self._lock:
            rows = self.conn.execute("SELECT key FROM cache").fetchall()
            keys_to_delete = [r[0] for r in rows if fnmatch.fnmatch(r[0], pattern)]
            if keys_to_delete:
                placeholders = ",".join("?" * len(keys_to_delete))
                self.conn.execute(f"DELETE FROM cache WHERE key IN ({placeholders})", keys_to_delete)
                self.conn.commit()
            return len(keys_to_delete)


class CacheService:
    """Redis cache service for AstroSeva."""

    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.client = None
        self.fallback: Optional[SQLiteCache] = None
        self._connect()

    def _connect(self):
        if not REDIS_AVAILABLE:
            logger.info("Redis not available, using SQLite disk cache")
            self.fallback = SQLiteCache()
            return

        try:
            self.client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
            )
            self.client.ping()
            logger.info("Connected to Redis")
        except Exception as e:
            logger.warning(f"Redis connection failed ({e}), using SQLite disk cache")
            self.client = None
            self.fallback = SQLiteCache()

    async def get(self, key: str) -> Optional[Any]:
        key = _safe_key(key)
        if self.client:
            try:
                value = await asyncio.to_thread(self.client.get, key)
                if value:
                    return json.loads(value)
                return None
            except Exception as e:
                logger.error(f"Cache get error: {e}")
                return None
        elif self.fallback:
            try:
                return await asyncio.to_thread(self.fallback._get_sync, key)
            except Exception as e:
                logger.error(f"Fallback cache get error: {e}")
                return None
        return None

    async def set(self, key: str, value: Any, expiry: int = 3600) -> bool:
        key = _safe_key(key)
        if self.client:
            try:
                await asyncio.to_thread(
                    self.client.setex, key, timedelta(seconds=expiry),
                    json.dumps(value, default=str)
                )
                return True
            except Exception as e:
                logger.error(f"Cache set error: {e}")
                return False
        elif self.fallback:
            try:
                return await asyncio.to_thread(self.fallback._set_sync, key, value, expiry)
            except Exception as e:
                logger.error(f"Fallback cache set error: {e}")
                return False
        return False

    async def delete(self, key: str) -> bool:
        key = _safe_key(key)
        if self.client:
            try:
                await asyncio.to_thread(self.client.delete, key)
                return True
            except Exception as e:
                logger.error(f"Cache delete error: {e}")
                return False
        elif self.fallback:
            try:
                return await asyncio.to_thread(self.fallback._delete_sync, key)
            except Exception as e:
                logger.error(f"Fallback cache delete error: {e}")
                return False
        return False

    async def clear_pattern(self, pattern: str) -> int:
        if self.client:
            try:
                keys = await asyncio.to_thread(self.client.keys, pattern)
                if keys:
                    return await asyncio.to_thread(self.client.delete, *keys)
                return 0
            except Exception as e:
                logger.error(f"Cache clear error: {e}")
                return 0
        elif self.fallback:
            try:
                return await asyncio.to_thread(self.fallback._clear_pattern_sync, pattern)
            except Exception as e:
                logger.error(f"Fallback cache clear error: {e}")
                return 0
        return 0

    def is_connected(self) -> bool:
        if self.client:
            try:
                self.client.ping()
                return True
            except Exception:
                return False
        return False


cache_service = CacheService()
