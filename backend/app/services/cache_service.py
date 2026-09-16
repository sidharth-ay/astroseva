"""Cache service using Redis with SQLite disk fallback."""

import os
import json
import sqlite3
import time
import threading
from typing import Optional, Any
from datetime import timedelta

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

    def get(self, key: str) -> Optional[Any]:
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

    def set(self, key: str, value: Any, expiry: int = 3600) -> bool:
        expires_at = time.time() + expiry if expiry else None
        with self._lock:
            self.conn.execute(
                "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
                (key, json.dumps(value, default=str), expires_at),
            )
            self.conn.commit()
        return True

    def delete(self, key: str) -> bool:
        with self._lock:
            self.conn.execute("DELETE FROM cache WHERE key = ?", (key,))
            self.conn.commit()
        return True


class CacheService:
    """Redis cache service for AstroSeva."""

    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.client = None
        self.fallback: Optional[SQLiteCache] = None
        self._connect()

    def _connect(self):
        """Connect to Redis, fall back to SQLite disk cache."""
        if not REDIS_AVAILABLE:
            print("Redis not available, using SQLite disk cache")
            self.fallback = SQLiteCache()
            return

        try:
            self.client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
            )
            self.client.ping()
            print("Connected to Redis")
        except Exception as e:
            print(f"Redis connection failed ({e}), using SQLite disk cache")
            self.client = None
            self.fallback = SQLiteCache()

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if self.client:
            try:
                value = self.client.get(key)
                if value:
                    return json.loads(value)
                return None
            except Exception as e:
                print(f"Cache get error: {e}")
                return None
        elif self.fallback:
            try:
                return self.fallback.get(key)
            except Exception as e:
                print(f"Fallback cache get error: {e}")
                return None
        return None

    async def set(
        self,
        key: str,
        value: Any,
        expiry: int = 3600,
    ) -> bool:
        """Set value in cache with expiry in seconds."""
        if self.client:
            try:
                self.client.setex(
                    key,
                    timedelta(seconds=expiry),
                    json.dumps(value, default=str),
                )
                return True
            except Exception as e:
                print(f"Cache set error: {e}")
                return False
        elif self.fallback:
            try:
                return self.fallback.set(key, value, expiry)
            except Exception as e:
                print(f"Fallback cache set error: {e}")
                return False
        return False

    async def delete(self, key: str) -> bool:
        """Delete value from cache."""
        if self.client:
            try:
                self.client.delete(key)
                return True
            except Exception as e:
                print(f"Cache delete error: {e}")
                return False
        elif self.fallback:
            try:
                return self.fallback.delete(key)
            except Exception as e:
                print(f"Fallback cache delete error: {e}")
                return False
        return False

    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern."""
        if self.client:
            try:
                keys = self.client.keys(pattern)
                if keys:
                    return self.client.delete(*keys)
                return 0
            except Exception as e:
                print(f"Cache clear error: {e}")
                return 0
        return 0

    def is_connected(self) -> bool:
        """Check if Redis is connected."""
        if self.client:
            try:
                self.client.ping()
                return True
            except:
                return False
        return False


# Singleton instance
cache_service = CacheService()
