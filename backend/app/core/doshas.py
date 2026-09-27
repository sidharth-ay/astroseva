"""Dosha (Affliction) detection in Vedic Astrology."""

from typing import Optional

# Manglik Dosha detection rules
MANGLIK_RULES = {
    "Mars_in_1": {"house": 1, "severity": "High", "description": "Mars in Ascendant"},
    "Mars_in_2": {"house": 2, "severity": "Medium", "description": "Mars in 2nd House"},
    "Mars_in_4": {"house": 4, "severity": "High", "description": "Mars in 4th House"},
    "Mars_in_7": {"house": 7, "severity": "High", "description": "Mars in 7th House"},
    "Mars_in_8": {"house": 8, "severity": "High", "description": "Mars in 8th House"},
    "Mars_in_12": {"house": 12, "severity": "Medium", "description": "Mars in 12th House"},
}


def detect_manglik(planets: list[dict], asc_sign: int) -> dict:
    """Detect Manglik Dosha (Mars affliction)."""
    manglik_positions = []

    for planet in planets:
        if planet.get("planet") == "Mars":
            house = planet.get("house", 0)
            if house in [1, 2, 4, 7, 8, 12]:
                rule = MANGLIK_RULES.get(f"Mars_in_{house}")
                if rule:
                    manglik_positions.append({
                        "house": house,
                        "severity": rule["severity"],
                        "description": rule["description"],
                    })

    # Check for cancellation (Vashya, same sign, etc.)
    cancellation = False
    cancellation_reason = None

    # Check if Mars is in same sign for both (for matching)
    # Check if Mars is exalted or in own sign
    for planet in planets:
        if planet.get("planet") == "Mars":
            if planet.get("dignity") == "Exalted":
                cancellation = True
                cancellation_reason = "Mars is exalted - reduces Manglik effect"
            elif planet.get("is_own_sign"):
                cancellation = True
                cancellation_reason = "Mars is in own sign - reduces Manglik effect"

    is_manglik = len(manglik_positions) > 0 and not cancellation

    if not is_manglik:
        severity = "None"
    elif any(p["severity"] == "High" for p in manglik_positions):
        severity = "High"
    else:
        severity = "Medium"

    return {
        "is_manglik": is_manglik,
        "positions": manglik_positions,
        "severity": severity,
        "cancellation": cancellation,
        "cancellation_reason": cancellation_reason,
        "description": "Mars in 1st, 2nd, 4th, 7th, 8th, or 12th house causes Manglik Dosha" if is_manglik else "No Manglik Dosha detected",
    }


def detect_kaal_sarp(planets: list[dict]) -> dict:
    """Detect Kaal Sarp Dosha (Rahu-Ketu axis affliction)."""
    rahu_house = None
    ketu_house = None

    for planet in planets:
        if planet.get("planet") == "Rahu":
            rahu_house = planet.get("house", 0)
        elif planet.get("planet") == "Ketu":
            ketu_house = planet.get("house", 0)

    if rahu_house is None or ketu_house is None:
        return {
            "has_dosha": False,
            "rahu_house": rahu_house,
            "ketu_house": ketu_house,
            "planets_between": [],
            "planets_outside": [],
            "severity": "None",
            "description": "Rahu or Ketu position not found",
        }

    # Check if all other planets are between Rahu and Ketu
    # (one side of the axis)
    planets_between = []
    planets_outside = []

    for planet in planets:
        if planet.get("planet") in ["Rahu", "Ketu"]:
            continue
        if planet.get("planet") in ["Uranus", "Neptune", "Pluto"]:
            continue  # classical Kaal Sarp considers Sun-Saturn only

        planet_house = planet.get("house", 0)
        if rahu_house < ketu_house:
            if rahu_house <= planet_house <= ketu_house:
                planets_between.append(planet.get("planet"))
            else:
                planets_outside.append(planet.get("planet"))
        else:
            if ketu_house <= planet_house <= rahu_house:
                planets_between.append(planet.get("planet"))
            else:
                planets_outside.append(planet.get("planet"))

    has_dosha = len(planets_outside) == 0

    return {
        "has_dosha": has_dosha,
        "rahu_house": rahu_house,
        "ketu_house": ketu_house,
        "planets_between": planets_between,
        "planets_outside": planets_outside,
        "severity": "High" if has_dosha else "None",
        "description": "All planets between Rahu-Ketu axis" if has_dosha else "Planets on both sides of Rahu-Ketu axis",
    }


