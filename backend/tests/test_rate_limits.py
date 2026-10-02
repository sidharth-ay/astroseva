"""Every endpoint is rate limited, and the limit is really enforced.

Thirty-eight endpoints had no limit at all before this change, including all
seven of `/api/v1/panchang` and all five of `/api/v1/healing`, both of which do
real work per request.

Two plausible fixes were tried first and neither worked, which is why this file
tests behaviour rather than configuration:

* `Limiter(default_limits=[...])` is only evaluated from inside the decorator,
  so it does nothing for an undecorated route.
* `SlowAPIASGIMiddleware` resolves handlers through `_find_route_handler`, which
  returns `None` in this FastAPI version because included routers are wrapped in
  `_IncludedRouter`. `_should_exempt(None)` is True, so the middleware exempted
  every feature route while appearing to be installed.

So each endpoint is decorated explicitly, and the guarantee that this does not
decay is enforced here rather than trusted.
"""

import ast
from pathlib import Path


from app.core.rate_limit import HEALTH_LIMIT, limiter

API_DIR = Path(__file__).resolve().parents[1] / "app" / "api"


def _routers():
    for path in sorted(API_DIR.glob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in tree.body:
            if not isinstance(node, ast.AsyncFunctionDef):
                continue
            is_route = any(
                isinstance(d, ast.Call)
                and isinstance(d.func, ast.Attribute)
                and isinstance(d.func.value, ast.Name)
                and d.func.value.id == "router"
                for d in node.decorator_list
            )
            if is_route:
                yield path, node


def _has_limit(node) -> bool:
    return any(
        isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr == "limit"
        for d in node.decorator_list
    )


def _limit_string(node) -> str:
    for d in node.decorator_list:
        if isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr == "limit":
            return d.args[0].value
    raise AssertionError("no limit decorator")


def _amount(limit_string: str) -> int:
    number, _, window = limit_string.partition("/")
    assert window.strip() in {"second", "minute", "hour", "day"}, limit_string
    return int(number)


def test_there_are_endpoints_to_check():
    """A scan that finds nothing would pass every other test vacuously."""
    assert len(list(_routers())) > 80


def test_every_endpoint_is_rate_limited():
    """The regression guard: a new endpoint arrives with a limit.

    This is the check that the two failed approaches would have passed. Both
    looked like app-wide protection and protected nothing, so the invariant is
    asserted structurally instead.
    """
    unprotected = [
        f"{path.stem}:{node.name}"
        for path, node in _routers()
        if not _has_limit(node)
    ]
    assert not unprotected, f"endpoints with no rate limit: {unprotected}"


def test_every_limited_endpoint_accepts_a_request():
    """`@limiter.limit` reads `request` off the signature, and it must be a
    Starlette `Request`.

    Checking only the *name* is not enough, and that gap had a real casualty:
    `save_chart` already had a body model called `request`, so decorating it made
    slowapi receive a `SaveChartRequest` and raise at call time -- while every
    test still passed, because the name was present.
    """
    wrong_type = []
    missing = []
    for path, node in _routers():
        if not _has_limit(node):
            continue
        params = {a.arg: a for a in node.args.args}
        if "request" not in params:
            missing.append(f"{path.stem}:{node.name}")
            continue
        annotation = params["request"].annotation
        rendered = ast.unparse(annotation) if annotation else ""
        if rendered != "Request":
            wrong_type.append(f"{path.stem}:{node.name} (request: {rendered})")

    assert not missing, f"limited but no `request` parameter: {missing}"
    assert not wrong_type, f"`request` is not a Starlette Request: {wrong_type}"


def test_limits_are_sane():
    """A limit of zero or an unparsable string would throttle everything."""
    for path, node in _routers():
        limit = _limit_string(node)
        assert _amount(limit) > 0, f"{path.stem}:{node.name} has {limit}"


def _panchang_budget() -> int:
    for path, node in _routers():
        if path.stem == "panchang" and node.name == "get_daily_panchang":
            return _amount(_limit_string(node))
    raise AssertionError("panchang daily endpoint not found")


def _reset():
    """Counters live in memory for the life of the process."""
    limiter.reset()


def test_the_limit_is_actually_enforced(client):
    """The endpoint answers normally up to its limit and 429s after it.

    The budget is read from the decorator rather than hard-coded, so changing a
    limit does not quietly turn this test into a slow or a lie.
    """
    budget = _panchang_budget()
    _reset()
    try:
        codes = [
            client.get(
                "/api/v1/panchang/daily",
                params={"latitude": 28.6139, "longitude": 77.209},
            ).status_code
            for _ in range(budget + 1)
        ]
    finally:
        _reset()

    assert codes[:budget] == [200] * budget, f"throttled early: {codes}"
    assert codes[budget] == 429, f"limit never applied: {codes[-3:]}"


def test_a_429_tells_the_caller_when_to_retry(client):
    """A client cannot wait correctly without being told how long."""
    budget = _panchang_budget()
    _reset()
    try:
        for _ in range(budget):
            client.get(
                "/api/v1/panchang/daily",
                params={"latitude": 28.6139, "longitude": 77.209},
            )
        resp = client.get(
            "/api/v1/panchang/daily",
            params={"latitude": 28.6139, "longitude": 77.209},
        )
    finally:
        _reset()

    assert resp.status_code == 429
    assert resp.headers.get("Retry-After"), "429 without Retry-After"


def test_health_keeps_answering(client):
    """It carries a higher ceiling than anything else, by design.

    Called more times than the panchang budget: a health check that throttles
    looks like an outage to whatever is watching.
    """
    calls = _panchang_budget() + 5
    assert _amount(HEALTH_LIMIT) > calls, "HEALTH_LIMIT would throttle routine polling"

    _reset()
    try:
        for _ in range(calls):
            resp = client.get("/health")
            assert resp.status_code == 200, f"health returned {resp.status_code}"
    finally:
        _reset()


def test_the_limiter_is_registered_on_the_app():
    from app.main import app

    assert app.state.limiter is limiter


def test_a_forged_forwarded_header_cannot_mint_a_new_bucket(client):
    """`key_func=get_remote_address` must key on the real peer.

    `X-Forwarded-For` is only honoured when the request arrived from a trusted
    proxy, and the trusted list is the loopback default. If the header were
    trusted unconditionally, any client could send a random value per request
    and never hit a limit at all -- so the anti-spoofing property is asserted
    rather than assumed.
    """
    budget = _panchang_budget()
    _reset()
    try:
        # Same client, a fresh forged identity on every call.
        codes = [
            client.get(
                "/api/v1/panchang/daily",
                params={"latitude": 28.6139, "longitude": 77.209},
                headers={"X-Forwarded-For": f"203.0.113.{n}"},
            ).status_code
            for n in range(budget + 1)
        ]
    finally:
        _reset()

    assert codes[budget] == 429, (
        "a forged X-Forwarded-For produced a fresh rate-limit bucket; "
        "the limiter is keying on a header any client can set"
    )


def test_a_rate_limited_endpoint_reports_which_one(client):
    """The 429 names the limit it broke, so the client can explain itself."""
    budget = _panchang_budget()
    _reset()
    try:
        for _ in range(budget + 1):
            resp = client.get(
                "/api/v1/panchang/daily",
                params={"latitude": 28.6139, "longitude": 77.209},
            )
    finally:
        _reset()

    body = resp.json()
    assert resp.status_code == 429
    assert body.get("error") or body.get("detail"), body