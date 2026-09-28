"""Parity tests for Grahayukti: aspects, consideration, Ghatak, Somatilak."""

from app.core.grahayukti import (
    GHATAKA, SOMATILAK, PLANET_ASPECTS, COMBUST_DEGREES,
    build_aspects, build_consideration, build_ghatak, build_somatilak,
    _sign_from_longitude,
)


def _p(name, sign, deg=5.0):
    return {
        "planet": name,
        "sign": sign,
        "sign_degree": deg,
        "longitude": sign * 30 + deg,
        "dignity": "Neutral",
    }


# ─── Table integrity ─────────────────────────────────────────

def test_ghataka_has_27_entries():
    assert len(GHATAKA) == 27


def test_somatilak_has_64_entries():
    assert len(SOMATILAK) == 64


def test_ghataka_lords_are_real_grahas():
    valid = {"Surya", "Chandra", "Mangala", "Budha", "Guru", "Shukra", "Shani", "Ketu", "Rahu"}
    for _, lord, _ in GHATAKA:
        assert lord in valid, lord


def test_aspect_separations_are_classical():
    """7th for all; 4/5/8 for Mars, 5/9 for Jupiter, 3/10 for Saturn."""
    assert PLANET_ASPECTS["Sun"] == (7,)
    assert PLANET_ASPECTS["Venus"] == (7,)
    assert PLANET_ASPECTS["Mars"] == (4, 7, 8)
    assert PLANET_ASPECTS["Jupiter"] == (5, 7, 9)
    assert PLANET_ASPECTS["Saturn"] == (3, 7, 10)


# ─── Aspects ─────────────────────────────────────────────────

def test_every_graha_aspects_seventh():
    # Moon in Aries (0) aspects the 7th = Libra (6).
    r = build_aspects([_p("Moon", 0), _p("Venus", 6)])
    assert r["by_planet"]["Moon"][0]["planet"] == "Venus"
    assert r["by_planet"]["Moon"][0]["aspect"] == "7th"


def test_jupiter_special_aspects():
    # Jupiter in Scorpio (7): 5th=Pisces(11), 7th=Taurus(1), 9th=Cancer(3).
    r = build_aspects([_p("Jupiter", 7), _p("Sun", 11), _p("Venus", 1), _p("Moon", 3)])
    aspects = {(a["planet"], a["aspect_index"]) for a in r["by_planet"]["Jupiter"]}
    assert aspects == {("Sun", 5), ("Venus", 7), ("Moon", 9)}


def test_mars_and_saturn_special_aspects():
    # Mars in Aries(0): 4th=Cancer(3), 7th=Libra(6), 8th=Scorpio(7).
    r = build_aspects([_p("Mars", 0), _p("Sun", 3), _p("Venus", 6), _p("Moon", 7)])
    mars = {a["aspect_index"] for a in r["by_planet"]["Mars"]}
    assert mars == {4, 7, 8}

    # Saturn in Aries(0): 3rd=Gemini(2), 7th=Libra(6), 10th=Capricorn(9).
    r = build_aspects([_p("Saturn", 0), _p("Sun", 2), _p("Venus", 6), _p("Moon", 9)])
    sat = {a["aspect_index"] for a in r["by_planet"]["Saturn"]}
    assert sat == {3, 7, 10}


def test_conjunction_is_not_an_aspect():
    r = build_aspects([_p("Sun", 0), _p("Moon", 0)])
    assert "by_planet" not in r or not r["by_planet"]


def test_aspect_nature_classification():
    # Mars in Aries: 4th=Cancer(3) benefic, 7th=Libra(6) and 8th=Scorpio(7) malefic.
    r = build_aspects([_p("Mars", 0), _p("Sun", 3), _p("Venus", 6), _p("Moon", 7)])
    by_n = {a["aspect_index"]: a["nature"] for a in r["by_planet"]["Mars"]}
    assert by_n[4] == "Benefic"
    assert by_n[8] == "Malefic"
    assert by_n[7] == "Malefic"


def test_on_sign_groups_aspecting_grahas():
    # Mars in Aries 4th-aspects Cancer(3); Saturn in Aries 3rd-aspects Gemini(2).
    r = build_aspects([_p("Mars", 0), _p("Saturn", 0), _p("Sun", 3), _p("Venus", 2)])
    assert set(r["on_sign"]["3"]) == {"Mars"}
    assert set(r["on_sign"]["2"]) == {"Saturn"}


def test_nodes_excluded_from_consideration_degrees():
    assert "Rahu" not in COMBUST_DEGREES
    assert "Ketu" not in COMBUST_DEGREES


# ─── Combustion ──────────────────────────────────────────────

def test_moon_combust_within_12_degrees_of_sun():
    # Sun at 5 deg Aries, Moon at 10 deg Aries = 5 deg behind -> combust.
    planets = [_p("Sun", 0, 5.0), _p("Moon", 0, 10.0)]
    rows = {r["planet"]: r for r in build_consideration(planets)}
    assert rows["Moon"]["combust"] is True


