"""The Kundli PDF must actually show the house placements.

`get_kundli_chart` keys houses by integer, and the PDF builder looked them up
with `houses.get(str(house_num))`. Every lookup missed, so all twelve houses
rendered as "Empty" in every PDF the app produced. The bug was invisible because
an empty house is a legitimate value in that column.

The house rows are read off the flowable list that `generate_kundli_pdf` builds,
rather than from the rendered PDF: extracting the text layer would need
pdfminer, which is not a dependency of this project.
"""

import pytest

from app.core.houses import get_kundli_chart
from app.services.pdf_service import generate_kundli_pdf


def _house_rows(kundli_data: dict) -> list[list[str]]:
    """The house-placement rows, pulled out of the built flowables."""
    from reportlab.platypus import Table

    captured = {}
    import app.services.pdf_service as pdf_service

    original = pdf_service.SimpleDocTemplate.build

    def spy(doc, flowables, *args, **kwargs):
        captured["flowables"] = flowables
        raise _StopHere()

    pdf_service.SimpleDocTemplate.build = spy
    try:
        generate_kundli_pdf(kundli_data)
    except _StopHere:
        pass
    finally:
        pdf_service.SimpleDocTemplate.build = original

    for flowable in captured["flowables"]:
        if isinstance(flowable, Table):
            rows = [[str(c) for c in row] for row in flowable._cellvalues]
            if any(row and row[0].startswith("House 1") for row in rows):
                return rows
    raise AssertionError("no house-placement table was built")


class _StopHere(Exception):
    """Raised from the build hook to stop before writing the PDF."""


def _pdf_bytes(kundli_data: dict) -> bytes:
    """Produce a real PDF, to confirm the data does not break the build."""
    return generate_kundli_pdf(kundli_data)


@pytest.fixture(scope="module")
def chart():
    planets = [
        {"planet": "Sun", "longitude": 20.0},      # Aries, house 1
        {"planet": "Moon", "longitude": 50.0},     # Taurus, house 2
        {"planet": "Mars", "longitude": 350.0},    # Pisces, house 12
    ]
    # Ascendant in Aries (15 degrees) makes the above land in houses 1, 2, 12.
    return get_kundli_chart(15.0, planets)


def test_chart_houses_are_keyed_by_integer(chart):
    """The PDF used to look them up by string, which cannot match."""
    assert set(chart) == set(range(1, 13))
    assert all(isinstance(k, int) for k in chart)


def test_house_placements_appear_in_the_pdf(chart):
    rows = _house_rows({"houses": chart, "name": "Test"})
    placed = {row[0]: row[1] for row in rows}
    assert "Sun" in placed["House 1"], placed["House 1"]
    assert "Moon" in placed["House 2"], placed["House 2"]
    assert "Mars" in placed["House 12"], placed["House 12"]


def test_pdf_is_not_all_empty_houses(chart):
    """Nine of twelve houses are genuinely empty, so count the non-empty ones."""
    rows = _house_rows({"houses": chart, "name": "Test"})
    empty = [row[0] for row in rows if row[1] == "Empty"]
    assert len(empty) == 9, empty


def test_pdf_accepts_string_keyed_houses(chart):
    """A JSON round-trip turns integer keys into strings, so both are handled."""
    string_keyed = {str(k): v for k, v in chart.items()}
    rows = _house_rows({"houses": string_keyed, "name": "Test"})
    placed = {row[0]: row[1] for row in rows}
    assert "Sun" in placed["House 1"]
    assert len([r for r in rows if r[1] == "Empty"]) == 9


def test_pdf_accepts_bare_name_lists():
    """The Lal Kitab chart shape is a plain list of names, not cell dicts."""
    houses = {i: [] for i in range(1, 13)}
    houses[1] = ["Sun", "Jupiter"]
    rows = _house_rows({"houses": houses, "name": "Test"})
    placed = {row[0]: row[1] for row in rows}
    assert placed["House 1"] == "Sun, Jupiter", placed["House 1"]
    assert len([r for r in rows if r[1] == "Empty"]) == 11


def test_pdf_survives_missing_houses():
    rows = _house_rows({"name": "Test"})
    assert len(rows) == 12
    assert all(row[1] == "Empty" for row in rows)


def test_a_real_chart_still_produces_a_pdf(client):
    """End to end: the live endpoint's own payload must render."""
    data = client.post("/api/v1/kundli/export-pdf", json={
        "name": "Test", "birth_date": "1990-05-15", "birth_time": "10:30",
        "birth_place": "Delhi", "latitude": 28.6139, "longitude": 77.209,
        "timezone_offset": 5.5,
    })
    assert data.status_code == 200, data.text
    pdf = data.content
    assert pdf.startswith(b"%PDF"), pdf[:8]
    assert len(pdf) > 2000, len(pdf)
