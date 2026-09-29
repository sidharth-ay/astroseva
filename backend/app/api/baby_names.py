"""Baby name suggestion API.

Matching notes
--------------
The first version of this endpoint was unusable. The page sends the gender as
"boy" or "girl" while the query parameter only accepted "male" or "female", so
every request failed validation with 422 and the page never rendered a name.
Both spellings are accepted here now.

The numerology is no longer invented either. The endpoint previously summed the
digits of the birth date and offered "lucky numbers" from a formula that had no
basis in the numerology module, while each name card showed a hardcoded number
that contradicted it. It now uses app/core/numerology.py, the same engine the
numerology feature uses:

  * calculate_life_path_number  - the child's ruling number, from the birth date
  * calculate_destiny_number    - a name's Expression/Destiny number
  * get_number_compatibility    - the existing matrix, so this feature and the
                                  numerology feature can never disagree

Names are ranked by how well the two numbers match, and every suggestion
carries the numbers and the verdict so the page can explain itself.
"""

from fastapi import APIRouter, Query
from datetime import date
import logging

from ..core.numerology import (
    calculate_destiny_number,
    calculate_life_path_number,
    get_number_compatibility,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/baby-names", tags=["baby-names"])

# The page and any external caller have used different spellings; accept both.
_GENDER_ALIASES = {
    "boy": "male", "male": "male", "m": "male",
    "girl": "female", "female": "female", "f": "female",
}

# Ranking weight, best first. Ties fall back to the name alphabetically so the
# order is stable between requests.
_RANK = {"Excellent": 0, "Strong": 1, "Good": 2, "Neutral": 3}

# Name database.
BOY_NAMES = [
    {"name": "Aarav", "meaning": "Peaceful, calm", "origin": "Sanskrit"},
    {"name": "Vivaan", "meaning": "First ray of sunlight", "origin": "Sanskrit"},
    {"name": "Aditya", "meaning": "Sun, lord of the sun", "origin": "Sanskrit"},
    {"name": "Arjun", "meaning": "Bright, shining, white", "origin": "Sanskrit"},
    {"name": "Sai", "meaning": "Divine, holy one", "origin": "Sanskrit"},
    {"name": "Reyansh", "meaning": "A ray of light", "origin": "Sanskrit"},
    {"name": "Krishna", "meaning": "Dark, attractive, divine", "origin": "Sanskrit"},
    {"name": "Ishaan", "meaning": "Sun, lord", "origin": "Sanskrit"},
    {"name": "Shaurya", "meaning": "Bravery, valor", "origin": "Sanskrit"},
    {"name": "Atharv", "meaning": "First Veda, knowledge", "origin": "Sanskrit"},
    {"name": "Kabir", "meaning": "Great, noble", "origin": "Arabic"},
    {"name": "Anvi", "meaning": "Goddess of forest", "origin": "Sanskrit"},
    {"name": "Vihaan", "meaning": "Dawn, new beginning", "origin": "Sanskrit"},
    {"name": "Dhruv", "meaning": "Pole star, constant", "origin": "Sanskrit"},
    {"name": "Veer", "meaning": "Brave, warrior", "origin": "Sanskrit"},
    {"name": "Kian", "meaning": "King, ancient", "origin": "Persian"},
    {"name": "Rohan", "meaning": "Ascending, sandalwood", "origin": "Sanskrit"},
    {"name": "Advik", "meaning": "Unique, different", "origin": "Sanskrit"},
    {"name": "Arnav", "meaning": "Ocean, sea", "origin": "Sanskrit"},
    {"name": "Ayaan", "meaning": "Gift of God, path", "origin": "Arabic"},
    {"name": "Vedant", "meaning": "Wisdom, knowledge", "origin": "Sanskrit"},
    {"name": "Nihit", "meaning": "Destined, ordained", "origin": "Sanskrit"},
    {"name": "Parth", "meaning": "Prince, hero", "origin": "Sanskrit"},
    {"name": "Rudra", "meaning": "Lord Shiva", "origin": "Sanskrit"},
    {"name": "Yash", "meaning": "Fame, glory", "origin": "Sanskrit"},
    {"name": "Devansh", "meaning": "Part of God", "origin": "Sanskrit"},
    {"name": "Aryan", "meaning": "Ancient, noble", "origin": "Sanskrit"},
    {"name": "Kiran", "meaning": "Ray of light", "origin": "Sanskrit"},
    {"name": "Manav", "meaning": "Human, humane", "origin": "Sanskrit"},
]

GIRL_NAMES = [
    {"name": "Ananya", "meaning": "Unique, matchless", "origin": "Sanskrit"},
    {"name": "Diya", "meaning": "Lamp, light", "origin": "Sanskrit"},
    {"name": "Myra", "meaning": "Admirable, beloved", "origin": "Sanskrit"},
    {"name": "Sara", "meaning": "Princess, pure", "origin": "Hebrew"},
    {"name": "Aanya", "meaning": "Grace, favor", "origin": "Sanskrit"},
    {"name": "Aadhya", "meaning": "First, beginning", "origin": "Sanskrit"},
    {"name": "Kiara", "meaning": "Dark-haired, beam of light", "origin": "Italian"},
    {"name": "Priya", "meaning": "Beloved, dear one", "origin": "Sanskrit"},
    {"name": "Ira", "meaning": "Earth, Saraswati", "origin": "Sanskrit"},
    {"name": "Tara", "meaning": "Star, goddess of compassion", "origin": "Sanskrit"},
    {"name": "Saanvi", "meaning": "Goddess Lakshmi", "origin": "Sanskrit"},
    {"name": "Aaradhya", "meaning": "Worshipped, devoted", "origin": "Sanskrit"},
    {"name": "Nisha", "meaning": "Night, darkness", "origin": "Sanskrit"},
    {"name": "Pari", "meaning": "Fairy, beautiful", "origin": "Persian"},
    {"name": "Riya", "meaning": "Singer, graceful", "origin": "Sanskrit"},
    {"name": "Meera", "meaning": "Devotee of Krishna", "origin": "Sanskrit"},
    {"name": "Anika", "meaning": "Grace, brilliance", "origin": "Sanskrit"},
    {"name": "Zoya", "meaning": "Alive, loving, caring", "origin": "Arabic"},
    {"name": "Navya", "meaning": "New, young", "origin": "Sanskrit"},
    {"name": "Aisha", "meaning": "Life, alive, prosperous", "origin": "Arabic"},
    {"name": "Saanvi Kaur", "meaning": "Princess, divine grace", "origin": "Sanskrit"},
    {"name": "Ishita", "meaning": "Supreme, goddess", "origin": "Sanskrit"},
    {"name": "Kavya", "meaning": "Poem, art", "origin": "Sanskrit"},
    {"name": "Trisha", "meaning": "Goddess Lakshmi", "origin": "Sanskrit"},
    {"name": "Aditi", "meaning": "Sun goddess, freedom", "origin": "Sanskrit"},
    {"name": "Rhea", "meaning": "Flowing, gentle", "origin": "Greek"},
    {"name": "Sneha", "meaning": "Affection, love", "origin": "Sanskrit"},
    {"name": "Aarohi", "meaning": "Ascending, rising", "origin": "Sanskrit"},
    {"name": "Mannat", "meaning": "Wish, thought of the heart", "origin": "Sanskrit"},
]


def _normalise_gender(gender: str) -> str:
    key = (gender or "").strip().lower()
    if key not in _GENDER_ALIASES:
        raise ValueError(
            f"gender must be one of: {', '.join(sorted(set(_GENDER_ALIASES)))}"
        )
    return _GENDER_ALIASES[key]


def _to_numerology_date(birth_date: str) -> str:
    """Convert an ISO date to the DD-MM-YYYY the numerology module expects.

    The page uses <input type="date">, which yields YYYY-MM-DD. Passing that
    straight through would be read as day=2026, month=09, year=29 and produce a
    confidently wrong life path number.
    """
    parsed = date.fromisoformat(birth_date)
    return f"{parsed.day:02d}-{parsed.month:02d}-{parsed.year}"


def _rank_names(names: list[dict], life_path: int | None) -> list[dict]:
    """Score each name's Destiny number against the child's Life Path."""
    scored = []
    for entry in names:
        destiny = calculate_destiny_number(entry["name"])
        destiny_number = destiny["destiny_number"]
        if life_path is None:
            verdict, rank = "Neutral", _RANK["Neutral"]
            explanation = "Add a birth date to see how this name matches the child's Life Path."
        else:
            verdict = get_number_compatibility(life_path, destiny_number)["compatibility"]
            rank = _RANK.get(verdict, _RANK["Neutral"])
            explanation = (
                f"Destiny number {destiny_number} against Life Path {life_path}: {verdict}."
            )
        scored.append((rank, entry["name"], {
            **entry,
            "destiny_number": destiny_number,
            "is_master_number": destiny["is_master_number"],
            "traits": destiny.get("traits", []),
            "compatibility": verdict,
            "compatibility_note": explanation,
        }))
    scored.sort(key=lambda item: (item[0], item[1]))
    return [item[2] for item in scored]


@router.get("/suggest")
async def suggest_baby_names(
    gender: str = Query("boy", pattern="^(boy|girl|male|female|m|f)$"),
    birth_date: str = Query(None, description="YYYY-MM-DD, optional"),
):
    """Suggest baby names, ranked by numerological match when a birth date is given."""
    try:
        resolved = _normalise_gender(gender)
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))

    names = BOY_NAMES if resolved == "male" else GIRL_NAMES

    life_path_block = None
    life_path_number = None
    if birth_date:
        try:
            numerology_date = _to_numerology_date(birth_date)
            life_path = calculate_life_path_number(numerology_date)
            life_path_number = life_path["life_path_number"]
            life_path_block = {
                "life_path_number": life_path_number,
                "is_master_number": life_path["is_master_number"],
                "reduction": life_path["reduction"],
                "traits": life_path.get("traits", []),
                "lucky_color": life_path.get("lucky_color", ""),
                "lucky_gem": life_path.get("lucky_gem", ""),
                "lucky_day": life_path.get("lucky_day", ""),
                "planet": life_path.get("planet", ""),
            }
        except ValueError:
            # An unparseable date should not take the whole feature down; the
            # names are still useful, just unranked.
            logger.info("Ignoring unparseable birth_date %r", birth_date)
            birth_date = None

    suggestions = _rank_names(names, life_path_number)

    return {
        "gender": resolved,
        "birth_date": birth_date or None,
        "life_path": life_path_block,
        "count": len(suggestions),
        "names": suggestions,
    }
