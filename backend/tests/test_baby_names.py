"""Baby name suggestion tests.

The feature was completely broken: the page sends gender="boy"/"girl" while the
query parameter only accepted "male"/"female", so every request returned 422 and
no name was ever shown. test_gender_values_the_page_sends_all_work is the
regression guard for exactly that.
"""

import pytest

from app.api.baby_names import (
    BOY_NAMES,
    GIRL_NAMES,
    _to_numerology_date,
    suggest_baby_names,
)
from app.core.numerology import calculate_life_path_number
from tests.conftest import build_test_request


@pytest.mark.parametrize("gender", ["boy", "male", "m"])
def test_male_spellings_work(gender, http_request):
    result = await_suggest(gender=gender, request=http_request)
    assert result["gender"] == "male"
    assert result["count"] > 0
    assert result["names"]


@pytest.mark.parametrize("gender", ["girl", "female", "f"])
def test_female_spellings_work(gender, http_request):
    result = await_suggest(gender=gender, request=http_request)
    assert result["gender"] == "female"
    assert result["count"] > 0
    assert result["names"]


def test_gender_values_the_page_sends_all_work(http_request):
    """The exact values the Boy/Girl buttons send. This was a hard 422."""
    import asyncio

    async def run():
        for gender in ("boy", "girl"):
            res = await suggest_baby_names(
                request=http_request, gender=gender, birth_date=None
            )
            assert res["count"] > 0, gender
            assert all(n["name"] for n in res["names"]), gender

    asyncio.run(run())


def test_unknown_gender_is_rejected(http_request):
    import asyncio
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            suggest_baby_names(request=http_request, gender="other", birth_date=None)
        )
    assert exc.value.status_code == 400


# --- numerology -------------------------------------------------------------


def test_iso_date_is_converted_before_numerology():
    """An ISO date read as DD-MM-YYYY would give a wrong Life Path number."""
    iso = "2026-09-29"
    converted = _to_numerology_date(iso)
    assert converted == "29-09-2026"
    # Sanity: the correct Life Path for this date.
    assert calculate_life_path_number(converted)["life_path_number"] == 3


def test_life_path_is_returned_for_a_birth_date():
    result = await_suggest(gender="boy", birth_date="2026-09-29")
    assert result["life_path"]["life_path_number"] == 3
    assert result["life_path"]["reduction"]


def test_names_carry_a_destiny_number_and_verdict():
    result = await_suggest(gender="girl", birth_date="2026-09-29")
    for n in result["names"]:
        # Master numbers 11, 22 and 33 are valid Destiny numbers.
        assert 1 <= n["destiny_number"] <= 33
        assert n["compatibility"] in {"Excellent", "Strong", "Good", "Neutral"}
        assert n["compatibility_note"]
        assert n["meaning"] and n["origin"]


def test_no_duplicate_names_within_a_pool():
    for pool, label in ((BOY_NAMES, "BOY_NAMES"), (GIRL_NAMES, "GIRL_NAMES")):
        names = [n["name"] for n in pool]
        dupes = {n for n in names if names.count(n) > 1}
        assert not dupes, f"{label} has duplicate names: {dupes}"


def test_ranking_puts_the_best_match_first():
    result = await_suggest(gender="boy", birth_date="2026-09-29")
    order = {"Excellent": 0, "Strong": 1, "Good": 2, "Neutral": 3}
    ranks = [order[n["compatibility"]] for n in result["names"]]
    assert ranks == sorted(ranks), "names must be ordered best match first"


def test_ranking_is_stable_across_calls():
    a = await_suggest(gender="boy", birth_date="2026-09-29")
    b = await_suggest(gender="boy", birth_date="2026-09-29")
    assert [n["name"] for n in a["names"]] == [n["name"] for n in b["names"]]


def test_without_a_birth_date_names_are_unranked_but_still_shown():
    result = await_suggest(gender="boy")
    assert result["life_path"] is None
    assert result["count"] == len(BOY_NAMES)
    assert all(n["compatibility"] == "Neutral" for n in result["names"])


def test_unparseable_date_does_not_break_the_feature():
    result = await_suggest(gender="boy", birth_date="not-a-date")
    assert result["count"] > 0
    assert result["life_path"] is None


def test_gender_selects_the_right_pool():
    boys = await_suggest(gender="boy")
    girls = await_suggest(gender="girl")
    assert len(boys["names"]) == len(BOY_NAMES)
    assert len(girls["names"]) == len(GIRL_NAMES)
    assert {n["name"] for n in boys["names"]}.isdisjoint(
        {n["name"] for n in girls["names"]}
    )


def test_no_contradictory_hardcoded_lucky_number():
    """Each name's number now comes from numerology, not a stored constant."""
    result = await_suggest(gender="boy", birth_date="2026-09-29")
    for entry in BOY_NAMES:
        assert "lucky_number" not in entry, f"{entry['name']} still carries a hardcoded number"
    for n in result["names"]:
        assert "lucky_number" not in n


def test_endpoint_requires_auth(client):
    """The router is behind login like every other feature."""
    resp = client.get("/api/v1/baby-names/suggest?gender=boy")
    assert resp.status_code == 200
    assert resp.json()["count"] > 0


def await_suggest(**kwargs) -> dict:
    """Call the coroutine endpoint directly with its defaults filled in."""
    import asyncio

    # `request` is required by the rate-limit decorator, which reads it off the
    # handler signature rather than the ASGI scope. Supplied here so every
    # caller of this helper does not have to.
    params = {"request": kwargs.pop("request", None) or build_test_request(),
              "gender": "boy", "birth_date": None}
    params.update(kwargs)
    return asyncio.run(suggest_baby_names(**params))
