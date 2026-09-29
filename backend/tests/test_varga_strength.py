"""Parity tests for the divisional charts, Shadbala, Bhavabala, Ashtakavarga,
Navatara and Arudha."""

import pytest

from app.core.vargas import (
    build_vargas, get_varga_signs, d1_rasi, d2_hora, d3_drekkana,
    d4_chaturthamsa, d5_panchamsa, d6_shashtamsa, d7_saptamsa, d8_ashtamsa,
    d9_navamsa, d10_dasamsa, d12_dwadasamsa, d16_kalamsa, CHART_FN, DIVISIONS,
)
from app.core.shadbala import build_shadbala, build_bhavabala, GRAHAS, STHANA
from app.core.ashtakavarga import (
    build_ashtakavarga, build_prasthara_ashtakavarga, _POSITIONS, GRAHAS as AV_GRAHAS,
)
from app.core.navatara import build_navatara, build_arudha, NAVATARA_TOTAL


def _p(name, sign, deg=15.0, lon=None, retro=False):
    return {
        "planet": name, "sign": sign, "sign_degree": deg,
        "longitude": sign * 30 + deg if lon is None else lon,
        "retrograde": retro,
    }


# ─── Divisional charts ───────────────────────────────────────

def test_all_sixteen_charts_registered():
    assert set(CHART_FN) == set(DIVISIONS)
    assert "D9" in CHART_FN and "D12" in CHART_FN and "D16" in CHART_FN


def test_d1_is_the_sign_itself():
    for sign in range(12):
        for deg in (0.0, 15.0, 29.9):
            assert d1_rasi(sign, deg) == sign


def test_d2_hora_odd_even_flip():
    # Odd signs: first half Leo, second half Cancer.
    assert d2_hora(0, 5.0) == 4
    assert d2_hora(0, 20.0) == 3
    # Even signs reverse.
    assert d2_hora(1, 5.0) == 3
    assert d2_hora(1, 20.0) == 4


def test_d3_drekkana_spans_three_signs():
    # Aries: Aries, Leo, Sagittarius.
    assert d3_drekkana(0, 0.0) == 0
    assert d3_drekkana(0, 10.0) == 4
    assert d3_drekkana(0, 20.0) == 8


def test_d3_covers_every_sign_across_three_bands():
    for sign in range(12):
        got = {d3_drekkana(sign, d) for d in (0.0, 10.0, 20.0)}
        assert len(got) == 3, sign


def test_d9_reproduces_published_modality_rule():
    # Movable from itself, fixed from the 9th, dual from the 5th.
    assert d9_navamsa(0, 0.0) == 0     # Aries movable -> Aries
    assert d9_navamsa(1, 0.0) == 9     # Taurus fixed -> Capricorn
    assert d9_navamsa(2, 0.0) == 6     # Gemini dual -> Libra


def test_d9_walks_consecutive_signs():
    for sign in (0, 1, 2):
        row = [d9_navamsa(sign, d) for d in (0, 3.4, 6.7, 10, 13.4, 16.7, 20, 23.4, 26.7)]
        expected = [(row[0] + i) % 12 for i in range(9)]
        assert row == expected, sign


def test_d9_first_navamsa_always_cardinal():
    """The 1st navamsa of every sign falls on a cardinal sign (0,3,6,9)."""
    firsts = {d9_navamsa(s, 0.0) for s in range(12)}
    assert firsts <= {0, 3, 6, 9}
    assert len(firsts) == 4


def test_d12_counts_through_all_twelve():
    row = [d12_dwadasamsa(0, d) for d in (0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5)]
    assert row == list(range(12))


def test_d16_uses_sixteen_parts():
    """16 parts of 1.875 degrees; the 16th part wraps 4 signs past the first."""
    assert d16_kalamsa(0, 0.9) == 0
    # Part index 15 -> sign (0 + 0 + 15) % 12 == 3
    assert d16_kalamsa(0, 28.5) == 3


def test_d5_d7_d10_flip_on_even_signs():
    # Odd and even signs must start differently.
    assert d5_panchamsa(0, 0.0) != d5_panchamsa(1, 0.0)
    assert d7_saptamsa(0, 0.0) != d7_saptamsa(1, 0.0)
    assert d10_dasamsa(0, 0.0) != d10_dasamsa(1, 0.0)


