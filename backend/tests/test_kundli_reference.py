"""Reference-chart regression test for the JPL-based Vedic engine.

Reference: 1995-08-15 10:30 IST, Delhi (28.6139N, 77.2090E).
Positions cross-checked against NASA JPL DE421 (geocentric apparent,
true equinox of date) + Lahiri ayanamsa. Signs must match exactly;
degrees within 0.5 deg. If this test fails, the kundli is wrong.
"""

import pytest

from app.core.planets import (
    get_planetary_positions,
    get_retrograde_planets,
)
from app.core.nakshatras import get_nakshatra_from_longitude

# Expected sidereal (sign_index, sign_degree) per planet
EXPECTED = {
    "Sun": (3, 28.1),      # Cancer
    "Moon": (11, 24.9),    # Pisces
    "Mars": (5, 21.3),     # Virgo
    "Mercury": (4, 15.3),  # Leo
    "Jupiter": (7, 12.0),  # Scorpio
    "Venus": (3, 26.5),    # Cancer
    "Saturn": (10, 29.7),  # Aquarius
    "Rahu": (6, 6.0),      # Libra
    "Ketu": (0, 6.0),      # Aries
    "Uranus": (9, 3.8),    # Capricorn
    "Neptune": (8, 29.6),  # Sagittarius
    "Pluto": (7, 4.0),     # Scorpio
}

DEG_TOL = 0.5


@pytest.fixture(scope="module")
def chart():
    return get_planetary_positions(1995, 8, 15, 10, 30, 5.5, 28.6139, 77.2090)


def test_all_planet_signs(chart):
    by_name = {p["planet"]: p for p in chart["planets"]}
    assert set(by_name) == set(EXPECTED)
    for name, (sign, _) in EXPECTED.items():
        assert by_name[name]["sign"] == sign, f"{name} in wrong sign"


def test_planet_degrees(chart):
    by_name = {p["planet"]: p for p in chart["planets"]}
    for name, (_, deg) in EXPECTED.items():
        assert abs(by_name[name]["sign_degree"] - deg) < DEG_TOL, (
            f"{name} degree off: {by_name[name]['sign_degree']}"
        )


def test_lagna(chart):
    assert chart["asc_sign"] == 5  # Virgo
    assert abs(chart["asc_sign_degree"] - 28.5) < DEG_TOL


def test_retrograde_nodes_saturn_uranus_neptune(chart):
    # Aug 1995: Saturn/Uranus/Neptune genuinely retrograde (all near opposition)
    assert sorted(get_retrograde_planets(chart["planets"])) == [
        "Ketu", "Neptune", "Rahu", "Saturn", "Uranus",
    ]


def test_moon_nakshatra_revati(chart):
    moon = next(p for p in chart["planets"] if p["planet"] == "Moon")
    nak = get_nakshatra_from_longitude(moon["longitude"])
    assert nak["name"] == "Revati"
    assert nak["lord"] == "Mercury"


def test_sun_in_tenth_house_morning_chart(chart):
    """10:30 IST: Sun must be near the MC (houses 9-11), not below horizon."""
    from app.core.houses import get_planets_in_houses

    planets = [
        {"planet": p["planet"], "longitude": p["longitude"]} for p in chart["planets"]
    ]
    houses = get_planets_in_houses(planets, chart["ascendant"])
    sun_house = next(h for h, ps in houses.items() if "Sun" in ps)
    assert sun_house in (9, 10, 11), f"Sun in house {sun_house} at 10:30am?"
