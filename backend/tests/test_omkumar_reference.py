"""Om Kumar reference test: 2006-01-01 10:30 IST, Kolkata.

Ground truth: AstroSage Rasi (D1) chart, Lahiri ayanamsa, Mean nodes.
Lagna Aquarius 28-11-30; Sa Cancer 15-57; Me Sagittarius 02-02-16;
Ra Pisces 15-02-24. Houses: La 1, Ra 2, Ma 3, Sa 6, Ke 8, Ju 9,
Su+Me 11, Mo+Ve 12 (+Ur 1, Ne 12, Pl 11).
"""

import pytest

from app.core.planets import get_planetary_positions
from app.core.houses import get_planets_in_houses

DEG_TOL = 0.15  # degrees; engine matches AstroSage to ~1 arcmin


@pytest.fixture(scope="module")
def chart():
    return get_planetary_positions(2006, 1, 1, 10, 30, 5.5, 22.5726, 88.3639)


@pytest.fixture(scope="module")
def by_name(chart):
    return {p["planet"]: p for p in chart["planets"]}


def test_lagna_aquarius(chart):
    assert chart["asc_sign"] == 10  # Aquarius
    assert abs(chart["asc_sign_degree"] - 28.1917) < DEG_TOL


def test_reference_degrees(by_name):
    assert by_name["Saturn"]["sign"] == 3  # Cancer
    assert abs(by_name["Saturn"]["sign_degree"] - 15.95) < DEG_TOL
    assert by_name["Mercury"]["sign"] == 8  # Sagittarius
    assert abs(by_name["Mercury"]["sign_degree"] - 2.0378) < DEG_TOL
    assert by_name["Rahu"]["sign"] == 11  # Pisces
    assert abs(by_name["Rahu"]["sign_degree"] - 15.04) < DEG_TOL


def test_astrosage_houses(chart):
    planets = [
        {"planet": p["planet"], "longitude": p["longitude"]} for p in chart["planets"]
    ]
    houses = get_planets_in_houses(planets, chart["ascendant"])
    assert houses[2] == ["Rahu"]
    assert houses[3] == ["Mars"]
    assert houses[6] == ["Saturn"]
    assert houses[8] == ["Ketu"]
    assert houses[9] == ["Jupiter"]
    assert sorted(houses[11]) == ["Mercury", "Pluto", "Sun"]
    assert sorted(houses[12]) == ["Moon", "Neptune", "Venus"]
    assert houses[1] == ["Uranus"]
