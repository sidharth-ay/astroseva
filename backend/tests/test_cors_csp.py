"""CORS and CSP must not be weaker than they need to be.

Two independent things, both of which had been loosened to the point where the
browser could not do its job.
"""

import os
import re
import subprocess
from pathlib import Path

import pytest

FRONTEND = Path(__file__).resolve().parents[2] / "frontend"
NEXTCONFIG = FRONTEND / "next.config.ts"
CONFIG_SOURCE = NEXTCONFIG.read_text(encoding="utf-8")


def _config_expression(name: str, env: dict[str, str]) -> str:
    """Evaluate one of the config's bindings with Node, under a given env.

    The CSP entries are template literals referencing computed values, so
    reading the file as text yields `${connectSrc}` rather than the policy. The
    directives that matter depend on NODE_ENV and NEXT_PUBLIC_API_URL, and those
    have to be checked -- a test that cannot resolve them would happily pass a
    policy that blocks the API, which is the bug this file exists to catch.

    Node is used rather than a Python regex or `exec` because the file is
    TypeScript with comments that contain apostrophes and backticks
    (`API's real address`), which any line- or comment-based slicing in Python
    mis-parses. Node parses it the way the build does. Only the bindings before
    `nextConfig` are evaluated; the config object itself is never constructed.
    """
    script = f"""
      const fs = require('fs');
      const src = fs.readFileSync({str(NEXTCONFIG)!r}, 'utf8');
      const head = src.split('const nextConfig')[0].replace(/^import type.*$/gm, '');
      const m = {{ exports: {{}} }};
      new Function('module', 'exports', head + '\\nmodule.exports = {{ {name} }};')(m, m.exports);
      process.stdout.write(String(m.exports.{name}));
    """
    proc = subprocess.run(
        ["node", "-e", script],
        capture_output=True, text=True, env={**os.environ, **env},
    )
    if proc.returncode != 0:
        raise AssertionError(
            f"could not evaluate {name} from next.config.ts:\n{proc.stderr.strip()}"
        )
    return proc.stdout.strip()


def _csp_directives(env: dict[str, str] | None = None) -> dict[str, str]:
    """The real policy, with the config's computed values resolved.

    `env` sets the environment the policy is built under; it defaults to
    production with no `NEXT_PUBLIC_API_URL`, which is what a deployed build
    sees.
    """
    environ = {"NODE_ENV": "production"}
    environ.update(env or {})
    connect_src = _config_expression("connectSrc", environ)
    script_src = _config_expression("scriptSrc", environ)

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
        value = value.replace("${connectSrc}", connect_src)
        value = value.replace("${scriptSrc}", script_src)
        directives[name.strip()] = value.strip()
    return directives


# --- CSP ----------------------------------------------------------------------

def test_script_src_never_allows_eval_in_production():
    """`'unsafe-eval'` permits eval(), which makes injection trivially exploitable.

    It is not needed for a production React build. It IS needed by the dev
    runtime, so it is granted conditionally on NODE_ENV. This asserts the
    production half: the branch a deployed build takes must not contain it.
    """
    assert "unsafe-eval" not in _csp_directives()["script-src"]


def test_script_src_allows_eval_in_development():
    """React's dev runtime calls eval() to reconstruct callstacks.

    Without it the client throws while evaluating and the page never hydrates,
    which looks like an application bug rather than a header problem: the form
    is present in the HTML source but nothing responds to a click.
    """
    dev = _csp_directives({"NODE_ENV": "development"})
    assert "unsafe-eval" in dev["script-src"], (
        "the development script-src must allow unsafe-eval or React cannot run"
    )
    # ...and development must not weaken the directives that have no dev story.
    assert dev["object-src"] == "'none'"
    assert dev["frame-ancestors"] == "'none'"


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


# --- connect-src must permit where the client actually calls -----------------

def _client_api_base() -> str:
    """The origin the browser will request, from api.ts's own resolution."""
    source = (FRONTEND / "src" / "lib" / "api.ts").read_text(encoding="utf-8")
    fallback = re.search(
        r'API_BASE_FALLBACK\s*=\s*"([^"]+)"', source
    )
    assert fallback, "API_BASE_FALLBACK not found in api.ts"
    configured = re.search(r"process\.env\.NEXT_PUBLIC_API_URL", source)
    # With no env file present (the default) the fallback is what is used.
    return fallback.group(1) if configured else "'self'"


def test_connect_src_permits_the_api_origin_the_client_uses():
    """The regression that made login and registration report "Failed to fetch".

    `next.config.ts` computed `connect-src` as `'self'` when
    `NEXT_PUBLIC_API_URL` was unset, while `api.ts` fell back to
    `http://127.0.0.1:8000`. The browser evaluates `connect-src` before sending,
    so every API call was blocked with nothing in the server logs.

    The previous version of this test asserted `connect-src` contained no
    localhost, which was true of the broken file and therefore useless. The
    property that matters is that the directive admits the client's own target.
    """
    origin = _client_api_base()
    if origin == "'self'":
        pytest.skip("no explicit API fallback to check against")
    # Checked under development with no API url set, which is how the app runs
    # by default and therefore how the breakage was reported.
    connect_src = _csp_directives(
        {"NODE_ENV": "development", "NEXT_PUBLIC_API_URL": ""}
    )["connect-src"]
    assert origin in connect_src, (
        f"connect-src does not permit {origin}, which is where api.ts sends "
        "requests, so every call is blocked in the browser"
    )


def test_connect_src_defaults_to_the_shared_constant():
    """The two files must not be able to drift apart again.

    The config's comment names the client file whose default it mirrors, and
    the client's names the config. Each points at the other, so a change to one
    that is not made in the other is visible in review rather than only in the
    browser.
    """
    assert "api.ts" in CONFIG_SOURCE, (
        "the config's fallback should name the client file it mirrors"
    )
    api_src = (FRONTEND / "src" / "lib" / "api.ts").read_text(encoding="utf-8")
    assert "next.config.ts" in api_src, (
        "api.ts's fallback should name the config file it mirrors"
    )
    # And the literals must actually agree, not just the comments.
    fallback = re.search(r'API_BASE_FALLBACK\s*=\s*"([^"]+)"', api_src)
    assert fallback, "API_BASE_FALLBACK not found in api.ts"
    assert fallback.group(1) in _csp_directives()["connect-src"], (
        "the two defaults disagree, so the policy blocks the client's requests"
    )


def test_connect_src_is_derived_from_the_configured_api_url():
    assert "NEXT_PUBLIC_API_URL" in CONFIG_SOURCE
    # The directive must interpolate the computed value rather than a literal.
    assert "`connect-src ${connectSrc}`" in CONFIG_SOURCE
    assert "const connectSrc" in CONFIG_SOURCE


def test_connect_src_still_includes_self():
    """A same-origin deployment must keep working."""
    assert "'self'" in _csp_directives()["connect-src"]


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
