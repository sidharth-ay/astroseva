"""AstroSeva - Vedic Astrology Platform API."""

from dotenv import load_dotenv
load_dotenv()

import logging
import os
import re
from contextlib import asynccontextmanager
from datetime import datetime, UTC

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from .core.rate_limit import HEALTH_LIMIT, limiter
from .services.auth_service import get_current_user, require_admin

from .api import kundli, matching, predictions, horoscope, panchang, numerology, doshas, auth, charts, chat, cities, transit, gemstones, varshphal, baby_names, festivals, lalkitab, reports, celebrity, mantra, healing, settings, palmistry
from .api import astrologers, admin_astrologers, directory
from .db.database import init_db, SessionLocal
# Importing this module registers the background job handlers.
from .services import job_handlers as _job_handlers  # noqa: F401

from .core.logging import RequestIdMiddleware, configure_logging

configure_logging()
logger = logging.getLogger(__name__)

# Initialize database
init_db()

# CORS origins from environment.
#
# Both spellings of the dev host are listed by default. They are different
# origins to a browser, so a request from `127.0.0.1:3000` is rejected when only
# `localhost:3000` is allowed -- which makes the whole site look broken (every
# API call, including login, fails) purely because of how the URL was typed.
DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:3001,http://127.0.0.1:3001"
)
CORS_ORIGINS = [
    o.strip() for o in os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",") if o.strip()
]

# Origins allowed to read responses without credentials.
#
# The API authenticates with a bearer token in the Authorization header, not a
# cookie, so `allow_credentials=True` buys nothing and costs something: with it
# set, a wildcard is no longer permitted, and every origin must be enumerated
# correctly. Since the token is sent explicitly by the client, credentials are
# not needed for cross-origin API calls at all.
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"

# Docs visibility
ENABLE_DOCS = os.getenv("ENABLE_DOCS", "false").lower() == "true"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AstroSeva API starting up...")
    import asyncio
    from .services.jobs import sweep_forever, sweep_pending
    # Sweep anything left pending by a previous crash before starting the loop.
    await sweep_pending(limit=100)
    sweep_stop = asyncio.Event()
    sweep_task = asyncio.create_task(sweep_forever(sweep_stop))
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
    sweep_stop.set()
    await sweep_task


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


_RATE_LIMIT_PATTERN = re.compile(r"(\d+)\s+per\s+(\d+)?\s*(second|minute|hour|day)", re.I)


