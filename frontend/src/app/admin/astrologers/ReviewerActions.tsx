"use client";

/**
 * Reviewer evidence capture for a single application.
 *
 * Two backend capabilities had no interface at all, which left the verification
 * workflow hollow:
 *   - `POST /{id}/mock-consults` -- the mock consultation is the evidence that
 *     justifies moving to verified, yet a reviewer could not record one and
 *     could still click straight through to "Verified".
 *   - `POST /{id}/assessments/{attempt_id}/override` -- an applicant who failed
 *     auto-grading had no path forward, because no reviewer could see the score
 *     or correct it.
 */

import { useState } from "react";
import {
  Video,
  ClipboardCheck,
  Loader2,
  Plus,
  X,
  ShieldAlert,
} from "lucide-react";

import { api, type AdminApplication } from "@/lib/api";

const ACCENT = "#C8956D";

const CRITERIA = [
  { key: "score_accuracy", label: "Accuracy", hint: "Was the reading astrologically sound?" },
  { key: "score_clarity", label: "Clarity", hint: "Was it explained without jargon?" },
  { key: "score_empathy", label: "Empathy", hint: "Was the client treated with respect?" },
  { key: "score_structure", label: "Structure", hint: "Was the consultation organised?" },
] as const;

const VERDICTS = [
  { value: "pass", label: "Pass", hint: "Cleared to practise." },
  { value: "conditional", label: "Conditional pass", hint: "Cleared with probation conditions." },
  { value: "fail", label: "Fail", hint: "Not cleared." },
] as const;

