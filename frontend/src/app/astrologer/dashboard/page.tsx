"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  ClipboardList,
  Video,
  CheckCircle2,
  Clock3,
  XCircle,
  AlertTriangle,
  ArrowRight,
  History,
} from "lucide-react";

import { api, type MyApplication, type OnboardingEvent } from "@/lib/api";
import AvailabilityEditor from "../availability/AvailabilityEditor";

const ACCENT = "#C8956D";

/** The happy path, in order. A stage is "done" once the applicant is past it. */
const STAGES: { key: string; label: string; icon: typeof ShieldCheck }[] = [
  { key: "applied", label: "Application submitted", icon: FileText },
  { key: "under_review", label: "Document review", icon: ShieldCheck },
  { key: "assessment_pending", label: "Qualification test", icon: ClipboardList },
  { key: "mock_pending", label: "Mock consultation", icon: Video },
  { key: "verified", label: "Verified", icon: CheckCircle2 },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft — not yet submitted",
  applied: "Submitted — waiting for a reviewer",
  under_review: "Under review",
  assessment_pending: "Ready for your qualification test",
  mock_pending: "Qualified — mock consultation pending",
  verified: "Verified and listed",
  probation: "Verified on probation",
  rejected: "Not approved",
  suspended: "Suspended",
};

const STATUS_COLOR: Record<string, string> = {
  verified: ACCENT,
  probation: "#EAB308",
  rejected: "var(--danger)",
  suspended: "var(--danger)",
};

// Mirrors DOC_KINDS in astrologer_service.py. Only the labels are needed here;
// the apply page is the single place that defines what can be uploaded.
const DOC_KINDS = [
  { value: "pan", label: "PAN card" },
  { value: "aadhaar", label: "Aadhaar (front)" },
  { value: "address_proof", label: "Address proof" },
  { value: "degree_certificate", label: "Astrology qualification" },
  { value: "professional_cert", label: "Professional certificate" },
  { value: "experience_letter", label: "Experience letter" },
  { value: "other", label: "Other document" },
];

// A reviewer's "admin_verified" is a human confirming a self-declared scan. The
// wording avoids implying government-backed identity verification.
const DOC_STATUS: Record<string, string> = {
  self_declared: "Waiting for a reviewer",
  admin_verified: "Accepted by a reviewer",
  rejected: "Rejected by a reviewer",
};

/** Index of the furthest stage reached, so completed steps can be ticked off. */
function reachedIndex(status: string): number {
  if (status === "draft") return -1;
  if (status === "probation" || status === "verified") return STAGES.length - 1;
  const i = STAGES.findIndex((s) => s.key === status);
  return i;
}

