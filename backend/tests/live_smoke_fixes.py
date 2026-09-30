"""Live smoke test for the defects this series fixed.

Every case below was one of:
  - a 500 (the two /sample endpoints, /matching/export-pdf)
  - a null in an otherwise well-formed response (/panchang/monthly)
  - a contract mismatch with the page (/lalkitab/chart)
  - a constant where a computed value belonged (/transit, /gemstones)
  - an overlapping window (/panchang/ghati)
  - an enumeration oracle or a bcrypt prefix match (/auth/login)

Unlike the pytest suite this exercises the real application object end to end,
including the routers and the dependency wiring, so it catches the cases where
the module is correct but nothing is wired to it.

    cd backend && python tests/live_smoke_fixes.py

It writes one throwaway account to the development database. The account is
named `smoke-*@example.com` and can be removed with:

    python -c "import sqlite3; c=sqlite3.connect('astroseva.db'); \
        c.execute(\"delete from users where email like 'smoke-%'\"); c.commit()"
"""

import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("JWT_SECRET", "smoke-test-secret-not-for-production-0123456789")

from fastapi.testclient import TestClient  # noqa: E402

from app.db.database import SessionLocal  # noqa: E402
from app.db.models import User  # noqa: E402
from app.main import app  # noqa: E402
from app.services.auth_service import (  # noqa: E402
    get_current_user,
    hash_password,
    is_admin,
)

BIRTH = {
    "name": "Smoke", "birth_date": "1990-05-15", "birth_time": "10:30",
    "birth_place": "Delhi", "latitude": 28.6139, "longitude": 77.209,
    "timezone_offset": 5.5,
}

PASS, FAIL = [], []


def check(name, condition, detail=""):
    (PASS if condition else FAIL).append(name)
    mark = "PASS" if condition else "FAIL"
    suffix = f"  -- {detail}" if detail and not condition else ""
    print(f"  {mark}  {name}{suffix}")


def _minutes(clock: str) -> float:
    h, m = clock.split(":")
    return int(h) + int(m) / 60


def main() -> int:
    email = f"smoke-{uuid.uuid4().hex[:8]}@example.com"
    with SessionLocal() as s:
        u = User(
            email=email, name="Smoke",
            hashed_password=hash_password("Smoke-Test-1"),
            role="client", token_version=0,
        )
        s.add(u)
        s.commit()
        # Built detached: the request path opens its own session, so the user
        # object must not belong to this one.
        actor = User(
            id=u.id, email=u.email, name=u.name, role=u.role, token_version=0
        )

    app.dependency_overrides[get_current_user] = lambda: actor
    c = TestClient(app)
    token = c.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Smoke-Test-1"},
    ).json()["token"]
    h = {"Authorization": f"Bearer {token}"}

    print("\n-- endpoints that returned 500 --")
    r = c.get("/api/v1/kundli/sample", headers=h)
    check("/kundli/sample is 200", r.status_code == 200, str(r.status_code))
    check("/kundli/sample has an ascendant", r.json().get("asc_sign") is not None)

    r = c.get("/api/v1/matching/sample", headers=h)
    check("/matching/sample is 200", r.status_code == 200, str(r.status_code))

    r = c.post(
        "/api/v1/matching/export-pdf",
        json={"boy": BIRTH,
              "girl": {**BIRTH, "birth_date": "1992-08-20", "birth_time": "14:00"}},
        headers=h,
    )
    check("/matching/export-pdf is a PDF", r.content[:4] == b"%PDF", str(r.status_code))

    print("\n-- responses that were null or constant --")
    r = c.get("/api/v1/panchang/monthly?year=2026&month=3", headers=h)
    days = r.json().get("days", [])
    check("/panchang/monthly has 31 days", len(days) == 31, str(len(days)))
    check("/panchang/monthly days all have a tithi",
          bool(days) and all(d.get("tithi") for d in days),
          f"{sum(1 for d in days if d.get('tithi'))}/{len(days)}")

    r = c.get("/api/v1/transit/today", headers=h)
    motions = [t.get("daily_motion") for t in r.json()["transits"]]
    check("/transit reports computed motion",
          len(set(motions)) > 1, f"all equal: {motions}")
    check("/transit dropped the bare speed field",
          all("speed" not in t for t in r.json()["transits"]))

    r = c.post("/api/v1/gemstones/recommend", json=BIRTH, headers=h)
    g = r.json()
    check("/gemstones considers all seven grahas",
          len(g.get("considerations", [])) == 7,
          str(len(g.get("considerations", []))))
    check("/gemstones justifies each recommendation",
          all(x.get("reason") for x in g["gemstones"]))
    check("/gemstones states its basis", bool(g.get("basis")))

    print("\n-- page contracts --")
    r = c.post("/api/v1/lalkitab/chart", json=BIRTH, headers=h)
    lk = r.json()
    check("/lalkitab returns a remedy LIST", isinstance(lk["remedies"], list),
          type(lk["remedies"]).__name__)
    check("/lalkitab house cells are objects",
          all(isinstance(o, dict)
              for occs in lk["houses"].values() for o in occs))
    check("/lalkitab exposes name and birth_place",
          lk.get("name") == "Smoke" and lk.get("birth_place") == "Delhi")

    r = c.post("/api/v1/varshphal/calculate",
               json={**BIRTH, "year": 2026}, headers=h)
    v = r.json()
    check("/varshpal reports solar transits",
          bool(v["annual_chart"]["solar_transits"]))
    check("/varshpal reports a dasha", bool(v["annual_chart"]["dasha_lord"]))
    check("/varshpal has no invented months",
          "auspicious_months" not in v and "challenging_months" not in v)
    v2 = c.post("/api/v1/varshphal/calculate",
                json={**BIRTH, "year": 2029}, headers=h).json()
    check("/varshpal differs between years",
          v["annual_chart"] != v2["annual_chart"])

    print("\n-- windows that overlapped --")
    r = c.get(
        "/api/v1/panchang/ghati?date_str=2026-03-11"
        "&latitude=28.6139&longitude=77.209",
        headers=h,
    )
    body = r.json()
    windows = body["muhurats"]
    overlaps = [
        1 for a, b in zip(windows, windows[1:])
        if _minutes(b["start"]) < _minutes(a["end"])
    ]
    check("/ghati windows do not overlap", not overlaps, f"{len(overlaps)} overlaps")
    check("/ghati states its limitations", bool(body.get("limitations")))

    print("\n-- security --")
    unknown = c.post("/api/v1/auth/login",
                     json={"email": "nobody@example.com", "password": "Whatever-1"})
    wrong = c.post("/api/v1/auth/login",
                   json={"email": email, "password": "Wrong-Password-1"})
    check("unknown and wrong password both 401",
          unknown.status_code == wrong.status_code == 401,
          f"{unknown.status_code}/{wrong.status_code}")

    # Over 72 bytes, so the length guard fires before the comparison and the
    # answer cannot depend on whether the stored password happens to match.
    r = c.post("/api/v1/auth/login",
               json={"email": email, "password": "Smoke-Test-1" + "X" * 80})
    check("a password over 72 bytes is refused", r.status_code == 400,
          str(r.status_code))

    check("ADMIN_EMAILS grants nothing",
          is_admin(type("U", (), {"email": "boss@example.com", "role": "client"})())
          is False)
    check("the admin role does",
          is_admin(type("U", (), {"email": "a@b.c", "role": "admin"})()) is True)

    print(f"\n  {len(PASS)} passed, {len(FAIL)} failed")
    for name in FAIL:
        print(f"    FAILED: {name}")
    if PASS or FAIL:
        print(f"  (throwaway account left behind: {email})")
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())