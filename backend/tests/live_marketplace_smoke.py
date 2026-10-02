"""Live smoke test for the astrologer marketplace.

Runs against a real uvicorn process and a throwaway database, walking one
applicant and one reviewer through the full lifecycle. Exits non-zero on the
first unexpected response, so it is usable as a gate.
"""

import io
import os
import sqlite3
import sys
import time
import uuid

import httpx

BASE = os.environ.get("SMOKE_BASE", "http://127.0.0.1:8000")
# A throwaway password for the throwaway `smoke_*@example.com` accounts this
# script creates and clean_smoke_data.py deletes. It is not a credential for
# anything real, and it must satisfy the register endpoint's password rules.
PASSWORD = "Sm0ke-Test-Only!"

failures: list[str] = []


def check(label: str, cond: bool, detail: str = "") -> None:
    if cond:
        print(f"  PASS  {label}")
    else:
        print(f"  FAIL  {label} {detail}")
        failures.append(label)


def register(email: str, name: str) -> dict:
    r = httpx.post(f"{BASE}/api/v1/auth/register",
                   json={"email": email, "name": name, "password": PASSWORD}, timeout=30)
    r.raise_for_status()
    r = httpx.post(f"{BASE}/api/v1/auth/login",
                   json={"email": email, "password": PASSWORD}, timeout=30)
    r.raise_for_status()
    return r.json()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def png_bytes() -> bytes:
    # Smallest valid PNG, standing in for a scanned document.
    return bytes.fromhex(
        "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
        "1f15c4890000000a49444154789c6360000002000100ffff03000006"
        "0005570c2d0000000049454e44ae426082"
    )


print("== 0. a browser on either dev hostname can reach the API ==")
# This was the reported bug: CORS allowed only `localhost:3000`, so opening the
# site at 127.0.0.1:3000 made every call -- including login -- fail, which looks
# exactly like a broken app.
for origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
    r = httpx.post(
        f"{BASE}/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "x"},
        headers={"Origin": origin},
        timeout=30,
    )
    acao = r.headers.get("access-control-allow-origin")
    check(f"login responds to an {origin} browser", acao == origin,
          f"access-control-allow-origin={acao}")

print("== 1. applicant registers and starts a draft ==")
suffix = uuid.uuid4().hex[:8]
applicant = register(f"smoke_app_{suffix}@example.com", "Smoke Applicant")
app_tok = applicant["token"]
print(f"  role at registration: {applicant['user'].get('role')}")
check("registration does not grant the astrologer role",
      applicant["user"].get("role") in (None, "client"))

print("== 1b. viewing the application creates nothing; starting does ==")
# The /services card asks this question while rendering, so it must be inert.
r = httpx.get(f"{BASE}/api/v1/astrologer/me", headers=auth(app_tok), timeout=30)
check("no application yet is a normal 200", r.status_code == 200, r.text)
check("has_application is false", r.json().get("has_application") is False, r.text)
check("application is null", r.json().get("application") is None, r.text)

r = httpx.get(f"{BASE}/api/v1/astrologer/me/exists", headers=auth(app_tok), timeout=30)
check("the exists check agrees", r.json().get("has_application") is False, r.text)

r = httpx.get(f"{BASE}/api/v1/astrologer/me", headers=auth(app_tok), timeout=30)
check("reading twice still reports no application",
      r.json().get("has_application") is False, r.text)

r = httpx.post(f"{BASE}/api/v1/astrologer/me/start", headers=auth(app_tok), timeout=30)
check("starting creates the draft", r.status_code == 200, r.text)
app_id = r.json()["id"]
check("the new application is in draft", r.json()["status"] == "draft", r.text)

again = httpx.post(f"{BASE}/api/v1/astrologer/me/start", headers=auth(app_tok), timeout=30)
check("starting twice is idempotent", again.json().get("id") == app_id, again.text)
check("the exists check now agrees",
      httpx.get(f"{BASE}/api/v1/astrologer/me/exists", headers=auth(app_tok),
                timeout=30).json().get("has_application") is True)

print("== 2. the directory is closed to anonymous callers ==")
check("directory 401s without a token",
      httpx.get(f"{BASE}/api/v1/astrologers", timeout=30).status_code == 401)
