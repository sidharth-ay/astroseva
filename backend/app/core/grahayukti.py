"""Grahayukti: planetary aspects, consideration factors, Ghatak and Somatilak.

All four are deterministic and derived from the birth chart only - no ephemeris
work. Kept separate from kundli_extras.py so each block can be unit-tested
against its published table.
"""

# Vedic aspects: every graha aspects the 7th from itself; special aspects are
# the 5th for Mars/Jupiter/Saturn and the 9th for Jupiter and Saturn.
# Index = separation in signs, 0 = conjunction (excluded from aspect lists).
ALL_ASPECTS = (7,)
PLANET_ASPECTS = {
    "Mars": (4, 7, 8),
    "Jupiter": (5, 7, 9),
    "Saturn": (3, 7, 10),
    "Sun": (7,),
    "Moon": (7,),
    "Mercury": (7,),
    "Venus": (7,),
    "Rahu": (7,),
    "Ketu": (7,),
}

ASPECT_NAMES = {
    3: "3rd (Drishti)", 4: "4th", 5: "5th", 7: "7th", 8: "8th", 9: "9th", 10: "10th",
}
ASPECT_NATURE = {
    3: "Malefic", 4: "Benefic", 5: "Benefic",
    7: "Malefic", 8: "Malefic", 9: "Benefic", 10: "Malefic",
}

# Combustion (Asta): a graha is combust when within its own angular limit of
# the Sun. Mercury and Venus are the outermost; the nodes are not combust.
COMBUST_DEGREES = {
    "Moon": 12,
    "Mars": 17,
    "Mercury": 14,
    "Jupiter": 11,
    "Venus": 10,
    "Saturn": 15,
}

# Pakshi / Karaka classification of the nine grahas.
PAKSHI_GRAHA = {
    "Sun": "Devata (god)", "Moon": "Devata (god)", "Mars": "Rakshasa (demon)",
    "Rahu": "Rakshasa (demon)", "Jupiter": "Devata (god)",
    "Saturn": "Rakshasa (demon)", "Mercury": "Devata (god)",
    "Ketu": "Rakshasa (demon)", "Venus": "Manushya (human)",
}

