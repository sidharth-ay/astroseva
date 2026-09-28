"""AstroSeva - Vedic Astrology Platform API."""

from dotenv import load_dotenv
load_dotenv()

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .core.rate_limit import limiter
from .services.auth_service import get_current_user

from .api import kundli, matching, predictions, horoscope, panchang, numerology, doshas, auth, charts, chat, cities, transit, gemstones, varshphal, baby_names, festivals, lalkitab, kp, reports, celebrity, mantra, healing
from .db.database import init_db

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize database
init_db()

# CORS origins from environment
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# Docs visibility
ENABLE_DOCS = os.getenv("ENABLE_DOCS", "false").lower() == "true"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AstroSeva API starting up...")
    # Clear any stale horoscope cache entries on startup
    try:
        from .services.cache_service import cache_service
        deleted = await cache_service.clear_pattern("horoscope:*")
        if deleted:
            logger.info(f"Cleared {deleted} stale horoscope cache entries")
    except Exception as e:
        logger.warning(f"Cache clear on startup failed: {e}")
    yield
    logger.info("AstroSeva API shutting down...")


async def _warm_horoscopes():
    """Warm horoscope caches on first request (not at startup to save quota)."""
    pass


app = FastAPI(
    title="AstroSeva API",
    description="Vedic Astrology Platform - Kundli, Matching, Predictions, Horoscope, Panchang, Numerology, Chat",
    version="1.0.0",
    docs_url="/docs" if ENABLE_DOCS else None,
    redoc_url="/redoc" if ENABLE_DOCS else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Minimal security headers for API responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Include routers
#
# Every feature router requires a valid JWT. The frontend AuthGate blocks the
# page shell, but this is the real boundary: without it the APIs were callable
# anonymously with curl. The auth router is intentionally NOT gated here --
# /register and /login must stay reachable -- and it already applies
# get_current_user per-endpoint to /me, /logout and /change-password.
require_auth = [Depends(get_current_user)]

app.include_router(kundli.router, dependencies=require_auth)
app.include_router(matching.router, dependencies=require_auth)
app.include_router(predictions.router, dependencies=require_auth)
app.include_router(horoscope.router, dependencies=require_auth)
app.include_router(panchang.router, dependencies=require_auth)
app.include_router(numerology.router, dependencies=require_auth)
app.include_router(doshas.router, dependencies=require_auth)
app.include_router(auth.router)
app.include_router(charts.router, dependencies=require_auth)
app.include_router(chat.router, dependencies=require_auth)
app.include_router(cities.router, dependencies=require_auth)
app.include_router(transit.router, dependencies=require_auth)
app.include_router(gemstones.router, dependencies=require_auth)
app.include_router(varshphal.router, dependencies=require_auth)
app.include_router(baby_names.router, dependencies=require_auth)
app.include_router(festivals.router, dependencies=require_auth)
app.include_router(lalkitab.router, dependencies=require_auth)
app.include_router(kp.router, dependencies=require_auth)
app.include_router(reports.router, dependencies=require_auth)
app.include_router(celebrity.router, dependencies=require_auth)
app.include_router(mantra.router, dependencies=require_auth)
app.include_router(healing.router, dependencies=require_auth)


@app.get("/")
async def root():
    return {
        "name": "AstroSeva API",
        "version": "1.0.0",
        "description": "Vedic Astrology Platform",
    }


@app.get("/health")
async def health_check():
    """Real health check — verifies DB, Redis, and reports status."""
    from .services.cache_service import cache_service
    from .db.database import SessionLocal
    from sqlalchemy import text

    checks = {}
    status_code = 200

    # Database check
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {type(e).__name__}"
        status_code = 503

    # Redis check
    try:
        if cache_service.is_connected():
            checks["redis"] = "ok"
        else:
            checks["redis"] = "degraded (using fallback)"
    except Exception:
        checks["redis"] = "error"
        status_code = 503

    overall = "healthy" if status_code == 200 else "degraded"
    return JSONResponse(
        status_code=status_code,
        content={
            "status": overall,
            "service": "AstroSeva API",
            "checks": checks,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# Cache namespaces an admin may clear.
CACHE_CLEAR_ALLOWED_PREFIXES = (
    "horoscope:", "kundli:", "panchang:", "prediction:",
    "report:", "doshas:", "remedies:", "transit:",
)


def _is_admin(user) -> bool:
    """Admin check via the ADMIN_EMAILS env allowlist.

    Empty/unset means nobody is an admin, so the default deployment exposes
    no cache-wipe capability at all.
    """
    raw = os.getenv("ADMIN_EMAILS", "")
    allowed = {e.strip().lower() for e in raw.split(",") if e.strip()}
    if not allowed:
        return False
    email = (getattr(user, "email", "") or "").strip().lower()
    return email in allowed


@app.post("/api/v1/admin/clear-cache")
@limiter.limit("10/minute")
async def clear_cache(request: Request, pattern: str, user=Depends(get_current_user)):
    """Clear cache entries matching a pattern (admin only).

    `pattern` is required: a namespace must be named explicitly, and the
    full-wipe "*" is never accepted.
    """
    if not _is_admin(user):
        raise HTTPException(
            status_code=403, detail="Administrator privileges required"
        )
    from .services.cache_service import cache_service
    # Reject anything outside the allowlist, including the "*" full wipe.
    # Previously `pattern != "*"` let "*" skip this check entirely, so any
    # authenticated user could flush the whole cache by omitting the argument.
    if not pattern.startswith(CACHE_CLEAR_ALLOWED_PREFIXES):
        return JSONResponse(
            status_code=400,
            content={"error": "Pattern not allowed", "allowed_prefixes": list(CACHE_CLEAR_ALLOWED_PREFIXES)},
        )
    deleted = await cache_service.clear_pattern(pattern)
    return {"cleared": deleted, "pattern": pattern}
