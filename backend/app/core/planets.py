"""Vedic astrology engine: NASA JPL DE421 ephemeris (via Skyfield).

All longitudes are GEOCENTRIC apparent tropical longitudes referred to the
true equinox of date, converted to sidereal with the Lahiri ayanamsa.
This replaces the earlier PyEphem implementation which mistakenly used
heliocentric longitudes (hlon) for the planets.
"""

import math
import os
from datetime import datetime, timedelta, timezone

try:
    from skyfield.api import load
except ImportError:
    raise ImportError("Skyfield is required: pip install skyfield")

# --- Ephemeris singletons (loaded once, cached on disk) ---------------------
_TS = load.timescale()
_EPH_PATH = os.environ.get(
    "SKYFIELD_EPHEMERIS",
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "de421.bsp",
    ),
)
_EPH = load(_EPH_PATH)  # auto-downloads on first run if missing
_EARTH = _EPH["earth"]

# Skyfield body keys (barycenters differ from planet centers by < 0.1 arcsec)
_BODIES = {
    "Sun": "sun",
    "Moon": "moon",
    "Mars": "mars",
    "Mercury": "mercury",
    "Jupiter": "jupiter barycenter",
    "Venus": "venus",
    "Saturn": "saturn barycenter",
    "Uranus": "uranus barycenter",
    "Neptune": "neptune barycenter",
    "Pluto": "pluto barycenter",
}

# Classical Vedic planets (used for Kaal Sarp and dignity-free outer handling)
CLASSICAL_PLANETS = {"Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"}

# Zodiac sign names
SIGN_NAMES = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

# Sign lords
SIGN_LORDS = {
    0: "Mars", 1: "Venus", 2: "Mercury", 3: "Moon", 4: "Sun", 5: "Mercury",
    6: "Venus", 7: "Mars", 8: "Jupiter", 9: "Saturn", 10: "Saturn", 11: "Jupiter"
}

# Exaltation and debilitation signs (sign index)
EXALTATION = {"Sun": 0, "Moon": 1, "Mars": 3, "Mercury": 5, "Jupiter": 4, "Venus": 11, "Saturn": 6}
DEBILITATION = {"Sun": 6, "Moon": 7, "Mars": 9, "Mercury": 11, "Jupiter": 8, "Venus": 4, "Saturn": 0}

# Own signs
OWN_SIGNS = {
    "Sun": [4], "Moon": [3], "Mars": [0, 7], "Mercury": [2, 5],
    "Jupiter": [8, 11], "Venus": [1, 6], "Saturn": [9, 10]
}


def _to_utc_time(year: int, month: int, day: int,
                 hour: float, minute: float, tz_offset: float):
    """Local birth time -> Skyfield Time in UTC."""
    naive = datetime(year, month, day) + timedelta(hours=float(hour), minutes=float(minute))
    aware = naive.replace(tzinfo=timezone(timedelta(hours=float(tz_offset))))
    return _TS.from_datetime(aware.astimezone(timezone.utc))


def _tropical_longitude(body_name: str, t) -> float:
    """Geocentric apparent tropical longitude (true equinox of date), degrees."""
    body = _EPH[_BODIES[body_name]]
    apparent = _EARTH.at(t).observe(body).apparent()
    _, lon, _ = apparent.ecliptic_latlon(epoch=t)  # returns (lat, lon, dist)
    return lon.degrees % 360


def _lahiri_ayanamsa(t) -> float:
    """Lahiri (Chitrapaksha) ayanamsa in degrees.

    Anchor 23.85313 deg at J2000.0 TT + mean precession rate 50.29"/yr.
    Accurate to ~1 arcminute vs published Lahiri tables.
    """
    years_since_j2000 = (t.tt - 2451545.0) / 365.25
    return (23.85313 + (50.29 / 3600.0) * years_since_j2000) % 360


def _mean_lunar_node(t) -> float:
    """Mean ascending lunar node (Rahu) tropical longitude, degrees (Meeus)."""
    T = (t.tt - 2451545.0) / 36525.0
    return (125.04452 - 1934.136261 * T) % 360


def _mean_obliquity(t) -> float:
    """Mean obliquity of the ecliptic of date, degrees (Meeus, truncated)."""
    T = (t.tt - 2451545.0) / 36525.0
    return 23.4392911 - (46.8150 * T + 0.00059 * T * T - 0.001813 * T * T * T) / 3600.0


def _gmst_degrees(t) -> float:
    """Greenwich Mean Sidereal Time in degrees (Meeus)."""
    d = t.ut1 - 2451545.0
    T = d / 36525.0
    gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - T ** 3 / 38710000.0
    return gmst % 360


