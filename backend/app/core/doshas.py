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


def detect_manglik(planets: list[dict], asc_sign: int, moon_sign: int | None = None) -> dict:
    """Detect Manglik Dosha (Mars affliction) from Lagna and Moon charts.

    Mirrors AstroSage: Mars in houses 1, 2, 4, 7, 8, 12 counted from the
    Lagna (ascendant) and from the Moon (Chandra Lagna). Present in both
    charts = High; in exactly one = Low (Anshik/partial); in neither = None.
    Cancellations per AstroSage: aspect by Jupiter (5th/7th/9th from itself)
    or Venus (7th from itself). Exalted/own-sign Mars is kept as an
    additional (non-AstroSage) cancellation, flagged in the reason.
    """
    by_name = {p.get("planet"): p for p in planets}
    mars = by_name.get("Mars", {})

    def _houses_for(ref_sign: int) -> list[dict]:
        out = []
        mars_sign = mars.get("sign")
        if mars_sign is None or ref_sign is None:
            return out
        house = (mars_sign - ref_sign) % 12 + 1
        if house in [1, 2, 4, 7, 8, 12]:
            rule = MANGLIK_RULES.get(f"Mars_in_{house}")
            if rule:
                out.append({
                    "house": house,
                    "severity": rule["severity"],
                    "description": rule["description"],
                })
        return out

    lagna_positions = _houses_for(asc_sign)
    moon_positions = _houses_for(moon_sign) if moon_sign is not None else []
    manglik_positions = (
        [{**p, "chart": "lagna"} for p in lagna_positions]
        + [{**p, "chart": "moon"} for p in moon_positions]
    )

    # Cancellations
    cancellation = False
    cancellation_reason = None
    mars_sign = mars.get("sign")

    def _signs_of(name: str) -> int | None:
        p = by_name.get(name)
        return p.get("sign") if p else None

    jup_sign = _signs_of("Jupiter")
    ven_sign = _signs_of("Venus")
    if mars_sign is not None:
        if jup_sign is not None and (mars_sign - jup_sign) % 12 in [4, 6, 8]:
            cancellation = True
            cancellation_reason = "Mars aspected by Jupiter - cancels Manglik effect"
        elif ven_sign is not None and (mars_sign - ven_sign) % 12 == 6:
            cancellation = True
            cancellation_reason = "Mars aspected by Venus - cancels Manglik effect"
    if not cancellation:
        if mars.get("dignity") == "Exalted":
            cancellation = True
            cancellation_reason = "Mars is exalted - reduces Manglik effect (extension beyond AstroSage rules)"
        elif mars.get("is_own_sign"):
            cancellation = True
            cancellation_reason = "Mars is in own sign - reduces Manglik effect (extension beyond AstroSage rules)"

    lagna_hit = len(lagna_positions) > 0
    moon_hit = len(moon_positions) > 0
    is_manglik = (lagna_hit or moon_hit) and not cancellation

    if not is_manglik:
        severity = "None"
    elif lagna_hit and moon_hit:
        severity = "High"
    else:
        severity = "Low"

    return {
        "is_manglik": is_manglik,
        "positions": manglik_positions,
        "lagna_manglik": lagna_hit,
        "moon_manglik": moon_hit,
        "severity": severity,
        "cancellation": cancellation,
        "cancellation_reason": cancellation_reason,
        "description": "Mars in 1st, 2nd, 4th, 7th, 8th, or 12th house from Lagna or Moon causes Manglik Dosha" if is_manglik else "No Manglik Dosha detected",
    }


def get_transit_saturn_sign(year: int, month: int, day: int) -> int:
    """Return sidereal sign index (0-11) of Saturn on a given date (Lahiri).

    Used for Sade Sati, which compares *transiting* Saturn against the
    *natal* Moon sign. Local import avoids any circulars.
    """
    from .planets import get_planetary_positions

    positions = get_planetary_positions(year, month, day, 12, 0, 5.5)
    for planet in positions["planets"]:
        if planet.get("planet") == "Saturn":
            return int(planet.get("sign", 0))
    raise ValueError("Saturn position unavailable for transit date")


def detect_sade_sati(planets: list[dict], moon_sign: int, transit_saturn_sign: int | None = None) -> dict:
    """Detect Sade Sati (transiting Saturn over natal Moon sign)."""
    fallback = False
    if transit_saturn_sign is None:
        fallback = True
        transit_saturn_sign = None
        for planet in planets:
            if planet.get("planet") == "Saturn":
                transit_saturn_sign = planet.get("sign")
                break

    if transit_saturn_sign is None:
        return {
            "is_active": False,
            "saturn_sign": None,
            "moon_sign": moon_sign,
            "relative_position": None,
            "phase": None,
            "severity": "None",
            "transit_based": False,
            "description": "Saturn position not found",
        }

    # 0-based: 0 = same sign (1st/Peak), 1 = next (2nd/Setting), 11 = previous (12th/Rising)
    relative = (transit_saturn_sign - moon_sign) % 12

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
        "saturn_sign": transit_saturn_sign,
        "moon_sign": moon_sign,
        "relative_position": relative,
        "phase": phase,
        "severity": "High" if relative == 0 else "Medium" if is_active else "None",
        "transit_based": not fallback,
        "description": f"Sade Sati is {'active' if is_active else 'not active'}" + (f" - {phase}" if phase else "") + (" (natal-Saturn approximation; transit date not given)" if fallback else ""),
    }


