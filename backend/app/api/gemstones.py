"""Gemstone recommendation API."""

from fastapi import APIRouter, Depends, HTTPException, Request
from ..core.rate_limit import limiter
import logging

from ..models.birth_data import BirthData
from ..core.planets import get_planetary_positions
from ..core.houses import get_house_from_longitude
from ..services.settings_service import house_system_setting
from ..core.planets import _get_dignity
from ..core.rashis import RASHI_NAMES
from ..core.grahayukti import COMBUST_DEGREES

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
async def recommend_gemstones(
    request: Request,
    birth_data: BirthData,
    house_system: str = Depends(house_system_setting),
):
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

        # --- what the chart actually supports -------------------------------
        #
        # This previously returned all seven gemstones for every chart. The
        # ascendant and every planet's house were computed and then never read;
        # the only thing that varied between two people was a paragraph
        # mentioning retrograde planets. The paragraph claimed the list came
        # "based on your birth chart", which it did not.
        #
        # What follows is derived from the chart: each graha's dignity and
        # whether it is combust, and a recommendation only where the placement
        # supports one. A graha in a weak sign is reported as such and no stone
        # is suggested for it, rather than the stone being listed anyway.

        planets = positions["planets"]
        by_name = {p["planet"]: p for p in planets}
        sun_longitude = by_name["Sun"]["longitude"]

        def _separation(lng: float) -> float:
            return abs((lng - sun_longitude + 180) % 360 - 180)

        def _condition(dignity: str, retrograde: bool) -> str:
            if retrograde:
                # A retrograde graha is applying its significations inversely,
                # so a stone is not strengthened by wearing it for that graha.
                return "retrograde_apply_inversely"
            if dignity == "Exalted":
                return "exalted"
            if dignity == "Own Sign":
                return "own_sign"
            if dignity in ("Friend's Sign", "Neutral Sign"):
                return "friendly"
            return "weak"

        # Conditions under which a stone is actually indicated.
        INDICATED = {"exalted", "own_sign", "friendly"}

        gemstones = []
        considerations = []
        for name, info in GEMSTONE_MAP.items():
            p = by_name.get(name)
            if p is None:
                continue
            dignity = _get_dignity(name, p["sign"])
            limit = COMBUST_DEGREES.get(name)
            combust = limit is not None and _separation(p["longitude"]) < limit
            house = get_house_from_longitude(p["longitude"], positions["ascendant"], house_system)

            if combust:
                condition = "combust"
            else:
                condition = _condition(dignity, p["retrograde"])

            considerations.append({
                "planet": name,
                "sign": RASHI_NAMES[p["sign"]]["en"],
                "house": house,
                "dignity": dignity,
                "combust": combust,
                "condition": condition,
            })

            if condition not in INDICATED:
                continue

            gemstones.append({
                "planet": name,
                "condition": condition,
                "reason": (
                    f"{name} is in {RASHI_NAMES[p['sign']]['en']}, "
                    f"the {house}th house from the ascendant, where it is "
                    f"{dignity.lower()}."
                ),
                **info,
            })

        rec_lines = [
            "Always consult a qualified astrologer before wearing gemstones.",
            "A stone is best worn during that graha's own dasha period.",
            "Test a stone before committing to it, particularly Blue Sapphire.",
            "Cleanse a new stone before first wear.",
        ]
        retrograde = [c["planet"] for c in considerations
                      if c["condition"] == "retrograde_apply_inversely"]
        if retrograde:
            rec_lines.append(
                f"Note: {', '.join(retrograde)} "
                f"{'is' if len(retrograde) == 1 else 'are'} retrograde, so "
                f"{'its' if len(retrograde) == 1 else 'their'} significations "
                f"apply inversely."
            )
        combust = [c["planet"] for c in considerations if c["combust"]]
        if combust:
            rec_lines.append(
                f"No stone is recommended for {', '.join(combust)}, which "
                f"{'is' if len(combust) == 1 else 'are'} combust (too close to "
                f"the Sun)."
            )

        return {
            "birth_data": {
                "name": birth_data.name, "date": str(birth_data.birth_date),
                "time": str(birth_data.birth_time),
                "place": birth_data.birth_place,
            },
            "ascendant": RASHI_NAMES[asc_sign]["en"],
            "gemstones": gemstones,
            # Every graha is reported, including those for which no stone is
            # suggested, so the user can see why.
            "considerations": considerations,
            "basis": (
                "Each graha's dignity in its sign of placement, its house from "
                "the ascendant, whether it is combust, and its retrograde "
                "status. A stone is recommended only where the placement is "
                "favourable."
            ),
            "recommendations": "\n".join(rec_lines),
            "disclaimer": (
                "This is a traditional reading of the chart, not a "
                "prescription. Gemstone wearing carries financial cost and, for "
                "some stones, tradition holds it should be tested first. "
                "Confirm with a qualified astrologer before buying."
            ),
        }

    except Exception as e:
        logger.error(f"Gemstone error: {e}")
        raise HTTPException(status_code=500, detail="Error generating gemstone recommendations.") from e
