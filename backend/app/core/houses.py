"""House (Bhava) system and calculations for Vedic Astrology."""

from typing import Optional

# House names
HOUSE_NAMES = {
    1: {"en": "Lagna/Ascendant", "hi": "लग्न", "keywords": ["self", "personality", "appearance", "health"]},
    2: {"en": "Dhana", "hi": "धन", "keywords": ["wealth", "family", "speech", "food"]},
    3: {"en": "Sahaja", "hi": "सहज", "keywords": ["siblings", "courage", "communication", "short travels"]},
    4: {"en": "Sukha", "hi": "सुख", "keywords": ["mother", "happiness", "property", "vehicles"]},
    5: {"en": "Putra", "hi": "पुत्र", "keywords": ["children", "creativity", "education", "romance"]},
    6: {"en": "Ripu", "hi": "रिपु", "keywords": ["enemies", "disease", "debts", "service"]},
    7: {"en": "Kalatra", "hi": "कलत्र", "keywords": ["marriage", "partner", "business", "trade"]},
    8: {"en": "Ayur", "hi": "आयु", "keywords": ["longevity", "transformation", "occult", "inheritance"]},
    9: {"en": "Dharma", "hi": "धर्म", "keywords": ["fortune", "father", "religion", "long travels"]},
    10: {"en": "Karma", "hi": "कर्म", "keywords": ["career", "authority", "reputation", "government"]},
    11: {"en": "Labha", "hi": "लाभ", "keywords": ["gains", "income", "friends", "aspirations"]},
    12: {"en": "Vyaya", "hi": "व्यय", "keywords": ["losses", "expenses", "foreign lands", "liberation"]},
}

# Natural house lords (who naturally rules each house)
NATURAL_HOUSE_LORDS = {
    1: "Mars",    # Aries
    2: "Venus",   # Taurus
    3: "Mercury", # Gemini
    4: "Moon",    # Cancer
    5: "Sun",     # Leo
    6: "Mercury", # Virgo
    7: "Venus",   # Libra
    8: "Mars",    # Scorpio
    9: "Jupiter", # Sagittarius
    10: "Saturn", # Capricorn
    11: "Saturn", # Aquarius
    12: "Jupiter",# Pisces
}

# Benefic and malefic for each house
HOUSE_NATURE = {
    1: {"benefic": ["Jupiter", "Venus", "Mercury", "Moon"], "malefic": ["Mars", "Saturn", "Sun", "Rahu", "Ketu"]},
    2: {"benefic": ["Venus", "Mercury", "Moon"], "malefic": ["Mars", "Saturn", "Sun", "Rahu", "Ketu"]},
    3: {"benefic": ["Mars", "Sun", "Jupiter"], "malefic": ["Venus", "Mercury", "Moon", "Saturn"]},
    4: {"benefic": ["Moon", "Venus", "Mercury"], "malefic": ["Saturn", "Mars", "Sun", "Rahu", "Ketu"]},
    5: {"benefic": ["Sun", "Jupiter", "Mars"], "malefic": ["Saturn", "Venus", "Mercury", "Rahu", "Ketu"]},
    6: {"benefic": ["Saturn", "Mars", "Sun"], "malefic": ["Jupiter", "Venus", "Moon", "Rahu", "Ketu"]},
    7: {"benefic": ["Venus", "Mercury", "Saturn"], "malefic": ["Mars", "Sun", "Jupiter", "Rahu", "Ketu"]},
    8: {"benefic": ["Saturn", "Mars"], "malefic": ["Jupiter", "Venus", "Mercury", "Moon", "Sun", "Rahu", "Ketu"]},
    9: {"benefic": ["Sun", "Jupiter", "Moon", "Mars"], "malefic": ["Saturn", "Mercury", "Venus", "Rahu", "Ketu"]},
    10: {"benefic": ["Saturn", "Sun", "Jupiter", "Mars"], "malefic": ["Moon", "Venus", "Mercury", "Rahu", "Ketu"]},
    11: {"benefic": ["Jupiter", "Venus", "Mercury", "Moon"], "malefic": ["Sun", "Mars", "Saturn", "Rahu", "Ketu"]},
    12: {"benefic": ["Saturn", "Venus", "Mercury"], "malefic": ["Sun", "Moon", "Mars", "Jupiter", "Rahu", "Ketu"]},
}

