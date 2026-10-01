"""Location search over the shared city/town dataset.

One dataset, one endpoint, one consumer. Every feature that needs a birthplace
uses `components/CitySearch.tsx`, which calls this. There is deliberately no
second city list: a second list is how two features end up disagreeing about
which towns exist.

The dataset lives only at `backend/data/cities.json` (regenerate with
`data/build_cities.py`). It was previously duplicated at
`frontend/src/lib/cities.json` and excluded from the Docker build by
`backend/.dockerignore`, so in a container the loader found neither file and
every search returned an empty list — which looks to a user like "this town is
not supported". Both are fixed: the duplicate is gone and `data/` is no longer
ignored. `tests/test_cities_search.py` fails loudly if the dataset is
unreachable.
"""

import json
import os
from functools import lru_cache

from fastapi import APIRouter, Query

router = APIRouter(tags=["cities"])

_HERE = os.path.dirname(os.path.abspath(__file__))
_BACKEND_ROOT = os.path.abspath(os.path.join(_HERE, "..", ".."))

_CITIES_PATH = os.path.join(_BACKEND_ROOT, "data", "cities.json")

# How many suggestions to return. Ten was enough to hide the real answer: the
# matching was an unranked substring scan, so `pur` returned the first ten names
# in file order (no guarantee it even included "Puri") rather than the best ones.
DEFAULT_LIMIT = 12
MAX_LIMIT = 50


@lru_cache(maxsize=1)
def _load_cities() -> tuple:
    """Read the dataset once per process.

    A JSON decode error is deliberately not swallowed: a corrupt dataset should
    be a loud startup failure, not a search box that silently returns nothing.
    """
    if not os.path.exists(_CITIES_PATH):
        raise RuntimeError(
            "No location dataset found. Expected: "
            f"{_CITIES_PATH} (regenerate with data/build_cities.py)"
        )
    try:
        with open(_CITIES_PATH, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(
            f"Could not read the location dataset at {_CITIES_PATH}: {exc}"
        ) from exc
    if not isinstance(data, list):
        raise RuntimeError(
            f"The location dataset at {_CITIES_PATH} is not a list of locations"
        )
    return tuple(data)


def _score(city_name: str, query: str) -> int:
    """Rank a match. Higher is better; 0 means no match.

    The previous behaviour was `query in name` with no ordering, which made
    reachability depend on where a town happened to sit in the file. With 6,288
    places, `kot` matched 83 names and `pur` matched 641, so the place the user
    actually meant was almost never among the first ten.

    Known limitation: ranking is by text shape, not prominence, because the
    dataset carries no population or feature-class field. `pur` therefore ranks
    "Puri" above "Purnia" only by length, not by importance. Adding an alias
    layer (Banaras -> Varanasi) is the honest fix; guessing prominence is not.
    "Banaras" is not in the dataset at all — the city is stored as "Varanasi".

    Scored in tiers, most specific first:
      exact name              the user typed the full name
      name starts with query  Delhi -> Delhi, New Delhi
      word starts with query  "new del" -> New Delhi
      substring               "eli" -> Belleli
      all query letters in order, as a subsequence
    """
    name = city_name.lower()
    if name == query:
        return 1000
    if name.startswith(query):
        # Shorter names are more likely to be the intended major city:
        # "Delhi" should outrank "Delhi Cantonment West".
        return 900 - min(len(name) - len(query), 90)
    for index, word in enumerate(name.split()):
        if word.startswith(query):
            return 800 - index * 10 - min(len(word) - len(query), 40)
    if query in name:
        return 600 - name.index(query)
    # Subsequence: every query character appears in order. The only way to reach
    # a village whose name is spelled differently from the guess.
    position = 0
    gaps = 0
    for char in query:
        found = name.find(char, position)
        if found == -1:
            return 0
        gaps += found - position
        position = found + 1
    if position < len(name):
        # Require the match to span most of the name, or "a" matches everything.
        if gaps > len(name):
            return 0
    return 300 - min(gaps, 200)


@router.get("/api/v1/cities")
def search_cities(
    q: str = Query(..., min_length=1, max_length=100, description="City or town name"),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT, description="Maximum suggestions"),
):
    """Search cities and towns by name, best match first.

    `total` is the number of matches found before `limit` is applied, so the
    client can tell "three places match" from "thirteen places match, here are
    the best twelve".
    """
    # Called directly (from tests, or from any non-HTTP caller) rather than
    # through FastAPI, the `Query(...)` defaults arrive as `Query` objects
    # rather than values. Normalising them here keeps the function usable both
    # ways instead of only inside a request.
    if not isinstance(limit, int):
        limit = DEFAULT_LIMIT
    limit = max(1, min(limit, MAX_LIMIT))

    query = q.strip().lower()
    if not query:
        return {"cities": [], "total": 0}

    scored = []
    for city in _load_cities():
        name = city.get("name")
        if not name:
            continue
        score = _score(name, query)
        if score:
            scored.append((score, name, city))

    # Sorted by score, then by name so equal-scoring results are stable and
    # alphabetical rather than dependent on file order.
    scored.sort(key=lambda row: (-row[0], row[1]))
    return {
        "cities": [city for _, _, city in scored[:limit]],
        "total": len(scored),
    }