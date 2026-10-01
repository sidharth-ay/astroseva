"""The shape of a remedy answer, and the corpus behind it.

`POST /api/v1/doshas/remedies` returned `generate_remedies()` untouched: one
string that was either free-form Gemini output or a pre-written paragraph,
depending on whether a key was configured and the quota still held. The
frontend's only guarantee about the value was that it could be turned into
text, and when it could not it fell back to `JSON.stringify` and rendered the
result -- raw JSON served up as a remedy.

The answer is now a list of sections, each a title with concrete actions. The
sections always come from this corpus; an AI answer is adopted only when it
parses into that same shape, and is dropped when it does not.
"""

import re

from ..core.doshas import active_doshas
from ..services.ai_service import generate_local_remedies, generate_remedies

# Keyed by the names `active_doshas` reports. A detected dosha with no entry
# here would go missing from the answer, so `test_remedies_structure` pins the
# two together.
CORPUS: dict[str, list[str]] = {
    "Manglik Dosha": [
        "Visit a Hanuman temple every Tuesday",
        'Chant "Om Hanumate Namaha" 108 times daily',
        "Donate red lentils (masoor dal) on Tuesday",
        "Read the Hanuman Chalisa regularly",
        "Avoid non-vegetarian food on Tuesdays",
    ],
    "Sade Sati": [
        'Chant "Om Sham Shanaicharaya Namaha" on Saturdays',
        "Donate black sesame seeds, iron, and mustard oil on Saturday",
        "Visit a Shani temple every Saturday evening",
        "Wear Blue Sapphire only after consulting an astrologer",
        "Help the elderly and the disabled",
    ],
    "Pitru Dosha": [
        "Perform Pind Daan at a holy place",
        "Feed crows and cows regularly",
        'Chant "Om Pitrabhyah Namaha" on Amavasya',
        "Donate food to Brahmins on new moon days",
        "Perform Shraddha ceremonies during Pitru Paksha",
    ],
}

NO_DOSHA_NOTE = (
    "No significant doshas detected. Continue with regular spiritual practices."
)

# A heading is a short line ending in a colon that is not itself a bullet;
# an action is a bulleted or numbered line. Anything else is prose and is
# left out rather than shown raw. 40 characters keeps a sentence like "The
# following doshas are detected in the birth chart:" from becoming a heading.
_HEADING = re.compile(r"^[^:\n]{1,40}:$")
_ACTION = re.compile(r"^\s*(?:[-*•]|\d+[.)])\s+")


def corpus_sections(names: list[str]) -> list[dict]:
    """The deterministic sections for a list of detected doshas."""
    return [
        {"title": name, "actions": list(CORPUS[name])}
        for name in names
        if name in CORPUS
    ]


def parse_sections(text: str | None) -> list[dict]:
    """Split a free-form answer into sections, or return nothing.

    Only a heading followed by at least one bullet counts. Prose that will not
    split that way is discarded -- the caller falls back to the corpus, which
    is the point of not passing model output through unexamined.
    """
    if not text:
        return []

    sections: list[dict] = []
    title: str | None = None
    actions: list[str] = []

    def flush() -> None:
        nonlocal title, actions
        if title and actions:
            sections.append({"title": title, "actions": actions})
        title, actions = None, []

    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if _ACTION.match(line):
            if title is not None:
                actions.append(_ACTION.sub("", line, count=1).strip())
        elif _HEADING.match(line):
            flush()
            title = line[:-1].strip().lstrip("#").strip()
    flush()

    return [s for s in sections if s["actions"]]


async def build_remedies(doshas: dict, language: str = "en") -> dict:
    """A structured remedy answer for a detected set of doshas.

    The AI path is tried first and adopted only if it parses into sections.
    `generate_remedies` answers with its own pre-written text whenever Gemini
    is unreachable or out of quota, so that text is compared against and not
    mistaken for a generated answer.
    """
    names = active_doshas(doshas)
    if not names:
        return {"source": "corpus", "sections": [], "note": NO_DOSHA_NOTE}

    try:
        text = await generate_remedies(doshas, language)
    except Exception:
        text = None

    if text and text != generate_local_remedies(names):
        sections = parse_sections(text)
        if sections:
            return {"source": "ai", "sections": sections}

    return {"source": "corpus", "sections": corpus_sections(names)}