# Kundli chart sizes (for North Indian diamond chart)
CHART_SIZES = {
    "north_indian": 4,  # 4x4 diamond
    "south_indian": 4,  # 4x4 square
}


def get_house_name(house_number: int, lang: str = "en") -> str:
    """Get house name by number (1-12)."""
    if house_number not in HOUSE_NAMES:
        raise ValueError(f"Invalid house number: {house_number}")
    return HOUSE_NAMES[house_number][lang]


def get_house_keywords(house_number: int) -> list[str]:
    """Get keywords associated with a house."""
    if house_number not in HOUSE_NAMES:
        raise ValueError(f"Invalid house number: {house_number}")
    return HOUSE_NAMES[house_number]["keywords"]


def get_house_lord(house_number: int) -> str:
    """Get natural lord of a house."""
    if house_number not in NATURAL_HOUSE_LORDS:
        raise ValueError(f"Invalid house number: {house_number}")
    return NATURAL_HOUSE_LORDS[house_number]


def get_house_from_longitude(longitude: float, asc_longitude: float, house_system: str = "whole-sign") -> int:
    """Get house number from planet longitude and ascendant longitude.

    Default "whole-sign" follows the North-Indian Rasi-chart convention
    (same as AstroSage): house = signs counted from the Lagna sign.
    "equal" keeps the old Bhava-style 30-degree slices from Lagna longitude.
    """
    if house_system == "whole-sign":
        return (int(longitude / 30) - int(asc_longitude / 30)) % 12 + 1
    # Equal-house fallback (Bhava style)
    relative_long = (longitude - asc_longitude) % 360
    house = int(relative_long / 30) + 1
    if house > 12:
        house = 12
    return house


def get_planets_in_houses(planets: list[dict], asc_longitude: float) -> dict:
    """Assign planets to houses based on their longitudes."""
    houses = {i: [] for i in range(1, 13)}

    for planet in planets:
        house = get_house_from_longitude(planet["longitude"], asc_longitude)
        houses[house].append(planet["planet"])

    return houses


def get_kundli_chart(asc_longitude: float, planets: list[dict]) -> dict:
    """Generate a North Indian style Kundli chart."""
    asc_sign = int(asc_longitude / 30)

    # Initialize chart with signs
    chart = {}
    for i in range(12):
        sign = (asc_sign + i) % 12
        chart[i + 1] = {
            "sign": sign,
            "planets": [],
        }

    # Place planets in houses
    for planet in planets:
        house = get_house_from_longitude(planet["longitude"], asc_longitude)
        chart[house]["planets"].append(planet["planet"])

    return chart


def is_house_benefic(house_number: int, planet: str) -> bool:
    """Check if a planet is benefic for a specific house."""
    if house_number not in HOUSE_NATURE:
        return False
    return planet in HOUSE_NATURE[house_number]["benefic"]


def is_house_malefic(house_number: int, planet: str) -> bool:
    """Check if a planet is malefic for a specific house."""
    if house_number not in HOUSE_NATURE:
        return False
    return planet in HOUSE_NATURE[house_number]["malefic"]


def get_house_strength(house_number: int, planets: list[dict], asc_longitude: float) -> str:
    """Evaluate house strength based on occupants and aspects."""
    house_planets = []
    for planet in planets:
        house = get_house_from_longitude(planet["longitude"], asc_longitude)
        if house == house_number:
            house_planets.append(planet)

    benefic_count = sum(1 for p in house_planets if is_house_benefic(house_number, p["planet"]))
    malefic_count = sum(1 for p in house_planets if is_house_malefic(house_number, p["planet"]))

    if benefic_count > malefic_count:
        return "Strong"
    elif malefic_count > benefic_count:
        return "Weak"
    else:
        return "Neutral"
