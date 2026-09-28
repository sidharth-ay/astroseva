"""Dosha oracle tests — AstroSage published verdicts + engine invariants.

Manglik oracles mirror AstroSage celebrity verdicts (Lagna/Moon Mars houses):
- SRK pattern: Mars 4th from Lagna, 11th from Moon -> Lagna-only (Low)
- Akshay pattern: Mars 1st from Lagna, 2nd from Moon -> Lagna-only (Low)
- Ajay pattern: Mars 5th from Lagna, 3rd from Moon -> neither (None)
- Jolie/Biden pattern: Mars 10th/11th from Lagna, 1st/7th from Moon -> Moon-only (Low)

Sade Sati oracles mirror published phase tables:
- Hawking (Moon Leo): Saturn in Leo mid-1948 -> Peak
- Markle (Moon Virgo): Saturn in Virgo 1980-82 -> Peak
"""

from app.core.doshas import (
    detect_all_doshas,
    detect_manglik,
    detect_pitru_dosha,
    detect_sade_sati,
    get_transit_saturn_sign,
)
from app.core.planets import get_planetary_positions
from app.models.response import DoshaResponse


def _chart_positions(year, month, day, hour, minute, tz, lat, lon):
    pos = get_planetary_positions(year, month, day, hour, minute, tz, lat, lon)
    asc = int(pos["ascendant"] / 30)
    moon = next(p["sign"] for p in pos["planets"] if p["planet"] == "Moon")
    return pos["planets"], asc, moon


def _mars_houses(planets, asc, moon):
    mars_sign = next(p["sign"] for p in planets if p["planet"] == "Mars")
    return (mars_sign - asc) % 12 + 1, (mars_sign - moon) % 12 + 1


def test_verdict_srk_lagna_only():
    # SRK: Nov 02 1965 02:30 Delhi — AstroSage: 4th Lagna / 11th Moon, Lagna-only.
    planets, asc, moon = _chart_positions(1965, 11, 2, 2, 30, 5.5, 28.6139, 77.2090)
    lagna_h, moon_h = _mars_houses(planets, asc, moon)
    assert (lagna_h, moon_h) == (4, 11)
    r = detect_manglik(planets, asc, moon)
    assert r["lagna_manglik"] is True and r["moon_manglik"] is False
    assert r["has_placement"] is True  # shown even though own-sign mitigated


def test_verdict_akshay_lagna_only():
    # Akshay: Sep 09 1967 12:05 Amritsar — AstroSage: 1st Lagna / 2nd Moon, Lagna-only.
    planets, asc, moon = _chart_positions(1967, 9, 9, 12, 5, 5.5, 31.63, 74.87)
    lagna_h, moon_h = _mars_houses(planets, asc, moon)
    assert (lagna_h, moon_h) == (1, 2)
    r = detect_manglik(planets, asc, moon)
    assert r["lagna_manglik"] is True and r["moon_manglik"] is False
    # Jupiter aspects Mars -> mitigated but SHOWN (never hidden)
    assert r["has_placement"] is True and r["severity"] == "Mitigated"


def test_verdict_ajay_neither():
    # Ajay: Apr 02 1969 13:32 Delhi — AstroSage: 5th / 3rd, neither.
    planets, asc, moon = _chart_positions(1969, 4, 2, 13, 32, 5.5, 28.6139, 77.2090)
    lagna_h, moon_h = _mars_houses(planets, asc, moon)
    assert (lagna_h, moon_h) == (5, 3)
    r = detect_manglik(planets, asc, moon)
    assert r["is_manglik"] is False and r["has_placement"] is False
    assert r["severity"] == "None"


def test_verdict_jolie_moon_only():
    # Jolie pattern: Mars 10th Lagna / 1st Moon -> Moon-only Low.
    # Mars sign 1; asc 4 -> (1-4)%12+1 = 10; moon 1 -> house 1.
    r = detect_manglik([_mars(1)], 4, 1)
    assert r["lagna_manglik"] is False and r["moon_manglik"] is True
    assert r["is_manglik"] is True and r["severity"] == "Low"


def test_verdict_biden_moon_only():
    # Biden pattern: Mars 11th Lagna / 7th Moon -> Moon-only Low.
    # Mars sign 2; asc 4 -> (2-4)%12+1 = 11; moon 8 -> (2-8)%12+1 = 7.
    r = detect_manglik([_mars(2)], 4, 8)
    assert r["lagna_manglik"] is False and r["moon_manglik"] is True
    assert r["is_manglik"] is True and r["severity"] == "Low"


