"""AstroSeva - Vedic Astrology Platform API."""

from dotenv import load_dotenv
load_dotenv()

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

from .api import kundli, matching, predictions, horoscope, panchang, numerology, doshas, auth, charts, chat
from .db.database import init_db

logger = logging.getLogger(__name__)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

# Initialize database
init_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: warm all 12 horoscopes in background (non-blocking)
    asyncio.create_task(_warm_horoscopes())
    yield


async def _warm_horoscopes():
    """Warm all 12 horoscope caches at startup."""
    try:
        await asyncio.sleep(2)  # let server fully start first
        from .api.horoscope import warm_all_horoscopes
        await warm_all_horoscopes()
    except Exception as e:
        logger.warning(f"Startup horoscope warm failed: {e}")


# Create FastAPI app
app = FastAPI(
    title="AstroSeva API",
    description="Vedic Astrology Platform - Kundli, Matching, Predictions, Horoscope, Panchang, Numerology, Chat",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
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


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "AstroSeva API",
        "version": "1.0.0",
        "description": "Vedic Astrology Platform",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "kundli": "/api/v1/kundli/generate",
            "matching": "/api/v1/matching/analyze",
            "predictions": "/api/v1/predictions/generate",
            "horoscope": "/api/v1/horoscope/daily/{sign}",
            "panchang": "/api/v1/panchang/daily",
            "numerology": "/api/v1/numerology/analyze",
            "doshas": "/api/v1/doshas/detect",
            "auth": "/api/v1/auth/login",
            "chat": "/api/v1/chat/send",
        },
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "AstroSeva API"}
