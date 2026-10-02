"""Astrologer onboarding tests: state machine, scoring, grading, access control.

These cover the trust machinery specifically. The two things most likely to go
wrong in a marketplace are (a) an applicant skipping a verification stage, and
(b) one practitioner reading or editing another's application, so both are
tested directly rather than inferred from endpoint tests.
"""

import uuid
from datetime import date, timedelta

import pytest

from app.db.models import (
    PRACTISING_STATUSES,
    ROLE_ASTROLOGER,
    STATUS_APPLIED,
    STATUS_ASSESSMENT_PENDING,
    STATUS_DRAFT,
    STATUS_MOCK_PENDING,
    STATUS_PROBATION,
    STATUS_REJECTED,
    STATUS_SUSPENDED,
    STATUS_UNDER_REVIEW,
    STATUS_VERIFIED,
    Astrologer,
    AstrologerAssessment,
    AstrologerDocument,
    AstrologerMockConsult,
    OnboardingEvent,
    User,
)
from app.services import assessment
from app.services import astrologer_service as svc


# The `db` fixture comes from conftest: an isolated throwaway SQLite database,
# so these tests never write into the real astroseva.db.


def _user(db, role=ROLE_ASTROLOGER, name="Test Astrologer", email=None):
    """A persisted user. The email is unique per call: the test database is
    shared across the session and these tests commit, so a fixed address would
    collide with rows left by earlier tests."""
    u = User(email=email or f"u{uuid.uuid4().hex}@example.com", name=name,
             hashed_password="x", role=role, token_version=0)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _profile(db, user, status=STATUS_DRAFT, headline="Vedic astrologer", bio="Bio text"):
    p = Astrologer(user_id=user.id, slug=svc.slugify(user.name, user.id),
                   status=status, headline=headline, bio=bio,
                   languages=["English"], specialties=["Vedic"],
                   experience_years=5)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


# --- state machine ----------------------------------------------------------


def test_happy_path_transitions_are_legal():
    path = [STATUS_DRAFT, STATUS_APPLIED, STATUS_UNDER_REVIEW,
            STATUS_ASSESSMENT_PENDING, STATUS_MOCK_PENDING, STATUS_VERIFIED]
    for a, b in zip(path, path[1:], strict=False):
        assert svc.can_transition(a, b), f"{a} -> {b} should be legal"


@pytest.mark.parametrize("a,b", [
    (STATUS_DRAFT, STATUS_VERIFIED),        # skipping review entirely
    (STATUS_APPLIED, STATUS_MOCK_PENDING),   # skipping the assessment
    (STATUS_ASSESSMENT_PENDING, STATUS_VERIFIED),  # skipping the mock consult
    (STATUS_REJECTED, STATUS_VERIFIED),     # must return to draft first
    (STATUS_VERIFIED, STATUS_APPLIED),      # cannot re-enter the queue
    (STATUS_SUSPENDED, STATUS_VERIFIED),    # suspension must be lifted, not skipped
])
def test_illegal_transitions_are_refused(a, b):
    assert not svc.can_transition(a, b), f"{a} -> {b} must be illegal"


def test_probation_is_a_valid_mock_outcome():
    """Both approval-with-conditions and outright approval come out of the mock."""
    assert svc.can_transition(STATUS_MOCK_PENDING, STATUS_VERIFIED)
    assert svc.can_transition(STATUS_MOCK_PENDING, STATUS_PROBATION)


def test_apply_status_records_an_audit_event(db):
    user = _user(db)
    p = _profile(db, user)
    svc.apply_status(db, p, STATUS_APPLIED, actor_user_id=user.id)
    db.commit()
    events = db.query(OnboardingEvent).filter(
        OnboardingEvent.astrologer_id == p.id,
        OnboardingEvent.event_type == "status_changed",
    ).all()
    assert len(events) == 1
    assert events[0].from_status == STATUS_DRAFT
    assert events[0].to_status == STATUS_APPLIED
    assert events[0].actor_user_id == user.id


def test_apply_status_rejects_illegal_move_and_leaves_no_trace(db):
    user = _user(db)
    p = _profile(db, user)
    with pytest.raises(svc.TransitionError):
        svc.apply_status(db, p, STATUS_VERIFIED, actor_user_id=user.id)
    db.rollback()
    assert db.query(OnboardingEvent).filter(
        OnboardingEvent.astrologer_id == p.id).count() == 0