r = httpx.get(f"{BASE}/api/v1/astrologers", headers=auth(app_tok), timeout=30)
check("directory 200s for a logged-in client", r.status_code == 200, r.text)

print("== 3. an incomplete application cannot be submitted ==")
r = httpx.post(f"{BASE}/api/v1/astrologer/apply", headers=auth(app_tok), timeout=30)
check("submit is refused while incomplete", r.status_code == 400, r.text)

print("== 4. profile is saved ==")
r = httpx.put(f"{BASE}/api/v1/astrologer/me", headers=auth(app_tok), timeout=30, json={
    "headline": "Vedic and KP astrologer",
    "bio": "Twelve years of practice, focused on dasha and transit analysis.",
    "experience_years": 12,
    "languages": ["English", "Hindi"],
    "specialties": ["Vedic", "KP System"],
    "location": "Pune",
})
check("profile saves", r.status_code == 200, r.text)

print("== 5. documents upload, and a bad type is refused ==")
bad = httpx.post(f"{BASE}/api/v1/astrologer/documents", headers=auth(app_tok), timeout=30,
                 files={"file": ("evil.exe", io.BytesIO(b"MZ"), "application/x-msdownload")},
                 data={"kind": "pan"})
check("non-image upload is refused", bad.status_code == 400, bad.text)

for kind in ("pan", "aadhaar", "degree_certificate"):
    r = httpx.post(f"{BASE}/api/v1/astrologer/documents", headers=auth(app_tok), timeout=30,
                   files={"file": (f"{kind}.png", io.BytesIO(png_bytes()), "image/png")},
                   data={"kind": kind})
    check(f"{kind} uploads", r.status_code == 200, r.text)

r = httpx.get(f"{BASE}/api/v1/astrologer/me", headers=auth(app_tok), timeout=30)
check("three documents recorded",
      len(r.json()["application"]["documents"]) == 3, r.text)

print("== 6. submitting now succeeds and grants the role ==")
r = httpx.post(f"{BASE}/api/v1/astrologer/apply", headers=auth(app_tok), timeout=30)
check("submit succeeds", r.status_code == 200, r.text)
check("status is applied", r.json()["status"] == "applied", r.text)
me = httpx.get(f"{BASE}/api/v1/auth/me", headers=auth(app_tok), timeout=30).json()
check("role became astrologer", me.get("role") == "astrologer", str(me))

print("== 7. the applicant is not a reviewer ==")
r = httpx.get(f"{BASE}/api/v1/admin/astrologers", headers=auth(app_tok), timeout=30)
check("applicant is refused the queue", r.status_code == 403, r.text)

print("== 8. a reviewer walks the application through ==")
reviewer = register(f"smoke_rev_{suffix}@example.com", "Smoke Reviewer")
rev_tok = reviewer["token"]
# Promote in the DB: there is no self-service reviewer signup by design.
db_path = os.environ.get("SMOKE_DB", "astroseva.db")
con = sqlite3.connect(db_path)
con.execute("UPDATE users SET role='reviewer' WHERE email=?", (f"smoke_rev_{suffix}@example.com",))
con.commit()
con.close()
reviewer = register(f"smoke_rev_{suffix}@example.com", "Smoke Reviewer")
rev_tok = reviewer["token"]
check("reviewer role applies", reviewer["user"].get("role") == "reviewer", str(reviewer["user"]))

r = httpx.get(f"{BASE}/api/v1/admin/astrologers?status=applied", headers=auth(rev_tok), timeout=30)
check("reviewer sees the applied queue", r.status_code == 200, r.text)
check("application is in the queue",
      any(a["id"] == app_id for a in r.json()["applications"]), r.text)

counts = httpx.get(f"{BASE}/api/v1/admin/astrologers/counts", headers=auth(rev_tok), timeout=30).json()
check("counts include applied", counts["counts"].get("applied", 0) >= 1, str(counts))

print("== 8b. an abandoned draft is invisible to the reviewer ==")
# Someone who opens the form and leaves should not consume review time.
lurker = register(f"smoke_lurk_{suffix}@example.com", "Smoke Lurker")
l_tok = lurker["token"]
started = httpx.post(f"{BASE}/api/v1/astrologer/me/start", headers=auth(l_tok), timeout=30)
check("the lurker started an application", started.status_code == 200, started.text)
lurk_id = started.json()["id"]
check("it is a draft", started.json()["status"] == "draft", started.text)

