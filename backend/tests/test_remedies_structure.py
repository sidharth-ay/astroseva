"""The remedy answer has a shape, and it is never the model's raw text.

`POST /api/v1/doshas/remedies` returned whatever `generate_remedies()` produced
-- free-form Gemini output when a key was configured and the quota held, a
pre-written paragraph otherwise -- as a single string. The frontend's handling
of it was three branches of "make it a string somehow", the last of which was
`JSON.stringify(r, null, 2)`: anything that did not fit the shape it expected
was printed to the user as JSON.

These tests pin the structured answer: every section comes from the corpus
unless the AI answer parses into sections on its own, prose that will not parse
is discarded rather than passed through, and every dosha the detector can
report has corpus entries behind it.
"""

import uuid

from app.core.doshas import active_doshas
from app.services import remedy_service
from app.services.ai_service import generate_local_remedies

ALL_ACTIVE = {
    "manglik": {"is_manglik": True},
    "sade_sati": {"is_active": True},
    "pitru_dosha": {"has_dosha": True},
    "kaal_sarp": {"has_dosha": False},
}

NONE_ACTIVE = {
    "manglik": {"is_manglik": False},
    "sade_sati": {"is_active": False},
    "pitru_dosha": {"has_dosha": False},
    "kaal_sarp": {"has_dosha": False},
}

AI_SECTIONS = """Manglik Dosha Remedies:
- Visit Hanuman temple every Tuesday
- Donate red lentils on Tuesday

Sade Sati Remedies:
- Chant the Shani mantra on Saturdays
"""

AI_PROSE = (
    "You should consider visiting a temple and chanting regularly. The key is "
    "consistency and devotion rather than any single ritual, and you may also "
    "want to consult a learned astrologer for guidance tailored to your chart."
)


# ---------------------------------------------------------------------------
# active_doshas is the shared definition
# ---------------------------------------------------------------------------

def test_active_doshas_reports_each_detected_dosha_in_order():
    assert active_doshas(ALL_ACTIVE) == ["Manglik Dosha", "Sade Sati", "Pitru Dosha"]
    assert active_doshas(NONE_ACTIVE) == []


def test_active_doshas_ignores_doshas_that_are_not_active():
    partial = {**NONE_ACTIVE, "sade_sati": {"is_active": True}}
    assert active_doshas(partial) == ["Sade Sati"]


# ---------------------------------------------------------------------------
# The corpus covers everything the detector can report
# ---------------------------------------------------------------------------

def test_every_dosha_the_detector_can_report_has_corpus_entries():
    """A detected dosha with no corpus entry would silently vanish."""
    names = active_doshas(ALL_ACTIVE)
    missing = [n for n in names if n not in remedy_service.CORPUS]
    assert missing == [], f"no corpus entries for: {missing}"


def test_corpus_sections_have_a_title_and_actions():
    sections = remedy_service.corpus_sections(active_doshas(ALL_ACTIVE))
    assert [s["title"] for s in sections] == ["Manglik Dosha", "Sade Sati", "Pitru Dosha"]
    for section in sections:
        assert section["actions"], f"{section['title']} has no actions"
        assert all(isinstance(a, str) and a.strip() for a in section["actions"])


def test_corpus_is_deterministic():
    """Same input, same answer -- this is not a generated response."""
    first = remedy_service.corpus_sections(["Manglik Dosha"])
    second = remedy_service.corpus_sections(["Manglik Dosha"])
    assert first == second


# ---------------------------------------------------------------------------
# The parser accepts structure and rejects prose
# ---------------------------------------------------------------------------

def test_parser_extracts_headings_and_bullets():
    sections = remedy_service.parse_sections(AI_SECTIONS)
    assert [s["title"] for s in sections] == ["Manglik Dosha Remedies", "Sade Sati Remedies"]
    assert sections[0]["actions"] == ["Visit Hanuman temple every Tuesday", "Donate red lentils on Tuesday"]
    assert sections[1]["actions"] == ["Chant the Shani mantra on Saturdays"]


def test_parser_drops_prose_that_will_not_split():
    """Unparseable model output must not become a remedy."""
    assert remedy_service.parse_sections(AI_PROSE) == []


