"""Live check: does a festival scan still stall unrelated requests?

Runs against the already-running dev server on 127.0.0.1:8000.

    cd backend && python tests/live_concurrency_check.py
"""

import json
import sqlite3
import threading
import time
import urllib.error
import urllib.request
import uuid

BASE = "http://127.0.0.1:8000"
LAT, LON, TZ = 28.6139, 77.209, 5.5


def call(path, method="GET", body=None, token=None, timeout=300):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw[:1] in b"{[" else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, (json.loads(raw) if raw[:1] in b"{[" else None)


def clear_cache(fragment):
    con = sqlite3.connect("app/cache_fallback.db")
    n = con.execute("delete from cache where key like ?",
                    (f"%{fragment}%",)).rowcount
    con.commit()
    con.close()
    return n


def main():
    email = f"conc-{uuid.uuid4().hex[:8]}@example.com"
    call("/api/v1/auth/register", "POST",
         {"email": email, "name": "Conc", "password": "Conc-Test-1"})
    status, login = call("/api/v1/auth/login", "POST",
                         {"email": email, "password": "Conc-Test-1"})
    token = (login or {}).get("token")
    if not token:
        print(f"  login failed: {status} {login}")
        return 1
    print(f"  logged in ({email})")

    # A year nobody has requested, and its cache entries dropped, so the scan is
    # genuinely cold and runs the full computation.
    year = 2031
    cleared = clear_cache(str(year))
    print(f"  cleared {cleared} cache rows for {year}, so the scan is cold\n")

    slow = {}

    def run_festivals():
        start = time.perf_counter()
        status, payload = call(
            f"/api/v1/festivals/list?year={year}&month=10"
            f"&latitude={LAT}&longitude={LON}&timezone_offset={TZ}",
            token=token,
        )
        slow["elapsed"] = time.perf_counter() - start
        slow["status"] = status
        slow["count"] = (payload or {}).get("count")

    thread = threading.Thread(target=run_festivals)
    thread.start()
    # Let the scan get under way before the "unrelated" request lands, so the
    # two genuinely overlap.
    time.sleep(0.4)

    start = time.perf_counter()
    status, payload = call(
        f"/api/v1/panchang/daily?date_str={year}-06-01"
        f"&latitude={LAT}&longitude={LON}&timezone_offset={TZ}",
        token=token,
    )
    quick = time.perf_counter() - start
    thread.join()

    print(f"  festivals (the slow one) : {slow['elapsed']:.2f}s  "
          f"status={slow['status']}  festivals={slow['count']}")
    print(f"  panchang, mid-scan       : {quick:.2f}s  status={status}")

    ok = True
    if slow["status"] != 200 or not slow["count"]:
        print("  FAIL: the festival scan did not succeed")
        ok = False
    if quick > 1.0:
        print(f"  FAIL: an unrelated request waited {quick:.1f}s behind the scan")
        ok = False
    else:
        print(f"  PASS: unrelated request returned in {quick:.2f}s "
              f"(was 14.8s when the scan blocked the event loop)")

    con = sqlite3.connect("astroseva.db")
    con.execute("delete from users where email = ?", (email,))
    con.commit()
    con.close()
    print("  cleaned up the throwaway account")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())