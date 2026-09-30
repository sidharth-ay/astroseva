"""The reviewer's transition buttons must be ones the backend accepts.

`LEGAL_TRANSITIONS` is the authority. The admin page kept its own list of
allowed next statuses, and three entries had drifted out of it, so the UI
offered a control that produced a 409 when pressed.
"""

import re
from pathlib import Path

import pytest

from app.services.astrologer_service import LEGAL_TRANSITIONS, can_transition

FRONTEND_PAGE = (
    Path(__file__).resolve().parents[2]
    / "frontend" / "src" / "app" / "admin" / "astrologers" / "page.tsx"
)


def _frontend_actions() -> dict[str, set[str]]:
    """Parse NEXT_ACTIONS out of the admin page.

    Read as text rather than imported, because the check exists precisely
    because the two files are separate and can drift.
    """
    source = FRONTEND_PAGE.read_text(encoding="utf-8")
    block = source.split("const NEXT_ACTIONS")[1].split("};")[0]
    return {
        status: set(re.findall(r'"([a-z_]+)"', targets))
        for status, targets in re.findall(r"([a-z_]+):\s*\[([^\]]*)\]", block)
    }


@pytest.fixture(scope="module")
def actions():
    return _frontend_actions()


def test_every_backend_status_has_a_button_list(actions):
    assert set(actions) == set(LEGAL_TRANSITIONS), (
        sorted(set(LEGAL_TRANSITIONS) - set(actions)),
        sorted(set(actions) - set(LEGAL_TRANSITIONS)),
    )


@pytest.mark.parametrize("status", sorted(LEGAL_TRANSITIONS))
def test_every_offered_transition_is_legal(actions, status):
    """The three that had drifted, each of which 409'd on press:
    verified -> verified, rejected -> applied, suspended -> verified."""
    illegal = [t for t in actions[status] if not can_transition(status, t)]
    assert not illegal, f"{status} offers illegal transitions: {illegal}"


@pytest.mark.parametrize("status", sorted(LEGAL_TRANSITIONS))
def test_every_legal_transition_is_offered(actions, status):
    """A legal transition the UI hides is a reviewer with no way to do it."""
    missing = sorted(
        t for t in LEGAL_TRANSITIONS[status] if t not in actions[status]
    )
    assert not missing, f"{status} hides legal transitions: {missing}"


def test_the_three_known_drifted_transitions_are_gone(actions):
    assert "verified" not in actions["verified"]
    assert "applied" not in actions["rejected"]
    assert "verified" not in actions["suspended"]


# --- the rejection reason field name ------------------------------------------

def test_status_change_sends_rejection_reason_not_reason():
    """`setApplicationStatus` sent `{ to_status, reason }`.

    The backend reads `rejection_reason`, so Pydantic dropped it, the stored
    value was never set, and the applicant was shown the fallback
    "Not stated by reviewer" in place of what the reviewer had written.
    """
    source = (
        FRONTEND_PAGE.parents[3] / "lib" / "api.ts"   # frontend/src/lib/api.ts
    ).read_text(encoding="utf-8")
    block = source.split("setApplicationStatus")[1].split("}),")[0]
    assert "rejection_reason: reason" in block
    # `reason` must not appear as a bare key in the request body.
    assert "JSON.stringify({ to_status, reason })" not in block


def test_rejection_reason_round_trips_through_the_api(reviewer_user, applicant_user,
                                                       test_sessionmaker):
    """End to end: what the reviewer types is what the applicant is shown."""
    from app.db.models import Astrologer, STATUS_UNDER_REVIEW
    from tests.conftest import _make_client, _clear_overrides
    from tests.test_assessment_grading import _drop_profile

    applicant = _make_client(applicant_user, test_sessionmaker)
    try:
        applicant.post("/api/v1/astrologer/me/start")
    finally:
        _clear_overrides()

    session = test_sessionmaker()
    try:
        profile = session.query(Astrologer).filter(
            Astrologer.user_id == applicant_user.id
        ).one()
        profile.status = STATUS_UNDER_REVIEW
        session.commit()
        astrologer_id = profile.id
    finally:
        session.close()

    reviewer = _make_client(reviewer_user, test_sessionmaker)
    try:
        r = reviewer.post(
            f"/api/v1/admin/astrologers/{astrologer_id}/status",
            json={
                "to_status": "rejected",
                "rejection_reason": "Identity document is unreadable.",
            },
        )
        assert r.status_code == 200, r.text
        detail = reviewer.get(f"/api/v1/admin/astrologers/{astrologer_id}").json()
        assert detail["rejection_reason"] == "Identity document is unreadable."
    finally:
        _clear_overrides()
        _drop_profile(applicant_user.id, test_sessionmaker)
