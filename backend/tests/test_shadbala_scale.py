"""Shadbala must report the strength on the scale it is computed on.

`rupor_virupada` held `total / 6.0`, which is neither the Rupor total nor a
virupada. The six components are each out of 60 Rupor, so their sum is the
Rupor total -- up to 360 -- and a Rupa is 60 Rupor. A virupada and a Rupor are
the same unit, so the name stated one quantity under two labels while the value
was a third thing: for the Sun it reported 55.0 where the Rupor total was
329.25.
"""

import pytest

from app.core.shadbala import GRAHAS, build_shadbala

COMPONENTS = ("sthana", "dig", "kala", "cheshta", "naisargika", "drik")


def _chart():
    return [
        {"planet": "Sun", "longitude": 20.0, "house": 1, "sign": 0},
        {"planet": "Moon", "longitude": 60.0, "house": 3, "sign": 2},
        {"planet": "Mars", "longitude": 200.0, "house": 8, "sign": 6},
        {"planet": "Mercury", "longitude": 150.0, "house": 6, "sign": 5},
        {"planet": "Jupiter", "longitude": 100.0, "house": 4, "sign": 3},
        {"planet": "Venus", "longitude": 350.0, "house": 12, "sign": 11},
        {"planet": "Saturn", "longitude": 300.0, "house": 11, "sign": 10},
    ]


@pytest.fixture(scope="module")
def result():
    return build_shadbala(_chart(), 0)


def test_total_rupor_equals_the_sum_of_the_six_components(result):
    """The field named `rupor_virupada` held the sum divided by six."""
    for row in result["planets"]:
        component_sum = sum(row[c] for c in COMPONENTS)
        assert row["total_rupor"] == pytest.approx(component_sum, abs=0.05), row
        assert row["total_rupor"] != pytest.approx(component_sum / 6.0, abs=0.05)


def test_the_old_field_name_is_gone(result):
    """`rupor_virupada` named one unit twice while holding a third value."""
    for row in result["planets"]:
        assert "rupor_virupada" not in row
        assert "total_rupor" in row
        assert row["max_rupor"] == 360.0


def test_rupa_is_sixty_rupor(result):
    """One Rupa is 60 Rupor, so the two scales must agree under that factor."""
    for row in result["planets"]:
        assert row["total_rupa"] == pytest.approx(
            row["total_rupor"] / 60.0, abs=0.001
        ), row


def test_totals_stay_within_the_declared_maximum(result):
    for row in result["planets"]:
        assert 0 <= row["total_rupor"] <= row["max_rupor"], row
        assert 0 <= row["total_rupa"] <= 6.0, row


def test_strongest_and_weakest_agree_with_the_rows(result):
    """A sanity check that the scale change did not disturb the values.

    The ordering is by the reported total, so the summary fields must agree
    with the rows rather than being computed on some other scale.
    """
    rows = result["planets"]
    assert result["strongest"] == max(rows, key=lambda r: r["total_rupor"])["planet"]
    assert result["weakest"] == min(rows, key=lambda r: r["total_rupor"])["planet"]


def test_components_are_themselves_within_sixty(result):
    for row in result["planets"]:
        for c in COMPONENTS:
            assert 0 <= row[c] <= 60, (row["planet"], c, row[c])


def test_every_graha_is_reported(result):
    assert {p["planet"] for p in result["planets"]} == set(GRAHAS)


def test_the_type_on_the_frontend_names_the_right_field():
    """`api.ts` declared `rupor_virupada`, so the page and backend disagreed."""
    from pathlib import Path

    page = (
        Path(__file__).resolve().parents[2]
        / "frontend" / "src" / "lib" / "api.ts"
    ).read_text(encoding="utf-8")
    assert "rupor_virupada" not in page
    assert "total_rupor" in page
    assert "max_rupor" in page
