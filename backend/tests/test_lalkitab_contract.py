"""The Lal Kitab contract the page actually renders against.

`/lalkitab/chart` returned a shape the page could not consume: `remedies` was a
dict keyed by planet name, and the page called `.map` on it. `houses` held bare
planet name strings where the page read `occ.planet`. `name` and `birth_place`
were absent, being nested under a `birth_data` object the page never looked at.
These tests assert the response shape rather than the astrology, so they stay
valid if the remedy text changes.
"""

SAMPLE = {
    "name": "Test User",
    "birth_date": "1990-05-15",
    "birth_time": "10:30:00",
    "birth_place": "New Delhi",
    "latitude": 28.6139,
    "longitude": 77.209,
    "timezone_offset": 5.5,
}


def _post(client, **overrides):
    body = {**SAMPLE, **overrides}
    return client.post("/api/v1/lalkitab/chart", json=body)


def test_lalkitab_chart_returns_the_fields_the_page_reads(client):
    """name and birth_place were nested under birth_data and read as undefined."""
    r = _post(client)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "Test User"
    assert body["birth_place"] == "New Delhi"
    assert body["birth_date"] and body["birth_time"]


def test_lalkitab_remedies_is_a_list(client):
    """The page calls `result.remedies.map(...)`; a dict has no .map.

    This was the crash: the endpoint returned a dict keyed by planet name.
    """
    remedies = _post(client).json()["remedies"]
    assert isinstance(remedies, list), type(remedies)
    assert remedies
    for r in remedies:
        assert r["planet"]
        assert isinstance(r["house"], int)
        assert r["remedy"]
        assert r["general_remedy"]


def test_lalkitab_house_occupants_are_objects_with_a_planet_field(client):
    """The page renders `occ.planet`; the cells held bare name strings."""
    houses = _post(client).json()["houses"]
    assert set(houses) == {str(i) for i in range(1, 13)}
    for key, occupants in houses.items():
        assert isinstance(occupants, list), key
        for occ in occupants:
            assert isinstance(occ, dict), (key, occ)
            assert occ["planet"]


def test_lalkitab_planets_list_covers_every_body_with_a_degree(client):
    """The placements table formats `p.degree.toFixed(1)`."""
    planets = _post(client).json()["planets"]
    names = {p["planet"] for p in planets}
    assert {"Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"} <= names
    for p in planets:
        assert isinstance(p["house"], int)
        assert 0 <= p["degree"] < 30, p
        assert p["sign"]


def test_lalkitab_every_planet_lands_in_exactly_one_house(client):
    body = _post(client).json()
    in_houses = [o["planet"] for occs in body["houses"].values() for o in occs]
    assert len(in_houses) == len(set(in_houses)), "a planet appears in two houses"
    assert sorted(in_houses) == sorted(p["planet"] for p in body["planets"])


def test_lalkitab_house_remedy_matches_the_house_the_planet_is_in(client):
    """A remedy is chosen by the planet's house, so the two must agree."""
    body = _post(client).json()
    houses_of = {p["planet"]: p["house"] for p in body["planets"]}
    for r in body["remedies"]:
        assert r["house"] == houses_of[r["planet"]], r["planet"]


def test_lalkitab_remedies_are_ordered_by_house(client):
    """The cards render in list order, so house order is what the user sees."""
    remedies = _post(client).json()["remedies"]
    houses = [r["house"] for r in remedies]
    assert houses == sorted(houses), houses
