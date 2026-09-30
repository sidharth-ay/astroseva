"""Varshphal (Annual Horoscope) API."""

from fastapi import APIRouter, HTTPException, Request
from ..core.rate_limit import limiter
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from typing import Optional
import logging

from ..models.birth_data import BirthData
from ..core.planets import get_planetary_positions
from ..core.rashis import RASHI_NAMES
from ..core.dasha import get_dasha_for_birth

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/varshphal", tags=["varshphal"])

class VarshphalRequest(BirthData):
    year: int


@router.post("/calculate")
@limiter.limit("60/minute")
async def calculate_varshphal(request: Request, data: VarshphalRequest):
    """Calculate annual horoscope (Varshphal)."""
    try:
        # The birth coordinates must be passed: the ascendant depends on where
        # on Earth the birth happened, and it is read into the response.
        # Omitting them fell back to the Delhi default.
        positions = get_planetary_positions(
            year=data.year, month=data.birth_date.month, day=data.birth_date.day,
            hour=data.birth_time.hour, minute=data.birth_time.minute,
            timezone_offset=data.timezone_offset,
            latitude=data.latitude,
            longitude=data.longitude,
        )
        asc_sign = int(positions["ascendant"] / 30)

        # --- what was actually happening in the requested year --------------
        #
        # This previously returned one fixed sentence per topic with the
        # ascendant and a natal sign interpolated into it, plus
        # "auspicious_months" computed as `(asc_sign * 2 + m) % 12`. None of it
        # depended on the year: two people sharing an ascendant got identical
        # text for every year, and those months were an offset into a list of
        # month names rather than anything derived from the sky.
        #
        # What follows is what this engine can compute honestly: where each
        # graha actually was at the midpoint of the requested year, and which
        # Vimshottari dasha the native was running. Both are ephemeris results.
        # No prose is generated, and the response says so.

        year_positions = get_planetary_positions(
            year=data.year, month=7, day=1, hour=12, minute=0,
            timezone_offset=data.timezone_offset,
            latitude=data.latitude, longitude=data.longitude,
        )

        solar_transits = {}
        for p in year_positions["planets"]:
            if p["planet"] in ("Rahu", "Ketu"):
                continue
            solar_transits[p["planet"]] = {
                "sign": RASHI_NAMES[p["sign"]]["en"],
                "sign_index": p["sign"],
                "longitude": round(p["longitude"], 4),
                "retrograde": p["retrograde"],
            }

        # The dasha running through the year, which is the frame a Varshpal is
        # read against. Without it the response is ephemeris with no context.
        moon_longitude = next(
            p["longitude"] for p in positions["planets"] if p["planet"] == "Moon"
        )
        birth_utc = datetime(
            data.birth_date.year, data.birth_date.month, data.birth_date.day,
            data.birth_time.hour, data.birth_time.minute, tzinfo=timezone.utc,
        ) - timedelta(hours=data.timezone_offset)
        year_midpoint = datetime(data.year, 7, 1, 12, 0, tzinfo=timezone.utc)
        running = (
            get_dasha_for_birth(moon_longitude, birth_utc, year_midpoint)
            .get("current_dasha") or {}
        )

        def _span(start, end) -> str | None:
            if not start or not end:
                return None
            return f"{start.date().isoformat()} to {end.date().isoformat()}"

        annual_chart = {
            "solar_transits": solar_transits,
            # `get_current_dasha` names these mahadasha/antardasha, not
            # lord/start_date.
            "dasha_lord": running.get("mahadasha"),
            "dasha_period": _span(
                running.get("mahadasha_start"), running.get("mahadasha_end")
            ),
            "antardasha_lord": running.get("antardasha"),
            "antardasha_period": _span(
                running.get("antardasha_start"), running.get("antardasha_end")
            ),
            "sun_sign_at_year_midpoint": RASHI_NAMES[
                next(p["sign"] for p in year_positions["planets"]
                     if p["planet"] == "Sun")
            ]["en"],
        }

        return {
            "birth_data": {
                "name": data.name, "date": str(data.birth_date),
                "time": str(data.birth_time), "place": data.birth_place,
            },
            "year": data.year,
            "varshphal_chart": {
                "asc_sign": RASHI_NAMES[asc_sign]["en"],
                "planets": {
                    p["planet"]: RASHI_NAMES[p["sign"]]["en"]
                    for p in positions["planets"]
                },
            },
            "annual_chart": annual_chart,
            # Empty by design. The old endpoint filled this with prose that was
            # the same for every chart and every year; callers must not receive
            # invented narrative in place of the ephemeris above.
            "predictions": {},
            "method": (
                "Ephemeris: sidereal planetary positions at the midpoint of the "
                "requested year, plus the Vimshottari dasha running through it."
            ),
            "limitations": [
                "Positions are sampled at the midpoint of the year rather than "
                "tracked daily, so a graha that changes sign mid-year is "
                "reported only where it stood in July.",
                "This engine does not compute the annual horoscope's house-wise "
                "solar-return chart or its remedies, so it names no auspicious "
                "or challenging months.",
                "Interpretation of these positions is left to a qualified "
                "practitioner; what is returned here is the calculation, not a "
                "reading of it.",
            ],
        }
    except Exception as e:
        logger.error(f"Varshphal error: {e}")
        raise HTTPException(status_code=500, detail="Error calculating Varshphal.")
