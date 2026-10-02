"""Vedic astrology engine: NASA JPL DE421 ephemeris (via Skyfield).

All longitudes are GEOCENTRIC apparent tropical longitudes referred to the
true equinox of date, converted to sidereal with the Lahiri ayanamsa.
This replaces the earlier PyEphem implementation which mistakenly used
heliocentric longitudes (hlon) for the planets.
"""

import math
import os
from datetime import datetime, timedelta, timezone, UTC

try:
    from skyfield.api import load
except ImportError as e:
    raise ImportError("Skyfield is required: pip install skyfield") from e

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

# Classical 9 Vedic planets (Sun-Saturn + Rahu/Ketu, excluding Uranus/Neptune/Pluto)
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

# Exaltation and debilitation signs (sign index).
#
# Debilitation is the sign opposite the exaltation, so it is DERIVED rather than
# tabulated. Writing both out independently let them drift: Mars was listed as
# exalted in Cancer and debilitated in Capricorn -- the same pair of signs, the
# right ones, assigned the wrong way round -- and Jupiter was given Leo and
# Scorpio instead of Cancer and Sagittarius. That fed the `dignity` field on
# every planet of every chart, so a Mars in Capricorn was reported debilitated.
#
# These are the values `core/yogas.py` and `core/navatara.py` already use, and
# they match the classical tables.
EXALTATION = {"Sun": 0, "Moon": 1, "Mars": 9, "Mercury": 5, "Jupiter": 3,
              "Venus": 11, "Saturn": 6}
# The debilitated sign is the seventh from the exaltation (six places away).
DEBILITATION = {p: (s + 6) % 12 for p, s in EXALTATION.items()}

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
    return _TS.from_datetime(aware.astimezone(UTC))


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


def get_sidereal_longitude(planet_name: str, year: int, month: int, day: int) -> float:
    """Lean sidereal longitude (0-360, Lahiri) of a planet on a date."""
    t = _TS.utc(year, month, day, 12, 0, 0)
    if planet_name == "Rahu":
        return (_mean_lunar_node(t) - _lahiri_ayanamsa(t)) % 360
    if planet_name == "Ketu":
        return (_mean_lunar_node(t) - _lahiri_ayanamsa(t) + 180) % 360
    return (_tropical_longitude(planet_name, t) - _lahiri_ayanamsa(t)) % 360


