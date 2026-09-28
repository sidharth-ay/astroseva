"""Yoga + Navamsha parity tests (AstroSage rule set)."""

from app.core.yogas import detect_yogas
from app.core.vargas import get_navamsa_sign, get_navamsa_positions


def _p(name, sign):
    return {"planet": name, "sign": sign}


def _names(yogas):
    return [y["name"] for y in yogas]


def test_gaja_kesari():
    # Jupiter kendra (7th) from Moon
    planets = [_p("Jupiter", 4), _p("Moon", 1)]
    names = _names(detect_yogas(planets, 0, 1))
    assert "Gaja Kesari Yoga" in names


def test_no_gaja_kesari():
    # Jupiter 3rd from Moon -> no Gaja Kesari
    planets = [_p("Jupiter", 3), _p("Moon", 1)]
    assert "Gaja Kesari Yoga" not in _names(detect_yogas(planets, 0, 1))


def test_ruchaka_mahapurusha():
    # Mars own sign (Aries) in Lagna kendra (1st)
    planets = [_p("Mars", 0)]
    names = _names(detect_yogas(planets, 0, 5))
    assert "Ruchaka Mahapurusha Yoga" in names


def test_budha_aditya():
    planets = [_p("Sun", 4), _p("Mercury", 4)]
    assert "Budha-Aditya Yoga" in _names(detect_yogas(planets, 4, 1))


def test_kemadruma():
    # Nothing flanking the Moon (Moon sign 1, others far)
    planets = [_p("Moon", 1), _p("Sun", 6), _p("Mars", 9)]
    assert "Kemadruma Yoga" in _names(detect_yogas(planets, 0, 1))


def test_chandra_mangala():
    planets = [_p("Moon", 3), _p("Mars", 3)]
    assert "Chandra-Mangala Yoga" in _names(detect_yogas(planets, 0, 3))


def test_navamsa_movable_fixed_dual():
    # Aries 0° -> same sign; Taurus 0° -> from 9th (Capricorn 9)
    assert get_navamsa_sign(0, 0.0) == 0
    assert get_navamsa_sign(1, 0.0) == 9
    # Gemini (dual) 0° -> from 5th (Libra 6)
    assert get_navamsa_sign(2, 0.0) == 6
    # Last pada of Aries (29°) -> pada 8 -> sign 8
    assert get_navamsa_sign(0, 29.0) == 8


def test_navamsa_positions_map():
    m = get_navamsa_positions([
        {"planet": "Sun", "sign": 0, "sign_degree": 0.0},
        {"planet": "Moon", "sign": 1, "sign_degree": 0.0},
    ])
    assert m == {"Sun": 0, "Moon": 9}
