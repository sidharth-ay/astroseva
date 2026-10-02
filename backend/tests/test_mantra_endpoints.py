"""Mantra categories were countable but not openable.

`/api/v1/mantra/categories` reported a `mantra_count` and, for purpose and
planet categories, a `related_mantras` id list -- and no endpoint served those
mantras. A user could see "Purpose: Career & Success — 1 mantra" and had no way
to reach it.

The counts were also wrong. They were hand-written and had drifted from
`DAILY_MANTRAS`:

  - `career` claimed a mantra whose own `purpose` is `success`, while no mantra
    declares `purpose: "career"` -- so the category was always empty no matter
    how it was queried.
  - `peace` claimed 4 but held 5, `sun` claimed 2 but held 3, `jupiter` claimed
    3 but held 4, `ketu` claimed 1 but held 2.

These tests pin the derived counts to the mantras themselves, so the two can
never disagree again, and cover the list/detail endpoints that make a category
reachable in the first place.
"""


from app.api.mantra import DAILY_MANTRAS, MANTRA_CATEGORIES, _members, _categories

BASE = "/api/v1/mantra"


# ---------------------------------------------------------------------------
# Counts are derived, not asserted by hand
# ---------------------------------------------------------------------------

def test_every_category_agrees_with_the_mantras():
    """`mantra_count` equals `len(related_mantras)` equals the real members."""
    for kind, entries in _categories().items():
        for entry in entries:
            members = _members(kind, entry["id"])
            assert entry["related_mantras"] == members, (kind, entry["id"])
            assert entry["mantra_count"] == len(members), (kind, entry["id"])


def test_no_category_advertises_a_mantra_it_does_not_hold():
    """The old `career` entry pointed at `ganesh_mantra`, which declares success."""
    ids = {m["id"] for m in DAILY_MANTRAS}
    for kind, entries in _categories().items():
        for entry in entries:
            for member in entry["related_mantras"]:
                assert member in ids, (kind, entry["id"], member)


def test_a_member_really_belongs_to_the_category_it_is_listed_under():
    """Membership is re-derived, not copied from the stale literal."""
    for kind, entries in _categories().items():
        for entry in entries:
            for member in entry["related_mantras"]:
                assert member in _members(kind, entry["id"]), (kind, entry["id"], member)


def test_categories_keep_their_names_and_descriptions():
    """Derivation only replaces the counts, not the copy shown to the user."""
    for kind, entries in MANTRA_CATEGORIES.items():
        derived = {e["id"]: e for e in _categories()[kind]}
        for entry in entries:
            assert derived[entry["id"]]["name"] == entry["name"]
            assert derived[entry["id"]]["description"] == entry["description"]


def test_career_reports_an_honest_zero():
    """No mantra declares purpose=career, so the category must say 0, not 1."""
    career = next(e for e in _categories()["purpose"] if e["id"] == "career")
    assert career["mantra_count"] == 0
    assert career["related_mantras"] == []


def test_the_counts_that_were_wrong_are_now_right():
    """peace/sun/jupiter/ketu were each off by one against DAILY_MANTRAS."""
    categories = _categories()
    by_kind = {k: {e["id"]: e for e in v} for k, v in categories.items()}
    assert by_kind["purpose"]["peace"]["mantra_count"] == 5
    assert by_kind["planet"]["sun"]["mantra_count"] == 3
    assert by_kind["planet"]["jupiter"]["mantra_count"] == 4
    assert by_kind["planet"]["ketu"]["mantra_count"] == 2


# ---------------------------------------------------------------------------
# /categories
# ---------------------------------------------------------------------------

def test_categories_endpoint_returns_derived_membership(client):
    response = client.get(f"{BASE}/categories")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"deity", "purpose", "planet"}

    health = next(e for e in body["purpose"] if e["id"] == "health")
    assert health["mantra_count"] == len(health["related_mantras"])
    assert "mahamrityunjaya_mantra" in health["related_mantras"]


# ---------------------------------------------------------------------------
# List endpoint
# ---------------------------------------------------------------------------

def test_list_returns_every_mantra(client):
    response = client.get(BASE)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == len(DAILY_MANTRAS)
    assert len(body["mantras"]) == len(DAILY_MANTRAS)


def test_list_filters_by_purpose(client):
    response = client.get(BASE, params={"purpose": "protection"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 5
    assert all(m["purpose"] == "protection" for m in body["mantras"])


def test_list_filters_by_planet_case_insensitively(client):
    """Categories use lowercase ids; the data stores 'Saturn'."""
    response = client.get(BASE, params={"planet": "saturn"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 4
    assert all(m["planet"].lower() == "saturn" for m in body["mantras"])


def test_list_filters_by_deity(client):
    response = client.get(BASE, params={"deity": "shiva"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert all("shiva" in m["deity"].lower() for m in body["mantras"])


def test_list_combines_filters(client):
    response = client.get(BASE, params={"purpose": "peace", "planet": "jupiter"})
    assert response.status_code == 200
    body = response.json()
    assert all(
        m["purpose"] == "peace" and m["planet"].lower() == "jupiter"
        for m in body["mantras"]
    )
    assert body["total"] == len(body["mantras"])


def test_search_matches_meaning_and_benefits(client):
    response = client.get(BASE, params={"q": "obstacle"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert "ganesh_mantra" in [m["id"] for m in body["mantras"]]


def test_search_matches_transliteration(client):
    response = client.get(BASE, params={"q": "Gaṇapataye"})
    assert response.status_code == 200
    assert "ganesh_mantra" in [m["id"] for m in response.json()["mantras"]]


def test_search_with_no_hits_is_an_empty_list_not_an_error(client):
    response = client.get(BASE, params={"q": "definitelynotamantra"})
    assert response.status_code == 200
    assert response.json() == {"total": 0, "mantras": []}


def test_an_empty_search_string_is_rejected(client):
    """`min_length=1` keeps `?q=` from silently scanning everything."""
    response = client.get(BASE, params={"q": ""})
    assert response.status_code == 422


def test_unknown_purpose_returns_nothing(client):
    response = client.get(BASE, params={"purpose": "not-a-purpose"})
    assert response.status_code == 200
    assert response.json()["total"] == 0


# ---------------------------------------------------------------------------
# Detail endpoint
# ---------------------------------------------------------------------------

def test_detail_returns_one_mantra(client):
    response = client.get(f"{BASE}/gayatri_mantra")
    assert response.status_code == 200
    mantra = response.json()["mantra"]
    assert mantra["id"] == "gayatri_mantra"
    assert mantra["transliteration"].startswith("Om Bhur")


def test_detail_of_an_unknown_id_is_a_404(client):
    response = client.get(f"{BASE}/no_such_mantra")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Route ordering: /{mantra_id} is declared last so it cannot swallow /daily
# ---------------------------------------------------------------------------

def test_static_routes_are_matched_before_the_id_route(client):
    """`/{mantra_id}` would otherwise answer `/daily` with a 404."""
    for path in ("/daily", "/chalisa", "/aarti", "/categories"):
        assert client.get(f"{BASE}{path}").status_code == 200