export default function ReviewerActions({
  application,
  onChanged,
}: {
  application: AdminApplication;
  onChanged: () => void;
}) {
  const [showMock, setShowMock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock consult form
  const [scenario, setScenario] = useState("");
  const [response, setResponse] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({
    score_accuracy: 3,
    score_clarity: 3,
    score_empathy: 3,
    score_structure: 3,
  });
  const [verdict, setVerdict] = useState("pass");
  const [notes, setNotes] = useState("");

  // Override form
  const [overriding, setOverriding] = useState<number | null>(null);
  const [overrideNote, setOverrideNote] = useState("");

  // Only the mock stage accepts a mock consult; anywhere else the backend
  // refuses it, so the control is not offered at all.
  const mockStage = application.status === "mock_pending";
  const latestAttempt = application.assessments?.[0] ?? null;

  // Transient form state is keyed by application id rather than reset in an
  // effect: a parent that swaps applications remounts this component, so the
  // state starts clean without a synchronous setState during render.
  const formKey = application.id;
  const [localKey, setLocalKey] = useState(formKey);
  if (localKey !== formKey) {
    // Render-phase adjustment: React discards this render's output and
    // re-renders immediately with the fresh state, which is the documented way
    // to reset state on a prop change.
    setLocalKey(formKey);
    setShowMock(false);
    setOverriding(null);
    setError(null);
  }

  const submitMock = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.recordMockConsult(application.id, {
        scenario: scenario.trim(),
        response: response.trim(),
        score_accuracy: scores.score_accuracy,
        score_clarity: scores.score_clarity,
        score_empathy: scores.score_empathy,
        score_structure: scores.score_structure,
        verdict,
        notes: notes.trim() || undefined,
      });
      setShowMock(false);
      setScenario("");
      setResponse("");
      setNotes("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record the mock consultation.");
    } finally {
      setBusy(false);
    }
  };

  const submitOverride = async (attemptId: number, passed: boolean) => {
    if (!overrideNote.trim()) {
      setError("A written reason is required before overriding a grade.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.overrideAssessment(application.id, attemptId, passed, overrideNote.trim());
      setOverriding(null);
      setOverrideNote("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not override the attempt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      {error && (
        <p
          className="text-xs mb-3 flex items-start gap-1.5"
          style={{ color: "var(--danger)" }}
          role="alert"
        >
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {/* Assessment attempts */}
      <div className="mb-4">
        <h3 className="text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
          <ClipboardCheck className="w-3.5 h-3.5" /> Assessment attempts
        </h3>
        {application.assessments?.length ? (
          <ul className="space-y-2">
            {application.assessments.map((a) => (
              <li key={a.id} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Attempt {a.attempt_no}: {a.score}/{a.max_score}{" "}
                    <span style={{ color: a.passed ? ACCENT : "var(--danger)" }}>
                      ({a.passed ? "passed" : "failed"})
                    </span>{" "}
                    <span style={{ color: "var(--text-tertiary)" }}>· pass mark {a.pass_mark}</span>
                  </span>
                  {a.override_note && (
                    <span style={{ color: "var(--text-tertiary)" }}>
                      overridden: {a.override_note}
                    </span>
                  )}
                </div>
                {overriding === a.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      className="input-field w-full text-xs min-h-16"
                      placeholder="Why is the auto-grade wrong? This is recorded in the audit trail."
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn-primary text-[10px]"
                        disabled={busy}
                        onClick={() => submitOverride(a.id, !a.passed)}
                      >
                        Mark {a.passed ? "failed" : "passed"}
                      </button>
                      <button className="btn-ghost text-[10px]" onClick={() => setOverriding(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn-ghost text-[10px] mt-1"
                    onClick={() => {
                      setOverriding(a.id);
                      setOverrideNote("");
                      setError(null);
                    }}
                  >
                    Override this grade
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            No attempts yet.
            {latestAttempt === null && application.status === "assessment_pending"
              ? " The applicant has not taken the test."
              : ""}
          </p>
        )}
      </div>

      {/* Mock consult */}
      <div>
        <h3 className="text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
          <Video className="w-3.5 h-3.5" /> Mock consultation
        </h3>

        {!mockStage && (
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            A mock consultation can only be recorded once the applicant is in the
            mock stage.
          </p>
        )}

        {mockStage && !showMock && (
          <button className="btn-secondary text-xs" onClick={() => setShowMock(true)}>
            <Plus className="w-3.5 h-3.5" /> Record a mock consultation
          </button>
        )}

        {mockStage && showMock && (
          <div className="space-y-3">
            <div>
              <label className="input-label text-xs">Scenario put to the applicant</label>
              <textarea
                className="input-field w-full text-xs min-h-16"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="e.g. Client asks about a delayed marriage proposal."
              />
            </div>
            <div>
              <label className="input-label text-xs">Their response</label>
              <textarea
                className="input-field w-full text-xs min-h-24"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Summarise what they said."
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {CRITERIA.map((c) => (
                <div key={c.key}>
                  <label className="text-xs flex items-center justify-between mb-1" style={{ color: "var(--text-secondary)" }}>
                    {c.label}
                    <span style={{ color: ACCENT }}>{scores[c.key]}/5</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={scores[c.key]}
                    onChange={(e) => setScores((p) => ({ ...p, [c.key]: Number(e.target.value) }))}
                    className="w-full"
                    aria-label={c.label}
                  />
                  <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{c.hint}</p>
                </div>
              ))}
            </div>

            <div>
              <label className="input-label text-xs">Verdict</label>
              <div className="flex flex-wrap gap-2">
                {VERDICTS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setVerdict(v.value)}
                    className="text-[10px] px-2.5 py-1.5 rounded-full"
                    style={{
                      background: verdict === v.value ? "rgba(200,149,109,0.15)" : "transparent",
                      color: verdict === v.value ? ACCENT : "var(--text-secondary)",
                      border: `1px solid ${verdict === v.value ? ACCENT : "var(--border-subtle)"}`,
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                {VERDICTS.find((v) => v.value === verdict)?.hint}
              </p>
            </div>

            <div>
              <label className="input-label text-xs">Notes (optional)</label>
              <textarea
                className="input-field w-full text-xs min-h-16"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button
                className="btn-primary text-xs"
                disabled={busy || !scenario.trim() || !response.trim()}
                onClick={submitMock}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save evaluation
              </button>
              <button className="btn-ghost text-xs" onClick={() => setShowMock(false)}>
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
            {(!scenario.trim() || !response.trim()) && (
              <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                A scenario and the applicant&apos;s response are both required.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
