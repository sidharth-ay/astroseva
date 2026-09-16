"""Nakshatra (Lunar Mansion) definitions and properties."""

from typing import Optional

# 27 Nakshatras with their details
NAKSHATRAS = {
    0: {
        "name": "Ashwini",
        "name_hi": "अश्विनी",
        "lord": "Ketu",
        "symbol": "Horse's Head",
        "nature": "Deva",
        "start": 0.0,
        "end": 13.333,
    },
    1: {
        "name": "Bharani",
        "name_hi": "भरणी",
        "lord": "Venus",
        "symbol": "Yoni",
        "nature": "Manushya",
        "start": 13.333,
        "end": 26.666,
    },
    2: {
        "name": "Krittika",
        "name_hi": "कृत्तिका",
        "lord": "Sun",
        "symbol": "Razor",
        "nature": "Rakshasa",
        "start": 26.666,
        "end": 40.0,
    },
    3: {
        "name": "Rohini",
        "name_hi": "रोहिणी",
        "lord": "Moon",
        "symbol": "Chariot",
        "nature": "Manushya",
        "start": 40.0,
        "end": 53.333,
    },
    4: {
        "name": "Mrigashira",
        "name_hi": "मृगशिरा",
        "lord": "Mars",
        "symbol": "Deer's Head",
        "nature": "Deva",
        "start": 53.333,
        "end": 66.666,
    },
    5: {
        "name": "Ardra",
        "name_hi": "आर्द्रा",
        "lord": "Rahu",
        "symbol": "Teardrop",
        "nature": "Manushya",
        "start": 66.666,
        "end": 80.0,
    },
    6: {
        "name": "Punarvasu",
        "name_hi": "पुनर्वसु",
        "lord": "Jupiter",
        "symbol": "Bow and Quiver",
        "nature": "Deva",
        "start": 80.0,
        "end": 93.333,
    },
    7: {
        "name": "Pushya",
        "name_hi": "पुष्य",
        "lord": "Saturn",
        "symbol": "Lotus",
        "nature": "Deva",
        "start": 93.333,
        "end": 106.666,
    },
    8: {
        "name": "Ashlesha",
        "name_hi": "आश्लेषा",
        "lord": "Mercury",
        "symbol": "Serpent",
        "nature": "Rakshasa",
        "start": 106.666,
        "end": 120.0,
    },
    9: {
        "name": "Magha",
        "name_hi": "मघा",
        "lord": "Ketu",
        "symbol": "Throne",
        "nature": "Rakshasa",
        "start": 120.0,
        "end": 133.333,
    },
    10: {
        "name": "Purva Phalguni",
        "name_hi": "पूर्व फाल्गुनी",
        "lord": "Venus",
        "symbol": "Hammock",
        "nature": "Manushya",
        "start": 133.333,
        "end": 146.666,
    },
    11: {
        "name": "Uttara Phalguni",
        "name_hi": "उत्तर फाल्गुनी",
        "lord": "Sun",
        "symbol": "Bed",
        "nature": "Manushya",
        "start": 146.666,
        "end": 160.0,
    },
    12: {
        "name": "Hasta",
        "name_hi": "हस्त",
        "lord": "Moon",
        "symbol": "Hand",
        "nature": "Deva",
        "start": 160.0,
        "end": 173.333,
    },
    13: {
        "name": "Chitra",
        "name_hi": "चित्रा",
        "lord": "Mars",
        "symbol": "Pearl",
        "nature": "Rakshasa",
        "start": 173.333,
        "end": 186.666,
    },
    14: {
        "name": "Swati",
        "name_hi": "स्वाति",
        "lord": "Rahu",
        "symbol": "Coral",
        "nature": "Deva",
        "start": 186.666,
        "end": 200.0,
    },
    15: {
        "name": "Vishakha",
        "name_hi": "विशाखा",
        "lord": "Jupiter",
        "symbol": "Archway",
        "nature": "Rakshasa",
        "start": 200.0,
        "end": 213.333,
    },
    16: {
        "name": "Anuradha",
        "name_hi": "अनुराधा",
        "lord": "Saturn",
        "symbol": "Lotus",
        "nature": "Deva",
        "start": 213.333,
        "end": 226.666,
    },
    17: {
        "name": "Jyeshtha",
        "name_hi": "ज्येष्ठा",
        "lord": "Mercury",
        "symbol": "Earring",
        "nature": "Rakshasa",
        "start": 226.666,
        "end": 240.0,
    },
    18: {
        "name": "Mula",
        "name_hi": "मूल",
        "lord": "Ketu",
        "symbol": "Tied Bunch",
        "nature": "Rakshasa",
        "start": 240.0,
        "end": 253.333,
    },
    19: {
        "name": "Purva Ashadha",
        "name_hi": "पूर्वाषाढ़ा",
        "lord": "Venus",
        "symbol": "Elephant Tusk",
        "nature": "Manushya",
        "start": 253.333,
        "end": 266.666,
    },
    20: {
        "name": "Uttara Ashadha",
        "name_hi": "उत्तराषाढ़ा",
        "lord": "Sun",
        "symbol": "Elephant Tusk",
        "nature": "Manushya",
        "start": 266.666,
        "end": 280.0,
    },
    21: {
        "name": "Shravana",
        "name_hi": "श्रवण",
        "lord": "Moon",
        "symbol": "Ear",
        "nature": "Deva",
        "start": 280.0,
        "end": 293.333,
    },
    22: {
        "name": "Dhanishta",
        "name_hi": "धनिष्ठा",
        "lord": "Mars",
        "symbol": "Drum",
        "nature": "Rakshasa",
        "start": 293.333,
        "end": 306.666,
    },
    23: {
        "name": "Shatabhisha",
        "name_hi": "शतभिषा",
        "lord": "Rahu",
        "symbol": "Circle",
        "nature": "Rakshasa",
        "start": 306.666,
        "end": 320.0,
    },
    24: {
        "name": "Purva Bhadrapada",
        "name_hi": "पूर्व भाद्रपदा",
        "lord": "Jupiter",
        "symbol": "Sword",
        "nature": "Manushya",
        "start": 320.0,
        "end": 333.333,
    },
    25: {
        "name": "Uttara Bhadrapada",
        "name_hi": "उत्तर भाद्रपदा",
        "lord": "Saturn",
        "symbol": "Twin",
        "nature": "Manushya",
        "start": 333.333,
        "end": 346.666,
    },
    26: {
        "name": "Revati",
        "name_hi": "रेवती",
        "lord": "Mercury",
        "symbol": "Fish",
        "nature": "Deva",
        "start": 346.666,
        "end": 360.0,
    },
}

