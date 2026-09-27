"""Varshphal (Annual Horoscope) API."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from ..models.birth_data import BirthData
from ..core.planets import get_planetary_positions

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/varshphal", tags=["varshphal"])

class VarshphalRequest(BirthData):
    year: int

MONTHS = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]

@router.post("/calculate")
async def calculate_varshphal(data: VarshphalRequest):
    """Calculate annual horoscope (Varshphal)."""
    try:
        positions = get_planetary_positions(
            year=data.year, month=data.birth_date.month, day=data.birth_date.day,
            hour=data.birth_time.hour, minute=data.birth_time.minute,
            timezone_offset=data.timezone_offset,
        )
        asc_sign = int(positions["ascendant"] / 30)
        RASHI = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                 "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

        planet_signs = {}
        for p in positions["planets"]:
            planet_signs[p["planet"]] = RASHI[p["sign"]]

        # Simple rule-based predictions based on planetary positions
        predictions = {
            "career": f"With Ascendant in {RASHI[asc_sign]}, your career outlook for {data.year} shows growth. Jupiter in {planet_signs.get('Jupiter', 'unknown')} supports professional expansion.",
            "finance": f"Venus in {planet_signs.get('Venus', 'unknown')} indicates financial opportunities through partnerships. Saturn in {planet_signs.get('Saturn', 'unknown')} encourages disciplined saving.",
            "health": f"Mars in {planet_signs.get('Mars', 'unknown')} supports physical vitality. Pay attention to the areas ruled by {RASHI[asc_sign]} in your chart.",
            "marriage": f"Venus in {planet_signs.get('Venus', 'unknown')} strengthens romantic bonds. Moon in {planet_signs.get('Moon', 'unknown')} supports emotional connections.",
            "education": f"Mercury in {planet_signs.get('Mercury', 'unknown')} enhances learning. Jupiter in {planet_signs.get('Jupiter', 'unknown')} supports academic pursuits.",
            "travel": f"Rahu's position favors travel in the second half of the year. Short trips bring unexpected gains.",
        }

        auspicious = [MONTHS[(asc_sign * 2 + m) % 12] for m in range(3)]
        challenging = [MONTHS[(asc_sign * 2 + m + 6) % 12] for m in range(2)]

        return {
            "birth_data": {"name": data.name, "date": str(data.birth_date), "time": str(data.birth_time), "place": data.birth_place},
            "year": data.year,
            "varshphal_chart": {"asc_sign": RASHI[asc_sign], "planets": planet_signs},
            "predictions": predictions,
            "auspicious_months": auspicious,
            "challenging_months": challenging,
        }
    except Exception as e:
        logger.error(f"Varshphal error: {e}")
        raise HTTPException(status_code=500, detail="Error calculating Varshphal.")
