"""Written assessment for astrologer applicants.

Auto-graded multiple choice, chosen over free-text so the result is objective and
fast to review. The question set is frozen into each attempt's
``questions_snapshot`` rather than looked up at grading time, so a question bank
change cannot retroactively change somebody's mark.

Every question here is checkable against the engine in this repository, so the
assessment tests the astrology the product actually serves rather than recall of
a textbook.
"""

from dataclasses import dataclass, asdict
from typing import Optional

PASS_MARK = 8  # out of 10


@dataclass(frozen=True)
class Question:
    id: str
    prompt: str
    options: tuple[str, ...]
    correct_index: int
    explanation: str

    def public(self) -> dict:
        """The form sent to the applicant. Never includes the answer."""
        return {
            "id": self.id,
            "prompt": self.prompt,
            "options": list(self.options),
        }


QUESTION_BANK: tuple[Question, ...] = (
    Question(
        "q1",
        "Which calculation places a planet in a zodiac sign?",
        ("Its sidereal longitude divided into 30-degree signs",
         "Its tropical longitude divided into 30-degree signs",
         "Its distance from Earth divided into 12",
         "The day of the week it was born"),
        0,
        "This engine converts an apparent geocentric longitude to sidereal using "
        "the Lahiri ayanamsa, then indexes the 30-degree sign.",
    ),
    Question(
        "q2",
        "What is the Moon's sidereal longitude roughly 180 degrees ahead of the Sun?",
        ("Purnima", "Amavasya", "Shukla Ekadashi", "Krishna Chaturdashi"),
        0,
        "A 180-degree separation is the full moon, Purnima, at the end of the "
        "waxing fortnight.",
    ),
    Question(
        "q3",
        "A festival that is judged in pradosh rather than at sunrise is best known as:",
        ("Maha Shivaratri", "Raksha Bandhan", "Guru Purnima", "Akshaya Tritiya"),
        0,
        "Maha Shivaratri is observed in the closing part of pradosh, which is "
        "why testing it at sunrise puts it a day out.",
    ),
    Question(
        "q4",
        "In Vimshottari dasha, the running period is seeded from:",
        ("The Moon's nakshatra at birth",
         "The Sun's sign at birth",
         "The Lagna lord at birth",
         "The day of the week of birth"),
        0,
        "The birth Moon's nakshatra determines the starting dasha lord, then "
        "the 120-year cycle proceeds through the nine lords.",
    ),
    Question(
        "q5",
        "Sade Sati is the seven-and-a-half year transit of Saturn over:",
        ("The birth Moon's sign, then the two signs either side",
         "The Lagna sign only",
         "The seventh house from the Lagna only",
         "The Sun's sign at birth"),
        0,
        "It rises as Saturn transits the sign before the Moon, peaks over the "
        "Moon, and sets as it leaves the following sign.",
    ),
    Question(
        "q6",
        "The Nakshatra a chart falls on is determined by the Moon's:",
        ("Sidereal longitude, in 13.33-degree segments",
         "Tropical longitude, in 30-degree segments",
         "Latitude at birth",
         "Apparent retrograde motion"),
        0,
        "Each nakshatra spans 360/27 degrees, about 13.33 degrees of sidereal "
        "longitude.",
    ),
    Question(
        "q7",
        "A chart's houses are assigned, in the whole-sign system, by:",
        ("Counting whole 30-degree signs from the Lagna sign",
         "Dividing the ecliptic into equal 30-degree arcs from the Lagna degree",
         "The Sun's position at birth",
         "The Moon's nakshatra pada"),
        0,
        "Whole-sign counting ignores degree-level offsets, which is the "
        "conventional North-Indian rasi-chart method.",
    ),
    Question(
        "q8",
        "Kaal Sarp dosha is indicated when all classical planets are:",
        ("Hemmed between Rahu and Ketu on one side of the chart",
         "All retrograde at birth",
         "Located in the 7th house",
         "Aspected by the Sun"),
        0,
        "The defining condition is that every classical planet falls on one side "
        "of the Rahu-Ketu axis, with none in the other arc.",
    ),
    Question(
        "q9",
        "In this engine, Rahu and Ketu are computed as:",
        ("The mean lunar node, and the point 180 degrees opposite it",
         "The true lunar apsides",
         "The Moon's ascending and descending nodes at the exact birth minute",
         "Two separate planets"),
        0,
        "The mean node is used, with Ketu derived as node + 180 degrees; both "
        "are treated as always retrograde.",
    ),
    Question(
        "q10",
        "Grahayukti deals with:",
        ("Planetary aspects, combustion and consideration",
         "Dasha timing only",
         "The Navamsa division alone",
         "Lal Kitab remedies"),
        0,
        "Grahayukti covers drishti, combustion, and which planets each graha "
        "considers when forming results.",
    ),
)

PASS_PERCENT = 70


def get_questions() -> list[dict]:
    """The question set as sent to the applicant, with no answer key."""
    return [q.public() for q in QUESTION_BANK]


def snapshot() -> list[dict]:
    """The question set frozen into an attempt, including the answer key.

    Kept with the attempt so a later edit to QUESTION_BANK cannot change an
    already-graded result.
    """
    return [asdict(q) for q in QUESTION_BANK]


def grade(answers: dict[str, int], question_set: Optional[list[dict]] = None) -> dict:
    """Score answers against a question set. Returns score and per-question detail.

    `answers` maps question id to the index the applicant chose. Unanswered or
    unknown questions score zero rather than raising, so a partially completed
    attempt still produces a usable mark.
    """
    questions = question_set if question_set is not None else snapshot()
    by_id = {q["id"]: q for q in questions}
    details = []
    score = 0
    for q in questions:
        chosen = answers.get(q["id"])
        correct = chosen is not None and int(chosen) == int(q["correct_index"])
        if correct:
            score += 1
        details.append({
            "id": q["id"],
            "correct": correct,
            "chosen": chosen,
            "correct_index": q["correct_index"],
            "explanation": q.get("explanation", ""),
        })
    total = len(questions)
    return {
        "score": score,
        "max_score": total,
        "passed": total > 0 and score >= PASS_MARK,
        "pass_mark": PASS_MARK,
        "details": details,
    }


def pass_mark() -> int:
    return PASS_MARK