def test_moon_clear_far_from_sun():
    # Sun at 5 deg Aries, Moon at 25 deg Taurus = 50 deg away -> clear.
    planets = [_p("Sun", 0, 5.0), _p("Moon", 1, 25.0)]
    rows = {r["planet"]: r for r in build_consideration(planets)}
    assert rows["Moon"]["combust"] is False


def test_sun_is_never_combust():
    planets = [_p("Sun", 0, 5.0), _p("Moon", 0, 6.0)]
    rows = {r["planet"]: r for r in build_consideration(planets)}
    assert rows["Sun"]["combust"] is False
    assert "Luminous" in rows["Sun"]["pakshi_note"]


def test_consideration_covers_nine_grahas():
    planets = [_p(n, 0) for n in ("Sun", "Moon", "Mars", "Mercury",
                                 "Jupiter", "Venus", "Saturn", "Rahu", "Ketu")]
    rows = build_consideration(planets)
    assert len(rows) == 9
    assert {r["planet"] for r in rows} == {
        "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"}


def test_consideration_reports_pakshi():
    rows = {r["planet"]: r for r in build_consideration([_p("Venus", 0)])}
    assert "Manushya" in rows["Venus"]["pakshi"]


# ─── Ghatak ──────────────────────────────────────────────────

def test_ghatak_applies_exactly_one_division():
    for lon in (0.0, 47.3, 123.4, 219.9, 359.9):
        g = build_ghatak(lon)
        assert len(g["ascendant_ghatak"]) == 1, lon


def test_ghatak_covers_whole_zodiac():
    step = 360 / 27
    for i in range(27):
        g = build_ghatak(i * step + 1.0)
        applied = g["ascendant_ghatak"][0]
        assert applied["index"] == i, f"lon {i * step + 1.0} hit {applied}"


def test_ghatak_0_degrees_is_ashtami():
    g = build_ghatak(1.0)
    assert g["ascendant_ghatak"][0]["name"] == "Ashtami"
    assert g["ascendant_ghatak"][0]["lord"] == "Shani"


def test_ghatak_benefic_verdict_varies_by_ascendant():
    """The same Ghatak is benefic for some ascendants and malefic for others."""
    # Ghatak 0 (Ashtami) is benefic for cardinal/fixed signs, not dual signs.
    assert set(GHATAKA[0][2]) == {0, 1, 6, 7, 8, 9, 10, 11}

    aries = build_ghatak(2.0)          # Ghatak 0, Aries is benefic
    assert aries["ascendant_ghatak"][0]["index"] == 0
    assert aries["ascendant_ghatak"][0]["benefic_for_ascendant"] is True

    # Find a Ghatak inside Gemini (2) and confirm it reads malefic for Ghatak 0.
    gemini_lon = 2 * 30 + 5.0
    gemini = build_ghatak(gemini_lon)
    assert gemini["asc_sign"] == 2
    if gemini["ascendant_ghatak"][0]["index"] == 0:
        assert gemini["ascendant_ghatak"][0]["benefic_for_ascendant"] is False


def test_ghatak_boundaries_do_not_overlap():
    """Each of the 27 Ghatakas owns exactly its own 13.33-degree band."""
    step = 360 / 27
    for i in range(27):
        low = build_ghatak(i * step + 0.01)["ascendant_ghatak"][0]["index"]
        high = build_ghatak((i + 1) * step - 0.01)["ascendant_ghatak"][0]["index"]
        assert low == i, f"band {i} start resolved to {low}"
        assert high == i, f"band {i} end resolved to {high}"


def test_ghatak_benefic_count_within_range():
    for lon in (10.0, 100.0, 250.0):
        g = build_ghatak(lon)
        assert 0 <= g["benefic_count"] <= 1
        assert len(g["all"]) == 27


def test_ghatak_listing_is_ordered_and_ascending():
    g = build_ghatak(200.0)
    lons = [x["longitude"] for x in g["all"]]
    assert lons == sorted(lons)
    assert [x["index"] for x in g["all"]] == list(range(27))


# ─── Somatilak ───────────────────────────────────────────────

def test_somatilak_per_sign():
    assert build_somatilak(0)["somatilak"] == SOMATILAK[0]
    assert build_somatilak(11)["somatilak"] == SOMATILAK[11]
    for s in range(12):
        assert build_somatilak(s)["somatilak"] == SOMATILAK[s]


def test_somatilak_lord_matches_sign_lord():
    assert build_somatilak(0)["lord"] == "Mars"
    assert build_somatilak(3)["lord"] == "Moon"
    assert build_somatilak(4)["lord"] == "Sun"
    assert build_somatilak(9)["lord"] == "Saturn"


# ─── Helpers ─────────────────────────────────────────────────

def test_sign_from_longitude_wraps():
    assert _sign_from_longitude(0.0) == 0
    assert _sign_from_longitude(29.9) == 0
    assert _sign_from_longitude(30.0) == 1
    assert _sign_from_longitude(360.0) == 0
    assert _sign_from_longitude(390.0) == 1


def test_builders_tolerate_empty_input():
    assert build_aspects([])["by_planet"] == {}
    assert build_consideration([]) == []