queue = httpx.get(f"{BASE}/api/v1/admin/astrologers", headers=auth(rev_tok), timeout=30).json()
check("the draft is not in the queue",
      all(a["id"] != lurk_id for a in queue["applications"]),
      str([a["slug"] for a in queue["applications"]]))
c = httpx.get(f"{BASE}/api/v1/admin/astrologers/counts", headers=auth(rev_tok), timeout=30).json()
check("drafts are counted separately", c.get("drafts", 0) >= 1, str(c))
check("the queue total excludes drafts", c["total"] == len(queue["applications"]), str(c))

print("== 9. illegal status moves are refused ==")
r = httpx.post(f"{BASE}/api/v1/admin/astrologers/{app_id}/status", headers=auth(rev_tok), timeout=30,
               json={"to_status": "verified"})
check("applied cannot jump straight to verified", r.status_code == 409, r.text)

print("== 10. documents are reviewed, then the state advances ==")
r = httpx.get(f"{BASE}/api/v1/admin/astrologers/{app_id}", headers=auth(rev_tok), timeout=30)
docs = r.json()["documents"]
for d in docs:
    rr = httpx.post(f"{BASE}/api/v1/admin/astrologers/documents/{d['id']}/review",
                    headers=auth(rev_tok), timeout=30,
                    json={"identity_status": "admin_verified", "reviewer_note": "Legible."})
    check(f"document {d['kind']} accepted", rr.status_code == 200, rr.text)
    check(f"document {d['kind']} is admin_verified",
          rr.json().get("identity_status") == "admin_verified", rr.text)

bad = httpx.post(f"{BASE}/api/v1/admin/astrologers/documents/{docs[0]['id']}/review",
                 headers=auth(rev_tok), timeout=30,
                 json={"identity_status": "totally_verified"})
check("an invented review status is refused", bad.status_code in (400, 422), bad.text)

for target in ("under_review", "assessment_pending"):
    r = httpx.post(f"{BASE}/api/v1/admin/astrologers/{app_id}/status", headers=auth(rev_tok),
                   timeout=30, json={"to_status": target})
    check(f"advance to {target}", r.status_code == 200, r.text)

print("== 11. the assessment is graded against the server key ==")
view = httpx.get(f"{BASE}/api/v1/astrologer/assessment", headers=auth(app_tok), timeout=30).json()
check("no answer key is exposed",
      all("correct_index" not in q for q in view["questions"]), str(view["questions"][0]))

# A passing attempt: read the key from the service directly, as a reviewer-side
# check of grading, then submit those answers over HTTP.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.services import assessment as assessment_service  # noqa: E402

key = assessment_service.snapshot()
correct = {q["id"]: q["correct_index"] for q in key}
r = httpx.post(f"{BASE}/api/v1/astrologer/assessment", headers=auth(app_tok), timeout=30,
               json={str(k): v for k, v in correct.items()})
check("perfect score passes", r.json().get("passed") is True, r.text)
check("score is full marks", r.json()["score"] == r.json()["max_score"], r.text)

r = httpx.post(f"{BASE}/api/v1/astrologer/assessment", headers=auth(app_tok), timeout=30,
               json={str(q["id"]): 99 for q in key})
check("out-of-range answers do not pass", r.json().get("passed") is False, r.text)

print("== 12. a mock consultation is scored and the applicant is verified ==")
r = httpx.post(f"{BASE}/api/v1/admin/astrologers/{app_id}/status", headers=auth(rev_tok),
               timeout=30, json={"to_status": "mock_pending"})
check("advance to mock_pending", r.status_code == 200, r.text)

r = httpx.post(f"{BASE}/api/v1/admin/astrologers/{app_id}/mock-consults", headers=auth(rev_tok),
               timeout=30, json={
                   "scenario": "Client asks about a delayed marriage proposal.",
                   "response": "Explains dashas, gives remedies, no fear-mongering.",
                   "score_accuracy": 5, "score_clarity": 5, "score_empathy": 4,
                   "score_structure": 4, "verdict": "pass", "notes": "Good."})
check("mock consult recorded", r.status_code == 200, r.text)

