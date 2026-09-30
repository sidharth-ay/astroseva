"""The apply flow must actually submit, and must not depend on a stale prop.

The applicant form had a "Save and submit" button that only saved, and a
document-upload gate that read `app` before the state update from the same tick
had landed -- so the first upload after any profile edit was blocked or offered
on stale data.
"""

import re
from pathlib import Path

import pytest

PAGE = (
    Path(__file__).resolve().parents[2]
    / "frontend" / "src" / "app" / "astrologer" / "apply" / "page.tsx"
)


@pytest.fixture(scope="module")
def source():
    return PAGE.read_text(encoding="utf-8")


def _submit_handler(source: str) -> str:
    """The body of the submit button's onClick, up to its closing braces."""
    anchor = source.index("disabled={!canSubmit || busy}")
    start = source.index("onClick={async () => {", anchor)
    depth = 0
    for i in range(source.index("{", start), len(source)):
        if source[i] == "{":
            depth += 1
        elif source[i] == "}":
            depth -= 1
            if depth == 0:
                return source[start:i + 1]
    raise AssertionError("unbalanced braces in the submit handler")


def test_submit_button_actually_submits(source):
    """The button saved the profile, navigated to the dashboard, and stopped.

    The applicant landed on a draft and had to submit again from there, under a
    button labelled "Save and submit".
    """
    body = _submit_handler(source)
    assert "saveProfile()" in body, "the button no longer saves the profile"
    assert "api.submitApplication()" in body, (
        "the button saves but never submits"
    )


def test_submit_button_reports_failure_and_stays(source):
    """A failed submit must not navigate away and lose the applicant's work."""
    body = _submit_handler(source)
    assert "router.push" in body
    # Navigation must come after the submit resolves, and inside the try.
    assert body.index("api.submitApplication()") < body.index("router.push")
    assert body.index("api.submitApplication()") < body.index("} catch")
    # And the catch must surface the error rather than swallow it.
    assert "setError(" in body.split("} catch", 1)[1]


def test_submit_button_shows_progress(source):
    """A second press while the request is in flight would submit twice."""
    body = _submit_handler(source)
    assert "setBusy(true)" in body
    assert "setBusy(false)" in body
    assert "busy ? " in source, "the button label does not reflect the busy state"


def test_submit_is_disabled_until_the_gate_is_met(source):
    assert "disabled={!canSubmit || busy}" in source


def test_document_gate_reads_fresh_state(source):
    """`uploadedKinds` was derived from `app` in the same render pass.

    `saveProfile` calls `setApp(updated)`, but the gate was computed from the
    `app` binding captured when the step was entered, so it lagged a render
    behind and disagreed with the documents list.
    """
    # The gate is derived, not held in its own state that can go stale.
    assert "const uploadedKinds = new Set(app.documents.map" in source
    # `hasCredential` derives from that, and `canSubmit` from that.
    assert "const hasCredential = CREDENTIALS.some" in source
    assert "const canSubmit = profileComplete && hasCredential" in source
    # Nothing caches it into state that a re-render would not recompute.
    assert "setUploadedKinds" not in source
    assert "setHasCredential" not in source


def test_credential_kinds_match_the_backend(source):
    """Every kind the form offers must be one the backend accepts.

    `upload_document` validates `kind` against `DOC_KINDS` and rejects anything
    else with a 400, so a stale or invented kind in the form is a dead control.
    """
    from app.services.astrologer_service import CREDENTIAL_DOC_KINDS, DOC_KINDS

    offered = set(re.findall(r'value: "([a-z_]+)"', source))
    assert offered == set(DOC_KINDS), (
        f"only in form: {sorted(offered - set(DOC_KINDS))}, "
        f"only in backend: {sorted(set(DOC_KINDS) - offered)}"
    )

    # And the credential gate must cover exactly the credential subset, since
    # it is what decides whether the applicant may submit.
    creds = set(re.findall(r'value: "([a-z_]+)", label: "[^"]*", hint: "[^"]*", '
                           r'credential: true', source))
    assert creds == set(CREDENTIAL_DOC_KINDS), (
        f"form: {sorted(creds)}, backend: {sorted(CREDENTIAL_DOC_KINDS)}"
    )


def test_the_submit_gate_is_not_a_second_hardcoded_list(source):
    """The gate duplicated the credential kinds as its own literal array.

    That copy could drift from `CREDENTIAL_DOC_KINDS` without anything failing;
    the test above checks the two agree today, and this asserts there is only
    one list in the file to drift.
    """
    literals = re.findall(
        r'CREDENTIALS\s*=\s*\[([^\]]*)\]', source
    )
    assert not literals, (
        "the gate still hardcodes its own kind list; derive it from DOC_KINDS"
    )


def test_location_is_sent_as_null_when_blank_not_empty_string(source):
    """A blank location must clear the field, not store ""."""
    assert "location: location.trim() || null" in source


def test_step_count_in_the_intro_matches_the_steps():
    """The header said "Three short steps" above a four-step stepper."""
    source = PAGE.read_text(encoding="utf-8")
    steps = re.search(r"const STEPS[^=]*=\s*\[(.*?)\];", source, re.S)
    assert steps
    n = len(re.findall(r'key: "', steps.group(1)))
    words = {3: "Three", 4: "Four"}
    assert words[n] in source, f"{n} steps but the intro does not say {words[n]}"