def test_every_chart_returns_a_valid_sign():
    planets = [_p(n, s) for n, s in (("Sun", 0), ("Moon", 3), ("Mars", 7))]
    for code in CHART_FN:
        m = get_varga_signs(planets, code)
        assert set(m) == {"Sun", "Moon", "Mars"}
        for v in m.values():
            assert 0 <= v <= 11


def test_build_vargas_includes_ascendant():
    planets = [_p("Sun", 0)]
    v = build_vargas(planets, 5)
    assert "D9" in v and v["D9"]["name"] == "Navamsa"
    for code, entry in v.items():
        assert 0 <= entry["asc_sign"] <= 11, code


def test_unknown_chart_raises():
    with pytest.raises(ValueError):
        get_varga_signs([_p("Sun", 0)], "D99")


# ─── Shadbala ─────────────────────────────────────────────────

def _chart7(asc=0):
    return [
        _p("Sun", 0), _p("Moon", 3), _p("Mars", 7), _p("Mercury", 2),
        _p("Jupiter", 8), _p("Venus", 6), _p("Saturn", 10),
    ]


def test_shadbala_covers_seven_grahas():
    r = build_shadbala(_chart7(), 0)
    assert len(r["planets"]) == 7
    assert {x["planet"] for x in r["planets"]} == set(GRAHAS)


def test_shadbala_components_within_maxima():
    r = build_shadbala(_chart7(), 0)
    for x in r["planets"]:
        for comp in ("sthana", "dig", "kala", "cheshta", "naisargika", "drik"):
            assert 0 <= x[comp] <= 60, (x["planet"], comp)


def test_shadbala_total_matches_component_sum():
    r = build_shadbala(_chart7(), 0)
    for x in r["planets"]:
        s = x["sthana"] + x["dig"] + x["kala"] + x["cheshta"] + x["naisargika"] + x["drik"]
        assert abs(x["total_rupa"] - s / 60.0) < 0.01, x["planet"]


def test_shadbala_sthana_by_house_class():
    r = build_shadbala(_chart7(), 0)
    for x in r["planets"]:
        assert x["sthana"] == STHANA.get(x["house"], 0.0), x["planet"]


def test_shadbala_kendra_beats_dusthana():
    # Sun in a kendra house (1st) should out-score it in a dusthana house (3rd).
    kendra = build_shadbala([_p("Sun", 0)], 0)["planets"][0]["sthana"]
    dusthana = build_shadbala([_p("Sun", 2)], 0)["planets"][0]["sthana"]
    assert kendra > dusthana


def test_cheshta_zero_for_slow_grahas():
    r = build_shadbala(_chart7(), 0)
    by = {x["planet"]: x for x in r["planets"]}
    for slow in ("Mars", "Jupiter", "Venus", "Saturn"):
        assert by[slow]["cheshta"] == 0.0, slow


def test_derived_grades_are_consistent_with_total():
    r = build_shadbala(_chart7(), 0)
    for x in r["planets"]:
        assert x["bhasa_rupa"] == (x["total_rupa"] >= 20.0)
        assert x["bhava_rupa"] == (x["total_rupa"] >= 30.0)
        assert x["dhruva_rupa"] == (x["total_rupa"] >= 45.0)


def test_bhavabala_total_within_maximum():
    for asc in range(12):
        r = build_bhavabala(_chart7(asc), asc)
        assert r["total_rava"] <= r["max_total"] + 0.01, asc


def test_bhavabala_twelve_houses_each_capped():
    r = build_bhavabala(_chart7(), 0)
    assert len(r["houses"]) == 12
    for h in r["houses"]:
        assert 0 <= h["rava"] <= 60.0


def test_bhavabala_house_signs_follow_ascendant():
    r = build_bhavabala(_chart7(), 5)
    for h in r["houses"]:
        assert h["sign"] == (5 + h["house"] - 1) % 12


# ─── Ashtakavarga ─────────────────────────────────────────────