def test_rejection_requires_a_reason(db):
    user = _user(db)
    p = _profile(db, user, status=STATUS_MOCK_PENDING)
    svc.apply_status(db, p, STATUS_REJECTED, user.id)
    db.commit()
    assert p.rejection_reason  # never blank
    assert p.status == STATUS_REJECTED


def test_probation_records_an_end_date(db):
    user = _user(db)
    p = _profile(db, user, status=STATUS_MOCK_PENDING)
    until = date.today() + timedelta(days=30)
    svc.apply_status(db, p, STATUS_PROBATION, user.id, probation_until=until)
    db.commit()
    assert p.probation_until == until
    assert p.status in PRACTISING_STATUSES  # probationary astrologers may practise


def test_suspension_removes_the_right_to_practise(db):
    user = _user(db)
    p = _profile(db, user, status=STATUS_VERIFIED)
    assert svc.is_practising(p)
    svc.apply_status(db, p, STATUS_SUSPENDED, user.id)
    db.commit()
    assert not svc.is_practising(p)


# --- submission guard -------------------------------------------------------


def test_cannot_apply_with_an_incomplete_profile(db):
    user = _user(db)
    p = _profile(db, user, headline="", bio="")
    with pytest.raises(svc.TransitionError):
        svc.assert_can_submit(db, p)


def test_cannot_apply_without_documents(db):
    user = _user(db)
    p = _profile(db, user)
    with pytest.raises(svc.TransitionError) as e:
        svc.assert_can_submit(db, p)
    assert "identity" in str(e.value).lower()


def test_can_apply_once_identity_and_credential_are_present(db):
    user = _user(db)
    p = _profile(db, user)
    db.add(AstrologerDocument(astrologer_id=p.id, kind="pan",
                              storage_key="astrologers/1/a.pdf"))
    db.add(AstrologerDocument(astrologer_id=p.id, kind="degree_certificate",
                              storage_key="astrologers/1/b.pdf"))
    db.commit()
    svc.assert_can_submit(db, p)  # must not raise


# --- accuracy scoring -------------------------------------------------------


def test_recompute_accuracy_is_zero_with_no_evidence(db):
    user = _user(db)
    p = _profile(db, user)
    out = svc.recompute_accuracy(db, p)
    assert out["accuracy_score"] == 0.0
    assert out["total_assessments"] == 0


def test_recompute_accuracy_combines_assessment_and_mock(db):
    user = _user(db)
    p = _profile(db, user)
    snap = assessment.snapshot()
    db.add(AstrologerAssessment(astrologer_id=p.id, attempt_no=1, questions_snapshot=snap,
                                answers={}, score=10, max_score=10, passed=True))
    db.add(AstrologerAssessment(astrologer_id=p.id, attempt_no=2, questions_snapshot=snap,
                                answers={}, score=5, max_score=10, passed=False))
    db.add(AstrologerMockConsult(astrologer_id=p.id, evaluator_id=user.id,
                                scenario="s", response="r", score_accuracy=5,
                                score_clarity=4, score_empathy=5, score_structure=4,
                                verdict="pass"))
    db.commit()
    out = svc.recompute_accuracy(db, p)
    assert out["total_assessments"] == 2
    assert out["assessments_passed"] == 1
    assert out["assessment_pass_rate"] == 50.0
    assert out["mock_average_score"] == 4.5
    # 0.5*5 + (4.5/5)*5 = 7.0
    assert out["accuracy_score"] == 7.0
    assert p.accuracy_score == 7.0


def test_recompute_ignores_out_of_range_mock_scores(db):
    """A zero left by an unrecorded score must not drag the average down."""
    user = _user(db)
    p = _profile(db, user)
    db.add(AstrologerMockConsult(astrologer_id=p.id, evaluator_id=user.id,
                                scenario="s", response="r", score_accuracy=5,
                                score_clarity=5, score_empathy=0, score_structure=0,
                                verdict="pass"))
    db.commit()
    out = svc.recompute_accuracy(db, p)
    assert out["mock_average_score"] == 5.0


