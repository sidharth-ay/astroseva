"""Delete the throwaway accounts created while diagnosing auth and rate limits.

Targets only the prefixes used by the ad-hoc diagnostic commands
(burst/burst2/rl/authdiag/verify) plus the smoke_ prefix handled by
clean_smoke_data.py. The original development accounts and kk@gmail.com are
left alone.
"""

import sqlite3
import sys

DB = "astroseva.db"
PREFIXES = ("burst%", "burst2%", "rl_%", "authdiag_%", "verify_%")

con = sqlite3.connect(DB)
cur = con.cursor()

removed = 0
for pattern in PREFIXES:
    cur.execute("delete from users where email like ?", (pattern,))
    removed += cur.rowcount
con.commit()

left = cur.execute("select count(1) from users").fetchone()[0]
print(f"removed {removed} diagnostic accounts")
print(f"users remaining: {left}")
print("remaining emails:")
for (email,) in cur.execute("select email from users order by id").fetchall():
    print("  ", email)

con.close()
sys.exit(0)