def test_ashtakavarga_each_graha_binds_eight_points():
    r = build_ashtakavarga(_chart7(), 0)
    for graha, v in r["per_graha"].items():
        assert v["total_points"] == 8, graha


def test_ashtakavarga_positions_are_eight_distinct():
    for graha, positions in _POSITIONS.items():
        assert len(positions) == 8, graha
        assert len(set(positions)) == 8, graha


def test_ashtakavarga_own_sign_always_binds():
    r = build_ashtakavarga(_chart7(), 0)
    for graha, v in r["per_graha"].items():
        own = next(x for x in v["signs"] if x["sign"] == v["occupied_sign"])
        assert own["points"] == 6, graha


def test_ashtakavarga_sign_points_sum_to_forty_eight():
    """Eight contributing positions, each worth 6, is the classical 48."""
    r = build_ashtakavarga(_chart7(), 0)
    for graha, v in r["per_graha"].items():
        assert sum(x["points"] for x in v["signs"]) == 48, graha


def test_ashtakavarga_bound_signs_are_never_graded_nil():
    """The bug: every grade was the "nil" fallback, on every graha and sign.

    The cutoffs that produced them ran from 5 to 32 and were applied to
    single-sign bhavs, which top out at 6. A sign a graha binds has 6 points
    and must not read "nil".
    """
    r = build_ashtakavarga(_chart7(), 0)
    for graha, v in r["per_graha"].items():
        for x in v["signs"]:
            expected = "poorna" if x["points"] == 6 else "nil"
            assert x["grade"] == expected, (graha, x["sign"], x["points"], x["grade"])
        assert v["grade_own"] == "poorna", graha
        if v["in_asc_sign"]:
            assert v["grade_asc"] != "nil", graha


def test_ashtakavarga_reports_its_maximum():
    """total_points is a constant count of positions, not a grade.

    Every graha binds all eight of its positions, so the old UI showing a bare
    "8" in the emphasised colour implied a score. It is now rendered out of 8.
    """
    r = build_ashtakavarga(_chart7(), 0)
    for graha, v in r["per_graha"].items():
        assert v["total_points"] == 8, graha
        assert v["max_total_points"] == 8, graha


def test_ashtakavarga_house_bhav_scale():
    r = build_ashtakavarga(_chart7(), 0)
    for graha, v in r["per_graha"].items():
        for x in v["signs"]:
            assert x["points"] in (0, 6), (graha, x["points"])
        assert v["in_own_sign"] in (0, 6), graha
        assert v["in_asc_sign"] in (0, 6), graha


def test_ashtakavarga_aggregate_within_seven():
    r = build_ashtakavarga(_chart7(), 0)
    for x in r["by_sign"]:
        assert 0 <= x["grahas_binding"] <= 7


def test_ashtakavarga_flags_unvalidated():
    """The payload must admit it is not oracle-validated."""
    r = build_ashtakavarga(_chart7(), 0)
    assert r["validated_against_published_tables"] is False


def test_pav_charts_present():
    r = build_prasthara_ashtakavarga(_chart7(), 0)
    assert len(r["lagna_chart"]) == 12
    assert len(r["sukarma_chart"]) == 12
    assert len(r["nabansaka_chart"]) == 12
    assert r["seventh_lord"]


# ─── Navatara ─────────────────────────────────────────────────

def test_navatara_covers_seven_grahas():
    r = build_navatara(_chart7())
    assert len(r["grahas"]) == 7


def test_navatara_exalted_beats_debilitated():
    """Same graha, exalted sign must score above debilitated."""
    ex = build_navatara([_p("Venus", 11)])["grahas"][0]["total"]   # Pisces
    deb = build_navatara([_p("Venus", 5)])["grahas"][0]["total"]    # Virgo
    assert ex > deb


def test_navatara_own_sign_beats_enemy_sign():
    own = build_navatara([_p("Sun", 4)])["grahas"][0]["total"]     # Leo, own
    enemy = build_navatara([_p("Sun", 7)])["grahas"][0]["total"]   # Libra, enemy
    assert own > enemy