def _mars(sign, dignity="Neutral", own=False):
    return {"planet": "Mars", "sign": sign, "dignity": dignity, "is_own_sign": own}


# --- Manglik oracles (sign arithmetic: house = (mars - ref) % 12 + 1) ---

def test_manglik_lagna_only_low():
    # Mars sign 0; asc 9 -> Lagna house 4; moon 3 -> Moon house 10
    r = detect_manglik([_mars(0)], 9, 3)
    assert r["is_manglik"] is True
    assert r["lagna_manglik"] is True
    assert r["moon_manglik"] is False
    assert r["severity"] == "Low"


def test_manglik_moon_only_low():
    # Mars sign 0; asc 3 -> Lagna house 10; moon 0 -> Moon house 1
    r = detect_manglik([_mars(0)], 3, 0)
    assert r["is_manglik"] is True
    assert r["lagna_manglik"] is False
    assert r["moon_manglik"] is True
    assert r["severity"] == "Low"


def test_manglik_neither():
    # Mars sign 0; asc 8 -> Lagna house 5; moon 10 -> Moon house 3
    r = detect_manglik([_mars(0)], 8, 10)
    assert r["is_manglik"] is False
    assert r["severity"] == "None"


def test_manglik_both_charts_high():
    # Mars sign 0; asc 11 -> Lagna house 2; moon 5 -> Moon house 8
    r = detect_manglik([_mars(0)], 11, 5)
    assert r["is_manglik"] is True
    assert r["severity"] == "High"


def test_manglik_moon_second_excluded():
    # AstroSage verdict pattern (Akshay): Moon-2nd Mars reads "not present".
    # Mars sign 0; asc 9 -> Lagna house 4; moon 11 -> Moon house 2 (excluded).
    r = detect_manglik([_mars(0)], 9, 11)
    assert r["lagna_manglik"] is True
    assert r["moon_manglik"] is False
    assert r["severity"] == "Low"


def test_manglik_mitigated_shown_not_hidden():
    # Real placement + Jupiter aspect: inactive but REPORTED as Mitigated.
    r = detect_manglik([_mars(0), {"planet": "Jupiter", "sign": 6}], 9, 3)
    assert r["is_manglik"] is False
    assert r["has_placement"] is True
    assert r["severity"] == "Mitigated"
    assert len(r["positions"]) > 0
    # Lagna hit but Jupiter aspects Mars (Mars 0, Jupiter 6 -> diff 6 = 7th aspect)
    r = detect_manglik([_mars(0), {"planet": "Jupiter", "sign": 6}], 9, 3)
    assert r["is_manglik"] is False
    assert r["cancellation"] is True
    assert "Jupiter" in r["cancellation_reason"]


def test_manglik_venus_aspect_cancels():
    # Mars 0, Venus 6 -> opposite (7th aspect)
    r = detect_manglik([_mars(0), {"planet": "Venus", "sign": 6}], 9, 3)
    assert r["is_manglik"] is False
    assert "Venus" in r["cancellation_reason"]


# --- Sade Sati oracles ---

def test_sade_sati_phases_pure():
    assert detect_sade_sati([], 4, 4)["phase"] == "Peak (on Moon sign)"
    assert detect_sade_sati([], 4, 3)["phase"] == "Rising (12th from Moon)"
    assert detect_sade_sati([], 4, 5)["phase"] == "Setting (2nd from Moon)"
    r = detect_sade_sati([], 4, 7)
    assert r["is_active"] is False and r["severity"] == "None"


def test_transit_saturn_matches_history():
    # Published ingresses: Pisces Mar 2025, Aquarius pre-2025, Leo mid-1948, Virgo 1980-82
    assert get_transit_saturn_sign(2025, 6, 1) == 11
    assert get_transit_saturn_sign(2024, 1, 15) == 10
    assert get_transit_saturn_sign(1948, 8, 1) == 4
    assert get_transit_saturn_sign(1981, 9, 1) == 5


def test_sade_sati_hawking_peak():
    # Hawking, Moon Leo (4); Saturn transited Leo Jul 1948 -> Peak per published table
    r = detect_sade_sati([], 4, get_transit_saturn_sign(1948, 8, 1))
    assert r["is_active"] is True
    assert r["phase"] == "Peak (on Moon sign)"
    assert r["transit_based"] is True


def test_sade_sati_markle_peak():
    # Markle, Moon Virgo (5); Saturn in Virgo 1980-82 -> Peak per published table
    r = detect_sade_sati([], 5, get_transit_saturn_sign(1981, 9, 1))
    assert r["is_active"] is True
    assert r["phase"] == "Peak (on Moon sign)"


