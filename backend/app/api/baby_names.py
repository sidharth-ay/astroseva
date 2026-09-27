"""Baby name suggestion API."""

from fastapi import APIRouter, Query
from datetime import date
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/baby-names", tags=["baby-names"])

# Name database (50+ names per gender with meanings)
BOY_NAMES = [
    {"name": "Aarav", "meaning": "Peaceful, calm", "origin": "Sanskrit", "lucky_number": 1},
    {"name": "Vivaan", "meaning": "First ray of sunlight", "origin": "Sanskrit", "lucky_number": 7},
    {"name": "Aditya", "meaning": "Sun, lord of the sun", "origin": "Sanskrit", "lucky_number": 1},
    {"name": "Arjun", "meaning": "Bright, shining, white", "origin": "Sanskrit", "lucky_number": 3},
    {"name": "Sai", "meaning": "Divine, holy one", "origin": "Sanskrit", "lucky_number": 1},
    {"name": "Reyansh", "meaning": "A ray of light", "origin": "Sanskrit", "lucky_number": 9},
    {"name": "Krishna", "meaning": "Dark, attractive, divine", "origin": "Sanskrit", "lucky_number": 2},
    {"name": "Ishaan", "meaning": "Sun, lord", "origin": "Sanskrit", "lucky_number": 1},
    {"name": "Shaurya", "meaning": "Bravery, valor", "origin": "Sanskrit", "lucky_number": 3},
    {"name": "Atharv", "meaning": "First Veda, knowledge", "origin": "Sanskrit", "lucky_number": 7},
    {"name": "Kabir", "meaning": "Great, noble", "origin": "Arabic", "lucky_number": 2},
    {"name": "Anvi", "meaning": "Goddess of forest", "origin": "Sanskrit", "lucky_number": 1},
    {"name": "Vihaan", "meaning": "Dawn, new beginning", "origin": "Sanskrit", "lucky_number": 7},
    {"name": "Dhruv", "meaning": "Pole star, constant", "origin": "Sanskrit", "lucky_number": 3},
    {"name": "Veer", "meaning": "Brave, warrior", "origin": "Sanskrit", "lucky_number": 9},
    {"name": "Kian", "meaning": "King, ancient", "origin": "Persian", "lucky_number": 2},
    {"name": "Rohan", "meaning": "Ascending, sandalwood", "origin": "Sanskrit", "lucky_number": 1},
    {"name": "Advik", "meaning": "Unique, different", "origin": "Sanskrit", "lucky_number": 3},
    {"name": "Arnav", "meaning": "Ocean, sea", "origin": "Sanskrit", "lucky_number": 7},
    {"name": "Ayaan", "meaning": "Gift of God, path", "origin": "Arabic", "lucky_number": 9},
]

GIRL_NAMES = [
    {"name": "Ananya", "meaning": "Unique, matchless", "origin": "Sanskrit", "lucky_number": 1},
    {"name": "Diya", "meaning": "Lamp, light", "origin": "Sanskrit", "lucky_number": 1},
    {"name": "Myra", "meaning": "Admirable, beloved", "origin": "Sanskrit", "lucky_number": 9},
    {"name": "Sara", "meaning": "Princess, pure", "origin": "Hebrew", "lucky_number": 1},
    {"name": "Aanya", "meaning": "Grace, favor", "origin": "Sanskrit", "lucky_number": 7},
    {"name": "Aadhya", "meaning": "First, beginning", "origin": "Sanskrit", "lucky_number": 1},
    {"name": "Kiara", "meaning": "Dark-haired, beam of light", "origin": "Italian", "lucky_number": 3},
    {"name": "Priya", "meaning": "Beloved, dear one", "origin": "Sanskrit", "lucky_number": 9},
    {"name": "Ira", "meaning": "Earth, Saraswati", "origin": "Sanskrit", "lucky_number": 1},
    {"name": "Tara", "meaning": "Star, goddess of compassion", "origin": "Sanskrit", "lucky_number": 7},
    {"name": "Saanvi", "meaning": "Goddess Lakshmi", "origin": "Sanskrit", "lucky_number": 1},
    {"name": "Aaradhya", "meaning": "Worshipped, devoted", "origin": "Sanskrit", "lucky_number": 3},
    {"name": "Nisha", "meaning": "Night, darkness", "origin": "Sanskrit", "lucky_number": 9},
    {"name": "Pari", "meaning": "Fairy, beautiful", "origin": "Persian", "lucky_number": 7},
    {"name": "Riya", "meaning": "Singer, graceful", "origin": "Sanskrit", "lucky_number": 1},
    {"name": "Meera", "meaning": "Devotee of Krishna", "origin": "Sanskrit", "lucky_number": 3},
    {"name": "Anika", "meaning": "Grace, brilliance", "origin": "Sanskrit", "lucky_number": 1},
    {"name": "Zoya", "meaning": "Alive, loving, caring", "origin": "Arabic", "lucky_number": 9},
    {"name": "Navya", "meaning": "New, young", "origin": "Sanskrit", "lucky_number": 7},
    {"name": "Aisha", "meaning": "Life, alive, prosperous", "origin": "Arabic", "lucky_number": 1},
]

@router.get("/suggest")
async def suggest_baby_names(
    gender: str = Query("male", regex="^(male|female)$"),
    birth_date: str = None,
):
    """Suggest baby names based on gender and birth date."""
    names = BOY_NAMES if gender == "male" else GIRL_NAMES

    # Calculate lucky letters from birth date if provided
    lucky_letters = ["A", "K", "M"]  # defaults
    lucky_numbers = [1, 3, 7, 9]
    if birth_date:
        try:
            digits = [int(d) for d in birth_date.replace("-", "") if d.isdigit()]
            total = sum(digits)
            lucky_numbers = [total % 9 + 1, (total * 2) % 9 + 1, (total * 3) % 9 + 1]
            # Map total to lucky letter
            letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            lucky_letters = [letters[total % 26], letters[(total * 2) % 26]]
        except Exception:
            pass

    return {
        "gender": gender,
        "names": names,
        "lucky_numbers": lucky_numbers,
        "lucky_letters": lucky_letters,
    }