# Nakshatra pada (quarter) size
NAKSHATRA_PADA_SIZE = 360 / (27 * 4)  # ~3.333 degrees

# Vishakha tree (for matching)
VISHAKHA_TREES = {
    0: "Palash", 1: "Banyan", 2: "Peepal", 3: "Neem",
    4: "Mango", 5: "Banana", 6: "Coconut", 7: "Jamun",
    8: "Gular", 9: "Shisham", 10: "Kadamb", 11: "Bilva",
    12: "Apamarg", 13: "Dhav", 14: "Kutaja", 15: "Karanja",
    16: "Banyan", 17: "Peepal", 18: "Shami", 19: "Arjun",
    20: "Khadira", 21: "Bilva", 22: "Shyonak", 23: "Banyan",
    24: "Peepal", 25: "Mango", 26: "Jamun",
}


def get_nakshatra_from_longitude(longitude: float) -> dict:
    """Get nakshatra details from ecliptic longitude."""
    longitude = longitude % 360
    nakshatra_index = int(longitude / (360 / 27))
    nakshatra = NAKSHATRAS[nakshatra_index]

    # Calculate pada (quarter)
    pada_index = int((longitude - nakshatra["start"]) / NAKSHATRA_PADA_SIZE) + 1
    pada_index = min(pada_index, 4)

    return {
        "index": nakshatra_index,
        "name": nakshatra["name"],
        "name_hi": nakshatra["name_hi"],
        "lord": nakshatra["lord"],
        "symbol": nakshatra["symbol"],
        "nature": nakshatra["nature"],
        "pada": pada_index,
    }


def get_nakshatra_lord(nakshatra_index: int) -> str:
    """Get the ruling planet of a nakshatra."""
    if nakshatra_index not in NAKSHATRAS:
        raise ValueError(f"Invalid nakshatra index: {nakshatra_index}")
    return NAKSHATRAS[nakshatra_index]["lord"]


def get_nakshatra_by_name(name: str) -> Optional[dict]:
    """Get nakshatra details by name."""
    for index, nak in NAKSHATRAS.items():
        if nak["name"].lower() == name.lower():
            return {"index": index, **nak}
    return None


def get_all_nakshatras() -> list[dict]:
    """Get all nakshatras with their details."""
    return [{"index": i, **n} for i, n in NAKSHATRAS.items()]
