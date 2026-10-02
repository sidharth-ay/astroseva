"""Hindu festival calendar API.

Dates are computed astronomically (see app/core/festivals.py) rather than
tabulated, so the endpoint answers for any year and for any location: festival
dates shift by a day in some places, and the sunrise/sunset/muhurat windows
depend entirely on latitude and longitude.
"""

from datetime import date
import asyncio
import logging

from fastapi import APIRouter, HTTPException, Query, Request

from ..core.festivals import get_festivals
from ..services.cache_service import cache_service
from ..core.rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/festivals", tags=["festivals"])

# One year of computation is a few seconds of ephemeris work, so results are
# cached per year and rounded location.
CACHE_TTL = 60 * 60 * 24


def _location_bucket(lat: float, lon: float) -> tuple[str, str]:
    """Coarse location key: festival dates shift by city, not by a degree."""
    return f"{round(lat, 1)}", f"{round(lon, 1)}"


@router.get("/list")
@limiter.limit("30/minute")
async def list_festivals(
    request: Request,
    month: int = Query(None, ge=1, le=12, description="Filter to a single month"),
    year: int = Query(None, ge=2000, le=2100, description="Defaults to the current year"),
    latitude: float = Query(28.6139, ge=-90, le=90),
    longitude: float = Query(77.2090, ge=-180, le=180),
    timezone_offset: float = Query(5.5, ge=-12, le=14),
    category: str = Query(None, description="major | minor | vrat"),
):
    """List Hindu festivals with their tithi basis, sunrise/sunset and muhurat."""
    if year is None:
        year = date.today().year
    if category and category not in ("major", "minor", "vrat"):
        raise HTTPException(
            status_code=400,
            detail="category must be one of: major, minor, vrat",
        )

    lat_key, lon_key = _location_bucket(latitude, longitude)
    cache_key = f"festivals:{year}:{month}:{lat_key}:{lon_key}:{timezone_offset}:{category or 'all'}"

    cached = await cache_service.get(cache_key)
    if cached:
        return cached

    try:
        # Computed in a worker thread. `get_festivals` is synchronous and does
        # thousands of ephemeris evaluations, so calling it inline here blocked
        # the event loop: uvicorn runs a single worker, and while it was running,
        # an unrelated request that otherwise takes 10ms was measured at 14.8s.
        # Every feature in the app appeared broken at once, which is why this
        # looked like a project-wide failure rather than one slow endpoint.
        # `doshas.py` and `chat.py` already offload their blocking work the same
        # way.
        festivals = await asyncio.to_thread(
            get_festivals,
            year=year,
            latitude=latitude,
            longitude=longitude,
            timezone_offset=timezone_offset,
            month=month,
        )
    except Exception as e:
        logger.error(f"Festival calculation error: {e}")
        raise HTTPException(
            status_code=500, detail="Error calculating festivals. Please try again."
        ) from e

    if category:
        festivals = [f for f in festivals if f["category"] == category]

    payload = {
        "year": year,
        "month": month,
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "timezone_offset": timezone_offset,
            "label": _label_for(latitude, longitude, timezone_offset),
        },
        "count": len(festivals),
        "festivals": festivals,
        "note": (
            "Dates follow Lahiri ayanamsa and are computed from the prevailing "
            "tithi. A festival falling within a few hours of a tithi boundary can "
            "differ by a day from panchangs that use a different ayanamsa."
        ),
    }
    await cache_service.set(cache_key, payload, expiry=CACHE_TTL)
    return payload


@router.get("/categories")
@limiter.limit("30/minute")
async def festival_categories(request: Request):
    """The category values the /list endpoint can filter on."""
    return {
        "categories": [
            {"id": "major", "label": "Major festivals"},
            {"id": "minor", "label": "Observances"},
            {"id": "vrat", "label": "Vrat days"},
        ]
    }


def _label_for(lat: float, lon: float, tz: float) -> str:
    """Coarse place label. Avoids shipping a reverse geocoder for a caption."""
    if 6.0 <= lat <= 37.0 and 68.0 <= lon <= 97.0:
        return "India"
    if 51.0 <= lat <= 52.5 and -1.0 <= lon <= 0.5:
        return "United Kingdom"
    if 1.0 <= lat <= 2.0 and 103.0 <= lon <= 105.0:
        return "Singapore"
    if 40.0 <= lat <= 42.0 and -75.0 <= lon <= -71.0:
        return "United States / Canada"
    if 1.0 <= lat <= 2.5 and 110.0 <= lon <= 112.0:
        return "Malaysia"
    if 25.0 <= lat <= 26.0 and 55.0 <= lon <= 56.5:
        return "United Arab Emirates"
    if tz == 0:
        return "Europe / Africa (UTC)"
    if tz == 5.5:
        return "India / Sri Lanka"
    if tz == -5:
        return "Eastern Americas"
    if tz == -8:
        return "Pacific Americas"
    return f"{lat:.2f}, {lon:.2f}"
