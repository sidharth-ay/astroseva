"""Panchang API endpoints."""

from fastapi import APIRouter, HTTPException
from datetime import date, datetime
import logging

from ..models.response import PanchangResponse
from ..core.planets import get_planetary_positions
from ..core.panchang import get_panchang
from ..services.cache_service import cache_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/panchang", tags=["panchang"])


@router.get("/daily", response_model=PanchangResponse)
async def get_daily_panchang(
    latitude: float = 28.6139,
    longitude: float = 77.2090,
    date_str: str = None,
    timezone_offset: float = 5.5,
    sunrise_hour: float = 6.0,
    sunset_hour: float = 18.0,
):
    """Get daily Panchang for a location."""
    if date_str is None:
        date_str = date.today().isoformat()

    # Check cache
    cache_key = f"panchang:{date_str}:{latitude}:{longitude}"
    cached = await cache_service.get(cache_key)
    if cached:
        return PanchangResponse(**cached)

    try:
        # Parse date
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()

        # Calculate Sun and Moon positions (approximate)
        # For simplicity, using noon position
        positions = get_planetary_positions(
            year=target_date.year,
            month=target_date.month,
            day=target_date.day,
            hour=12,
            minute=0,
            timezone_offset=timezone_offset,
        )

        sun_longitude = None
        moon_longitude = None

        for planet in positions["planets"]:
            if planet["planet"] == "Sun":
                sun_longitude = planet["longitude"]
            elif planet["planet"] == "Moon":
                moon_longitude = planet["longitude"]

        if sun_longitude is None or moon_longitude is None:
            raise HTTPException(
                status_code=500,
                detail="Could not calculate Sun/Moon positions"
            )

        # Calculate Panchang
        panchang = get_panchang(
            sun_longitude=sun_longitude,
            moon_longitude=moon_longitude,
            date=datetime.combine(target_date, datetime.min.time()),
            sunrise_hour=sunrise_hour,
            sunset_hour=sunset_hour,
        )

        response = PanchangResponse(**panchang)

        # Cache for 24 hours
        await cache_service.set(cache_key, response.dict(), expiry=86400)

        return response

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD."
        )
    except Exception as e:
        logger.error(f"Panchang error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error calculating Panchang. Please try again."
        )


@router.get("/muhurat")
async def get_muhurat(
    latitude: float = 28.6139,
    longitude: float = 77.2090,
    date_str: str = None,
):
    """Get auspicious timings (Muhurat) for the day."""
    if date_str is None:
        date_str = date.today().isoformat()

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()

        # Get Panchang first
        panchang = await get_daily_panchang(latitude, longitude, date_str)

        # Calculate Abhijit Muhurat (approximate)
        # Abhijit is the 8th Muhurat from sunrise
        muhurat_duration = (18.0 - 6.0) / 15  # 30 muhurats in a day

        abhijit_start = 6.0 + 7 * muhurat_duration
        abhijit_end = 6.0 + 8 * muhurat_duration

        return {
            "date": date_str,
            "abhijit_muhurat": {
                "start": f"{int(abhijit_start):02d}:{int((abhijit_start % 1) * 60):02d}",
                "end": f"{int(abhijit_end):02d}:{int((abhijit_end % 1) * 60):02d}",
            },
            "rahu_kaal": panchang.rahu_kaal,
            "gulika_kaal": panchang.gulika_kaal,
            "note": "For precise muhurats, consult a Vedic calendar (Panchang)",
        }

    except Exception as e:
        logger.error(f"Muhurat error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error calculating Muhurat. Please try again."
        )
