"""The crystal filters run on the server, not in the browser.

The client used to carry its own nine-entry copy of this list and filter it
locally, while the backend served fourteen. Same question, different answers
depending on where you asked. The filters now live on `/crystals` and the
client asks instead of computing.
"""

from app.api.healing import CRYSTALS


def test_unfiltered_returns_the_whole_corpus(client):
    resp = client.get("/api/v1/healing/crystals")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == len(CRYSTALS)
    assert len(body["crystals"]) == len(CRYSTALS)


def test_chakra_filter_matches_case_insensitively(client):
    lower = client.get("/api/v1/healing/crystals", params={"chakra": "heart"}).json()
    upper = client.get("/api/v1/healing/crystals", params={"chakra": "HEART"}).json()
    assert lower["total"] > 0
    assert lower == upper
    for crystal in lower["crystals"]:
        assert "heart" in {a.lower() for a in crystal["chakra_associations"]}


def test_zodiac_and_chakra_combine(client):
    both = client.get(
        "/api/v1/healing/crystals", params={"zodiac": "leo", "chakra": "solar_plexus"}
    ).json()
    assert both["total"] >= 1
    for crystal in both["crystals"]:
        assert "leo" in {a.lower() for a in crystal["zodiac_associations"]}
        assert "solar_plexus" in {a.lower() for a in crystal["chakra_associations"]}


def test_unknown_chakra_is_an_empty_list_not_an_error(client):
    resp = client.get("/api/v1/healing/crystals", params={"chakra": "not-a-chakra"})
    assert resp.status_code == 200
    assert resp.json() == {"crystals": [], "total": 0}


def test_text_search_matches_name_and_properties(client):
    resp = client.get("/api/v1/healing/crystals", params={"q": "amethyst"}).json()
    assert resp["total"] >= 1
    assert resp["crystals"][0]["name"] == "Amethyst"
