"""Transit (Gochar) API — current planetary positions."""

from fastapi import APIRouter, Request
from ..core.rate_limit import limiter
from datetime import date
import logging

from ..core.planets import get_planetary_positions
from ..services.cache_service import cache_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/transit", tags=["transit"])

PLANET_SIGNS = {
    "Sun": 0, "Moon": 1, "Mars": 3, "Mercury": 5,
    "Jupiter": 7, "Venus": 9, "Saturn": 11,
}

@router.get("/today")
@limiter.limit("60/minute")
async def get_today_transit(request: Request):
    """Get current planetary transits for today."""
    today = date.today()
    cache_key = f"transit:{today.isoformat()}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached

    try:
        positions = get_planetary_positions(
            year=today.year, month=today.month, day=today.day,
            hour=12, minute=0, timezone_offset=5.5,
        )

        RASHI_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                       "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

        transits = []
        current_signs = {}
        for p in positions["planets"]:
            name = p["planet"]
            if name in ("Rahu", "Ketu"):
                continue
            sign_name = RASHI_NAMES[p["sign"]]
            transits.append({
                "planet": name,
                "current_sign": sign_name,
                "current_sign_index": p["sign"],
                "retrograde": p["retrograde"],
                "speed": round(abs(p.get("speed", 1.0)), 2),
            })
            current_signs[name] = sign_name

        result = {"date": today.isoformat(), "transits": transits, "current_signs": current_signs}
        await cache_service.set(cache_key, result, expiry=86400)
        return result

    except Exception as e:
        logger.error(f"Transit error: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Error calculating transits.")
