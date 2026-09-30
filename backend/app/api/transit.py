"""Transit (Gochar) API — current planetary positions."""

from fastapi import APIRouter, Request
from ..core.rate_limit import limiter
from datetime import date, timedelta
import logging

from ..core.planets import get_planetary_positions
from ..services.cache_service import cache_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/transit", tags=["transit"])

PLANET_SIGNS = {
    "Sun": 0, "Moon": 1, "Mars": 3, "Mercury": 5,
    "Jupiter": 7, "Venus": 9, "Saturn": 11,
}

def _positions_on(d: date, user_offset: float = 5.5) -> dict[int, float]:
    """Sidereal longitude of each graha on a given date."""
    pos = get_planetary_positions(
        year=d.year, month=d.month, day=d.day,
        hour=12, minute=0, timezone_offset=user_offset,
        latitude=28.6139, longitude=77.2090,
    )
    return {p["planet"]: p["longitude"] for p in pos["planets"]}


def _daily_motion(planet: str, d: date) -> float:
    """Degrees of sidereal longitude the graha covers per day.

    A central difference across one day either side, unwrapped so that a graha
    crossing 360 or 0 does not report a near-zero or huge jump. Sign is carried:
    a retrograde graha comes out negative.
    """
    yesterday = _positions_on(d - timedelta(days=1))
    tomorrow = _positions_on(d + timedelta(days=1))
    if planet not in yesterday or planet not in tomorrow:
        return 0.0
    forward = tomorrow[planet] - yesterday[planet]
    if forward > 180:
        forward -= 360
    elif forward < -180:
        forward += 360
    return forward / 2.0


def _motion_label(degrees_per_day: float) -> str:
    """Direct, retrograde or stationary, at the classical thresholds."""
    if abs(degrees_per_day) < 0.05:
        return "stationary"
    return "direct" if degrees_per_day > 0 else "retrograde"


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
        # Today's transits are the same for everyone on Earth: the Sun, Moon and
        # planets are placed from the date and the timezone offset, and the
        # ascendant plays no part in a transit report. The coordinates are
        # pinned to the Delhi default explicitly rather than left implicit, so
        # that it is clear the omission is deliberate.
        positions = get_planetary_positions(
            year=today.year, month=today.month, day=today.day,
            hour=12, minute=0, timezone_offset=5.5,
            latitude=28.6139, longitude=77.2090,
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
                "sign_degree": round(p["sign_degree"], 2),
                "retrograde": p["retrograde"],
                # Degrees of sidereal longitude covered per day, computed from
                # the position on the day before and the day after. The engine
                # emits no speed field, so this used to read
                # `p.get("speed", 1.0)` and report 1.0 for every graha every
                # day -- a number that looked measured and was a fallback.
                "daily_motion": round(_daily_motion(name, today), 4),
                "motion": _motion_label(_daily_motion(name, today)),
            })
            current_signs[name] = sign_name

        result = {"date": today.isoformat(), "transits": transits, "current_signs": current_signs}
        await cache_service.set(cache_key, result, expiry=86400)
        return result

    except Exception as e:
        logger.error(f"Transit error: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Error calculating transits.")