def _compute_ascendant(t, lat: float, lon: float) -> float:
    """Ascendant (Lagna) tropical ecliptic longitude, degrees.

    ASC = atan2(cos H, -(sin H * cos eps + tan phi * sin eps)),
    H = local sidereal time (RAMC), phi = latitude, eps = obliquity.
    (Two-argument form keeps the rising-point quadrant: the descendant
    is 180 degrees away.)
    """
    lst = (_gmst_degrees(t) + lon) % 360  # lon positive East
    H = math.radians(lst)
    eps = math.radians(_mean_obliquity(t))
    phi = math.radians(lat)
    asc = math.degrees(math.atan2(
        math.cos(H),
        -(math.sin(H) * math.cos(eps) + math.tan(phi) * math.sin(eps)),
    )) % 360
    return asc


def _is_retrograde(planet_name: str, t) -> bool:
    """True retrograde check from JPL daily motion (1-day arc)."""
    if planet_name in ("Sun", "Moon"):
        return False
    if planet_name in ("Rahu", "Ketu"):
        return True  # lunar nodes are always retrograde in Vedic astrology
    t2 = _TS.tt(jd=t.tt + 1.0)
    d = _tropical_longitude(planet_name, t2) - _tropical_longitude(planet_name, t)
    if d > 180:
        d -= 360
    elif d < -180:
        d += 360
    return d < 0


def _get_sign_info(longitude: float) -> dict:
    """Sign index and in-sign degree from ecliptic longitude."""
    longitude = longitude % 360
    return {"sign_index": int(longitude / 30), "sign_degree": longitude % 30}


def _get_dignity(planet: str, sign_index: int) -> str:
    """Planetary dignity in a sign."""
    if planet in EXALTATION and EXALTATION[planet] == sign_index:
        return "Exalted"
    if planet in DEBILITATION and DEBILITATION[planet] == sign_index:
        return "Debilitated"
    if planet in OWN_SIGNS and sign_index in OWN_SIGNS[planet]:
        return "Own Sign"
    moolatrikona = {"Sun": 4, "Moon": 1, "Mars": 0, "Mercury": 5,
                    "Jupiter": 6, "Venus": 7, "Saturn": 10}
    if planet in moolatrikona and moolatrikona[planet] == sign_index:
        return "Moolatrikona"
    return "Neutral"


def get_planetary_positions(year: int, month: int, day: int,
                            hour: float = 12.0, minute: float = 0,
                            timezone_offset: float = 5.5,
                            latitude: float = 28.6139,
                            longitude: float = 77.2090) -> dict:
    """Calculate sidereal (Lahiri) planetary positions for birth details.

    Same signature as before -- all existing callers work unchanged.
    """
    t = _to_utc_time(year, month, day, hour, minute, timezone_offset)
    ayanamsa = _lahiri_ayanamsa(t)

    planets = []
    for planet_name in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus",
                        "Saturn", "Uranus", "Neptune", "Pluto"]:
        tropical_long = _tropical_longitude(planet_name, t)
        sidereal_long = (tropical_long - ayanamsa) % 360
        sign_info = _get_sign_info(sidereal_long)
        dignity = _get_dignity(planet_name, sign_info["sign_index"])
        planets.append({
            "planet": planet_name,
            "longitude": sidereal_long,
            "sign": sign_info["sign_index"],
            "sign_name": SIGN_NAMES[sign_info["sign_index"]],
            "sign_degree": sign_info["sign_degree"],
            "retrograde": _is_retrograde(planet_name, t),
            "dignity": dignity,
            "is_own_sign": dignity in ("Own Sign", "Moolatrikona"),
        })

    # Rahu (mean node) / Ketu (opposite point)
    rahu_sid = (_mean_lunar_node(t) - ayanamsa) % 360
    ketu_sid = (rahu_sid + 180) % 360
    for name, lng in (("Rahu", rahu_sid), ("Ketu", ketu_sid)):
        sign_info = _get_sign_info(lng)
        planets.append({
            "planet": name,
            "longitude": lng,
            "sign": sign_info["sign_index"],
            "sign_name": SIGN_NAMES[sign_info["sign_index"]],
            "sign_degree": sign_info["sign_degree"],
            "retrograde": True,
            "dignity": "Neutral",
            "is_own_sign": False,
        })

    asc_sid = (_compute_ascendant(t, latitude, longitude) - ayanamsa) % 360
    asc_info = _get_sign_info(asc_sid)

    return {
        "planets": planets,
        "ascendant": asc_sid,
        "asc_sign": asc_info["sign_index"],
        "asc_sign_degree": asc_info["sign_degree"],
        "ayanamsa": ayanamsa,
        "julian_day": t.tt,
    }


def get_retrograde_planets(planets: list) -> list:
    """List of retrograde planet names."""
    return [p["planet"] for p in planets if p.get("retrograde", False)]


def get_exalted_planets(planets: list) -> list:
    """List of exalted planet names."""
    return [p["planet"] for p in planets if p.get("dignity") == "Exalted"]


def get_debilitated_planets(planets: list) -> list:
    """List of debilitated planet names."""
    return [p["planet"] for p in planets if p.get("dignity") == "Debilitated"]
