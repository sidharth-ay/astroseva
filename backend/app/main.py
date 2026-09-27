"""AstroSeva - Vedic Astrology Platform API."""

from dotenv import load_dotenv
load_dotenv()

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .core.rate_limit import limiter

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
    allow_headers=["*"],
)


# Include routers
app.include_router(kundli.router)
app.include_router(matching.router)
app.include_router(predictions.router)
app.include_router(horoscope.router)
app.include_router(panchang.router)
app.include_router(numerology.router)
app.include_router(doshas.router)
app.include_router(auth.router)
app.include_router(charts.router)
app.include_router(chat.router)
app.include_router(cities.router)
app.include_router(transit.router)
app.include_router(gemstones.router)
app.include_router(varshphal.router)
app.include_router(baby_names.router)
app.include_router(festivals.router)
app.include_router(lalkitab.router)
app.include_router(kp.router)
app.include_router(reports.router)
app.include_router(celebrity.router)
app.include_router(mantra.router)
app.include_router(healing.router)


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


@app.post("/api/v1/admin/clear-cache")
async def clear_cache(pattern: str = "*"):
    """Clear cache entries matching a pattern."""
    from .services.cache_service import cache_service
    deleted = await cache_service.clear_pattern(pattern)
    return {"cleared": deleted, "pattern": pattern}
