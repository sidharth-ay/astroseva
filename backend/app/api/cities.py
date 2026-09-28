"""City/district search API for birth-place autocomplete.

Primary source: districts.json (all Indian districts with state + coords +
old-name aliases). Fallback/merged: towns file (smaller towns & villages).
Every result carries a prebuilt "Name, State" label so same-name places in
different states are unambiguous.
"""

import json
import os
from functools import lru_cache
from fastapi import APIRouter, Query

router = APIRouter(tags=["cities"])

_DISTRICTS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "districts.json")
_TOWNS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "src", "lib", "cities.json")


def _load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (FileNotFoundError, ValueError):
        return []


@lru_cache(maxsize=1)
def _load_places():
    """Merged, normalized place index (districts first, then towns)."""
    places = []
    # normalized name-or-alias -> list of (lat, lng): suppresses stale town
    # rows that duplicate a district (e.g. town "Aurangabad" vs district
    # "Chhatrapati Sambhajinagar" sharing old-name aliases + coords).
    district_index: dict[str, list] = {}
    for d in _load_json(_DISTRICTS_PATH):
        name = str(d.get("district", "")).strip()
        state = str(d.get("state", "")).strip()
        if not name:
            continue
        lat, lng = d.get("lat"), d.get("lng")
        district_index.setdefault(name.lower(), []).append((lat, lng))
        for alias in (d.get("aliases") or []):
            district_index.setdefault(str(alias).lower(), []).append((lat, lng))
        places.append({
            "name": name,
            "district": name,
            "state": state,
            "lat": lat,
            "lng": lng,
            "tz": 5.5,
            "aliases": [str(a) for a in (d.get("aliases") or [])],
            "kind": "district",
            "label": f"{name}, {state}" if state else name,
        })
    for t in _load_json(_TOWNS_PATH):
        name = str(t.get("name", "")).strip()
        if not name:
            continue
        # Skip towns that duplicate a district (same name/alias, coords
        # within ~15km): the district entry (with state) is strictly better.
        if t.get("lat") is not None and any(
            dlat is not None
            and abs(dlat - t["lat"]) < 0.15
            and abs(dlng - t["lng"]) < 0.15
            for dlat, dlng in district_index.get(name.lower(), [])
        ):
            continue
        state = str(t.get("state", "")).strip()
        places.append({
            "name": name,
            "district": "",
            "state": state,
            "lat": t.get("lat"),
            "lng": t.get("lng"),
            "tz": t.get("tz", 5.5),
            "aliases": [],
            "kind": "town",
            "label": f"{name}, {state}" if state else name,
        })
    return places


def _score(name: str, q: str) -> int | None:
    """Match rank: exact (0) < prefix (1) < word-start (2) < substring (3). None = no match."""
    n = name.lower()
    if n == q:
        return 0
    if n.startswith(q):
        return 1
    if any(w.startswith(q) for w in n.replace("-", " ").split()):
        return 2
    if q in n:
        return 3
    return None


@router.get("/api/v1/cities")
def search_cities(q: str = Query(..., min_length=1, max_length=100, description="City or district name to search")):
    places = _load_places()
    # Support "name, state" queries to disambiguate directly.
    if "," in q:
        name_part, state_part = (p.strip().lower() for p in q.split(",", 1))
    else:
        name_part, state_part = q.strip().lower(), ""

    scored = []
    for p in places:
        if state_part and state_part not in p["state"].lower():
            continue
        best = _score(p["name"], name_part)
        if best is None:
            for alias in p["aliases"]:
                alias_score = _score(alias, name_part)
                if alias_score is not None:
                    best = alias_score + 1  # alias hits rank just below direct hits
                    break
        if best is None:
            continue
        # Districts before towns on ties.
        scored.append((best, 0 if p["kind"] == "district" else 1, p))

    scored.sort(key=lambda s: (s[0], s[1], s[2]["name"]))
    return {"cities": [p for _, _, p in scored[:15]]}
