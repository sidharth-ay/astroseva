"""The supplementary kundli blocks: avastha, karakas, devata, Julian Day, Avakahada.

This was the only calculation module with no direct test reference. Everything
here is either a classical table or a closed-form algorithm, so every assertion
below is against a value fixed outside this codebase:

- Julian Day anchors on J2000.0, a defined constant;
- the avastha corners follow from the stated even/odd rule;
- the yoni/gana/nadi tables are indexed by nakshatra number, whose entries are
  part of the classical definition, not this implementation.
"""

import pytest

from app.core import kundli_extras as extras
from app.core.kundli_extras import (
    FRIENDSHIPS,
    GANA,
    ISHTA_DEVATA,
    KARAKA_ROLES,
    NADI_MAP,
    SEVEN_PLANETS,
    VARNA_BY_SIGN,
    YONI,
    avastha_of,
    build_avakahada,
    chara_karakas,
    ishta_devata,
    julian_day,
)


# --- the tables are complete -----------------------------------------------


def test_the_classical_tables_cover_all_27_nakshatras():
    assert len(YONI) == 27, f"yoni has {len(YONI)} entries"
    assert len(GANA) == 27, f"gana has {len(GANA)} entries"
    assert len(NADI_MAP) == 27, f"nadi has {len(NADI_MAP)} entries"


def test_the_karaka_roles_are_the_classical_seven():
    assert KARAKA_ROLES == [
        "Atmakaraka", "Amatyakaraka", "Bhratrukaraka", "Matrukaraka",
        "Putrakaraka", "Gnatikaraka", "Darakaraka",
    ]


def test_friendships_partition_the_other_six_planets():
    """Each planet's friends, enemies and neutrals must be exactly the others.

    A planet listed twice, or missing, or listed as its own friend, is a table
    typo -- and table typos are the whole failure mode of hardcoded data.
    """
    for planet, rel in FRIENDSHIPS.items():
        others = set(SEVEN_PLANETS) - {planet}
        assert set(rel["friends"]) | set(rel["enemies"]) | set(rel["neutral"]) == others, planet
        assert not (set(rel["friends"]) & set(rel["enemies"])), planet
        assert not (set(rel["friends"]) & set(rel["neutral"])), planet
        assert not (set(rel["enemies"]) & set(rel["neutral"])), planet


def test_varna_covers_all_twelve_signs():
    assert set(VARNA_BY_SIGN) == set(range(12))


def test_ishta_devata_covers_the_seven_planets():
    assert set(ISHTA_DEVATA) == set(SEVEN_PLANETS)


def test_ashwini_opens_the_tables():
    """Nakshatra 0 is Ashwini: horse yoni, Deva gana, Adi nadi."""
    assert YONI[0] == "Horse (male)"
    assert GANA[0] == "Deva"
    assert NADI_MAP[0] == "Adi"


# --- avastha ----------------------------------------------------------------


def test_avastha_progresses_with_degree_in_even_signs():
    assert avastha_of(0, 0.0) == "Bala (infant)"
    assert avastha_of(0, 6.0) == "Kumara (youth)"
    assert avastha_of(0, 29.9) == "Mrita (old)"


def test_avastha_mirrors_in_odd_signs():
    # Sign index 1 is odd, so the progression runs backwards: a planet at the
    # start of the sign is old, and one at the end is infant.
    assert avastha_of(1, 0.0) == "Mrita (old)"
    assert avastha_of(1, 29.9) == "Bala (infant)"


def test_avastha_clamps_the_top_of_the_sign():
    assert avastha_of(0, 30.0) == "Mrita (old)"


# --- chara karakas ------------------------------------------------------------


def _planets():
    return [
        {"planet": "Sun", "sign_degree": 10.0},
        {"planet": "Moon", "sign_degree": 25.0},
        {"planet": "Mars", "sign_degree": 3.0},
        {"planet": "Mercury", "sign_degree": 18.0},
        {"planet": "Jupiter", "sign_degree": 12.0},
        {"planet": "Venus", "sign_degree": 28.0},
        {"planet": "Saturn", "sign_degree": 7.0},
        {"planet": "Rahu", "sign_degree": 29.9},
        {"planet": "Uranus", "sign_degree": 29.9},
    ]


def test_karakas_follow_descending_degree():
    assert [k["planet"] for k in chara_karakas(_planets())] == [
        "Venus", "Moon", "Mercury", "Jupiter", "Sun", "Saturn", "Mars",
    ]
    assert [k["role"] for k in chara_karakas(_planets())] == KARAKA_ROLES


def test_nodes_and_outer_planets_are_not_karakas():
    """Rahu is at 29.9 degrees -- highest of all -- and still must not appear."""
    planets = [k["planet"] for k in chara_karakas(_planets())]
    assert "Rahu" not in planets
    assert "Uranus" not in planets


def test_a_planet_without_a_degree_is_skipped():
    planets = _planets() + [{"planet": "Saturn"}]
    assert len(chara_karakas(planets)) == 7


# --- ishta devata -------------------------------------------------------------


def test_the_highest_degree_planet_names_the_deity():
    assert ishta_devata(_planets()) == {"planet": "Venus", "deity": "Goddess Lakshmi"}


def test_no_planets_means_no_deity():
    assert ishta_devata([]) == {"planet": None, "deity": None}
    assert ishta_devata([{"planet": "Rahu", "sign_degree": 20.0}]) == {
        "planet": None,
        "deity": None,
    }


# --- Julian Day ---------------------------------------------------------------


def test_julian_day_anchors_on_j2000():
    """1 January 2000, 12:00 TT is Julian Day 2451545.0 by definition."""
    assert julian_day(2000, 1, 1, 12.0) == pytest.approx(2451545.0)


def test_julian_day_advances_one_per_day():
    assert julian_day(2000, 1, 2, 12.0) - julian_day(2000, 1, 1, 12.0) == pytest.approx(1.0)


def test_julian_day_handles_january_and_february():
    """Months 1-2 belong to the previous year in the algorithm; a wrong branch
    shifts the answer by roughly a year."""
    assert julian_day(2000, 2, 29, 12.0) - julian_day(2000, 1, 1, 12.0) == pytest.approx(59.0)


# --- Avakahada Chakra ---------------------------------------------------------


def test_avakahada_assembles_the_packet():
    packet = build_avakahada(
        moon_sign=3,
        moon_nakshatra_index=8,
        moon_pada=2,
        asc_sign=0,
        rashi_lord="Moon",
        asc_lord="Mars",
        star_lord="Saturn",
    )
    assert packet == {
        "rasi": "Cancer",
        "nakshatra_pada": 2,
        "rasi_lord": "Moon",
        "asc_lord": "Mars",
        "star_lord": "Saturn",
        "varna": VARNA_BY_SIGN[3],
        "yoni": YONI[8],
        "gana": GANA[8],
        "nadi": NADI_MAP[8],
    }


def test_avakahada_tolerates_an_unknown_nakshatra():
    packet = build_avakahada(
        moon_sign=0,
        moon_nakshatra_index=99,
        moon_pada=1,
        asc_sign=0,
        rashi_lord="Mars",
        asc_lord="Mars",
        star_lord="Ketu",
    )
    assert packet["yoni"] == "Unknown"
    assert packet["gana"] == "Unknown"
    assert packet["nadi"] == "Unknown"
    assert packet["rasi"] == "Aries"
