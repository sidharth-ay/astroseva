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

SIGN_LORDS = {
    0: "Mars", 1: "Venus", 2: "Mercury", 3: "Moon", 4: "Sun", 5: "Mercury",
    6: "Venus", 7: "Mars", 8: "Jupiter", 9: "Saturn", 10: "Saturn", 11: "Jupiter",
}

# Stones that must never be worn together (enmity matrix, AstroSage).
INCOMPATIBLE = {
    "Blue Sapphire": ["Ruby", "Pearl", "Red Coral"],
    "Ruby": ["Diamond", "Blue Sapphire"],
    "Pearl": ["Emerald", "Red Coral", "Diamond", "Blue Sapphire"],
    "Emerald": ["Pearl", "Red Coral", "Yellow Sapphire"],
    "Yellow Sapphire": ["Diamond", "Emerald", "Blue Sapphire"],
    "Diamond": ["Yellow Sapphire", "Ruby", "Pearl"],
    "Red Coral": ["Emerald", "Pearl", "Blue Sapphire"],
}

# Yogakaraka planets (own both kendra + trikona) by ascendant.
YOGAKARAKA = {1: "Saturn", 6: "Saturn", 9: "Venus", 10: "Venus",
              3: "Mars", 4: "Mars", 0: None, 7: None, 2: None,
              5: None, 8: None, 11: None}

@router.post("/recommend")
@limiter.limit("60/minute")
async def recommend_gemstones(request: Request, birth_data: BirthData):
    """Recommend gemstones by Lagna/5th/9th lords (AstroSage system).

    Jivan Ratna (Lagna lord) + Lucky (5th lord) + Bhagya (9th lord);
    Maraka (2nd/7th), Trik (3rd/6th/11th) and 8th lords are avoided.
    """
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
        lord_of = lambda house: SIGN_LORDS.get((asc_sign + house - 1) % 12)
        lagna_lord = lord_of(1)
        fifth_lord = lord_of(5)
        ninth_lord = lord_of(9)
        avoid_lords = {lord_of(h) for h in [2, 3, 6, 7, 8, 11]} - {None}

        roles = [(lagna_lord, "Jivan Ratna (Lagna lord)"),
                 (fifth_lord, "Lucky stone (5th lord)"),
                 (ninth_lord, "Bhagya stone (9th lord)")]
        seen, gemstones, primary = set(), [], []
        for planet, role in roles:
            if not planet or planet in seen or planet in avoid_lords:
                continue
            if planet in ("Rahu", "Ketu") or planet not in GEMSTONE_MAP:
                continue
            seen.add(planet)
            info = GEMSTONE_MAP[planet]
            gemstones.append({"planet": planet, "role": role, **info})
            primary.append(info["gemstone"])

        yogakaraka = YOGAKARAKA.get(asc_sign)
        notes = []
        if yogakaraka and yogakaraka in [g["planet"] for g in gemstones]:
            notes.append(f"{yogakaraka} is Yogakaraka for your ascendant — its stone is especially effective.")
        avoided = sorted({GEMSTONE_MAP[p]["gemstone"] for p in avoid_lords if p in GEMSTONE_MAP})
        if avoided:
            notes.append(f"Avoid Maraka/Trik/8th-lord stones: {', '.join(avoided)}.")
        for stone in primary:
            clashes = [c for c in INCOMPATIBLE.get(stone, []) if c in primary and c != stone]
            for clash in sorted(set(clashes)):
                notes.append(f"Do not wear {stone} together with {clash}.")

        rec_lines = [
            "Based on your Lagna (ascendant), 5th and 9th lords:",
            "Always consult a qualified astrologer before wearing gemstones.",
            "Wear during the appropriate planetary Dasha after proper energisation.",
            "Cleanse the gemstone before first use by soaking in raw milk or Gangajal.",
        ]
        if any(p["retrograde"] for p in positions["planets"] if p["planet"] in ("Saturn", "Jupiter", "Mercury")):
            rec_lines.append("Note: Some planets are retrograde. Consult an astrologer for specific guidance on gemstone wearing during retrograde periods.")

        return {
            "birth_data": {"name": birth_data.name, "date": str(birth_data.birth_date), "time": str(birth_data.birth_time), "place": birth_data.birth_place},
            "gemstones": gemstones,
            "primary_stones": primary,
            "avoid_stones": avoided,
            "notes": notes,
            "recommendations": "\n".join(rec_lines),
        }
    except Exception as e:
        logger.error(f"Gemstone error: {e}")
        raise HTTPException(status_code=500, detail="Error generating gemstone recommendations.")
