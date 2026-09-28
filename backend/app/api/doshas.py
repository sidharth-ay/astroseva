"""Dosha detection API endpoints."""

from datetime import date
from fastapi import APIRouter, HTTPException, Request, Query
from ..core.rate_limit import limiter
import logging
import asyncio

from ..models.birth_data import BirthData
from ..models.response import DoshaResponse
from ..core.planets import get_planetary_positions
from ..core.houses import get_house_from_longitude
from ..core.doshas import detect_all_doshas, detect_manglik, detect_sade_sati, detect_pitru_dosha, get_transit_saturn_sign, get_sade_sati_periods
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


def _transit_saturn_for(as_of: date | None) -> tuple[int, str]:
    """Saturn sign for an as-of date (default today), plus ISO date string."""
    day = as_of or date.today()
    return get_transit_saturn_sign(day.year, day.month, day.day), day.isoformat()


@router.post("/detect", response_model=DoshaResponse)
@limiter.limit("20/minute")
async def detect_doshas(
    request: Request,
    birth_data: BirthData,
    as_of_date: date | None = Query(default=None, description="As-of date for Sade Sati transit (default today)"),
):
    """Detect all doshas in a birth chart."""
    _validate_location(birth_data)
    as_of = (as_of_date or date.today()).isoformat()
    cache_key = (
        f"doshas:{birth_data.birth_date}:{birth_data.birth_time}:"
        f"{birth_data.latitude}:{birth_data.longitude}:{birth_data.timezone_offset}:{as_of}"
    )
    cached = await cache_service.get(cache_key)
    # Only trust a cache entry that carries every field DoshaResponse requires.
    # Entries written before kaal_sarp existed would otherwise raise a
    # ValidationError -> HTTP 500, so treat them as a miss and recompute.
    if cached and set(DoshaResponse.model_fields).issubset(cached):
        return DoshaResponse(**cached)
    try:
        transit_saturn, _ = _transit_saturn_for(as_of_date)
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

        # Detect doshas (Sade Sati uses transit Saturn as of the given date)
        doshas = detect_all_doshas(
            planets=planets,
            asc_sign=asc_sign,
            moon_sign=moon_sign or 0,
            transit_saturn_sign=transit_saturn,
        )
        doshas["sade_sati"] = {**doshas["sade_sati"], "as_of_date": as_of}

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
async def get_remedies(
    request: Request,
    birth_data: BirthData,
    language: str = "en",
    as_of_date: date | None = Query(default=None, description="As-of date for Sade Sati transit (default today)"),
):
    """Get remedies for detected doshas."""
    _validate_location(birth_data)
    as_of = (as_of_date or date.today()).isoformat()
    cache_key = (
        f"remedies:{birth_data.birth_date}:{birth_data.birth_time}:"
        f"{birth_data.latitude}:{birth_data.longitude}:{language}:{as_of}"
    )
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    try:
        transit_saturn, _ = _transit_saturn_for(as_of_date)
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
            transit_saturn_sign=transit_saturn,
        )
        doshas["sade_sati"] = {**doshas["sade_sati"], "as_of_date": as_of}

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


@router.post("/sade-sati-periods")
@limiter.limit("20/minute")
async def get_sade_periods(request: Request, birth_data: BirthData):
    """Past/present/future Sade Sati windows for the natal Moon sign."""
    _validate_location(birth_data)
    cache_key = f"sade-periods:{birth_data.birth_date}:{birth_data.birth_time}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    try:
        positions = get_planetary_positions(
            year=birth_data.birth_date.year, month=birth_data.birth_date.month,
            day=birth_data.birth_date.day, hour=birth_data.birth_time.hour,
            minute=birth_data.birth_time.minute,
            timezone_offset=birth_data.timezone_offset,
            latitude=birth_data.latitude, longitude=birth_data.longitude,
        )
        moon_sign = next(
            (p["sign"] for p in positions["planets"] if p.get("planet") == "Moon"), 0
        )
        periods = await asyncio.to_thread(
            get_sade_sati_periods, moon_sign, 1950, 2061)
        response = {"moon_sign": moon_sign, "periods": periods}
        await cache_service.set(cache_key, response, expiry=86400)
        return response
    except Exception as e:
        logger.error(f"Sade periods error: {e}")
        raise HTTPException(status_code=500, detail="Error calculating Sade Sati periods.")
