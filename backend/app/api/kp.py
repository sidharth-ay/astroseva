"""KP (Krishnamurti Paddhati) Astrology API."""

from fastapi import APIRouter, HTTPException
import logging

from ..models.birth_data import BirthData
from ..core.planets import get_planetary_positions
from ..core.houses import get_house_from_longitude

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/kp", tags=["kp"])

RASHI_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
               "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira",
    "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
    "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra",
    "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula",
    "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]

# KP sub-lord table (simplified — each nakshatra has 9 sub-divisions)
KP_SUB_LORDS = ["Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", "Ketu", "Venus"]

def _kp_nakshatra_lord(nakshatra_index: int) -> str:
    """Get the ruling planet of a nakshatra in KP system."""
    return KP_SUB_LORDS[nakshatra_index % 9]

def _kp_sub_lord(nakshatra_index: int, pada: int, longitude_in_sign: float) -> str:
    """Calculate KP sub-lord (simplified)."""
    # Each nakshatra is 13°20'. Sub-lord is based on position within nakshatra.
    nak_span = 13.333
    sub_index = int((longitude_in_sign % nak_span) / (nak_span / 9))
    return KP_SUB_LORDS[min(sub_index, 8)]

@router.post("/chart")
async def get_kp_chart(birth_data: BirthData):
    """Generate KP (Krishnamurti Paddhati) chart with sub-lords and ruling planets."""
    try:
        positions = get_planetary_positions(
            year=birth_data.birth_date.year,
            month=birth_data.birth_date.month,
            day=birth_data.birth_date.day,
            hour=birth_data.birth_time.hour,
            minute=birth_data.birth_time.minute,
            timezone_offset=birth_data.timezone_offset,
        )

        asc_sign = int(positions["ascendant"] / 30)

        kp_data = []
        for p in positions["planets"]:
            name = p["planet"]
            longitude = p["longitude"]
            sign = p["sign"]
            sign_degree = p["sign_degree"]

            # Calculate nakshatra from sidereal longitude
            nak_span = 360 / 27
            nak_index = int(longitude / nak_span) % 27
            pada_span = nak_span / 4
            pada = int((longitude % nak_span) / pada_span) + 1
            if pada > 4:
                pada = 4

            nak_lord = _kp_nakshatra_lord(nak_index)
            sub_lord = _kp_sub_lord(nak_index, pada, sign_degree)

            kp_data.append({
                "planet": name,
                "sign": RASHI_NAMES[sign],
                "sign_index": sign,
                "nakshatra": NAKSHATRAS[nak_index],
                "nakshatra_index": nak_index,
                "pada": pada,
                "nak_lord": nak_lord,
                "sub_lord": sub_lord,
                "retrograde": p["retrograde"],
            })

        # Ruling planets at time of chart (approximate)
        import datetime
        now = datetime.datetime.now()
        day_of_week = now.weekday()
        ruling_planets = ["Saturn", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Sun"]
        ruling_planet = ruling_planets[(day_of_week + 1) % 7]

        return {
            "birth_data": {"name": birth_data.name, "date": str(birth_data.birth_date), "time": str(birth_data.birth_time), "place": birth_data.birth_place},
            "planets": kp_data,
            "ascendant": {
                "sign": RASHI_NAMES[asc_sign],
                "nakshatra": NAKSHATRAS[int(positions["ascendant"] / (360/27)) % 27],
                "nak_lord": _kp_nakshatra_lord(int(positions["ascendant"] / (360/27)) % 27),
            },
            "ruling_planet": ruling_planet,
            "note": "KP system uses sub-lords for precise event timing. For detailed analysis, consult a KP astrologer.",
        }
    except Exception as e:
        logger.error(f"KP chart error: {e}")
        raise HTTPException(status_code=500, detail="Error generating KP chart.")
