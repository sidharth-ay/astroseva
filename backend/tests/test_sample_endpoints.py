"""Sample endpoints must not 500.

`/kundli/sample` and `/matching/sample` each called the handler they delegate
to with a single positional argument, but both of those handlers take the
`Request` first for the rate limiter. Every call raised TypeError, which the
handler's own `except Exception` turned into a generic 500. The endpoints were
unreachable, and the fixtures they document for anyone writing tests or
demonstrating the API.
"""

import pytest


def test_kundli_sample_returns_a_chart(client):
    r = client.get("/api/v1/kundli/sample")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "Sample Person"
    assert body["asc_sign"] is not None
    assert body["planets"]


def test_matching_sample_returns_a_result(client):
    r = client.get("/api/v1/matching/sample")
    assert r.status_code == 200, r.text
    body = r.json()
    assert "kootas" in body
    assert body["kootas"]


@pytest.mark.parametrize("path", [
    "/api/v1/kundli/sample",
    "/api/v1/matching/sample",
])
def test_sample_endpoints_do_not_return_a_server_error(client, path):
    """The failure mode was a 500 with a generic message, not a 4xx."""
    r = client.get(path)
    assert r.status_code != 500, f"{path} returned 500: {r.text}"
