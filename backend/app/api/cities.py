"""City search API endpoint for lightweight client-side autocomplete."""

import json
import os
from functools import lru_cache
from fastapi import APIRouter, Query

router = APIRouter(tags=["cities"])

_CITIES_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "cities.json")
_FALLBACK_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "src", "lib", "cities.json")


@lru_cache(maxsize=1)
def _load_cities():
    for p in (_CITIES_PATH, _FALLBACK_PATH):
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            continue
    return []


@router.get("/api/v1/cities")
def search_cities(q: str = Query(..., min_length=1, max_length=100, description="City name to search")):
    cities = _load_cities()
    lower = q.lower()
    matched = [c for c in cities if lower in c["name"].lower()][:10]
    return {"cities": matched}
