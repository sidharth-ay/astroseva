"""AI Prediction API endpoints."""

from fastapi import APIRouter, HTTPException
import logging

from ..models.birth_data import PredictionRequest, BirthData
from ..models.response import PredictionResponse
from ..core.planets import get_planetary_positions
from ..core.rashis import RASHI_NAMES
from ..core.doshas import detect_all_doshas
from ..services.ai_service import generate_prediction
from ..services.cache_service import cache_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/predictions", tags=["predictions"])


@router.post("/generate", response_model=PredictionResponse)
async def generate_ai_prediction(request: PredictionRequest):
    """Generate AI prediction using Google Gemini."""
    # Check cache
    cache_key = f"prediction:{request.birth_data.birth_date}:{request.birth_data.birth_time}:{request.birth_data.latitude}:{request.prediction_type}:{request.language}"
    cached = await cache_service.get(cache_key)
    if cached:
        return PredictionResponse(**cached)

    try:
        # Calculate birth chart details
        positions = get_planetary_positions(
            year=request.birth_data.birth_date.year,
            month=request.birth_data.birth_date.month,
            day=request.birth_data.birth_date.day,
            hour=request.birth_data.birth_time.hour,
            minute=request.birth_data.birth_time.minute,
            timezone_offset=request.birth_data.timezone_offset,
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

        # Detect doshas
        doshas = detect_all_doshas(
            planets=positions["planets"],
            asc_sign=asc_sign,
            moon_sign=moon_sign or 0,
        )

        # Prepare birth details for AI
        birth_details = {
            "name": request.birth_data.name,
            "birth_date": str(request.birth_data.birth_date),
            "birth_time": str(request.birth_data.birth_time),
            "birth_place": request.birth_data.birth_place,
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
                f"- Kaal Sarp: {'Yes' if doshas['kaal_sarp']['has_dosha'] else 'No'}",
                f"- Sade Sati: {'Yes' if doshas['sade_sati']['is_active'] else 'No'}",
                f"- Pitru Dosha: {'Yes' if doshas['pitru_dosha']['has_dosha'] else 'No'}",
            ]),
        }

        # Generate prediction
        result = await generate_prediction(
            birth_details=birth_details,
            prediction_type=request.prediction_type,
            language=request.language,
        )

        response = PredictionResponse(
            prediction_type=request.prediction_type,
            content=result["content"],
            ai_model=result["model"],
            tokens_used=result.get("tokens_used"),
            language=request.language,
        )

        # Cache for 24 hours
        await cache_service.set(cache_key, response.dict(), expiry=86400)

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