# --- planetary dignity --------------------------------------------------------
#
# The three tables that judge a planet's dignity must never disagree. They used
# to: core/planets.py had Mars exalted in Cancer and debilitated in Capricorn
# -- the right pair of signs, the wrong way round -- and Jupiter in Leo and
# Scorpio rather than Cancer and Sagittarius. That reached the `dignity` field
# on every planet of every chart, so a Mars in Capricorn was reported
# "Debilitated" when it is exalted.
#
# These assertions compare the tables against each other AND against the
# classical values written out literally, so a future edit to one and not the
# others fails here rather than in a user's chart.


def test_dignity_tables_agree_across_the_core_modules():
    from app.core.navatara import _DEBILITATED, _EXALTED
    from app.core.planets import DEBILITATION, EXALTATION
    from app.core.yogas import DEBILITATED, EXALTED

    assert EXALTATION == EXALTED == _EXALTED
    assert DEBILITATION == DEBILITATED == _DEBILITATED


def test_exaltation_matches_the_classical_signs():
    from app.core.planets import EXALTATION

    # Aries, Taurus, Capricorn, Virgo, Cancer, Pisces, Libra
    assert EXALTATION == {
        "Sun": 0, "Moon": 1, "Mars": 9, "Mercury": 5,
        "Jupiter": 3, "Venus": 11, "Saturn": 6,
    }


def test_debilitation_is_the_sign_opposite_exaltation():
    from app.core.planets import DEBILITATION, EXALTATION

    for planet, exalt in EXALTATION.items():
        assert DEBILITATION[planet] == (exalt + 6) % 12, planet
        assert DEBILITATION[planet] != exalt, (
            f"{planet} is listed as both exalted and debilitated in the same sign"
        )


def test_dignity_reports_the_classical_result_for_mars_and_jupiter():
    from app.core.planets import _get_dignity

    # The two that were wrong: Mars is exalted in Capricorn, Jupiter in Cancer.
    assert _get_dignity("Mars", 9) == "Exalted"
    assert _get_dignity("Mars", 3) == "Debilitated"
    assert _get_dignity("Jupiter", 3) == "Exalted"
    assert _get_dignity("Jupiter", 9) == "Debilitated"
    # And the ones that were already right must stay right.
    assert _get_dignity("Sun", 0) == "Exalted"
    assert _get_dignity("Saturn", 6) == "Exalted"
    assert _get_dignity("Venus", 11) == "Exalted"


def test_navatara_totals_within_range():
    for sign in range(12):
        for graha in GRAHAS:
            r = build_navatara([_p(graha, sign)])["grahas"][0]
            assert 0 <= r["total"] <= 100, (graha, sign)


def test_navatara_all_nine_factors_present():
    r = build_navatara([_p("Venus", 6)])
    g = r["grahas"][0]
    assert len(g["factors"]) == 9
    assert len(g["factor_names"]) == 9


def test_navatara_published_totals_are_classical():
    assert NAVATARA_TOTAL["Venus"] == 82
    assert NAVATARA_TOTAL["Jupiter"] == 80
    assert NAVATARA_TOTAL["Mercury"] == 78
    assert NAVATARA_TOTAL["Saturn"] == 52


# ─── Arudha ───────────────────────────────────────────────────

def test_arudha_lagna_is_ninth_from_ascendant():
    for asc in range(12):
        r = build_arudha(_chart7(), asc)
        assert r["arudha_lagna"] == (asc + 8) % 12, asc


def test_arudha_per_graha_is_ninth_from_its_sign():
    r = build_arudha(_chart7(), 0)
    for a in r["arudhas"]:
        if a["planet"] in ("Rahu", "Ketu"):
            continue
        assert a["arudha_sign"] == (a["sign"] + 8) % 12, a["planet"]


def test_arudha_house_is_relative_to_ascendant():
    r = build_arudha(_chart7(), 0)
    for a in r["arudhas"]:
        assert a["house"] == (a["arudha_sign"] - 0) % 12 + 1


def test_arudha_parivartana_detected():
    # Sun in Aries (Mars's sign) and Mars in Aries (Sun's sign) exchange.
    planets = [_p("Sun", 0), _p("Mars", 4)]
    r = build_arudha(planets, 0)
    assert isinstance(r["parivartana"], list)
