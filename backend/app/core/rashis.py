"""Rashi (Zodiac Sign) definitions and properties for Vedic Astrology."""

from typing import Optional

# Rashi names (0-indexed: Aries=0)
RASHI_NAMES = {
    0: {"en": "Aries", "hi": "मेष", "lord": "Mars", "symbol": "Ram"},
    1: {"en": "Taurus", "hi": "वृषभ", "lord": "Venus", "symbol": "Bull"},
    2: {"en": "Gemini", "hi": "मिथुन", "lord": "Mercury", "symbol": "Twins"},
    3: {"en": "Cancer", "hi": "कर्क", "lord": "Moon", "symbol": "Crab"},
    4: {"en": "Leo", "hi": "सिंह", "lord": "Sun", "symbol": "Lion"},
    5: {"en": "Virgo", "hi": "कन्या", "lord": "Mercury", "symbol": "Virgin"},
    6: {"en": "Libra", "hi": "तुला", "lord": "Venus", "symbol": "Scales"},
    7: {"en": "Scorpio", "hi": "वृश्चिक", "lord": "Mars", "symbol": "Scorpion"},
    8: {"en": "Sagittarius", "hi": "धनु", "lord": "Jupiter", "symbol": "Archer"},
    9: {"en": "Capricorn", "hi": "मकर", "lord": "Saturn", "symbol": "Goat"},
    10: {"en": "Aquarius", "hi": "कुम्भ", "lord": "Saturn", "symbol": "Water Bearer"},
    11: {"en": "Pisces", "hi": "मीन", "lord": "Jupiter", "symbol": "Fish"},
}

# Elements
ELEMENTS = {
    0: "Fire",    # Aries
    1: "Earth",   # Taurus
    2: "Air",     # Gemini
    3: "Water",   # Cancer
    4: "Fire",    # Leo
    5: "Earth",   # Virgo
    6: "Air",     # Libra
    7: "Water",   # Scorpio
    8: "Fire",    # Sagittarius
    9: "Earth",   # Capricorn
    10: "Air",    # Aquarius
    11: "Water",  # Pisces
}

# Quality (Modality)
QUALITIES = {
    0: "Cardinal",   # Aries
    1: "Fixed",      # Taurus
    2: "Mutable",    # Gemini
    3: "Cardinal",   # Cancer
    4: "Fixed",      # Leo
    5: "Mutable",    # Virgo
    6: "Cardinal",   # Libra
    7: "Fixed",      # Scorpio
    8: "Mutable",    # Sagittarius
    9: "Cardinal",   # Capricorn
    10: "Fixed",     # Aquarius
    11: "Mutable",   # Pisces
}

# Gender
GENDERS = {
    0: "Male",     # Aries
    1: "Female",   # Taurus
    2: "Male",     # Gemini
    3: "Female",   # Cancer
    4: "Male",     # Leo
    5: "Female",   # Virgo
    6: "Male",     # Libra
    7: "Female",   # Scorpio
    8: "Male",     # Sagittarius
    9: "Female",   # Capricorn
    10: "Male",    # Aquarius
    11: "Female",  # Pisces
}

# Natural house relationships (Mars rules 1st/8th, Venus rules 2nd/7th, etc.)
NATURAL_HOUSES = {
    "Mars": [0, 7],       # 1st and 8th signs
    "Venus": [1, 6],      # 2nd and 7th signs
    "Mercury": [2, 5],    # 3rd and 6th signs
    "Moon": [3],           # 4th sign (Cancer)
    "Sun": [4],            # 5th sign (Leo)
    "Jupiter": [8, 11],   # 9th and 12th signs
    "Saturn": [9, 10],    # 10th and 11th signs
}


def get_rashi_name(sign_index: int, lang: str = "en") -> str:
    """Get rashi name by index (0-11)."""
    if sign_index not in RASHI_NAMES:
        raise ValueError(f"Invalid sign index: {sign_index}")
    return RASHI_NAMES[sign_index][lang]


def get_rashi_lord(sign_index: int) -> str:
    """Get ruling planet of a rashi."""
    if sign_index not in RASHI_NAMES:
        raise ValueError(f"Invalid sign index: {sign_index}")
    return RASHI_NAMES[sign_index]["lord"]


def get_element(sign_index: int) -> str:
    """Get element of a rashi."""
    return ELEMENTS.get(sign_index, "Unknown")


def get_quality(sign_index: int) -> str:
    """Get quality (modality) of a rashi."""
    return QUALITIES.get(sign_index, "Unknown")


def get_gender(sign_index: int) -> str:
    """Get gender of a rashi."""
    return GENDERS.get(sign_index, "Unknown")


def get_compatible_signs(sign_index: int) -> list[int]:
    """Get compatible signs (trines: 1-5-9, squares: 1-4-7-10)."""
    # Trine compatibility (120 degrees apart)
    trine_1 = sign_index
    trine_2 = (sign_index + 4) % 12
    trine_3 = (sign_index + 8) % 12
    return [trine_1, trine_2, trine_3]


def get_incompatible_signs(sign_index: int) -> list[int]:
    """Get incompatible signs (squares: 90 degrees apart)."""
    return [(sign_index + 3) % 12, (sign_index + 6) % 12, (sign_index + 9) % 12]


def get_enemy_signs(sign_index: int) -> list[int]:
    """Get enemy signs based on Vedic astrology relationships."""
    enemies = {
        0: [6, 7],    # Aries enemies: Libra, Scorpio
        1: [3, 4],    # Taurus enemies: Cancer, Leo
        2: [8, 9],    # Gemini enemies: Sagittarius, Capricorn
        3: [1, 10],   # Cancer enemies: Taurus, Aquarius
        4: [1, 2],    # Leo enemies: Taurus, Gemini
        5: [8, 11],   # Virgo enemies: Sagittarius, Pisces
        6: [0, 4],    # Libra enemies: Aries, Leo
        7: [1, 11],   # Scorpio enemies: Taurus, Pisces
        8: [2, 5],    # Sagittarius enemies: Gemini, Virgo
        9: [3, 6],    # Capricorn enemies: Cancer, Libra
        10: [3, 5],   # Aquarius enemies: Cancer, Virgo
        11: [6, 7],   # Pisces enemies: Libra, Scorpio
    }
    return enemies.get(sign_index, [])


def get_sign_from_longitude(longitude: float) -> dict:
    """Get sign details from ecliptic longitude."""
    sign_index = int(longitude / 30)
    sign_degree = longitude % 30
    return {
        "sign": sign_index,
        "sign_name": get_rashi_name(sign_index),
        "sign_name_hi": get_rashi_name(sign_index, "hi"),
        "degree": sign_degree,
        "lord": get_rashi_lord(sign_index),
        "element": get_element(sign_index),
        "quality": get_quality(sign_index),
    }
