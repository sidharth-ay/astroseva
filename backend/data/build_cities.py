"""Add an IANA timezone to every record in the location dataset.

The dataset shipped with a single fixed UTC offset per city. That is correct for
*today* and wrong for any historical birth: India used +5:53:20 until 1947-10-15,
+6:30 through the 1941-42 British wartime daylight saving, and +5:30 between
1942 and 1947. So a chart for someone born in 1935 was computed more than half an
hour off, which is enough to move the ascendant.

`tz` is kept, because it is a correct present-day offset and some callers want
it. `tz_iana` is added alongside, and the backend resolves the offset for the
actual birth date with the standard library's `zoneinfo`, which knows the history.

Run from the repo root:

    python backend/data/build_cities.py

The output is `backend/data/cities.json`, the single dataset the API serves. The
previous copy under `frontend/src/lib/` was deleted: nothing read it except a
dead export, and having two copies of the same list is how two features end up
disagreeing about which towns exist.
"""

import json
import os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
DATASET = os.path.join(HERE, "cities.json")

# The five non-Indian records, by name. Everything else in the file is inside
# India's bounding box and shares one zone.
INTERNATIONAL_ZONES = {
    "London": "Europe/London",
    "New York": "America/New_York",
    "Sydney": "Australia/Sydney",
    "Dubai": "Asia/Dubai",
    "Singapore": "Asia/Singapore",
}
INDIA_ZONE = "Asia/Kolkata"

# India's extent, used to decide which zone a record belongs to. Deliberately
# generous: an over-wide box that mislabels nothing matters more than a tight one
# that mislabels a border town.
INDIA_LAT = (5.0, 38.0)
INDIA_LNG = (66.0, 99.0)


def zone_for(record: dict) -> str:
    name = (record.get("name") or "").strip()
    if name in INTERNATIONAL_ZONES:
        return INTERNATIONAL_ZONES[name]
    lat = record.get("lat")
    lng = record.get("lng")
    if (
        isinstance(lat, (int, float))
        and isinstance(lng, (int, float))
        and INDIA_LAT[0] <= lat <= INDIA_LAT[1]
        and INDIA_LNG[0] <= lng <= INDIA_LNG[1]
    ):
        return INDIA_ZONE
    # Anything outside both is not in this dataset today. `UTC` is a safe,
    # obviously-wrong-looking value rather than a plausible guess, so a future
    # record lands somewhere visible instead of silently charted at the wrong
    # offset.
    return "UTC"


def main() -> int:
    with open(DATASET, "r", encoding="utf-8") as handle:
        records = json.load(handle)

    if not isinstance(records, list) or not records:
        raise SystemExit(f"{DATASET} is not a non-empty list")

    zones = Counter()
    changed = 0
    for record in records:
        zone = zone_for(record)
        record["tz_iana"] = zone
        zones[zone] += 1
        if zone == "UTC":
            changed += 1

    # Field order is stable so the file diffs cleanly.
    ordered = [
        {
            "name": r.get("name"),
            "lat": r.get("lat"),
            "lng": r.get("lng"),
            "tz": r.get("tz"),
            "tz_iana": r.get("tz_iana"),
            "state": r.get("state", ""),
        }
        for r in records
    ]

    with open(DATASET, "w", encoding="utf-8") as handle:
        json.dump(ordered, handle, ensure_ascii=False, separators=(",", ":"))

    print(f"  {len(ordered)} records written to {DATASET}")
    for zone, count in zones.most_common():
        print(f"    {zone:<22} {count}")
    if changed:
        print(f"  WARNING: {changed} record(s) fell outside every known zone")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())