# Sign lords for 8th-lord Pitru checks (Vedic whole-sign lordship)
SIGN_LORDS = {
    0: "Mars", 1: "Venus", 2: "Mercury", 3: "Moon", 4: "Sun", 5: "Mercury",
    6: "Venus", 7: "Mars", 8: "Jupiter", 9: "Saturn", 10: "Saturn", 11: "Jupiter",
}


def detect_pitru_dosha(planets: list[dict], asc_sign: int | None = None) -> dict:
    """Detect Pitru Dosha (ancestral affliction).

    Combos per AstroSage magazine: luminaries/benefics conjunct
    Rahu/Ketu/Saturn (same sign), malefics in the 5th, Ketu alone in 5th,
    8th-lord placements, plus the legacy house rules.
    """
    by_name = {p.get("planet"): p for p in planets}

    def _house(name: str) -> int | None:
        p = by_name.get(name)
        h = p.get("house") if p else None
        return h if isinstance(h, int) and h != 0 else None

    def _sign(name: str) -> int | None:
        p = by_name.get(name)
        s = p.get("sign") if p else None
        return s if isinstance(s, int) else None

    rahu_house = _house("Rahu")
    ketu_house = _house("Ketu")
    sun_house = _house("Sun")
    moon_house = _house("Moon")

    conditions = []

    # Rahu in 1st, 5th, or 9th with malefic influence (legacy rule)
    if rahu_house in [1, 5, 9]:
        conditions.append(f"Rahu in {rahu_house}th house")

    # Sun afflicted by Rahu/Ketu (legacy house-proximity rule)
    if sun_house and rahu_house:
        if abs(sun_house - rahu_house) <= 1:
            conditions.append("Sun afflicted by Rahu")

    # Moon in 5th with Rahu (legacy rule)
    if moon_house == 5 and rahu_house == 5:
        conditions.append("Moon and Rahu in 5th house")

    # Conjunction afflictions: Sun/Moon/Jupiter/Venus/Mars sharing a sign
    # with Rahu, Ketu, or Saturn (AstroSage combos 1-5)
    luminaries = [
        ("Sun", "paternal side"),
        ("Moon", "maternal side"),
        ("Jupiter", "teachers/saints"),
        ("Venus", "scholars"),
        ("Mars", "siblings"),
    ]
    malefics = ["Rahu", "Ketu", "Saturn"]
    for lum, side in luminaries:
        lum_sign = _sign(lum)
        if lum_sign is None:
            continue
        for mal in malefics:
            if _sign(mal) == lum_sign:
                conditions.append(f"{lum} conjunct {mal} ({side})")

    # Rahu/Ketu/Saturn or Mars in 5th; Ketu alone in 5th (combos 8-9)
    fifth = [n for n in ["Rahu", "Ketu", "Saturn", "Mars"] if _house(n) == 5]
    if fifth:
        conditions.append(f"{'/'.join(fifth)} in 5th house")
    if ketu_house == 5 and not [n for n in ["Rahu", "Saturn", "Mars", "Jupiter", "Venus", "Mercury", "Sun", "Moon"] if _house(n) == 5]:
        conditions.append("Ketu alone in 5th house")

    # 8th lord in ascendant, or ascendant lord in 8th (combo 7)
    if asc_sign is not None:
        eighth_sign = (asc_sign + 7) % 12
        eighth_lord = SIGN_LORDS.get(eighth_sign)
        asc_lord = SIGN_LORDS.get(asc_sign)
        if eighth_lord and _house(eighth_lord) == 1:
            conditions.append(f"8th lord {eighth_lord} in ascendant")
        if asc_lord and _house(asc_lord) == 8:
            conditions.append(f"Ascendant lord {asc_lord} in 8th house")

    # Deduplicate while preserving order
    seen = set()
    conditions = [c for c in conditions if not (c in seen or seen.add(c))]

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


def detect_all_doshas(planets: list[dict], asc_sign: int, moon_sign: int, transit_saturn_sign: int | None = None) -> dict:
    """Detect all doshas in a birth chart (Manglik, Sade Sati, Pitru)."""
    manglik = detect_manglik(planets, asc_sign, moon_sign)
    sade_sati = detect_sade_sati(planets, moon_sign, transit_saturn_sign)
    pitru = detect_pitru_dosha(planets, asc_sign)

    return {
        "manglik": manglik,
        "sade_sati": sade_sati,
        "pitru_dosha": pitru,
        "total_doshas": sum([
            1 if manglik["is_manglik"] else 0,
            1 if sade_sati["is_active"] else 0,
            1 if pitru["has_dosha"] else 0,
        ]),
    }
