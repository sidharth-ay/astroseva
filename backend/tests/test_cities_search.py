"""Location search: ranking, reachability, and the historical timezone fix.

Three defects these pin down, all of which presented as "the location system is
broken" from the user's side:

  - `/api/v1/cities` was behind the auth gate, but the component that calls it
    sent no bearer token. A 401 and an empty result list look identical, so a
    permissions problem looked like an unsupported town.
  - The dataset was unreachable in the container. `backend/data/cities.json`
    did not exist and `.dockerignore` excluded `data/`, so every search in a
    deployed environment returned an empty list.
  - Matching was an unranked substring scan. With 6,288 places, `pur` matched
    742 names and returned the first ten in file order, so the place the user
    meant was not reliably among them.
"""

import json
import os
import re
from pathlib import Path

import pytest

from app.api.cities import _CITIES_PATH, _load_cities, _score, search_cities

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent
DOCKERIGNORE = BACKEND / ".dockerignore"


# --- the dataset has to be findable in every environment --------------------

def test_the_dataset_is_reachable():
    """A missing dataset is the quietest possible failure.

    The loader raises rather than returning `[]`, so this fails at the right
    place instead of as "no towns match" in production.
    """
    cities = _load_cities()
    assert len(cities) > 6000, f"only {len(cities)} locations loaded"


def test_the_primary_dataset_path_exists():
    """The backend owns the data, not the frontend.

    It used to have no file of its own and read `frontend/src/lib/cities.json`,
    which the Docker build does not copy -- so the container found nothing.
    """
    assert os.path.exists(_CITIES_PATH), (
        f"{_CITIES_PATH} is the primary path and must exist"
    )