export default function AstrologerDashboardPage() {
  const [app, setApp] = useState<MyApplication | null>(null);
  const [events, setEvents] = useState<OnboardingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Data only: `loading` is entered by the caller, so nothing sets state
  // synchronously while the effect is mounting.
  const load = useCallback(async () => {
    try {
      const [a, t] = await Promise.all([api.getMyApplication(), api.getMyTimeline()]);
      // No application is a normal state, not an error: it only means the
      // caller has not started one yet.
      setApp(a.application);
      setEvents(t.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your application.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The initial fetch is a promise chain rather than a load() call, so the
    // effect body itself never sets state.
    let cancelled = false;
    Promise.all([api.getMyApplication(), api.getMyTimeline()])
      .then(([a, t]) => {
        if (cancelled) return;
        setApp(a.application);
        setEvents(t.events);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load your application.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.submitApplication();
      setApp(updated);
      setNotice("Application submitted. A reviewer will look at it shortly.");
      // Re-read rather than reuse `updated`: submitting also enqueues a job that
      // may have already moved the status on.
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center text-sm" style={{ color: "var(--text-tertiary)" }} role="status">
        Loading your application…
      </div>
    );
  }

  if (error && !app) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--danger)" }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{error}</p>
        <button className="btn-secondary text-sm" onClick={load}>Retry</button>
      </div>
    );
  }

  if (!app) {
    // Reachable now that GET /me no longer creates a draft: someone who has
    // not started an application has no row, so the dashboard has nothing to
    // show. Previously this rendered a blank page.
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 text-center">
        <div
          className="rounded-xl p-8"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <FileText className="w-8 h-8 mx-auto mb-3" style={{ color: ACCENT }} />
          <h1 className="font-display text-2xl mb-2" style={{ color: "var(--text-primary)" }}>
            No application yet
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            You have not started an application to practise on AstroSeva. Nothing is
            created until you begin, so there is nothing to track yet.
          </p>
          <Link href="/services" className="btn-primary text-sm">
            Apply to become an astrologer
          </Link>
        </div>
      </div>
    );
  }

  const reached = reachedIndex(app.status);
  const canSubmit = app.status === "draft";
  const assessmentOpen =
    app.status === "assessment_pending" || app.status === "applied";

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl mb-2" style={{ color: "var(--text-primary)" }}>
          Practitioner onboarding
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Track your application from submission to verification.
        </p>
      </header>

      {error && (
        <div
          className="rounded-lg p-4 mb-5 text-sm flex gap-2 items-start"
          style={{ color: "var(--danger)", border: "1px solid var(--danger)" }}
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {notice && (
        <div
          className="rounded-lg p-4 mb-5 text-sm flex gap-2 items-start"
          style={{ color: ACCENT, border: `1px solid ${ACCENT}` }}
          role="status"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {notice}
        </div>
      )}

      <div
        className="rounded-xl p-5 mb-6 flex flex-wrap items-center justify-between gap-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
      >
        <div>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-tertiary)" }}>
            Current status
          </p>
          <p className="text-lg" style={{ color: STATUS_COLOR[app.status] ?? "var(--text-primary)" }}>
            {STATUS_LABEL[app.status] ?? app.status}
          </p>
          {app.status === "rejected" && app.rejection_reason && (
            <p className="text-sm mt-2 max-w-xl" style={{ color: "var(--text-secondary)" }}>
              Reason: {app.rejection_reason}
            </p>
          )}
          {app.status === "probation" && app.probation_until && (
            <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
              Probation ends {app.probation_until}.
            </p>
          )}
        </div>
        {app.is_practising && (
          <Link href="/astrologers" className="btn-secondary text-sm">
            View my listing <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Stage tracker */}
      <ol className="mb-8 space-y-3">
        {STAGES.map((s, i) => {
          const done = reached >= i && reached > -1;
          const current = app.status === s.key;
          const Icon = s.icon;
          return (
            <li
              key={s.key}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{
                background: current ? "rgba(200,149,109,0.08)" : "transparent",
                border: `1px solid ${current ? ACCENT : "var(--border-subtle)"}`,
              }}
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: done ? "rgba(200,149,109,0.15)" : "var(--bg-surface)",
                  color: done ? ACCENT : "var(--text-tertiary)",
                }}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-sm flex-1" style={{ color: done ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                {s.label}
              </span>
              {current && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(200,149,109,0.15)", color: ACCENT }}>
                  In progress
                </span>
              )}
              {done && !current && <CheckCircle2 className="w-4 h-4" style={{ color: ACCENT }} />}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile */}
        <section
          className="rounded-xl p-5"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
            Your profile
          </h2>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
            {app.headline || "No headline set."}
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
            {app.experience_years} years experience · {app.specialties.join(", ") || "no specialities"}
          </p>
          {app.status === "draft" || app.status === "rejected" ? (
            <Link href="/astrologer/apply" className="btn-secondary text-xs">
              Edit profile and documents
            </Link>
          ) : (
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              Your details are locked while your application is being reviewed.
            </p>
          )}
        </section>

        {/* Documents */}
        <section
          className="rounded-xl p-5"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
            Documents ({app.documents.length})
          </h2>
          {app.documents.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              No documents uploaded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {app.documents.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-3 text-xs">
                  <span className="min-w-0">
                    <span className="block truncate" style={{ color: "var(--text-primary)" }}>
                      {DOC_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind}
                    </span>
                    <span style={{ color: "var(--text-tertiary)" }}>
                      {DOC_STATUS[d.identity_status] ?? d.identity_status}
                    </span>
                    {d.reviewer_note && (
                      <span className="block mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {d.reviewer_note}
                      </span>
                    )}
                  </span>
                  {d.identity_status === "admin_verified" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
                  ) : d.identity_status === "rejected" ? (
                    <XCircle className="w-4 h-4 shrink-0" style={{ color: "var(--danger)" }} />
                  ) : (
                    <Clock3 className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] mt-4" style={{ color: "var(--text-tertiary)" }}>
            Self-declared documents, reviewed by eye. Not verified against any government
            register.
          </p>
        </section>
      </div>

      <section
        className="rounded-xl p-5 mt-6"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
      >
        <h2 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
          Your availability
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
          Editable whenever you like, including while your application is under review.
        </p>
        <AvailabilityEditor onChanged={load} />
      </section>

      {assessmentOpen && (
        <div
          className="rounded-xl p-5 mt-6 flex flex-wrap items-center justify-between gap-4"
          style={{ background: "var(--bg-surface)", border: `1px solid ${ACCENT}` }}
        >
          <div>
            <p className="text-sm mb-1" style={{ color: "var(--text-primary)" }}>
              {app.status === "applied" ? "Assessment unlocks once a reviewer checks your documents" : "Your qualification test is ready"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              10 questions, auto-graded, 8 to pass.
            </p>
          </div>
          <Link
            href="/astrologer/apply?step=assessment"
            className={`btn-primary text-sm ${app.status === "applied" ? "pointer-events-none opacity-50" : ""}`}
          >
            Take the assessment
          </Link>
        </div>
      )}

      {canSubmit && (
        <div className="rounded-xl p-5 mt-6 flex flex-wrap items-center justify-between gap-4"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <div>
            <p className="text-sm mb-1" style={{ color: "var(--text-primary)" }}>
              Ready to submit?
            </p>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {app.next_step ?? "Complete your profile and documents first."}
            </p>
          </div>
          <button className="btn-primary text-sm" onClick={submit} disabled={busy}>
            {busy ? "Submitting…" : "Submit application"}
          </button>
        </div>
      )}

      {/* Audit trail */}
      <section className="mt-8">
        <h2 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <History className="w-4 h-4" style={{ color: ACCENT }} /> Activity
        </h2>
        {events.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Nothing yet.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="text-xs flex gap-3">
                <span className="shrink-0 tabular-nums" style={{ color: "var(--text-tertiary)" }}>
                  {e.created_at.slice(0, 16).replace("T", " ")}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {e.event_type.replace(/_/g, " ")}
                  {e.from_status && e.to_status && e.from_status !== e.to_status && (
                    <span style={{ color: "var(--text-tertiary)" }}>
                      {" "}
                      ({e.from_status} → {e.to_status})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