def detect_sade_sati(planets: list[dict], moon_sign: int) -> dict:
    """Detect Sade Sati (Saturn's 7.5-year transit over Moon sign)."""
    saturn_sign = None

    for planet in planets:
        if planet.get("planet") == "Saturn":
            saturn_sign = planet.get("sign")
            break

    if saturn_sign is None:
        return {
            "is_active": False,
            "saturn_sign": None,
            "moon_sign": moon_sign,
            "relative_position": None,
            "phase": None,
            "severity": "None",
            "description": "Saturn position not found",
        }

    # Sade Sati: Saturn transiting the 12th, 1st, or 2nd sign FROM the Moon.
    # In 0-based sign arithmetic: same sign (0), next sign (1), previous (11).
    relative = (saturn_sign - moon_sign) % 12

    is_active = relative in [11, 0, 1]

    phase = None
    if is_active:
        if relative == 11:
            phase = "Rising (12th from Moon)"
        elif relative == 0:
            phase = "Peak (on Moon sign)"
        elif relative == 1:
            phase = "Setting (2nd from Moon)"

    return {
        "is_active": is_active,
        "saturn_sign": saturn_sign,
        "moon_sign": moon_sign,
        "relative_position": relative,
        "phase": phase,
        "severity": "High" if relative == 0 else "Medium" if is_active else "None",
        "description": f"Sade Sati is {'active' if is_active else 'not active'}" + (f" - {phase}" if phase else ""),
    }


def detect_pitru_dosha(planets: list[dict]) -> dict:
    """Detect Pitru Dosha (Ancestral affliction)."""
    rahu_house = None
    ketu_house = None
    sun_house = None
    moon_house = None

    for planet in planets:
        if planet.get("planet") == "Rahu":
            rahu_house = planet.get("house", 0)
        elif planet.get("planet") == "Ketu":
            ketu_house = planet.get("house", 0)
        elif planet.get("planet") == "Sun":
            sun_house = planet.get("house", 0)
        elif planet.get("planet") == "Moon":
            moon_house = planet.get("house", 0)

    conditions = []

    # Rahu in 1st, 5th, or 9th with malefic influence
    if rahu_house in [1, 5, 9]:
        conditions.append(f"Rahu in {rahu_house}th house")

    # Sun afflicted by Rahu/Ketu
    if sun_house and rahu_house:
        if abs(sun_house - rahu_house) <= 1:
            conditions.append("Sun afflicted by Rahu")

    # Moon in 5th with Rahu
    if moon_house == 5 and rahu_house == 5:
        conditions.append("Moon and Rahu in 5th house")

    has_dosha = len(conditions) > 0

    return {
        "has_dosha": has_dosha,
        "conditions": conditions,
        "description": "Pitru Dosha detected" if has_dosha else "No Pitru Dosha detected",
    }


def detect_nadi_dosha(nadi1: str, nadi2: str) -> dict:
    """Detect Nadi Dosha (Nadi incompatibility in matching)."""
    has_dosha = nadi1 == nadi2

    return {
        "has_dosha": has_dosha,
        "nadi1": nadi1,
        "nadi2": nadi2,
        "description": "Nadi Dosha detected - same Nadi for both" if has_dosha else "No Nadi Dosha",
    }


def detect_all_doshas(planets: list[dict], asc_sign: int, moon_sign: int) -> dict:
    """Detect all doshas in a birth chart."""
    manglik = detect_manglik(planets, asc_sign)
    kaal_sarp = detect_kaal_sarp(planets)
    sade_sati = detect_sade_sati(planets, moon_sign)
    pitru = detect_pitru_dosha(planets)

    return {
        "manglik": manglik,
        "kaal_sarp": kaal_sarp,
        "sade_sati": sade_sati,
        "pitru_dosha": pitru,
        "total_doshas": sum([
            1 if manglik["is_manglik"] else 0,
            1 if kaal_sarp["has_dosha"] else 0,
            1 if sade_sati["is_active"] else 0,
            1 if pitru["has_dosha"] else 0,
        ]),
    }
