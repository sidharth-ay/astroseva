"""Remove smoke-test rows from the development database.

The live marketplace smoke script creates real users against the running
server, so it leaves data behind. This deletes exactly the accounts it created
(email prefix `smoke_`) and everything hanging off them.
"""

import sqlite3
import sys

DB = "astroseva.db"
PREFIX = "smoke_"

TABLES = [
    "astrologer_documents",
    "astrologer_assessments",
    "astrologer_mock_consults",
    "astrologer_availability",
    "onboarding_events",
]

con = sqlite3.connect(DB)
cur = con.cursor()

before_users = cur.execute("select count(*) from users").fetchone()[0]
before_profiles = cur.execute("select count(*) from astrologers").fetchone()[0]

user_ids = [r[0] for r in cur.execute(
    "select id from users where email like ?", (PREFIX + "%",)).fetchall()]

if user_ids:
    ph = ",".join("?" * len(user_ids))
    profile_ids = [r[0] for r in cur.execute(
        f"select id from astrologers where user_id in ({ph})", user_ids).fetchall()]

    if profile_ids:
        aph = ",".join("?" * len(profile_ids))
        for table in TABLES:
            cur.execute(f"delete from {table} where astrologer_id in ({aph})", profile_ids)
        cur.execute(f"delete from astrologers where id in ({aph})", profile_ids)

    cur.execute(f"delete from users where id in ({ph})", user_ids)

# job_runs holds no profile link, so it is cleared wholesale: nothing else writes
# to it and a stale retry row would re-run a handler against a deleted profile.
cur.execute("delete from job_runs")
con.commit()

after_users = cur.execute("select count(*) from users").fetchone()[0]
after_profiles = cur.execute("select count(*) from astrologers").fetchone()[0]
left = cur.execute(
    "select count(*) from users where email like ?", (PREFIX + "%",)).fetchone()[0]

print(f"users:    {before_users} -> {after_users}")
print(f"astrologers: {before_profiles} -> {after_profiles}")
for table in TABLES + ["job_runs"]:
    print(f"{table}: {cur.execute(f'select count(*) from {table}').fetchone()[0]}")

con.close()

if left:
    print(f"FAILED: {left} smoke accounts remain", file=sys.stderr)
    sys.exit(1)
print("clean")