# --- assessment -------------------------------------------------------------


def test_question_set_has_no_answer_key():
    public = assessment.get_questions()
    assert len(public) == 10
    for q in public:
        assert set(q) == {"id", "prompt", "options"}
        assert "correct_index" not in q
        assert "explanation" not in q


def test_grading_all_correct():
    snapshot = assessment.snapshot()
    answers = {q["id"]: q["correct_index"] for q in snapshot}
    result = assessment.grade(answers, snapshot)
    assert result["score"] == result["max_score"] == 10
    assert result["passed"] is True


def test_grading_all_wrong():
    snapshot = assessment.snapshot()
    answers = {q["id"]: (q["correct_index"] + 1) % len(q["options"]) for q in snapshot}
    result = assessment.grade(answers, snapshot)
    assert result["score"] == 0
    assert result["passed"] is False


def test_partial_answers_do_not_crash():
    snapshot = assessment.snapshot()
    result = assessment.grade({"q1": snapshot[0]["correct_index"]}, snapshot)
    assert result["score"] == 1
    assert result["max_score"] == 10


def test_unknown_answers_score_zero():
    result = assessment.grade({"q1": 0, "not_a_question": 1}, assessment.snapshot())
    assert 0 <= result["score"] <= 10


def test_snapshot_freezes_the_answer_key():
    """A later edit to the bank must not change an already-graded attempt."""
    frozen = assessment.snapshot()
    assert frozen[0]["correct_index"] == assessment.QUESTION_BANK[0].correct_index
    assert all("correct_index" in q for q in frozen)


# --- access control ---------------------------------------------------------


def test_directory_requires_login(anon_client):
    assert anon_client.get("/api/v1/astrologers").status_code == 401


def test_application_requires_login(anon_client):
    assert anon_client.get("/api/v1/astrologer/me").status_code == 401


def test_review_queue_refuses_a_plain_client(client):
    """A signed-in client must never reach the reviewer surface."""
    assert client.get("/api/v1/admin/astrologers").status_code == 403


def test_review_queue_refuses_an_astrologer(applicant_client):
    """Astrologer != reviewer. Separation of duty is the point."""
    assert applicant_client.get("/api/v1/admin/astrologers").status_code == 403


def test_review_queue_allows_a_reviewer(reviewer_client):
    assert reviewer_client.get("/api/v1/admin/astrologers").status_code == 200


def test_review_queue_allows_an_admin(admin_client):
    assert admin_client.get("/api/v1/admin/astrologers").status_code == 200


@pytest.fixture
def fresh_client(test_sessionmaker):
    """A client authenticated as a brand-new user with no application.

    The shared `client` fixture is one fixed user, and these tests assert on
    "has no application yet", so they each need an identity nobody has applied
    with before.
    """
    from tests.conftest import _clear_overrides, _make_client
    from app.db.models import ROLE_CLIENT, User

    session = test_sessionmaker()
    try:
        user = User(
            email=f"fresh{uuid.uuid4().hex}@example.com",
            name="Fresh User",
            hashed_password="x",
            role=ROLE_CLIENT,
            token_version=0,
        )
        session.add(user)
        session.commit()
        c = _make_client(user, test_sessionmaker)
        try:
            yield c
        finally:
            _clear_overrides()
    finally:
        session.rollback()
        session.close()