r = httpx.post(f"{BASE}/api/v1/admin/astrologers/{app_id}/status", headers=auth(rev_tok),
               timeout=30, json={"to_status": "verified"})
check("verified after mock", r.status_code == 200, r.text)
check("status is verified", r.json()["status"] == "verified", r.text)

print("== 13. the verified profile appears in the directory ==")
time.sleep(0.5)
listing = httpx.get(f"{BASE}/api/v1/astrologers", headers=auth(app_tok), timeout=30).json()
mine = [a for a in listing["astrologers"] if a["id"] == app_id]
check("verified profile is listed", len(mine) == 1, str(listing))
check("summary carries the name", mine and mine[0].get("name") == "Smoke Applicant", str(mine))
check("accuracy score is above zero", mine and mine[0]["accuracy_score"] > 0, str(mine))

profile = httpx.get(f"{BASE}/api/v1/astrologers/{mine[0]['slug']}", headers=auth(app_tok), timeout=30)
check("profile page resolves", profile.status_code == 200, profile.text)
check("profile has an accuracy breakdown", "accuracy" in profile.json(), profile.text)

print("== 14. the filter actually filters ==")
tarot_only = httpx.get(f"{BASE}/api/v1/astrologers?specialty=KP System", headers=auth(app_tok), timeout=30).json()
check("specialty filter returns the match",
      any(a["id"] == app_id for a in tarot_only["astrologers"]), str(tarot_only))
absent = httpx.get(f"{BASE}/api/v1/astrologers?specialty=Tarot", headers=auth(app_tok), timeout=30).json()
check("unmatched specialty excludes the profile",
      all(a["id"] != app_id for a in absent["astrologers"]), str(absent))

print("== 15. the audit trail records the whole path ==")
events = httpx.get(f"{BASE}/api/v1/astrologer/timeline", headers=auth(app_tok), timeout=30).json()["events"]
kinds = {e["event_type"] for e in events}
check("status changes are audited", "status_changed" in kinds, str(kinds))
check("assessment submission is audited", "assessment_submitted" in kinds, str(kinds))
audit = httpx.get(f"{BASE}/api/v1/admin/astrologers/{app_id}/audit", headers=auth(rev_tok), timeout=30)
check("reviewer can read the audit trail", audit.status_code == 200, audit.text)
check("audit entries carry their payload",
      any(e.get("payload") for e in audit.json()["events"]), audit.text[:200])

print("== 15b. the admin payload exposes attempts, so overrides are reachable ==")
admin_view = httpx.get(f"{BASE}/api/v1/admin/astrologers/{app_id}", headers=auth(rev_tok), timeout=30).json()
attempts = admin_view.get("assessments", [])
check("attempts are visible to a reviewer", len(attempts) == 2, str(attempts)[:200])
check("the attempt id needed for an override is present",
      all("id" in a and "score" in a for a in attempts), str(attempts)[:200])
check("the answer key is NOT in the admin payload",
      "questions_snapshot" not in admin_view and "answers" not in admin_view,
      str(admin_view)[:200])

print("== 15c. a failed grade can be overridden, with a written reason ==")
failed_attempt = next((a for a in attempts if not a["passed"]), None)
check("there is a failed attempt to override", failed_attempt is not None, str(attempts)[:200])
if failed_attempt:
    override_url = (
        f"{BASE}/api/v1/admin/astrologers/{app_id}"
        f"/assessments/{failed_attempt['id']}/override"
    )
    # `passed` and `note` are query parameters, matching what the UI sends.
    r = httpx.post(override_url, headers=auth(rev_tok), timeout=30,
                   params={"passed": "true", "note": ""})
    check("an override without a reason is refused", r.status_code == 400, r.text)

    r = httpx.post(
        override_url, headers=auth(rev_tok), timeout=30,
        params={"passed": "true",
                "note": "Answers contradicted the key; re-read the snapshot."})
    check("override with a reason succeeds", r.status_code == 200, r.text)
    check("override flips the result", r.json().get("passed") is True, r.text)

    after = httpx.get(f"{BASE}/api/v1/admin/astrologers/{app_id}", headers=auth(rev_tok), timeout=30).json()
    updated = next(a for a in after["assessments"] if a["id"] == failed_attempt["id"])
    check("the override is recorded on the attempt",
          updated["passed"] is True and updated["override_note"], str(updated))
    check("the override is audited",
      any(e["event_type"] == "assessment_overridden" for e in after["events"]),
      str([e["event_type"] for e in after["events"]]))

    r = httpx.post(
        f"{BASE}/api/v1/admin/astrologers/{app_id}/assessments/999999/override",
        headers=auth(rev_tok), timeout=30, params={"passed": "true", "note": "x"})
    check("an override for someone else's attempt 404s", r.status_code == 404, r.text)

