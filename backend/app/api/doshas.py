"""Dosha detection API endpoints."""

from fastapi import APIRouter, HTTPException
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
        planet["house"] = get_house_from_longitude(planet["longitude"], positions["ascendant"])
        if planet["planet"] == "Moon":
            moon_sign = planet["sign"]
    return positions["planets"], asc_sign, moon_sign


@router.post("/detect", response_model=DoshaResponse)
async def detect_doshas(birth_data: BirthData):
    """Detect all doshas in a birth chart."""
    try:
        # Calculate planetary positions
        positions = get_planetary_positions(
            year=birth_data.birth_date.year,
            month=birth_data.birth_date.month,
            day=birth_data.birth_date.day,
            hour=birth_data.birth_time.hour,
            minute=birth_data.birth_time.minute,
            timezone_offset=birth_data.timezone_offset,
        )

        # Get ascendant and moon signs
        planets, asc_sign, moon_sign = _planets_with_houses(positions)

        # Detect doshas
        doshas = detect_all_doshas(
            planets=planets,
            asc_sign=asc_sign,
            moon_sign=moon_sign or 0,
        )

        return DoshaResponse(
            manglik=doshas["manglik"],
            kaal_sarp=doshas["kaal_sarp"],
            sade_sati=doshas["sade_sati"],
            pitru_dosha=doshas["pitru_dosha"],
            total_doshas=doshas["total_doshas"],
        )

    except Exception as e:
        logger.error(f"Dosha detection error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error detecting doshas. Please try again."
        )


@router.post("/remedies")
async def get_remedies(birth_data: BirthData, language: str = "en"):
    """Get remedies for detected doshas."""
    try:
        # Calculate doshas first
        positions = get_planetary_positions(
            year=birth_data.birth_date.year,
            month=birth_data.birth_date.month,
            day=birth_data.birth_date.day,
            hour=birth_data.birth_time.hour,
            minute=birth_data.birth_time.minute,
            timezone_offset=birth_data.timezone_offset,
        )

        planets, asc_sign, moon_sign = _planets_with_houses(positions)

        doshas = detect_all_doshas(
            planets=planets,
            asc_sign=asc_sign,
            moon_sign=moon_sign or 0,
        )

        # Generate remedies using AI
        remedies = await generate_remedies(doshas, language)

        return {
            "doshas": doshas,
            "remedies": remedies,
            "language": language,
        }

    except Exception as e:
        logger.error(f"Remedies error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error generating remedies. Please try again."
        )