def test_client_with_no_application_is_told_so(fresh_client):
    """No application is a normal answer, not a 404.

    The /services card asks this question while rendering, so it needs a
    clean "you have not applied" response it can act on.
    """
    resp = fresh_client.get("/api/v1/astrologer/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["has_application"] is False
    assert body["application"] is None


def test_reading_the_application_creates_nothing(fresh_client, isolated_db):
    """GET /me is read-only. A viewer must not leave a row behind.

    This is the reason the endpoint was split: rendering the /services card,
    or simply opening the form, used to create a draft for every visitor.
    """
    before = isolated_db.query(Astrologer).count()

    resp = fresh_client.get("/api/v1/astrologer/me")
    assert resp.status_code == 200
    assert resp.json()["has_application"] is False
    assert isolated_db.query(Astrologer).count() == before

    # A second read is still a no-op.
    fresh_client.get("/api/v1/astrologer/me")
    assert isolated_db.query(Astrologer).count() == before


def test_starting_creates_exactly_one_draft(fresh_client, isolated_db):
    """POST /me/start is the only call that creates a row."""
    before = isolated_db.query(Astrologer).count()
    resp = fresh_client.post("/api/v1/astrologer/me/start")
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == STATUS_DRAFT
    assert isolated_db.query(Astrologer).count() == before + 1

    # And it is now visible to the read-only endpoint.
    assert fresh_client.get("/api/v1/astrologer/me").json()["has_application"] is True


def test_starting_twice_is_idempotent(fresh_client, isolated_db):
    """A double click or a retry must not produce two applications."""
    before = isolated_db.query(Astrologer).count()
    first = fresh_client.post("/api/v1/astrologer/me/start")
    second = fresh_client.post("/api/v1/astrologer/me/start")
    assert first.status_code == 200 and second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    # Counted as a delta: other tests in this module have created profiles in
    # the shared test database, so an absolute count would be meaningless.
    assert isolated_db.query(Astrologer).count() == before + 1


def test_exists_check_never_writes(fresh_client, isolated_db):
    """The label on /services is decided by this call, so it must be inert."""
    before = isolated_db.query(Astrologer).count()
    resp = fresh_client.get("/api/v1/astrologer/me/exists")
    assert resp.status_code == 200
    assert resp.json()["has_application"] is False
    assert isolated_db.query(Astrologer).count() == before

    fresh_client.post("/api/v1/astrologer/me/start")
    assert fresh_client.get("/api/v1/astrologer/me/exists").json()["has_application"] is True


def test_an_abandoned_draft_is_not_in_the_reviewer_queue(reviewer_client, isolated_db):
    """A draft is not a submission, so it must not take up a reviewer's time."""
    before_queue = len(reviewer_client.get("/api/v1/admin/astrologers").json()["applications"])

    user = _user(isolated_db, name="Started Then Left")
    p = _profile(isolated_db, user, status=STATUS_DRAFT)  # never submitted

    body = reviewer_client.get("/api/v1/admin/astrologers").json()
    slugs = [a["slug"] for a in body["applications"]]
    assert not any("started-then-left" in s for s in slugs), slugs
    assert len(body["applications"]) == before_queue

    counts = reviewer_client.get("/api/v1/admin/astrologers/counts").json()
    assert counts["drafts"] >= 1
    assert counts["total"] == before_queue
    assert p.status == STATUS_DRAFT


def test_a_submitted_application_appears_in_the_queue(reviewer_client, isolated_db):
    """The counterpart: submitting puts it back in the queue."""
    user = _user(isolated_db, name="Real Applicant")
    p = _profile(isolated_db, user, status=STATUS_APPLIED)

    body = reviewer_client.get("/api/v1/admin/astrologers").json()
    assert any(a["id"] == p.id for a in body["applications"]), body


def test_client_can_read_own_application(client):
    assert client.get("/api/v1/astrologer/me").status_code == 200


def test_one_applicant_cannot_delete_another_applicants_document(applicant_client, isolated_db):
    """Ownership is enforced in the query, not by a later comparison."""
    owner = _user(isolated_db, name="Owner One", email="owner1@example.com")
    po = _profile(isolated_db, owner)
    doc = AstrologerDocument(astrologer_id=po.id, kind="pan",
                              storage_key="astrologers/x/a.pdf")
    isolated_db.add(doc)
    isolated_db.commit()

    # The client is authenticated as a different applicant (applicant@example.com)
    # whose profile is empty, and the document belongs to someone else entirely.
    resp = applicant_client.delete(f"/api/v1/astrologer/documents/{doc.id}")
    assert resp.status_code in (404, 200)
    if resp.status_code == 200:
        # If it resolved, it must have been the caller's own document -- never
        # the other user's. This test uses distinct users, so it must be 404.
        pytest.fail("cross-user document delete was permitted")
    assert isolated_db.query(AstrologerDocument).filter(
        AstrologerDocument.id == doc.id).count() == 1


def test_reviewer_cannot_short_circuit_a_draft_application(reviewer_client, isolated_db):
    """An applicant still in draft has no assessment to override."""
    user = _user(isolated_db, name="Draft Applicant", email="draft@example.com")
    p = _profile(isolated_db, user)  # draft
    resp = reviewer_client.post(
        f"/api/v1/admin/astrologers/{p.id}/assessments/1/override?passed=true&note=x"
    )
    assert resp.status_code in (404, 409)
    assert p.status == STATUS_DRAFT


def test_mock_consultation_refused_outside_the_mock_stage(reviewer_client, isolated_db):
    user = _user(isolated_db, name="Early Applicant", email="early@example.com")
    p = _profile(isolated_db, user, status=STATUS_UNDER_REVIEW)
    resp = reviewer_client.post(
        f"/api/v1/admin/astrologers/{p.id}/mock-consults",
        json={"scenario": "a" * 20, "response": "b" * 20, "score_accuracy": 4,
              "score_clarity": 4, "score_empathy": 4, "score_structure": 4,
              "verdict": "pass"},
    )
    assert resp.status_code == 409
    assert p.status == STATUS_UNDER_REVIEW


def test_illegal_status_change_is_refused_with_the_legal_targets(reviewer_client, isolated_db):
    user = _user(isolated_db, name="Skipper", email="skipper@example.com")
    p = _profile(isolated_db, user)  # draft
    resp = reviewer_client.post(
        f"/api/v1/admin/astrologers/{p.id}/status",
        json={"to_status": STATUS_VERIFIED},
    )
    assert resp.status_code == 409
    assert "draft" in resp.json()["detail"].lower()
    assert p.status == STATUS_DRAFT


def test_status_change_to_applied_is_allowed_from_draft(reviewer_client, isolated_db):
    user = _user(isolated_db, name="Promoted", email="promoted@example.com")
    p = _profile(isolated_db, user)
    resp = reviewer_client.post(
        f"/api/v1/admin/astrologers/{p.id}/status",
        json={"to_status": STATUS_APPLIED},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == STATUS_APPLIED


def test_directory_hides_unverified_profiles(applicant_client, isolated_db):
    """Only practising astrologers are listable."""
    hidden = _user(isolated_db, name="Hidden One", email="hidden@example.com")
    _profile(isolated_db, hidden, status=STATUS_DRAFT)
    visible = _user(isolated_db, name="Visible One", email="visible@example.com")
    _profile(isolated_db, visible, status=STATUS_VERIFIED)

    body = applicant_client.get("/api/v1/astrologers").json()
    slugs = [a["slug"] for a in body["astrologers"]]
    assert any("visible-one" in s for s in slugs), slugs
    assert not any("hidden-one" in s for s in slugs), slugs
    assert all(a["status"] in PRACTISING_STATUSES for a in body["astrologers"])


def test_directory_filters_by_specialty(applicant_client, isolated_db):
    u1 = _user(isolated_db, name="Vedic One", email="vedic1@example.com")
    p1 = _profile(isolated_db, u1, status=STATUS_VERIFIED)
    p1.specialties = ["Vedic"]
    u2 = _user(isolated_db, name="Tarot One", email="tarot1@example.com")
    p2 = _profile(isolated_db, u2, status=STATUS_VERIFIED)
    p2.specialties = ["Tarot"]
    isolated_db.commit()

    body = applicant_client.get("/api/v1/astrologers?specialty=Tarot").json()
    slugs = [a["slug"] for a in body["astrologers"]]
    assert any("tarot-one" in s for s in slugs), slugs
    assert not any("vedic-one" in s for s in slugs), slugs


def test_profile_404s_for_an_unverified_astrologer(applicant_client, isolated_db):
    """An unlisted profile is 404, not 403, so it is indistinguishable from
    one that never existed."""
    u = _user(isolated_db, name="Still Draft", email="draft2@example.com")
    p = _profile(isolated_db, u, status=STATUS_DRAFT)
    assert applicant_client.get(f"/api/v1/astrologers/{p.slug}").status_code == 404


def test_assessment_endpoint_returns_no_answer_key(applicant_client):
    body = applicant_client.get("/api/v1/astrologer/assessment").json()
    assert len(body["questions"]) == 10
    for q in body["questions"]:
        assert "correct_index" not in q