async def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Return a 429 a human (and the frontend) can act on.

    slowapi's built-in handler emits {"error": ...} and no Retry-After, so the
    client had no way to tell the user how long to wait -- it surfaced as a
    generic "API request failed", indistinguishable from a real fault.

    An endpoint may supply its own ``error_message``, in which case that text
    replaces the "N per M" string, so the window is only derived when the
    default form is present.
    """
    raw = str(getattr(exc, "detail", "") or "")
    match = _RATE_LIMIT_PATTERN.search(raw)
    if match:
        count, _, unit = match.groups()
        seconds = {"second": 1, "minute": 60, "hour": 3600, "day": 86400}[unit.lower()]
        message = (
            f"Too many attempts. You may do this {count} times per "
            f"{unit.lower()}; please wait {seconds} seconds and try again."
        )
        error = f"Rate limit exceeded: {count} per {match.group(2) or 1} {unit.lower()}"
    else:
        seconds = 60
        message = raw or "Too many attempts. Please wait a moment and try again."
        error = raw or "Rate limit exceeded"

    return JSONResponse(
        status_code=429,
        content={"detail": message, "error": error},
        headers={"Retry-After": str(seconds)},
    )


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
    # False by default; see the note where it is defined.
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    # Exposed so a browser can read them. Without this the client cannot see the
    # rate-limit headers, which is part of why a 429 used to arrive as an
    # unexplained failure with nothing to act on.
    #
    # In practice only `Retry-After` is ever sent: it comes from our own 429
    # handler, and the client reads it. The X-RateLimit-* trio is listed because
    # they are the conventional set and cost nothing to allow for, but slowapi
    # only emits them when a route declares `response: Response`, which none
    # currently do -- see `app/core/rate_limit.py` for why that is not changed.
    expose_headers=["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining",
                    "X-RateLimit-Reset"],
    # Ten minutes, so a browser is not re-preflighting on every navigation.
    max_age=600,
)

app.add_middleware(RequestIdMiddleware)


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
# The city lookup is public reference data -- place names and coordinates, no
# user data -- and registration asks for a birth city *before* there is an
# account to authenticate with. Gating it meant a first-time user hit the city
# picker, got a 401, and could not complete sign-up at all.
app.include_router(cities.router)
app.include_router(transit.router, dependencies=require_auth)
app.include_router(gemstones.router, dependencies=require_auth)
app.include_router(varshphal.router, dependencies=require_auth)
app.include_router(baby_names.router, dependencies=require_auth)
app.include_router(festivals.router, dependencies=require_auth)
app.include_router(lalkitab.router, dependencies=require_auth)
app.include_router(reports.router, dependencies=require_auth)
app.include_router(celebrity.router, dependencies=require_auth)
app.include_router(mantra.router, dependencies=require_auth)
app.include_router(healing.router, dependencies=require_auth)
app.include_router(settings.router, dependencies=require_auth)
app.include_router(palmistry.router, dependencies=require_auth)

# Astrologer marketplace. Each carries its own role dependency rather than the
# plain require_auth, so authorisation cannot be forgotten per-endpoint:
#   astrologers/       - the caller's own application, any signed-in account
#   admin_astrologers/ - require_reviewer, applied per endpoint
#   directory/         - verified practitioners, any signed-in account
app.include_router(astrologers.router, dependencies=require_auth)
app.include_router(directory.router, dependencies=require_auth)
app.include_router(admin_astrologers.router, dependencies=require_auth)


@app.get("/")
async def root():
    return {
        "name": "AstroSeva API",
        "version": "1.0.0",
        "description": "Vedic Astrology Platform",
    }


@app.get("/health")
@limiter.limit(HEALTH_LIMIT)
async def health_check(request: Request):
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
            "timestamp": datetime.now(UTC).isoformat(),
        },
    )


@app.get("/ready")
@limiter.limit(HEALTH_LIMIT)
async def readiness_check(request: Request):
    """Ready to serve traffic: database reachable and schema current."""
    from sqlalchemy import text

    try:
        db = SessionLocal()
        try:
            # Reachability first: without it nothing else matters.
            db.execute(text("SELECT 1"))
            # Then currency: code migrated past its database answers 500s with
            # a healthy-looking process, which is exactly what this endpoint
            # exists to catch. The user_settings table arrived in 0003, so its
            # presence proves the chain ran to at least the current head.
            db.execute(text("SELECT 1 FROM user_settings LIMIT 1"))
        finally:
            db.close()
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"ready": False, "reason": f"{type(e).__name__}"},
        )
    return {"ready": True}


# Cache namespaces an admin may clear.
CACHE_CLEAR_ALLOWED_PREFIXES = (
    "horoscope:", "kundli:", "panchang:", "prediction:",
    "report:", "doshas:", "remedies:", "transit:",
)


def _is_admin(user) -> bool:
    """Deprecated shim. The real check is services.auth_service.is_admin.

    Kept so nothing else in the codebase reaches for the old private helper.
    """
    from .services.auth_service import is_admin

    return is_admin(user)


@app.post("/api/v1/admin/clear-cache")
@limiter.limit("10/minute")
async def clear_cache(request: Request, pattern: str, user=Depends(require_admin)):
    """Clear cache entries matching a pattern (admin only).

    `pattern` is required: a namespace must be named explicitly, and the
    full-wipe "*" is never accepted. Authorisation is now the shared
    `require_admin` dependency rather than a check inside the handler, so the
    gate cannot be bypassed by a future edit to this function body.
    """
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
