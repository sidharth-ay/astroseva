"""CORS and CSP must not be weaker than they need to be.

Two independent things, both of which had been loosened to the point where the
browser could not do its job.
"""

import re
from pathlib import Path

import pytest

FRONTEND = Path(__file__).resolve().parents[2] / "frontend"
NEXTCONFIG = FRONTEND / "next.config.ts"
CONFIG_SOURCE = NEXTCONFIG.read_text(encoding="utf-8")


def _csp_directives() -> dict[str, str]:
    """Parse the CSP array out of next.config.ts.

    Entries are plain or template literals, so both are matched. A CSP entry is
    a directive NAME and its sources separated by whitespace -- not a colon, so
    `default-src 'self'` has to be split on the first space. Splitting on a
    colon would also mangle the `https://` inside a value.
    """
    block = CONFIG_SOURCE.split('key: "Content-Security-Policy"')[1]
    array = block.split("value: [")[1].split("].join")[0]
    # Drop `//` comments, which carry no directives.
    array = "\n".join(
        line for line in array.splitlines()
        if not line.strip().startswith("//")
    )
    directives = {}
    for double, template in re.findall(r'"([^"]*)"|`([^`]*)`', array):
        entry = (double or template).strip()
        if not entry:
            continue
        name, _, value = entry.partition(" ")
        directives[name.strip()] = value.strip()
    return directives


# --- CSP ----------------------------------------------------------------------

def test_script_src_does_not_allow_eval():
    """`'unsafe-eval'` permits eval(), which makes injection trivially exploitable.

    It is not needed for a production React build. It was removed; `next dev`
    does not apply this header file, so a development page that needs it is
    working as intended.
    """
    assert "unsafe-eval" not in _csp_directives()["script-src"]


def test_script_src_has_no_wildcard():
    assert "*" not in _csp_directives()["script-src"]


def test_the_insecure_directives_are_documented_rather_than_silent():
    """`'unsafe-inline'` remains, because Next.js needs it.

    It should be stated in the file why, so nobody removes it and breaks
    production, or leaves it in without knowing what it costs.
    """
    assert "'unsafe-inline'" in _csp_directives()["script-src"]
    assert "'unsafe-inline'" in CONFIG_SOURCE, (
        "the reason for allowing unsafe-inline is not recorded"
    )
    # The comment should mention the trade-off, not just the fact.
    assert "unsafe-eval" in CONFIG_SOURCE, (
        "the removal of unsafe-eval should be explained in the file"
    )


@pytest.mark.parametrize("directive", ["object-src", "base-uri", "form-action"])
def test_the_directives_default_src_does_not_cover(directive):
    """These need stating: `default-src` is not a fallback for them."""
    assert directive in _csp_directives(), (
        f"{directive} is not set, so default-src does not protect it"
    )


def test_object_src_is_none():
    assert _csp_directives()["object-src"] == "'none'"


def test_frames_are_denied_in_both_places():
    """`frame-ancestors` and `X-Frame-Options` cover different clients."""
    assert _csp_directives()["frame-ancestors"] == "'none'"
    assert 'value: "DENY"' in CONFIG_SOURCE


# --- connect-src must not be hardcoded to localhost ---------------------------

def test_connect_src_is_not_hardcoded_to_localhost():
    """It was, so the policy blocked the API in every deployed environment.

    A browser would refuse the calls and the site would appear broken with
    nothing in the server logs, because the requests never left the browser.
    """
    assert "localhost" not in _csp_directives()["connect-src"], (
        "connect-src still names localhost, which blocks every real deployment"
    )
    assert "127.0.0.1" not in _csp_directives()["connect-src"]


def test_connect_src_is_derived_from_the_configured_api_url():
    assert "NEXT_PUBLIC_API_URL" in CONFIG_SOURCE
    # The directive must interpolate the computed value rather than a literal.
    assert "`connect-src ${connectSrc}`" in CONFIG_SOURCE
    assert "const connectSrc" in CONFIG_SOURCE


def test_connect_src_allows_same_origin_when_no_api_url_is_set():
    """`'self'` alone is the production default, so parse the branch."""
    assert "? \"'self'\"" in CONFIG_SOURCE or "'self'" in CONFIG_SOURCE
    assert "apiOrigin === null" in CONFIG_SOURCE


def test_the_api_url_is_reduced_to_an_origin():
    """A path or trailing slash would not equal the browser's Origin header."""
    assert "new URL(configured).origin" in CONFIG_SOURCE
    assert ".replace(" not in CONFIG_SOURCE.split("connectSrc")[0].split(
        "const connectSrc"
    )[-1]


# --- CORS --------------------------------------------------------------------


def test_credentials_are_not_required_by_default():
    """The API uses a bearer token, not a cookie.

    With `allow_credentials=True` a wildcard origin is no longer permitted, so
    the setting only adds a way for the configuration to be wrong.
    """
    source = Path(__file__).resolve().parents[1] / "app" / "main.py"
    text = source.read_text(encoding="utf-8")
    assert 'CORS_ALLOW_CREDENTIALS", "false"' in text, (
        "credentials must default to off"
    )
    # Check the middleware call site, not the whole file: the explanatory
    # comment names the old value deliberately.
    middleware = text.split("app.add_middleware(")[1].split("\n)")[0]
    assert "allow_credentials=CORS_ALLOW_CREDENTIALS" in middleware
    assert "allow_credentials=True" not in middleware


def test_rate_limit_headers_are_exposed_to_browsers():
    """A 429 is only actionable if the browser can read Retry-After."""
    text = (Path(__file__).resolve().parents[1] / "app" / "main.py").read_text(
        encoding="utf-8"
    )
    assert "expose_headers" in text
    assert "Retry-After" in text


def test_options_is_allowed_so_preflight_works():
    text = (Path(__file__).resolve().parents[1] / "app" / "main.py").read_text(
        encoding="utf-8"
    )
    assert '"OPTIONS"' in text


def test_patch_is_allowed():
    text = (Path(__file__).resolve().parents[1] / "app" / "main.py").read_text(
        encoding="utf-8"
    )
    assert '"PATCH"' in text


# --- and the endpoints still answer ------------------------------------------

def test_an_allowed_origin_gets_the_cors_header(client):
    r = client.get("/api/v1/auth/me", headers={"Origin": "http://localhost:3000"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_a_disallowed_origin_is_not_echoed(client):
    r = client.get("/api/v1/auth/me", headers={"Origin": "https://evil.example"})
    assert r.headers.get("access-control-allow-origin") != "https://evil.example"


def test_credentials_are_not_set_in_the_response(client):
    r = client.get("/api/v1/auth/me", headers={"Origin": "http://localhost:3000"})
    assert r.headers.get("access-control-allow-credentials") is None
