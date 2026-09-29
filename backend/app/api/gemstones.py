"""Gemstone recommendation API."""

from fastapi import APIRouter, HTTPException, Request
from ..core.rate_limit import limiter
import logging

from ..models.birth_data import BirthData
from ..core.planets import get_planetary_positions
from ..core.houses import get_house_from_longitude

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/gemstones", tags=["gemstones"])

GEMSTONE_MAP = {
    "Sun": {"gemstone": "Ruby", "weight": "3-5 carats", "metal": "Gold", "finger": "Ring finger", "day": "Sunday", "alternative": "Red Spinel"},
    "Moon": {"gemstone": "Pearl", "weight": "2-4 carats", "metal": "Silver", "finger": "Little finger", "day": "Monday", "alternative": "Moonstone"},
    "Mars": {"gemstone": "Red Coral", "weight": "3-6 carats", "metal": "Gold", "finger": "Ring finger", "day": "Tuesday", "alternative": "Carnelian"},
    "Mercury": {"gemstone": "Emerald", "weight": "1-2 carats", "metal": "Gold", "finger": "Little finger", "day": "Wednesday", "alternative": "Green Tourmaline"},
    "Jupiter": {"gemstone": "Yellow Sapphire", "weight": "2-4 carats", "metal": "Gold", "finger": "Index finger", "day": "Thursday", "alternative": "Citrine"},
    "Venus": {"gemstone": "Diamond", "weight": "0.5-1 carat", "metal": "Silver/Platinum", "finger": "Middle finger", "day": "Friday", "alternative": "White Sapphire"},
    "Saturn": {"gemstone": "Blue Sapphire", "weight": "2-4 carats", "metal": "Silver", "finger": "Middle finger", "day": "Saturday", "alternative": "Amethyst"},
}

@router.post("/recommend")
@limiter.limit("60/minute")
async def recommend_gemstones(request: Request, birth_data: BirthData):
    """Recommend gemstones based on birth chart."""
    try:
        # The birth coordinates must be passed: the ascendant depends on where
        # on Earth the birth happened, and it drives the house placement the
        # recommendations are built from. Omitting them fell back to the
        # Delhi default, so a Mumbai or London birth was charted for Delhi.
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

        asc_sign = int(positions["ascendant"] / 30)
        gemstones = []
        for p in positions["planets"]:
            name = p["planet"]
            if name in ("Rahu", "Ketu") or name not in GEMSTONE_MAP:
                continue
            info = GEMSTONE_MAP[name]
            gemstones.append({"planet": name, **info})

        rec_lines = [
            "Based on your birth chart, here are the recommended gemstones:",
            "Always consult a qualified astrologer before wearing gemstones.",
            "The gemstone should be worn during the appropriate planetary period (Dasha).",
            "Cleanse the gemstone before first use by soaking in raw milk or Gangajal.",
        ]
        if any(p["retrograde"] for p in positions["planets"] if p["planet"] in ("Saturn", "Jupiter", "Mercury")):
            rec_lines.append("Note: Some planets are retrograde. Consult an astrologer for specific guidance on gemstone wearing during retrograde periods.")

        return {
            "birth_data": {"name": birth_data.name, "date": str(birth_data.birth_date), "time": str(birth_data.birth_time), "place": birth_data.birth_place},
            "gemstones": gemstones,
            "recommendations": "\n".join(rec_lines),
        }
    except Exception as e:
        logger.error(f"Gemstone error: {e}")
        raise HTTPException(status_code=500, detail="Error generating gemstone recommendations.")
