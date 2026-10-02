"""Kundli supplementary blocks (AstroSage parity): Avakahada Chakra,
birth-moment Panchang, Ghatak (deferred — no verifiable table), Ishta Devata,
Chara Karakas, Avastha, natural friendship table, Julian Day.
"""

# Yoni animal per nakshatra index (0=Ashwini). Classical table.
YONI = [
    "Horse (male)", "Elephant (male)", "Goat (female)", "Serpent (male)",
    "Serpent (female)", "Dog (female)", "Cat (female)", "Goat (male)",
    "Cat (male)", "Rat (male)", "Rat (female)", "Cow (male)",
    "Buffalo (female)", "Tiger (female)", "Buffalo (male)", "Tiger (male)",
    "Deer (female)", "Deer (male)", "Dog (male)", "Monkey (male)",
    "Mongoose (male)", "Monkey (female)", "Lion (female)", "Horse (female)",
    "Lion (male)", "Cow (female)", "Elephant (female)",
]

# Gana per nakshatra index: Deva (divine), Manushya (human), Rakshasa (demonic).
GANA = [
    "Deva", "Manushya", "Rakshasa", "Manushya", "Deva", "Manushya", "Deva",
    "Deva", "Rakshasa", "Rakshasa", "Manushya", "Manushya", "Deva",
    "Rakshasa", "Deva", "Rakshasa", "Deva", "Rakshasa", "Rakshasa",
    "Manushya", "Manushya", "Deva", "Rakshasa", "Rakshasa", "Manushya",
    "Manushya", "Deva",
]

# Varna by Moon sign (same map as Ashtakoota Varna koota).
VARNA_BY_SIGN = {
    0: "Kshatriya", 1: "Vaishya", 2: "Shudra", 3: "Brahmin", 4: "Kshatriya",
    5: "Vaishya", 6: "Shudra", 7: "Brahmin", 8: "Kshatriya", 9: "Vaishya",
    10: "Shudra", 11: "Brahmin",
}

NADI_MAP = [
    "Adi", "Madhya", "Antya", "Adi", "Madhya", "Antya", "Adi",
    "Madhya", "Antya", "Antya", "Adi", "Madhya", "Antya", "Adi",
    "Madhya", "Antya", "Adi", "Madhya", "Antya", "Adi", "Madhya",
    "Madhya", "Antya", "Adi", "Madhya", "Antya", "Adi",
]

# Ishta Devata by Atmakaraka planet.
ISHTA_DEVATA = {
    "Sun": "Lord Shiva",
    "Moon": "Goddess Parvati",
    "Mars": "Lord Hanuman",
    "Mercury": "Lord Ganesha",
    "Jupiter": "Lord Vishnu",
    "Venus": "Goddess Lakshmi",
    "Saturn": "Lord Shiva",
}

KARAKA_ROLES = ["Atmakaraka", "Amatyakaraka", "Bhratrukaraka", "Matrukaraka",
                "Putrakaraka", "Gnatikaraka", "Darakaraka"]

# Natural friendships (Parasari).
FRIENDSHIPS = {
    "Sun": {"friends": ["Moon", "Mars", "Jupiter"], "enemies": ["Venus", "Saturn"], "neutral": ["Mercury"]},
    "Moon": {"friends": ["Sun", "Mercury"], "enemies": [], "neutral": ["Mars", "Jupiter", "Venus", "Saturn"]},
    "Mars": {"friends": ["Sun", "Moon", "Jupiter"], "enemies": ["Mercury"], "neutral": ["Venus", "Saturn"]},
    "Mercury": {"friends": ["Sun", "Venus"], "enemies": ["Moon"], "neutral": ["Mars", "Jupiter", "Saturn"]},
    "Jupiter": {"friends": ["Sun", "Moon", "Mars"], "enemies": ["Mercury", "Venus"], "neutral": ["Saturn"]},
    "Venus": {"friends": ["Mercury", "Saturn"], "enemies": ["Sun", "Moon"], "neutral": ["Mars", "Jupiter"]},
    "Saturn": {"friends": ["Mercury", "Venus"], "enemies": ["Sun", "Moon", "Mars"], "neutral": ["Jupiter"]},
}


def avastha_of(sign: int, sign_degree: float) -> str:
    """Planetary childhood→old-age state by in-sign degree."""
    stages = ["Bala (infant)", "Kumara (youth)", "Yuva (adult)",
              "Vriddha (aged)", "Mrita (old)"]
    idx = min(int(sign_degree / 6.0), 4)
    # Even signs mirror the progression.
    if sign % 2 == 1:
        idx = 4 - idx
    return stages[idx]


SEVEN_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]


def chara_karakas(planets: list) -> list:
    """Chara Karakas by descending in-sign degree (seven planets only)."""
    cands = sorted(
        (p for p in planets if p.get("planet") in SEVEN_PLANETS
         and p.get("sign_degree") is not None),
        key=lambda p: float(p["sign_degree"]),
        reverse=True,
    )
    return [{"role": role, "planet": p["planet"]}
            for role, p in zip(KARAKA_ROLES, cands, strict=False)]


def ishta_devata(planets: list) -> dict:
    """Ishta Devata from Atmakaraka (highest-degree planet excl. nodes/outer)."""
    cands = sorted(
        (p for p in planets if p.get("planet") in SEVEN_PLANETS
         and p.get("sign_degree") is not None),
        key=lambda p: float(p["sign_degree"]),
        reverse=True,
    )
    if not cands:
        return {"planet": None, "deity": None}
    atma = cands[0]["planet"]
    return {"planet": atma, "deity": ISHTA_DEVATA.get(atma, "Lord Vishnu")}


def julian_day(year: int, month: int, day: int, hour_utc: float = 12.0) -> float:
    """Julian Day number (Meeus algorithm)."""
    if month <= 2:
        year -= 1
        month += 12
    a = year // 100
    b = 2 - a + a // 4
    jd = (int(365.25 * (year + 4716)) + int(30.6001 * (month + 1))
          + day + b - 1524.5 + hour_utc / 24.0)
    return round(jd, 4)


def build_avakahada(moon_sign: int, moon_nakshatra_index: int, moon_pada: int,
                    asc_sign: int, rashi_lord: str, asc_lord: str,
                    star_lord: str) -> dict:
    """Avakahada Chakra packet (Rasi/Nakshatra-pada/lords/Varna/Yoni/Gana/Nadi)."""
    return {
        "rasi": ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                 "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius",
                 "Pisces"][moon_sign],
        "nakshatra_pada": moon_pada,
        "rasi_lord": rashi_lord,
        "asc_lord": asc_lord,
        "star_lord": star_lord,
        "varna": VARNA_BY_SIGN.get(moon_sign, "Unknown"),
        "yoni": YONI[moon_nakshatra_index] if 0 <= moon_nakshatra_index < 27 else "Unknown",
        "gana": GANA[moon_nakshatra_index] if 0 <= moon_nakshatra_index < 27 else "Unknown",
        "nadi": NADI_MAP[moon_nakshatra_index] if 0 <= moon_nakshatra_index < 27 else "Unknown",
    }