print("== 15d. availability can be published, and overlaps are refused ==")
# timezone_offset is in HOURS (-12..14), not minutes. IST is 5.5.
IST = 5.5
r = httpx.post(f"{BASE}/api/v1/astrologer/availability", headers=auth(app_tok), timeout=30, json={
    "weekday": 2, "start_minute": 1080, "end_minute": 1200,
    "timezone_offset": IST, "slot_minutes": 30})
check("a window is accepted", r.status_code == 200, r.text)
window_id = r.json()["id"]

r = httpx.post(f"{BASE}/api/v1/astrologer/availability", headers=auth(app_tok), timeout=30, json={
    "weekday": 2, "start_minute": 1140, "end_minute": 1260,
    "timezone_offset": IST, "slot_minutes": 30})
check("an overlapping window is refused", r.status_code == 409, r.text)

r = httpx.post(f"{BASE}/api/v1/astrologer/availability", headers=auth(app_tok), timeout=30, json={
    "weekday": 4, "start_minute": 1200, "end_minute": 1080,
    "timezone_offset": IST, "slot_minutes": 30})
check("an end before the start is refused", r.status_code == 400, r.text)

r = httpx.post(f"{BASE}/api/v1/astrologer/availability", headers=auth(app_tok), timeout=30, json={
    "weekday": 4, "start_minute": 600, "end_minute": 660,
    "timezone_offset": 330, "slot_minutes": 30})
check("an offset in minutes is rejected, not silently coerced",
      r.status_code == 422, r.text)

r = httpx.get(f"{BASE}/api/v1/astrologer/availability", headers=auth(app_tok), timeout=30).json()
check("exactly one window is stored", len(r["availability"]) == 1, str(r))
check("the window has minutes-from-midnight times",
      r["availability"][0]["start_minute"] == 1080, str(r))

prof = httpx.get(f"{BASE}/api/v1/astrologers/{mine[0]['slug']}", headers=auth(app_tok), timeout=30).json()
check("the public profile shows the published window",
      len(prof.get("availability", [])) == 1, str(prof)[:200])

r = httpx.delete(f"{BASE}/api/v1/astrologer/availability/{window_id}", headers=auth(app_tok), timeout=30)
check("a window can be removed", r.status_code == 200, r.text)
r = httpx.get(f"{BASE}/api/v1/astrologer/availability", headers=auth(app_tok), timeout=30).json()
check("the window is gone", len(r["availability"]) == 0, str(r))

print("== 16. isolation: one applicant cannot touch another's application ==")
other = register(f"smoke_other_{suffix}@example.com", "Smoke Other")
o_tok = other["token"]
httpx.get(f"{BASE}/api/v1/astrologer/me", headers=auth(o_tok), timeout=30)
r = httpx.get(f"{BASE}/api/v1/admin/astrologers/{app_id}", headers=auth(o_tok), timeout=30)
check("a plain client is refused another applicant's record", r.status_code == 403, r.text)

print("== 17. a suspended practitioner disappears from the directory ==")
r = httpx.post(f"{BASE}/api/v1/admin/astrologers/{app_id}/status", headers=auth(rev_tok),
               timeout=30, json={"to_status": "suspended"})
check("suspension allowed", r.status_code == 200, r.text)
after = httpx.get(f"{BASE}/api/v1/astrologers", headers=auth(app_tok), timeout=30).json()
check("suspended profile is no longer listed",
      all(a["id"] != app_id for a in after["astrologers"]), str(after))
check("suspended profile 404s",
      httpx.get(f"{BASE}/api/v1/astrologers/{mine[0]['slug']}", headers=auth(app_tok),
                timeout=30).status_code == 404)

print()
if failures:
    print(f"FAILED: {len(failures)} check(s): {failures}")
    sys.exit(1)
print("ALL CHECKS PASSED")
