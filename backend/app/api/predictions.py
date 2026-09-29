"""AI Prediction API endpoints."""

from fastapi import APIRouter, HTTPException, Request
from ..core.rate_limit import limiter
import logging

from ..models.birth_data import PredictionRequest, BirthData
from ..models.response import PredictionResponse
from ..core.planets import get_planetary_positions
from ..core.rashis import RASHI_NAMES
from ..core.doshas import detect_all_doshas, get_transit_saturn_sign
from ..services.ai_service import generate_prediction
from ..services.cache_service import cache_service
from datetime import date as _date

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/predictions", tags=["predictions"])


@router.post("/generate", response_model=PredictionResponse)
@limiter.limit("30/minute")
async def generate_ai_prediction(request: Request, payload: PredictionRequest):
    """Generate AI prediction using Google Gemini."""
    # Check cache
    cache_key = f"prediction:{payload.birth_data.birth_date}:{payload.birth_data.birth_time}:{payload.birth_data.latitude}:{payload.prediction_type}:{payload.language}"
    cached = await cache_service.get(cache_key)
    if cached:
        return PredictionResponse(**cached)

    try:
        # Calculate birth chart details
        # The birth coordinates must be passed: the ascendant depends on where
        # on Earth the birth happened, and it is read into the prediction
        # output. Omitting them fell back to the Delhi default.
        positions = get_planetary_positions(
            year=payload.birth_data.birth_date.year,
            month=payload.birth_data.birth_date.month,
            day=payload.birth_data.birth_date.day,
            hour=payload.birth_data.birth_time.hour,
            minute=payload.birth_data.birth_time.minute,
            timezone_offset=payload.birth_data.timezone_offset,
            latitude=payload.birth_data.latitude,
            longitude=payload.birth_data.longitude,
        )

        # Get ascendant and moon signs
        asc_sign = int(positions["ascendant"] / 30)
        moon_sign = None
        sun_sign = None

        for planet in positions["planets"]:
            if planet["planet"] == "Moon":
                moon_sign = planet["sign"]
            elif planet["planet"] == "Sun":
                sun_sign = planet["sign"]

        # Detect doshas (Sade Sati uses today's transiting Saturn)
        _today = _date.today()
        try:
            _transit_saturn = get_transit_saturn_sign(_today.year, _today.month, _today.day)
        except Exception:
            _transit_saturn = None
        doshas = detect_all_doshas(
            planets=positions["planets"],
            asc_sign=asc_sign,
            moon_sign=moon_sign or 0,
            transit_saturn_sign=_transit_saturn,
        )

        # Prepare birth details for AI
        birth_details = {
            "name": payload.birth_data.name,
            "birth_date": str(payload.birth_data.birth_date),
            "birth_time": str(payload.birth_data.birth_time),
            "birth_place": payload.birth_data.birth_place,
            "ascendant": RASHI_NAMES[asc_sign]["en"],
            "moon_sign": RASHI_NAMES[moon_sign]["en"] if moon_sign is not None else "Unknown",
            "sun_sign": RASHI_NAMES[sun_sign]["en"] if sun_sign is not None else "Unknown",
            "planetary_positions": "\n".join([
                f"{p['planet']}: {RASHI_NAMES[p['sign']]['en']} {p['sign_degree']:.2f}°"
                + (" (Retrograde)" if p['retrograde'] else "")
                for p in positions["planets"]
            ]),
            "doshas": "\n".join([
                f"- Manglik: {'Yes' if doshas['manglik']['is_manglik'] else 'No'}",
                f"- Sade Sati: {'Yes' if doshas['sade_sati']['is_active'] else 'No'}",
                f"- Pitru Dosha: {'Yes' if doshas['pitru_dosha']['has_dosha'] else 'No'}",
            ]),
        }

        # Generate prediction
        result = await generate_prediction(
            birth_details=birth_details,
            prediction_type=payload.prediction_type,
            language=payload.language,
        )

        response = PredictionResponse(
            prediction_type=payload.prediction_type,
            content=result["content"],
            ai_model=result["model"],
            tokens_used=result.get("tokens_used"),
            language=payload.language,
        )

        # Cache for 24 hours
        await cache_service.set(cache_key, response.model_dump(), expiry=86400)

        return response

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error generating prediction. Please try again."
        )


@router.get("/types")
async def get_prediction_types():
    """Get available prediction types."""
    return {
        "types": [
            {"id": "career", "name": "Career Prediction", "description": "Job, business, government service"},
            {"id": "marriage", "name": "Marriage Prediction", "description": "Timing, partner characteristics"},
            {"id": "health", "name": "Health Prediction", "description": "Wellness, disease prevention"},
            {"id": "finance", "name": "Finance Prediction", "description": "Wealth, investments, property"},
            {"id": "love", "name": "Love Prediction", "description": "Relationships, romance"},
            {"id": "education", "name": "Education Prediction", "description": "Studies, exams, career path"},
        ]
    }
