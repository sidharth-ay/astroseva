"""Dosha detection API endpoints."""

from fastapi import APIRouter, HTTPException, Request
from ..core.rate_limit import limiter
import logging

from ..models.birth_data import BirthData
from ..models.response import DoshaResponse
from ..core.planets import get_planetary_positions
from ..core.houses import get_house_from_longitude
from ..core.doshas import detect_all_doshas, detect_manglik, detect_kaal_sarp, detect_sade_sati, detect_pitru_dosha
from ..services.ai_service import generate_remedies
from ..services.cache_service import cache_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/doshas", tags=["doshas"])


def _planets_with_houses(positions: dict) -> tuple:
    """Attach whole-sign houses to planet dicts; return (planets, asc_sign, moon_sign)."""
    asc_sign = int(positions["ascendant"] / 30)
    moon_sign = 0
    for planet in positions["planets"]:
        planet["house"] = get_house_from_longitude(planet.get("longitude", 0), positions["ascendant"])
        if planet.get("planet") == "Moon":
            moon_sign = planet.get("sign", 0)
    return positions["planets"], asc_sign, moon_sign


def _validate_location(birth_data: BirthData) -> None:
    """Reject polar latitudes where the ascendant math breaks down."""
    if abs(birth_data.latitude) > 66.5:
        raise HTTPException(
            status_code=400,
            detail="Birth latitude beyond ±66.5° is not supported for house calculations.",
        )


@router.post("/detect", response_model=DoshaResponse)
@limiter.limit("20/minute")
async def detect_doshas(request: Request, birth_data: BirthData):
    """Detect all doshas in a birth chart."""
    cache_key = (
        f"doshas:{birth_data.birth_date}:{birth_data.birth_time}:"
        f"{birth_data.latitude}:{birth_data.longitude}:{birth_data.timezone_offset}"
    )
    cached = await cache_service.get(cache_key)
    if cached:
        return DoshaResponse(**cached)
    _validate_location(birth_data)
    try:
        # Calculate planetary positions (with birth-place coords —
        # ascendant/houses depend on them)
        positions = get_planetary_positions(
            year=birth_data.birth_date.year,
            month=birth_data.birth_date.month,
            day=birth_data.birth_date.day,
            hour=birth_data.birth_time.hour,
            minute=birth_data.birth_time.minute,
            timezone_offset=birth_data.timezone_offset,
            latitude=birth_data.latitude,
            longitude=birth_data.longitude,
        )

        # Get ascendant and moon signs
        planets, asc_sign, moon_sign = _planets_with_houses(positions)

        # Detect doshas
        doshas = detect_all_doshas(
            planets=planets,
            asc_sign=asc_sign,
            moon_sign=moon_sign or 0,
        )

        response = DoshaResponse(
            manglik=doshas["manglik"],
            kaal_sarp=doshas["kaal_sarp"],
            sade_sati=doshas["sade_sati"],
            pitru_dosha=doshas["pitru_dosha"],
            total_doshas=doshas["total_doshas"],
        )
        await cache_service.set(cache_key, response.model_dump(), expiry=86400)
        return response

    except Exception as e:
        logger.error(f"Dosha detection error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error detecting doshas. Please try again."
        )


@router.post("/remedies")
@limiter.limit("10/minute")
async def get_remedies(request: Request, birth_data: BirthData, language: str = "en"):
    """Get remedies for detected doshas."""
    cache_key = (
        f"remedies:{birth_data.birth_date}:{birth_data.birth_time}:"
        f"{birth_data.latitude}:{birth_data.longitude}:{language}"
    )
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    _validate_location(birth_data)
    try:
        # Calculate doshas first (with birth-place coords)
        positions = get_planetary_positions(
            year=birth_data.birth_date.year,
            month=birth_data.birth_date.month,
            day=birth_data.birth_date.day,
            hour=birth_data.birth_time.hour,
            minute=birth_data.birth_time.minute,
            timezone_offset=birth_data.timezone_offset,
            latitude=birth_data.latitude,
            longitude=birth_data.longitude,
        )

        planets, asc_sign, moon_sign = _planets_with_houses(positions)

        doshas = detect_all_doshas(
            planets=planets,
            asc_sign=asc_sign,
            moon_sign=moon_sign or 0,
        )

        # Generate remedies using AI
        remedies = await generate_remedies(doshas, language)

        response = {
            "doshas": doshas,
            "remedies": remedies,
            "language": language,
        }
        await cache_service.set(cache_key, response, expiry=86400)
        return response

    except Exception as e:
        logger.error(f"Remedies error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error generating remedies. Please try again."
        )