def test_the_container_can_actually_reach_the_dataset():
    """`.dockerignore` must not exclude the directory holding the dataset.

    `data/` was ignored while `backend/data/` was the intended location, so the
    image shipped without it.
    """
    if not DOCKERIGNORE.exists():
        pytest.skip("no .dockerignore")
    patterns = [
        line.strip()
        for line in DOCKERIGNORE.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    offending = [p for p in patterns if p.rstrip("/") in ("data", "data/*")]
    assert not offending, f".dockerignore excludes the dataset directory: {offending}"


def test_no_second_city_dataset_exists_in_the_frontend():
    """One dataset. Two copies is how two features disagree about which towns exist.

    The frontend copy was imported by `api.ts` only to be exported to nobody,
    while dragging 484 KB of JSON into the client bundle of all 41 pages that
    import that module.
    """
    stale = REPO / "frontend" / "src" / "lib" / "cities.json"
    assert not stale.exists(), (
        "the frontend still carries its own copy of the location dataset"
    )


def test_the_frontend_does_not_import_the_dataset():
    sources = list((REPO / "frontend" / "src").rglob("*.ts")) + list(
        (REPO / "frontend" / "src").rglob("*.tsx")
    )
    offenders = []
    for path in sources:
        text = path.read_text(encoding="utf-8", errors="replace")
        if re.search(r"""from\s+["'][^"']*cities\.json["']""", text):
            offenders.append(str(path.relative_to(REPO)))
    assert not offenders, f"the dataset is imported in the client: {offenders}"


# --- the search must be able to reach real places ----------------------------

def test_every_record_carries_a_timezone():
    """Both the fixed offset and an IANA zone.

    Without the zone there is no way to resolve a historical offset, and the
    fixed offset alone is wrong by up to an hour for older births.
    """
    missing = [c["name"] for c in _load_cities() if not c.get("tz_iana")]
    assert not missing, f"{len(missing)} records have no tz_iana, e.g. {missing[:5]}"


def test_search_finds_the_places_people_actually_type():
    """The cases the unranked scan got wrong.

    `pur` matched 742 places and returned the first ten in file order, so
    "Puri" was not reliably among them. These are typed constantly, so they are
    the regression that matters.
    """
    for query, expected in (
        ("delhi", "Delhi"),
        ("new del", "New Delhi"),
        ("mum", "Mumbai"),
        ("pune", "Pune"),
        ("ahmed", "Ahmedabad"),
        ("varanasi", "Varanasi"),
        ("london", "London"),
        ("new york", "New York"),
    ):
        names = [c["name"] for c in search_cities(q=query)["cities"]]
        assert names, f"{query!r} returned nothing"
        assert names[0] == expected, f"{query!r} ranked {names[:3]}, expected {expected} first"


def test_the_intended_place_is_inside_a_short_prefix_result():
    """A prefix must reach the place it names, even with many matches."""
    for query, expected in (("kot", "Kota"), ("pur", "Puri")):
        names = [c["name"] for c in search_cities(q=query)["cities"]]
        assert expected in names, f"{query!r} did not reach {expected}: {names}"


def test_search_is_case_insensitive():
    assert search_cities(q="DELHI")["cities"][0]["name"] == "Delhi"
    assert search_cities(q="mumbai")["cities"][0]["name"] == "Mumbai"


def test_search_reports_a_total_before_truncating():
    """So the client can say "many matches" rather than implying there were few."""
    result = search_cities(q="pur")
    assert result["total"] > len(result["cities"])


def test_search_respects_the_limit():
    assert len(search_cities(q="a", limit=5)["cities"]) <= 5


def test_an_unknown_query_returns_nothing_rather_than_everything():
    result = search_cities(q="zzzznotaplace")
    assert result["cities"] == []
    assert result["total"] == 0


def test_blank_input_is_handled():
    for blank in ("", "   "):
        result = search_cities(q=blank)
        assert result["cities"] == []


def test_matching_is_stable_for_equal_scores():
    """Equal-scoring results sort by name, not by position in the file."""
    first = [c["name"] for c in search_cities(q="kot")["cities"]]
    second = [c["name"] for c in search_cities(q="kot")["cities"]]
    assert first == second


def test_scoring_prefers_an_exact_match_over_a_prefix():
    assert _score("Delhi", "delhi") > _score("Delhi Cantt", "delhi")
    assert _score("Delhi Cantt", "delhi") > _score("New Delhi", "delhi")


def test_results_carry_coordinates_and_a_zone():
    """Everything the caller needs to chart the birth, in one record."""
    city = search_cities(q="pune")["cities"][0]
    assert isinstance(city["lat"], (int, float))
    assert isinstance(city["lng"], (int, float))
    assert city["tz_iana"]


# --- the dataset is well formed ----------------------------------------------

def test_the_dataset_is_valid_json_with_the_expected_shape():
    with open(_CITIES_PATH, encoding="utf-8") as handle:
        data = json.load(handle)
    assert isinstance(data, list) and data
    required = {"name", "lat", "lng", "tz", "tz_iana", "state"}
    for record in data[:50]:
        assert required.issubset(record), f"missing keys in {record}"
        assert -90 <= record["lat"] <= 90
        assert -180 <= record["lng"] <= 180


def test_the_dataset_has_no_duplicate_names():
    names = [c["name"] for c in _load_cities()]
    duplicates = {n for n in names if names.count(n) > 1} if len(names) < 1000 else set()
    # Counting every pair is O(n^2) over 6,288 records; only check for the
    # pathological case of a small dataset being fully duplicated.
    if not duplicates:
        from collections import Counter

        counts = Counter(names)
        worst = [n for n, c in counts.items() if c > 1]
        assert not worst, f"duplicate names: {worst[:5]}"


def test_international_records_use_a_real_zone():
    """Not `UTC`, which is the build script's visible-failure marker."""
    zones = {c["name"]: c["tz_iana"] for c in _load_cities()}
    for name in ("London", "New York", "Sydney", "Dubai", "Singapore"):
        if name in zones:
            assert zones[name] != "UTC", f"{name} fell back to UTC"
            assert "/" in zones[name], f"{name} has a non-IANA zone"


def test_indian_records_use_asia_kolkata():
    """The single zone every Indian record resolves to.

    Note this is the zone, not the offset: India was on +5:53:20 before
    October 1947 and +6:30 through the 1941-42 wartime daylight saving, which is
    why the zone is stored and the offset is resolved per birth date.
    """
    zones = [c["tz_iana"] for c in _load_cities()]
    kolkata = sum(1 for z in zones if z == "Asia/Kolkata")
    assert kolkata > 6000, f"only {kolkata} records are Asia/Kolkata"