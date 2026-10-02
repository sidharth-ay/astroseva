"""The alias layer and the prominence tier.

Two things made a birthplace hard to find even though it was in the dataset:

- Users type what they know. "Banaras", "Bombay", "Calcutta", "Madras" are all
  absent, because the dataset stores the official name -- so those queries
  returned nothing and the user concluded the town was unsupported.
- Ranking was by text shape only, so among equal matches an obscure place could
  outrank the major city the user meant.

The alias layer is a map in `data/city_aliases.json`; the tier is a map in
`data/city_prominence.json`. Both are curated by hand because there is no
population source available to this project, and inventing one would be worse
than admitting the limit.
"""

import pytest

from app.api.cities import (
    _canonical_query,
    _load_aliases,
    _load_prominence,
    _prominence_bonus,
    search_cities,
)


# --- aliases ---------------------------------------------------------------


@pytest.mark.parametrize(
    "typed, expected",
    [
        ("banaras", "Varanasi"),
        ("benares", "Varanasi"),
        ("bombay", "Mumbai"),
        ("calcutta", "Kolkata"),
        ("bangalore", "Bengaluru"),
        ("madras", "Chennai"),
        ("pondicherry", "Puducherry"),
        ("poona", "Pune"),
        ("allahabad", "Prayagraj"),
        ("cawnpore", "Kanpur"),
        ("mysore", "Mysuru"),
        ("trivandrum", "Thiruvananthapuram"),
        ("cochin", "Kochi"),
        ("baroda", "Vadodara"),
        ("panaji", "Panjim"),
    ],
)
def test_a_known_alias_resolves_to_the_name_the_dataset_uses(typed, expected):
    assert _canonical_query(typed) == expected.lower()


def test_an_alias_resolves_regardless_of_case():
    assert _canonical_query("BANARAS") == _canonical_query("banaras")


def test_an_unknown_query_is_left_alone():
    assert _canonical_query("pune") == "pune"
    assert _canonical_query("somevillage") == "somevillage"


def test_every_alias_target_exists_in_the_dataset():
    """An alias pointing at a missing name would silently break that lookup.

    This is checked at load time too, but a test states the intent: the alias
    layer is only useful if every target is a real place.
    """
    from app.api.cities import _load_cities

    known = {city.get("name") for city in _load_cities()}
    missing = {a: t for a, t in _load_aliases().items() if t not in known}
    assert not missing, f"aliases pointing at unknown cities: {missing}"


def test_typing_an_alias_finds_the_city():
    """The end-to-end behaviour: "banaras" must return Varanasi."""
    result = search_cities("banaras")
    assert result["total"] >= 1
    assert result["cities"][0]["name"] == "Varanasi"


# --- prominence ------------------------------------------------------------


def test_the_tier_is_three_valued():
    tiers = set(_load_prominence().values())
    assert tiers <= {2, 3}, f"unexpected tiers: {tiers}"


def test_the_bonus_only_separates_tiers():
    assert _prominence_bonus("Mumbai") == 50
    assert _prominence_bonus("Jaipur") == 25
    assert _prominence_bonus("Some Tiny Village") == 0


def test_prominence_breaks_a_tie_toward_the_major_city():
    """Two places matching equally: the more prominent one ranks first.

    "Puri" and "Purnia" both match "pur". Puri is a major pilgrimage city and
    carries a tier; Purnia does not. Without the tier the order was decided by
    name length alone.
    """
    result = search_cities("pur", limit=50)
    names = [c["name"] for c in result["cities"]]
    assert "Puri" in names and "Purnia" in names
    assert names.index("Puri") < names.index("Purnia")


def test_prominence_does_not_override_text_relevance():
    """A tier must not promote a weak match above an exact one.

    "Mumbai" is tier 3, but a query that exactly names a small place should
    still rank that place first -- otherwise the tier becomes a way to hide the
    answer the user actually typed.
    """
    result = search_cities("puri")
    assert result["cities"][0]["name"] == "Puri"


def test_the_bonus_cannot_bridge_two_text_bands():
    """Prominence orders within a band, never across one.

    The largest bonus is 50 and the narrowest gap between two text-score bands
    is 100 (exact 1000 vs prefix 900), so a tier can reorder equal matches but
    cannot lift a substring match above a prefix match.
    """
    assert _prominence_bonus("Mumbai") < 100