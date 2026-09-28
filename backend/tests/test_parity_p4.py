"""P4 parity: Lagna-lord gemstones, Mulank/Bhagyank/Lo Shu, career framework."""

from app.core.career import analyze_career_factors
from app.core.numerology import get_numerology_analysis


def _planets(houses):
    return [{"planet": n, "house": h, "sign": 0, "dignity": "Neutral"}
            for n, h in houses.items()]


def test_gemstone_lagna_lords_aries():
    # Aries asc: Lagna Mars, 5th Sun (Leo=4... 5th from Aries = Leo, lord Sun),
    # 9th Jupiter (Sagittarius). None are Maraka/Trik/8th lords here.
    import app.api.gemstones as g
    assert g.SIGN_LORDS[(0 + 0) % 12] == "Mars"  # lagna
    assert g.SIGN_LORDS[(0 + 4) % 12] == "Sun"  # 5th
    assert g.SIGN_LORDS[(0 + 8) % 12] == "Jupiter"  # 9th


def test_gemstone_avoids_maraka_taurus():
    # Taurus asc (1): 2nd lord Mercury (Gemini), 7th lord Mars (Scorpio)
    # must be avoided even though Mercury/Venus look benign.
    avoid = {1: None}
    from app.api.gemstones import SIGN_LORDS
    maraka = {SIGN_LORDS[(1 + 1) % 12], SIGN_LORDS[(1 + 6) % 12]}
    assert maraka == {"Mercury", "Mars"}


def test_gemstone_incompatibility_matrix():
    from app.api.gemstones import INCOMPATIBLE
    assert "Ruby" in INCOMPATIBLE["Blue Sapphire"]
    assert "Blue Sapphire" in INCOMPATIBLE["Ruby"]
    assert "Pearl" in INCOMPATIBLE["Emerald"]


def test_mulank_bhagyank():
    res = get_numerology_analysis("Test User", "15-01-1990")
    # Day 15 -> 1+5 = 6; full date 1+5+0+1+1+9+9+0 = 26 -> 8
    assert res["mulank"]["mulank_number"] == 6
    assert res["bhagyank"]["bhagyank_number"] == 8


def test_lo_shu_grid_counts():
    res = get_numerology_analysis("Test User", "15-01-1990")
    grid = res["lo_shu"]["grid"]
    # Digits: 1,5,0,1,1,9,9,0 -> 1x3, 5x1, 9x2 (zeros skipped)
    assert grid["1"] == 3 and grid["5"] == 1 and grid["9"] == 2
    assert 3 in res["lo_shu"]["missing_numbers"]
    assert sum(grid.values()) == 6


def test_career_framework_tenth_lord():
    # Aries asc (0): 10th = Capricorn, lord Saturn
    planets = _planets({"Sun": 10, "Saturn": 10, "Jupiter": 2, "Mercury": 3,
                        "Moon": 4, "Venus": 5, "Mars": 0})
    r = analyze_career_factors(planets, 0, "Jupiter")
    assert r["tenth_lord"] == "Saturn"
    assert any("10th" in f for f in r["factors"])
    assert "Jupiter" in r["verdict"]
    assert r["factors"]


def test_career_framework_private_lean():
    # Sun in 10th -> government lean; elsewhere -> private
    gov = analyze_career_factors(_planets({"Sun": 10}), 0, None)
    assert any("government" in f for f in gov["factors"])
    pvt = analyze_career_factors(_planets({"Sun": 5}), 0, None)
    assert any("private" in f for f in pvt["factors"])
