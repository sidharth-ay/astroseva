"""Dosha (Affliction) detection in Vedic Astrology."""

import calendar
import datetime
from bisect import bisect_right
from functools import lru_cache

_SIGN_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
               "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

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

    Mirrors AstroSage: Mars in houses 1, 2, 4, 7, 8, 12 from the Lagna,
    and houses 1, 4, 7, 8, 12 from the Moon (the 2nd is excluded
    Moon-side, matching all five published AstroSage verdicts — SRK,
    Akshay, Ajay, Jolie, Biden — where Moon-2nd Mars reads "not present").
    Present in both charts = High; in exactly one = Low (Anshik/partial).
    Cancelled placements are still REPORTED with severity "Mitigated"
    (never silently hidden); only uncancelled dosha counts as active.
    Cancellations per AstroSage: aspect by Jupiter (5th/7th/9th from itself)
    or Venus (7th from itself). Exalted/own-sign Mars is kept as an
    additional (non-AstroSage) cancellation, flagged in the reason.
    """
    by_name = {p.get("planet"): p for p in planets}
    mars = by_name.get("Mars", {})

    LAGNA_HOUSES = [1, 2, 4, 7, 8, 12]
    MOON_HOUSES = [1, 4, 7, 8, 12]

    def _houses_for(ref_sign: int | None, allowed: list[int]) -> list[dict]:
        out = []
        mars_sign = mars.get("sign")
        if mars_sign is None or ref_sign is None:
            return out
        house = (mars_sign - ref_sign) % 12 + 1
        if house in allowed:
            rule = MANGLIK_RULES.get(f"Mars_in_{house}")
            if rule:
                out.append({
                    "house": house,
                    "severity": rule["severity"],
                    "description": rule["description"],
                })
        return out

    lagna_positions = _houses_for(asc_sign, LAGNA_HOUSES)
    moon_positions = _houses_for(moon_sign, MOON_HOUSES) if moon_sign is not None else []
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
    has_placement = lagna_hit or moon_hit
    is_manglik = has_placement and not cancellation

    if not has_placement:
        severity = "None"
    elif cancellation:
        # Mitigated placements are SHOWN, never hidden — only the
        # active verdict and the total count exclude them.
        severity = "Mitigated"
    elif lagna_hit and moon_hit:
        severity = "High"
    else:
        severity = "Low"

    if is_manglik:
        description = "Mars in dosha houses from Lagna or Moon causes Manglik Dosha"
    elif cancellation and has_placement:
        description = f"Manglik placement found but mitigated: {cancellation_reason}"
    else:
        description = "No Manglik Dosha detected"

    return {
        "is_manglik": is_manglik,
        "has_placement": has_placement,
        "positions": manglik_positions,
        "lagna_manglik": lagna_hit,
        "moon_manglik": moon_hit,
        "severity": severity,
        "cancellation": cancellation,
        "cancellation_reason": cancellation_reason,
        "description": description,
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


# Kaal Sarp type by Rahu's house from Lagna (AstroTalk mapping; Ketu +6).
KAAL_SARP_TYPES = {
    1: "Anant", 2: "Kulik", 3: "Vasuki", 4: "Shankhpal", 5: "Padma",
    6: "Maha Padma", 7: "Takshak", 8: "Karkotak", 9: "Shankhnaad",
    10: "Ghatak", 11: "Vishdhar", 12: "Sheshnaag",
}

CLASSICAL_SEVEN = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]


def detect_kaal_sarp(planets: list[dict]) -> dict:
    """Detect Kaal Sarp Dosha (all 7 classical planets hemmed Rahu->Ketu).

    Longitude-based axis test (not house buckets): a planet counts as
    "between" when its longitude falls in the (Rahu, Ketu] 180-degree arc.
    Same-sign degree rule (AstroSage): a planet sharing Rahu's/Ketu's sign
    must have in-sign degree <= the node's, else it breaks the axis.
    Outer planets (Uranus/Neptune/Pluto) never count.
    """
    by_name = {p.get("planet"): p for p in planets}
    rahu = by_name.get("Rahu", {})
    ketu = by_name.get("Ketu", {})
    rahu_lon = rahu.get("longitude")
    ketu_lon = ketu.get("longitude")

    if rahu_lon is None or ketu_lon is None:
        return {
            "has_dosha": False,
            "rahu_house": rahu.get("house"),
            "ketu_house": ketu.get("house"),
            "planets_between": [],
            "planets_outside": [],
            "kaal_sarp_type": None,
            "severity": "None",
            "description": "Rahu or Ketu position not found",
        }

    rahu_deg = rahu_lon % 30
    ketu_deg = ketu_lon % 30
    between, outside = [], []

    for name in CLASSICAL_SEVEN:
        p = by_name.get(name)
        if not p or p.get("longitude") is None:
            outside.append(name)
            continue
        lon = float(p["longitude"])
        rel = (lon - float(rahu_lon)) % 360
        in_arc = 0 <= rel <= 180
        # Same-sign degree rule: must not exceed the node's in-sign degree.
        if in_arc:
            p_deg = lon % 30
            p_sign = int(lon // 30) % 12
            if (p_sign == int(float(rahu_lon) // 30) % 12 and p_deg > rahu_deg) or \
               (p_sign == int(float(ketu_lon) // 30) % 12 and p_deg > ketu_deg):
                in_arc = False
        (between if in_arc else outside).append(name)

    has_dosha = len(outside) == 0
    rahu_house = rahu.get("house")
    kaal_type = KAAL_SARP_TYPES.get(rahu_house) if isinstance(rahu_house, int) else None

    return {
        "has_dosha": has_dosha,
        "rahu_house": rahu_house,
        "ketu_house": ketu.get("house"),
        "planets_between": between,
        "planets_outside": outside,
        "kaal_sarp_type": kaal_type if has_dosha else None,
        "severity": "High" if has_dosha else "None",
        "description": (
            f"{kaal_type} Kaal Sarp Dosha — all planets hemmed between Rahu and Ketu"
            if has_dosha and kaal_type else
            "Kaal Sarp Dosha present" if has_dosha else
            "Planets on both sides of Rahu-Ketu axis"
        ),
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


def _phase_name(moon_sign: int, sat):
    if sat is None:
        return None
    relative = (sat - moon_sign) % 12
    if relative == 11:
        return "Rising"
    if relative == 0:
        return "Peak"
    if relative == 1:
        return "Setting"
    return None


def _sade_phase_for(moon_sign: int, y: int, m: int, d: int) -> tuple:
    """Return (phase_or_None, saturn_sidereal_sign) for one calendar day."""
    from .planets import get_sidereal_sign

    sat = get_sidereal_sign("Saturn", y, m, d)
    return _phase_name(moon_sign, sat), sat


def _sat_sign_on(day: datetime.date) -> int:
    from .planets import get_sidereal_sign

    return get_sidereal_sign("Saturn", day.year, day.month, day.day)


def _day_window(first: datetime.date, last: datetime.date) -> list:
    """[(day, sign)] for each day in the range, or [] past the ephemeris."""
    out, day = [], first
    while day <= last:
        try:
            out.append((day, _sat_sign_on(day)))
        except Exception:
            break
        day += datetime.timedelta(days=1)
    return out


@lru_cache(maxsize=8)
def _settled_timeline(start_year: int, end_year: int) -> tuple:
    """Monthly settled Saturn sign plus the exact day of each settled change.

    Saturn genuinely retrogrades across sign boundaries — sidereal longitude
    runs e.g. 64.8 -> 58.3 -> 65.5 deg in early 2003 — so a plain monthly scan
    invents multi-week Sade Sati windows. Months are sampled monthly (cheap),
    and only months whose sampled sign changed get a day-level scan, where
    motion direction is unambiguous. A change counts as settled only if Saturn
    is still in the new sign at the end of that window, so retrograde
    excursions are discarded and boundaries land on the ingress Saturn really
    settled in.

    Depends only on the year range, so results are cached across requests.
    """
    raw = []
    y, m = start_year, 1
    while y < end_year or (y == end_year and m <= 1):
        try:
            raw.append((y, m, _sat_sign_on(datetime.date(y, m, 15))))
        except Exception:
            break
        m += 1
        if m > 12:
            m, y = 1, y + 1

    truncated = len(raw) < (end_year - start_year) * 12 + 1
    series, switches = [], []
    if not raw:
        return tuple(series), tuple(switches), truncated

    settled = raw[0][2]
    series.append((raw[0][0], raw[0][1], settled))

    for i in range(1, len(raw)):
        y, m, sign = raw[i]
        if sign == settled:
            series.append((y, m, settled))
            continue
        # Saturn only ever moves forward one sign, so anything else is a
        # retrograde excursion rather than a new transit.
        if (sign - settled) % 12 != 1:
            series.append((y, m, settled))
            continue
        prev_y, prev_m, _ = raw[i - 1]
        window = _day_window(datetime.date(prev_y, prev_m, 8),
                             datetime.date(y, m, 22))
        entries = [d for d, s in window if s == sign]
        if not window or not entries:
            series.append((y, m, settled))
            continue
        # Settle only if the window starts in the old sign and ends in the new
        # one; an excursion already under way at the window start is rejected.
        if window[0][1] != settled or window[-1][1] != sign:
            series.append((y, m, settled))
            continue
        settled = sign
        switches.append((entries[0], sign))
        series.append((y, m, settled))

    return series, switches, truncated


def get_sade_sati_periods(moon_sign: int, start_year: int = 1950, end_year: int = 2060) -> list:
    """All Sade Sati windows (Rising/Peak/Setting) for a natal Moon sign.

    Scans transit Saturn monthly with retrograde motion suppressed, then
    narrows every boundary to the exact day Saturn settled in or out of the
    sign. Scanning stops cleanly at the end of the available ephemeris
    (Skyfield DE421s ends 2053-10-09) instead of raising.
    """
    if end_year > 2053:
        # Skyfield's bundled DE421s ends 2053-10-09; asking beyond it raises
        # EphemerisRangeError deep inside the observer, so clamp up front.
        end_year = 2053
    series, switches, truncated = _settled_timeline(start_year, end_year)
    switch_days = [d for d, _ in switches]

    def _month_end(y: int, m: int) -> datetime.date:
        return datetime.date(y, m, calendar.monthrange(y, m)[1])

    periods = []
    idx = 0
    while idx < len(series):
        sy, sm, sat = series[idx]
        phase = _phase_name(moon_sign, sat)
        if not phase:
            idx += 1
            continue
        end_idx = idx
        while end_idx + 1 < len(series) and series[end_idx + 1][2] == sat:
            end_idx += 1
        ey, em = series[end_idx][0], series[end_idx][1]

        # Ingress: the settled switch into this sign closest before the run.
        pos = bisect_right(switch_days, _month_end(sy, sm)) - 1
        if pos >= 0 and switches[pos][1] == sat:
            start = switch_days[pos]
            nxt = pos + 1
            partial = False
        else:
            # Scan began mid-transit, so the true ingress predates the window.
            start = datetime.date(sy, sm, 15)
            nxt = bisect_right(switch_days, datetime.date(sy, sm, 1))
            partial = True

        # Egress: the settled switch right after the ingress, since the
        # ingress itself can fall inside the run's final month.
        if nxt < len(switch_days):
            end = switch_days[nxt] - datetime.timedelta(days=1)
        else:
            # Scan ended mid-transit, so the true egress lies past the window.
            end = _month_end(ey, em)
            partial = True

        periods.append({
            "phase": phase,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "saturn_sign": sat,
            "saturn_sign_name": _SIGN_NAMES[sat] if sat < len(_SIGN_NAMES) else str(sat),
            "precision": "day",
            "partial": partial,
            "range_truncated": truncated,
        })
        idx = end_idx + 1
    return periods


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
    """Detect all doshas in a birth chart (Manglik, Kaal Sarp, Sade Sati, Pitru)."""
    manglik = detect_manglik(planets, asc_sign, moon_sign)
    kaal_sarp = detect_kaal_sarp(planets)
    sade_sati = detect_sade_sati(planets, moon_sign, transit_saturn_sign)
    pitru = detect_pitru_dosha(planets, asc_sign)

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


def active_doshas(doshas: dict) -> list[str]:
    """Names of the detected doshas that call for a remedy, in report order.

    The AI path and the remedy corpus each carried their own copy of this
    list; one definition keeps them from drifting apart.
    """
    names = []
    if doshas.get("manglik", {}).get("is_manglik"):
        names.append("Manglik Dosha")
    if doshas.get("sade_sati", {}).get("is_active"):
        names.append("Sade Sati")
    if doshas.get("pitru_dosha", {}).get("has_dosha"):
        names.append("Pitru Dosha")
    return names
