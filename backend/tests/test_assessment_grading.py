"""The assessment result must not leak the answer key or 500 on bad input.

`grade` is reachable with an untyped JSON body, so every field an applicant
sends is arbitrary.
"""

import pytest

from app.services import assessment as svc


def _all_correct() -> dict[str, int]:
    return {q["id"]: q["correct_index"] for q in svc.snapshot()}


# --- the answer key must not be in the result --------------------------------

def test_grade_result_does_not_contain_the_answer_key():
    """`correct_index` was in every detail of every result.

    The result goes back to the applicant after each submission, so one attempt
    handed over the full key for the next.
    """
    result = svc.grade(_all_correct())
    for detail in result["details"]:
        assert "correct_index" not in detail, detail
        assert set(detail) == {"id", "correct", "chosen", "explanation"}


def test_questions_sent_to_applicant_carry_no_key():
    for q in svc.get_questions():
        assert set(q) == {"id", "prompt", "options"}


def test_snapshot_is_the_only_place_the_key_lives():
    """The frozen snapshot keeps the key, so an old mark can still be re-graded."""
    assert all("correct_index" in q for q in svc.snapshot())


# --- malformed answers --------------------------------------------------------

@pytest.mark.parametrize("value", [
    "first", "", None, True, [], {"a": 1}, 99, -1, 1.5,
])
def test_malformed_answer_scores_zero_without_raising(value):
    """`int(value)` raised on most of these and compared out of range on the
    rest, so a malformed submission produced a 500 for the whole attempt rather
    than being scored as unanswered."""
    result = svc.grade({"q1": value})
    assert result["score"] == 0, value
    assert result["details"][0]["correct"] is False, value


def test_out_of_range_answer_is_not_echoed_as_a_choice():
    assert svc.grade({"q1": 99})["details"][0]["chosen"] is None


def test_numeric_string_is_accepted():
    """JSON clients sometimes send the index as a string."""
    assert svc.grade({"q1": "0"})["details"][0]["correct"] is True


def test_missing_answers_score_zero():
    result = svc.grade({})
    assert result["score"] == 0
    assert result["max_score"] == len(svc.snapshot())


def test_unknown_question_ids_are_ignored():
    assert svc.grade({"not_a_question": 0})["score"] == 0


def test_a_malformed_answer_cannot_sabotage_the_rest():
    """One bad entry must not cost the applicant the whole attempt."""
    answers = _all_correct()
    answers["q5"] = "garbage"
    assert svc.grade(answers)["score"] == len(svc.snapshot()) - 1


# --- the pass mark ------------------------------------------------------------

def test_pass_percent_is_derived_from_the_pass_mark():
    """`PASS_PERCENT = 70` was a separate literal describing 8 of 10, which is
    80. It was unused, so the mismatch stayed invisible."""
    assert svc.pass_percent() == round(svc.PASS_MARK * 100 / len(svc.snapshot()))
    assert not hasattr(svc, "PASS_PERCENT"), "the stale literal is still there"


# --- through the endpoint -----------------------------------------------------

def _open_assessment(applicant_user, test_sessionmaker):
    """Create the applicant's draft profile and move it to assessment_pending.

    Returns a TestClient; the caller clears overrides. The profile is created
    through the endpoint, which commits, so it outlives the function-scoped
    `isolated_db` rollback -- see `_drop_profile`.
    """
    from app.db.models import Astrologer, STATUS_ASSESSMENT_PENDING
    from tests.conftest import _make_client

    c = _make_client(applicant_user, test_sessionmaker)
    c.post("/api/v1/astrologer/me/start")

    session = test_sessionmaker()
    try:
        profile = session.query(Astrologer).filter(
            Astrologer.user_id == applicant_user.id
        ).one()
        profile.status = STATUS_ASSESSMENT_PENDING
        session.commit()
    finally:
        session.close()
    return c


def _drop_profile(user_id: int, test_sessionmaker) -> None:
    """Remove the applicant profile and its rows.

    The endpoint commits, so a profile created here survives the function-scoped
    rollback in `isolated_db` and leaks into later tests. Left behind, the next
    test that builds an Astrologer for the same user hits
    "UNIQUE constraint failed: astrologers.user_id".
    """
    from app.db.models import (
        Astrologer, AstrologerAssessment, AstrologerAvailability,
        AstrologerDocument, AstrologerMockConsult, OnboardingEvent,
    )

    session = test_sessionmaker()
    try:
        profile = session.query(Astrologer).filter(
            Astrologer.user_id == user_id
        ).one_or_none()
        if profile is None:
            return
        for model in (AstrologerAssessment, AstrologerAvailability,
                      AstrologerDocument, AstrologerMockConsult, OnboardingEvent):
            session.query(model).filter(
                model.astrologer_id == profile.id
            ).delete(synchronize_session=False)
        session.delete(profile)
        session.commit()
    finally:
        session.close()


@pytest.fixture
def submitted_client(applicant_user, test_sessionmaker):
    """An applicant_client whose profile is in a state where the test is open."""
    from tests.conftest import _clear_overrides

    c = _open_assessment(applicant_user, test_sessionmaker)
    try:
        yield c
    finally:
        _clear_overrides()
        _drop_profile(applicant_user.id, test_sessionmaker)


def test_endpoint_accepts_a_malformed_answer(submitted_client):
    """The grading path above is only half the story: the endpoint must not
    500 when the body carries junk."""
    r = submitted_client.post(
        "/api/v1/astrologer/assessment",
        json={"q1": "not an index", "q2": None, "q3": 99},
    )
    assert r.status_code == 200, r.text
    assert r.json()["score"] == 0


def test_endpoint_does_not_return_the_answer_key(submitted_client):
    r = submitted_client.post("/api/v1/astrologer/assessment", json={"q1": 0})
    assert r.status_code == 200, r.text
    assert "correct_index" not in r.text, "the key is in the response body"


def test_reviewer_queue_does_not_return_the_key(
    applicant_user, reviewer_user, test_sessionmaker
):
    """The admin review screen reads the same attempts.

    Built here rather than via the fixtures because both clients override
    `get_current_user` on the same app object, so two live TestClients would
    fight over who is logged in.
    """
    from tests.conftest import _make_client, _clear_overrides

    applicant = _open_assessment(applicant_user, test_sessionmaker)
    try:
        assert applicant.post(
            "/api/v1/astrologer/assessment", json={"q1": 0}
        ).status_code == 200
    finally:
        _clear_overrides()

    reviewer = _make_client(reviewer_user, test_sessionmaker)
    try:
        r = reviewer.get("/api/v1/admin/astrologers")
        assert r.status_code == 200, r.text
        assert "correct_index" not in r.text
    finally:
        _clear_overrides()
        _drop_profile(applicant_user.id, test_sessionmaker)