def test_parser_returns_nothing_for_empty_input():
    assert remedy_service.parse_sections(None) == []
    assert remedy_service.parse_sections("") == []


def test_parser_ignores_bullets_that_precede_any_heading():
    """An action with nowhere to hang has no section to belong to."""
    assert remedy_service.parse_sections("- just a line\n- and another") == []


def test_parser_does_not_treat_a_long_sentence_as_a_heading():
    heading = "The following doshas are detected in the birth chart:"
    assert len(heading) > 40
    assert remedy_service.parse_sections(f"{heading}\n- some action") == []


# ---------------------------------------------------------------------------
# build_remedies
# ---------------------------------------------------------------------------

def run(coro):
    import asyncio

    return asyncio.run(coro)


def test_no_doshas_gives_a_note_and_no_sections():
    report = run(remedy_service.build_remedies(NONE_ACTIVE))
    assert report["sections"] == []
    assert "No significant doshas" in report["note"]


def test_unreachable_ai_falls_back_to_the_corpus(monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("gemini is down")

    monkeypatch.setattr(remedy_service, "generate_remedies", boom)
    report = run(remedy_service.build_remedies(ALL_ACTIVE))
    assert report["source"] == "corpus"
    assert [s["title"] for s in report["sections"]] == ["Manglik Dosha", "Sade Sati", "Pitru Dosha"]


def test_the_local_paragraph_is_not_mistaken_for_a_generated_answer(monkeypatch):
    """`generate_remedies` answers with its own text when Gemini is unavailable."""
    names = active_doshas(ALL_ACTIVE)

    async def local_only(*args, **kwargs):
        return generate_local_remedies(names)

    monkeypatch.setattr(remedy_service, "generate_remedies", local_only)
    report = run(remedy_service.build_remedies(ALL_ACTIVE))
    assert report["source"] == "corpus"
    assert report["sections"]


def test_a_generated_answer_that_parses_is_used(monkeypatch):
    async def ai(*args, **kwargs):
        return AI_SECTIONS

    monkeypatch.setattr(remedy_service, "generate_remedies", ai)
    report = run(remedy_service.build_remedies(ALL_ACTIVE))
    assert report["source"] == "ai"
    assert report["sections"][0]["title"] == "Manglik Dosha Remedies"


def test_generated_prose_is_dropped_rather_than_shown_raw(monkeypatch):
    async def ai(*args, **kwargs):
        return AI_PROSE

    monkeypatch.setattr(remedy_service, "generate_remedies", ai)
    report = run(remedy_service.build_remedies(ALL_ACTIVE))
    assert report["source"] == "corpus"
    assert AI_PROSE not in str(report)


# ---------------------------------------------------------------------------
# The endpoint returns that shape
# ---------------------------------------------------------------------------

def _fresh_payload():
    """A chart the cache has never seen, so the code path actually runs."""
    return {
        "name": "Remedy Shape",
        "birth_date": "1990-06-15",
        "birth_time": "10:30",
        "birth_place": "New Delhi, India",
        "latitude": 28.6139 + (int(uuid.uuid4().int) % 40) / 100.0,
        "longitude": 77.2090,
        "timezone_offset": 5.5,
    }


def test_remedies_endpoint_returns_sections_not_a_string(client):
    resp = client.post("/api/v1/doshas/remedies", json=_fresh_payload())
    assert resp.status_code == 200, resp.text
    body = resp.json()
    remedies = body["remedies"]
    assert isinstance(remedies, dict), type(remedies)
    assert remedies["source"] in {"ai", "corpus"}
    assert isinstance(remedies["sections"], list)
    for section in remedies["sections"]:
        assert isinstance(section["title"], str) and section["title"]
        assert isinstance(section["actions"], list) and section["actions"]


def test_remedies_endpoint_sections_are_never_json_text(client):
    """The old frontend fallback rendered `JSON.stringify` output to the user."""
    resp = client.post("/api/v1/doshas/remedies", json=_fresh_payload())
    assert resp.status_code == 200, resp.text
    remedies = resp.json()["remedies"]
    for section in remedies["sections"]:
        for action in section["actions"]:
            assert not action.lstrip().startswith(("{", "[", '"'))
            assert not action.rstrip().endswith(("}", "]"))