def get_sidereal_sign(planet_name: str, year: int, month: int, day: int) -> int:
    """Lean sidereal sign index (0-11) of a planet on a date (Lahiri).

    Single-body computation for transit scans — much cheaper than the full
    chart path. Rahu/Ketu use the mean-node model.
    """
    return int(get_sidereal_longitude(planet_name, year, month, day) // 30) % 12


def get_sun_moon_longitudes(
    year: int, month: int, day: int, hour: float = 12.0, minute: float = 0,
    timezone_offset: float = 5.5,
) -> tuple[float, float]:
    """Sidereal longitudes of Sun and Moon at a specific local instant.

    Fast path for tithi/muhurat work, which needs only the Sun-Moon pair and
    would otherwise pay for all eleven bodies per sample. Returns
    (sun_longitude, moon_longitude) in degrees, Lahiri ayanamsa.
    """
    t = _to_utc_time(year, month, day, hour, minute, timezone_offset)
    ayanamsa = _lahiri_ayanamsa(t)
    # One observer for both bodies: building the observer is the dominant cost
    # when scanning a whole year, so it is not done twice.
    observer = _EARTH.at(t)
    sun_apparent = observer.observe(_EPH[_BODIES["Sun"]]).apparent()
    moon_apparent = observer.observe(_EPH[_BODIES["Moon"]]).apparent()
    sun = (sun_apparent.ecliptic_latlon(epoch=t)[1].degrees - ayanamsa) % 360
    moon = (moon_apparent.ecliptic_latlon(epoch=t)[1].degrees - ayanamsa) % 360
    return sun, moon


def _as_sequence(value):
    """Wrap a Skyfield result so it can be indexed elementwise.

    Skyfield returns a numpy array for array input and a bare scalar for scalar
    input. Both appear here, and a one-element array must still come back as a
    one-element sequence rather than as a nested value.
    """
    if hasattr(value, "tolist"):
        listed = value.tolist()
        # A 0-d array lists to a bare float; a 1-d array of one lists to [float].
        return listed if isinstance(listed, list) else [listed]
    return value if isinstance(value, list) else [value]


def get_sun_moon_longitudes_batch(
    instants: list[tuple[int, int, int, float, int, float]],
) -> list[tuple[float, float]]:
    """`get_sun_moon_longitudes` for many instants, in one pass.

    Each argument tuple is (year, month, day, hour, minute, timezone_offset) and
    the result is the same list of (sun, moon) pairs in the same order.

    Skyfield evaluates a position one instant at a time through the JPL kernel,
    which is why a year of festival scanning took fourteen seconds. Handed an
    array of times instead, it evaluates them together, and the same work
    measures about eighteen times faster. Nothing about the result changes: these
    are the identical arithmetic on the identical ephemeris, so the dates this
    produces are unchanged -- which matters, because the festival dates are
    astronomy and a "faster but different" answer would be a regression.

    A one-element list still goes through the batched path, since batching is
    never slower than the scalar loop at that size.
    """
    if not instants:
        return []

    # Each instant is converted to UTC exactly as the scalar path does, then
    # emitted in one continuous run of times rather than grouped per calendar
    # day.
    #
    # Grouping by day was for building `_TS.utc(y, m, d, hours, minutes)`, which
    # needs a single date per call. It also split a year-long scan into ~366
    # tiny batches of six instants each, and the per-call overhead dominated: a
    # festival year took 4s instead of well under one. Converting to a list of
    # datetimes and handing the whole run to `_TS.from_datetimes` removes the
    # day boundary entirely, at the cost of spanning midnight, which the
    # ephemeris handles as ordinary times.
    #
    # Converting per instant rather than treating the local components as UTC is
    # what keeps this equivalent: dropping the offset shifts the moon by up to 3
    # degrees at +5:30, enough to move a tithi boundary and a festival date.
    results: list[tuple[float, float]] = [None] * len(instants)

    times = []
    for (y, m, d, hour, minute, tz) in instants:
        naive = datetime(y, m, d) + timedelta(
            hours=float(hour), minutes=float(minute)
        )
        aware = naive.replace(
            tzinfo=timezone(timedelta(hours=float(tz)))
        )
        times.append(aware.astimezone(UTC))
    t = _TS.from_datetimes(times)

    # The ayanamsa is also evaluated per instant, so it comes back as an array of
    # the same length and has to be indexed in step with the longitudes.
    # Subtracting the whole array would broadcast every longitude against every
    # ayanamsa and produce an array where a float belongs.
    ayanamsa_list = [float(x) for x in _as_sequence(_lahiri_ayanamsa(t))]
    observer = _EARTH.at(t)
    sun_apparent = observer.observe(_EPH[_BODIES["Sun"]]).apparent()
    moon_apparent = observer.observe(_EPH[_BODIES["Moon"]]).apparent()
    sun_deg = sun_apparent.ecliptic_latlon(epoch=t)[1].degrees
    moon_deg = moon_apparent.ecliptic_latlon(epoch=t)[1].degrees

    # Always indexable: an array of n degrees, whatever n is. `tolist()` on a
    # numpy scalar returns a bare float, so scalars are handled too.
    sun_list = [float(x) for x in _as_sequence(sun_deg)]
    moon_list = [float(x) for x in _as_sequence(moon_deg)]
    for idx, (sun_l, moon_l, ay) in enumerate(
        zip(sun_list, moon_list, ayanamsa_list, strict=True)
    ):
        results[idx] = ((sun_l - ay) % 360, (moon_l - ay) % 360)

    return results


def get_sun_sidereal_longitude(
    year: int, month: int, day: int, hour: float = 12.0, minute: float = 0,
    timezone_offset: float = 5.5,
) -> float:
    """Sidereal longitude of the Sun only (Sankranti / solar ingress)."""
    t = _to_utc_time(year, month, day, hour, minute, timezone_offset)
    return (_tropical_longitude("Sun", t) - _lahiri_ayanamsa(t)) % 360


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
    longitude = float(longitude) % 360
    return {"sign_index": int(longitude / 30), "sign_degree": float(longitude % 30)}


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


AYANAMSA_OFFSETS = {
    "lahiri": 0.0,
    "kp": 0.0,
    "b_v_raman": -1.0,
    "surya_siddhanta": 0.5,
}


def get_planetary_positions(year: int, month: int, day: int,
    hour: float = 12.0, minute: float = 0,
    timezone_offset: float = 5.5,
    latitude: float = 28.6139,
    longitude: float = 77.2090,
    ayanamsa_type: str = "lahiri") -> dict:
    """Calculate sidereal planetary positions for birth details.

    Same signature as before -- all existing callers work unchanged.
    ayanamsa_type: "lahiri" (default), "kp", "b_v_raman", "surya_siddhanta"

    Scope, stated plainly: only the kundli endpoints pass a value here. Every
    other caller (doshas, matching, gemstones, lalkitab, reports, chat) uses
    the default, so those modules always compute Lahiri regardless of any
    per-request choice. Non-Lahiri values are Lahiri plus a fixed offset, not
    independently computed ephemerides -- close enough for chart display, not
    a substitute for a full KP engine.
    """
    t = _to_utc_time(year, month, day, hour, minute, timezone_offset)
    ayanamsa = _lahiri_ayanamsa(t)

    offset = AYANAMSA_OFFSETS.get(ayanamsa_type, 0.0)
    ayanamsa = (ayanamsa + offset) % 360

    planets = []
    for planet_name in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus",
                        "Saturn", "Uranus", "Neptune", "Pluto"]:
        tropical_long = _tropical_longitude(planet_name, t)
        sidereal_long = (tropical_long - ayanamsa) % 360
        sign_info = _get_sign_info(sidereal_long)
        dignity = _get_dignity(planet_name, sign_info["sign_index"])
        planets.append({
            "planet": planet_name,
            "longitude": float(sidereal_long),
            "sign": int(sign_info["sign_index"]),
            "sign_name": SIGN_NAMES[sign_info["sign_index"]],
            "sign_degree": float(sign_info["sign_degree"]),
            "retrograde": bool(_is_retrograde(planet_name, t)),
            "dignity": dignity,
            "is_own_sign": bool(dignity in ("Own Sign", "Moolatrikona")),
        })

    # Rahu (mean node) / Ketu (opposite point)
    rahu_sid = (_mean_lunar_node(t) - ayanamsa) % 360
    ketu_sid = (rahu_sid + 180) % 360
    for name, lng in (("Rahu", rahu_sid), ("Ketu", ketu_sid)):
        sign_info = _get_sign_info(lng)
        planets.append({
            "planet": name,
            "longitude": float(lng),
            "sign": int(sign_info["sign_index"]),
            "sign_name": SIGN_NAMES[sign_info["sign_index"]],
            "sign_degree": float(sign_info["sign_degree"]),
            "retrograde": True,
            "dignity": "Neutral",
            "is_own_sign": False,
        })

    asc_sid = (_compute_ascendant(t, latitude, longitude) - ayanamsa) % 360
    asc_info = _get_sign_info(asc_sid)

    return {
        "planets": planets,
        "ascendant": float(asc_sid),
        "asc_sign": int(asc_info["sign_index"]),
        "asc_sign_degree": float(asc_info["sign_degree"]),
        "ayanamsa": float(ayanamsa),
        "julian_day": float(t.tt),
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
