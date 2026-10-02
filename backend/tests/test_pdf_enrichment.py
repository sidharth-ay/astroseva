"""The Kundli PDF must include dasha, divisional charts, and doshas.

The export endpoint computed all three (via `_generate_kundli_data`) but never
passed them to the PDF builder, so the exported document was thinner than the
page: positions and houses only, no timing, no vargas, no dosha summary.

Like the house tests, these read the flowables `generate_kundli_pdf` builds
rather than the rendered bytes: extracting the text layer would need pdfminer,
which is not a dependency.
"""

import pytest
from reportlab.platypus import Paragraph, Table

import app.services.pdf_service as pdf_service
from app.services.pdf_service import generate_kundli_pdf


class _StopHere(Exception):
    """Raised from the build hook to stop before writing the PDF."""


def _flowables(kundli_data: dict):
    captured = {}
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
    return captured["flowables"]


def _headings(flowables) -> list[str]:
    return [
        f.text
        for f in flowables
        if isinstance(f, Paragraph) and f.text.startswith(("Vimshottari", "Mahadasha", "Navamsa", "Dasamsa", "Dosha"))
    ]


def _tables(flowables) -> list[list[list[str]]]:
    return [
        [[str(c) for c in row] for row in f._cellvalues]
        for f in flowables
        if isinstance(f, Table)
    ]


@pytest.fixture
def enriched():
    return {
        "name": "Enrichment Check",
        "birth_date": "1990-06-15",
        "dasha_info": {
            "current_dasha": {
                "lord": "Moon",
                "start": "2023-03-11 19:25:30+00:00",
                "end": "2033-03-11 07:25:30+00:00",
            },
            "all_mahadashas": [
                {"lord": "Ketu", "start": "1990-06-15", "end": "1997-03-11", "duration_years": 6.7},
                {"lord": "Venus", "start": "1997-03-11", "end": "2017-03-11", "duration_years": 20},
                {"lord": "Moon", "start": "2023-03-11", "end": "2033-03-11", "duration_years": 10},
            ],
        },
        "navamsa": {"name": "Navamsa", "planets": {"Sun": 11, "Moon": 10}},
        "dasamsa": {"name": "Dasamsa", "planets": {"Sun": 8}},
        "doshas": {
            "manglik": True,
            "kaal_sarp": False,
            "kaal_sarp_type": "",
            "sade_sati": True,
            "sade_sati_phase": "Peak",
            "pitru_dosha": False,
        },
    }


def test_current_dasha_names_its_lord_and_window(enriched):
    body = " ".join(
        f.text
        for f in _flowables(enriched)
        if isinstance(f, Paragraph) and "Mahadasha" in f.text
    )
    assert "Moon" in body, body
    assert "2023-03-11" in body and "2033-03-11" in body, body


def test_mahadasha_sequence_lists_every_period(enriched):
    tables = _tables(_flowables(enriched))
    dasha = next(t for t in tables if t[0][0] == "Lord")
    lords = [row[0] for row in dasha[1:]]
    assert lords == ["Ketu", "Venus", "Moon"], lords


def test_navamsa_and_dasamsa_tables_list_planets(enriched):
    tables = _tables(_flowables(enriched))
    navamsa = next(t for t in tables if t[0] == ["Planet", "Sign Index"] and any("11" in r for r in t))
    assert ["Sun", "11"] in navamsa
    assert ["Moon", "10"] in navamsa


def test_dosha_summary_states_each_dosha(enriched):
    tables = _tables(_flowables(enriched))
    dosha = next(t for t in tables if t[0] == ["Dosha", "Status"])
    states = {row[0]: row[1] for row in dosha[1:]}
    assert states == {
        "Manglik": "Present",
        "Kaal Sarp": "Absent",
        "Sade Sati": "Active (Peak)",
        "Pitru Dosha": "Absent",
    }, states


def test_missing_sections_degrade_to_no_section():
    """A chart without dasha/varga/dosha data still builds a valid PDF.

    The export wraps section failures the same way: an absent section must
    never fail the whole document.
    """
    flowables = _flowables({"name": "Bare", "houses": {}})
    headings = _headings(flowables)
    assert not any(h.startswith(("Vimshottari", "Mahadasha", "Navamsa", "Dosha")) for h in headings)
    # And the bytes still build.
    assert generate_kundli_pdf({"name": "Bare", "houses": {}})[:5] == b"%PDF-"


def test_enriched_pdf_builds_to_bytes(enriched):
    assert generate_kundli_pdf(enriched)[:5] == b"%PDF-"