# 27 Ghatakas (Ayana Sphuta). Index 0 = 0 deg Aries.
# Format: (name, lord, benefic_for_ascendant_signs)
GHATAKA = [
    ("Ashtami", "Shani", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Anapadi", "Shani", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Yogini", "Ketu", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Gandharva", "Ketu", [2, 3, 4, 5]),
    ("Bhadra", "Shukra", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    ("Rakshasa", "Guru", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Virodha", "Shukra", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Mrityu", "Rahu", [2, 3, 4, 5]),
    ("Naga", "Budha", [2, 3, 4, 5]),
    ("Kala", "Shukra", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Labha", "Budha", [2, 3, 4, 5]),
    ("Chitra", "Budha", [2, 3, 4, 5]),
    ("Nirriti", "Surya", [2, 3, 4, 5]),
    ("Parigha", "Shani", [2, 3, 4, 5]),
    ("Vipreet", "Shani", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Vishkambha", "Shani", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Shoola", "Budha", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Aindra", "Budha", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Rukma", "Ketu", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Bhringraja", "Shani", [2, 3, 4, 5]),
    ("Pushkala", "Guru", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Yuvan", "Budha", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Shanku", "Shani", [2, 3, 4, 5]),
    ("Bahala", "Budha", [2, 3, 4, 5]),
    ("Chandala", "Shukra", [2, 3, 4, 5]),
    ("Vipula", "Guru", [0, 1, 6, 7, 8, 9, 10, 11]),
    ("Nala", "Budha", [0, 1, 6, 7, 8, 9, 10, 11]),
]
GHATAKA_STEP = 360 / 27  # 13.3333 deg

# Somatilak: 64 case-sensitive Sanskrit compounds over the zodiac.
SOMATILAK = [
    "Bhramarudha", "Indra", "Yama", "Varuna", "Vayu", "Agni", "Pushpaka", "Nilam",
    "Paramesvara", "Vishva", "Indrajaal", "Parada", "Ayana", "Dhruva", "Hala", "Chitra",
    "Vidhi", "Vidyut", "Raudra", "Chandala", "Vayavya", "Dharma", "Vidvara", "Raksha",
    "Nala", "Chandala", "Vipula", "Yuvan", "Vrischika", "Vrischika", "Mrig", "Mrig",
    "Chandrabala", "Rukma", "Vajra", "Shanku", "Chhaya", "Vishada", "Kala", "Vidhu",
    "Wrish", "Durgha", "Sumangala", "Nepala", "Amala", "Pushkala", "Shobhana", "Atmaja",
    "Sukarma", "Supunya", "Bhadra", "Ruchaka", "Shobhana", "Kala", "Nirriti", "Bhringraja",
    "Yuvan", "Vipreet", "Anala", "Punar", "Pushkala", "Yuvan", "Nala", "Pushkala",
]

NAKSHATRA_ORDER = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha",
    "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha",
    "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
    "Uttara Bhadrapada", "Revati",
]

PLANET_LORD = {
    0: "Mars", 1: "Venus", 2: "Mercury", 3: "Moon", 4: "Sun", 5: "Mercury",
    6: "Venus", 7: "Mars", 8: "Jupiter", 9: "Saturn", 10: "Saturn", 11: "Jupiter",
}


def _sign_from_longitude(longitude: float) -> int:
    return int(longitude % 360 // 30) % 12


def build_aspects(planets: list) -> dict:
    """All Vedic aspects between the nine grahas.

    Returns per-aspecting-graha lists and the grahas aspecting each sign.
    """
    nine = [p for p in planets if p.get("planet") in PLANET_ASPECTS]
    per_planet: dict[str, list] = {}
    on_sign: dict[int, list[str]] = {i: [] for i in range(12)}

    for source in nine:
        name = source["planet"]
        src_sign = source.get("sign")
        if src_sign is None:
            continue
        hits = []
        for sep in PLANET_ASPECTS[name]:
            # 1st house is the graha's own sign, so the Nth house is N-1 signs on.
            target_sign = (src_sign + sep - 1) % 12
            for other in nine:
                if other["planet"] == name or other.get("sign") is None:
                    continue
                if other["sign"] == target_sign:
                    hits.append({
                        "planet": other["planet"],
                        "aspect": f"{sep}th",
                        "aspect_index": sep,
                        "nature": ASPECT_NATURE.get(sep, "Neutral"),
                        "sign": target_sign,
                    })
        if hits:
            per_planet[name] = sorted(hits, key=lambda h: h["planet"])
            for h in hits:
                on_sign[h["sign"]].append(name)

    return {
        "by_planet": per_planet,
        "on_sign": {str(k): v for k, v in on_sign.items() if v},
    }


def build_consideration(planets: list) -> list:
    """Planets Consideration: pakshi, combust, and dignity per graha."""
    by_name = {p.get("planet"): p for p in planets}
    sun_lon = None
    sun = by_name.get("Sun")
    if sun and sun.get("longitude") is not None:
        sun_lon = float(sun["longitude"]) % 360

    rows = []
    for name in ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus",
                 "Saturn", "Rahu", "Ketu"):
        p = by_name.get(name)
        if not p:
            continue
        row = {
            "planet": name,
            "pakshi": PAKSHI_GRAHA[name],
            "sign": p.get("sign"),
            "sign_degree": p.get("sign_degree"),
            "dignity": p.get("dignity"),
            "combust": False,
            "combust_note": None,
        }
        if name != "Sun" and name in COMBUST_DEGREES and sun_lon is not None:
            lon = float(p["longitude"]) % 360
            # Angular separation, not the signed difference: a graha is
            # combust only when it is within its own limit of the Sun.
            diff = abs(sun_lon - lon)
            diff = min(diff, 360 - diff)
            limit = COMBUST_DEGREES[name]
            if diff <= limit:
                row["combust"] = True
                row["combust_note"] = f"{diff:.1f}° from the Sun (limit {limit}°)"
        if name == "Sun":
            row["pakshi_note"] = "Luminous; not combust"
        rows.append(row)
    return rows


def build_ghatak(ascendant: float) -> dict:
    """27 Ghataka (Ayana Sphuta) points, with the benefic ones for this chart.

    The Ghatakas partition the zodiac into 27 equal 13°20' divisions. Only
    the single division containing the ascendant degree is "applied"; the rest
    are listed with a benefic/malefic verdict for this ascendant sign so the
    table can be shown in full the way AstroSage does.
    """
    lon = ascendant % 360
    asc_sign = _sign_from_longitude(lon)
    results = []
    for i, (name, lord, benefic_signs) in enumerate(GHATAKA):
        start = i * GHATAKA_STEP
        # Each Ghataka spans one third of a sign, so wrap 360 -> 0 for the tail.
        end = start + GHATAKA_STEP
        applied = (start <= lon < end) if end <= 360 else (
            lon >= start or lon < end - 360
        )
        results.append({
            "index": i,
            "name": name,
            "lord": lord,
            "longitude": round(start % 360, 4),
            "sign": int(start // 30) % 12,
            "deg_in_sign": round(start % 30, 4),
            "benefic_for_ascendant": asc_sign in benefic_signs,
            "applied": applied,
        })
    return {
        "ascendant": round(lon, 4),
        "asc_sign": asc_sign,
        "ascendant_ghatak": [r for r in results if r["applied"]],
        "benefic_count": sum(1 for r in results
                             if r["applied"] and r["benefic_for_ascendant"]),
        "all": results,
    }


def build_somatilak(asc_sign: int) -> dict:
    """The 64 Somatilak case-sensitive compounds; the 1st governs the ascendant."""
    return {
        "asc_sign": asc_sign,
        "somatilak": SOMATILAK[asc_sign],
        "lord": PLANET_LORD[asc_sign],
        "nakshatra": NAKSHATRA_ORDER[
            min(int((asc_sign * 30) / (360 / 27)), 26)
        ],
    }