# --- Pitru oracles ---

def test_pitru_sun_saturn_conjunction():
    planets = [
        {"planet": "Sun", "sign": 2, "house": 5},
        {"planet": "Saturn", "sign": 2, "house": 6},
    ]
    r = detect_pitru_dosha(planets, 0)
    assert r["has_dosha"] is True
    assert any("Sun conjunct Saturn" in c for c in r["conditions"])


def test_pitru_ketu_alone_fifth():
    planets = [{"planet": "Ketu", "sign": 5, "house": 5}]
    r = detect_pitru_dosha(planets, 0)
    assert r["has_dosha"] is True
    assert any("Ketu alone in 5th" in c for c in r["conditions"])


def test_pitru_eighth_lord_in_lagna():
    # Aries asc: 8th sign Scorpio (7), lord Mars; Mars in house 1
    planets = [{"planet": "Mars", "sign": 0, "house": 1}]
    r = detect_pitru_dosha(planets, 0)
    assert r["has_dosha"] is True
    assert any("8th lord Mars in ascendant" in c for c in r["conditions"])


def test_pitru_clean_chart():
    planets = [
        {"planet": "Sun", "sign": 0, "house": 2},
        {"planet": "Moon", "sign": 3, "house": 4},
        {"planet": "Mars", "sign": 5, "house": 6},
        {"planet": "Rahu", "sign": 10, "house": 10},
        {"planet": "Ketu", "sign": 4, "house": 4},
        {"planet": "Saturn", "sign": 8, "house": 7},
        {"planet": "Jupiter", "sign": 1, "house": 3},
        {"planet": "Venus", "sign": 11, "house": 11},
        {"planet": "Mercury", "sign": 6, "house": 9},
    ]
    r = detect_pitru_dosha(planets, 0)
    assert r["has_dosha"] is False


# --- Kaal Sarp oracles (longitude axis + degree rule + 12 types) ---

def _hemmed_chart():
    # All 7 classical planets in the (Rahu 350° -> Ketu 170°) arc.
    planets = [
        {"planet": n, "longitude": float(d), "house": 2}
        for n, d in [("Sun", 10), ("Moon", 40), ("Mars", 70), ("Mercury", 100),
                     ("Jupiter", 130), ("Venus", 150), ("Saturn", 170)]
    ]
    planets += [
        {"planet": "Rahu", "longitude": 350.0, "house": 12},
        {"planet": "Ketu", "longitude": 170.0, "house": 6},
    ]
    return planets


def test_kaal_sarp_present_with_type():
    from app.core.doshas import detect_kaal_sarp
    r = detect_kaal_sarp(_hemmed_chart())
    assert r["has_dosha"] is True
    assert r["kaal_sarp_type"] == "Sheshnaag"  # Rahu house 12
    assert r["severity"] == "High"
    assert r["planets_outside"] == []


def test_kaal_sarp_broken_axis():
    from app.core.doshas import detect_kaal_sarp
    planets = _hemmed_chart()
    planets[0]["longitude"] = 200.0  # Sun escapes the arc
    r = detect_kaal_sarp(planets)
    assert r["has_dosha"] is False
    assert r["kaal_sarp_type"] is None
    assert r["planets_outside"] == ["Sun"]


def test_kaal_sarp_degree_rule():
    # Same-sign degree: Sun 10° exceeds Rahu 5° in Aries -> breaks axis.
    from app.core.doshas import detect_kaal_sarp
    planets = _hemmed_chart()
    for p in planets:
        if p["planet"] == "Rahu":
            p["longitude"] = 5.0
    r = detect_kaal_sarp(planets)
    assert r["has_dosha"] is False
    assert "Sun" in r["planets_outside"]


def test_kaal_sarp_outer_planets_ignored():
    from app.core.doshas import detect_kaal_sarp
    planets = _hemmed_chart()
    planets.append({"planet": "Uranus", "longitude": 250.0, "house": 9})
    r = detect_kaal_sarp(planets)
    assert r["has_dosha"] is True


def test_aggregate_has_kaal_sarp_total_max_4():
    planets = [{"planet": "Mars", "sign": 0, "house": 5}]
    r = detect_all_doshas(planets, 8, 10, transit_saturn_sign=7)
    assert set(r.keys()) == {"manglik", "kaal_sarp", "sade_sati", "pitru_dosha", "total_doshas"}
    assert 0 <= r["total_doshas"] <= 4
    m = DoshaResponse(**r)
    assert m.total_doshas == r["total_doshas"]
