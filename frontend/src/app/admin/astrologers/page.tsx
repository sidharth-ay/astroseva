"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
  Video,
  CheckCircle2,
  Loader2,
  Ban,
} from "lucide-react";

import {
  api,
  type AdminApplication,
  type QueueCounts,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import ReviewerActions from "./ReviewerActions";
import AuditTrail from "./AuditTrail";

const ACCENT = "#C8956D";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  applied: "Applied",
  under_review: "Under review",
  assessment_pending: "Assessment pending",
  mock_pending: "Mock pending",
  verified: "Verified",
  probation: "Probation",
  rejected: "Rejected",
  suspended: "Suspended",
};

const QUEUE_TABS = ["applied", "under_review", "assessment_pending", "mock_pending", "verified", "rejected"];

// The transitions offered from each status. These mirror LEGAL_TRANSITIONS in
// backend/app/services/astrologer_service.py, which is the authority and
// rejects anything not listed there.
//
// Three were previously offered that the backend refuses:
//   verified -> verified      (no self-transition)
//   rejected -> applied       (must return to draft first)
//   suspended -> verified     (suspension is lifted through under_review)
// Each one produced a 409 on a control the reviewer could see and press.
const NEXT_ACTIONS: Record<string, string[]> = {
  draft: ["applied", "rejected"],
  applied: ["under_review", "rejected", "draft"],
  under_review: ["assessment_pending", "rejected", "applied"],
  assessment_pending: ["mock_pending", "rejected"],
  mock_pending: ["verified", "probation", "rejected"],
  verified: ["suspended", "probation"],
  probation: ["verified", "suspended"],
  rejected: ["draft"],
  suspended: ["under_review", "rejected"],
};

export default function AdminAstrologersPage() {
  const { user } = useAuth();
  const isReviewer = user?.role === "reviewer" || user?.role === "admin";

  const [rows, setRows] = useState<AdminApplication[]>([]);
  const [counts, setCounts] = useState<QueueCounts | null>(null);
  const [tab, setTab] = useState<string>("");
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Data only. The caller owns `loading`, so no effect sets state synchronously.
  const load = useCallback(async (status: string) => {
    setError(null);
    try {
      const [q, c] = await Promise.all([
        api.getReviewQueue(status || undefined),
        api.getQueueCounts(),
      ]);
      setRows(q.applications);
      setCounts(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the review queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(
    (status: string) => {
      setLoading(true);
      return load(status);
    },
    [load]
  );

  // Each status filter is a discrete tab click, so refetching on change is
  // enough; no debounce is needed and the effect body stays synchronous-free.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [q, c] = await Promise.all([
          api.getReviewQueue(tab || undefined),
          api.getQueueCounts(),
        ]);
        if (cancelled) return;
        setRows(q.applications);
        setCounts(c);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the review queue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const selectTab = useCallback(
    (next: string) => {
      setTab(next);
      setLoading(true);
    },
    []
  );

  const setStatus = async (id: number, to: string) => {
    const reason =
      to === "rejected"
        ? window.prompt("Reason for rejection (shown to the applicant):") ?? undefined
        : undefined;
    if (to === "rejected" && !reason) return;
    setBusy(true);
    setError(null);
    try {
      await api.setApplicationStatus(id, to, reason);
      setFlash(`Application moved to ${STATUS_LABEL[to] ?? to}.`);
      refresh(tab);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change the status.");
    } finally {
      setBusy(false);
    }
  };

  const reviewDoc = async (docId: number, status: "admin_verified" | "rejected") => {
    const note =
      status === "rejected" ? window.prompt("What is wrong with it?") ?? undefined : undefined;
    if (status === "rejected" && !note) return;
    setBusy(true);
    try {
      await api.reviewDocument(docId, { identity_status: status, reviewer_note: note });
      setFlash("Document reviewed.");
      refresh(tab);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not review the document.");
    } finally {
      setBusy(false);
    }
  };

  if (!isReviewer) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <Ban className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--danger)" }} />
        <h1 className="font-display text-2xl mb-2" style={{ color: "var(--text-primary)" }}>
          Reviewers only
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          This queue requires a reviewer or administrator role.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl mb-2 flex items-center gap-2.5" style={{ color: "var(--text-primary)" }}>
          <ShieldCheck className="w-7 h-7" style={{ color: ACCENT }} /> Onboarding queue
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {counts ? `${counts.total} application${counts.total === 1 ? "" : "s"} on record.` : "Loading counts…"}
        </p>
      </header>

      {flash && (
        <div className="rounded-lg p-3 mb-5 text-sm flex gap-2 items-start"
          style={{ color: ACCENT, border: `1px solid ${ACCENT}` }} role="status">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {flash}
        </div>
      )}
      {error && (
        <div className="rounded-lg p-4 mb-5 text-sm flex gap-2 items-start"
          style={{ color: "var(--danger)", border: "1px solid var(--danger)" }} role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Status tabs with counts */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => selectTab("")}
          className="text-xs px-3 py-1.5 rounded-full"
          style={{
            background: tab === "" ? "rgba(200,149,109,0.15)" : "var(--bg-surface)",
            color: tab === "" ? ACCENT : "var(--text-secondary)",
            border: `1px solid ${tab === "" ? ACCENT : "var(--border-subtle)"}`,
          }}>
          All {counts ? `(${counts.total})` : ""}
        </button>
        {QUEUE_TABS.map((s) => (
          <button key={s} onClick={() => selectTab(s)}
            className="text-xs px-3 py-1.5 rounded-full"
            style={{
              background: tab === s ? "rgba(200,149,109,0.15)" : "var(--bg-surface)",
              color: tab === s ? ACCENT : "var(--text-secondary)",
              border: `1px solid ${tab === s ? ACCENT : "var(--border-subtle)"}`,
            }}>
            {STATUS_LABEL[s]} {counts ? `(${counts.counts[s] ?? 0})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--text-tertiary)" }} role="status">
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--text-tertiary)" }}>
          Nothing in this queue.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => {
            const expanded = open === a.id;
            const next = NEXT_ACTIONS[a.status] ?? [];
            return (
              <li key={a.id} className="rounded-xl overflow-hidden"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                <button
                  onClick={() => setOpen(expanded ? null : a.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-sm truncate" style={{ color: "var(--text-primary)" }}>
                      {a.headline || `Application #${a.id}`}
                    </span>
                    <span className="block text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {a.experience_years} yr · {a.specialties.join(", ") || "no specialities"} ·{" "}
                      {a.documents.length} doc{a.documents.length === 1 ? "" : "s"} ·{" "}
                      {a.mock_consultations.length} mock
                    </span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] px-2 py-1 rounded-full"
                      style={{
                        background: a.status === "verified" ? "rgba(200,149,109,0.15)"
                          : a.status === "rejected" || a.status === "suspended" ? "rgba(220,38,38,0.15)"
                          : "var(--border-subtle)",
                        color: a.status === "verified" ? ACCENT
                          : a.status === "rejected" || a.status === "suspended" ? "var(--danger)"
                          : "var(--text-secondary)",
                      }}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                    {expanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />}
                  </span>
                </button>

                {expanded && (
                  <div className="px-5 pb-5 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                    {a.bio && (
                      <p className="text-sm mt-4 mb-4" style={{ color: "var(--text-secondary)" }}>{a.bio}</p>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2 mt-4">
                      <div>
                        <h3 className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--text-tertiary)" }}>
                          Documents
                        </h3>
                        {a.documents.length === 0 ? (
                          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>None uploaded.</p>
                        ) : (
                          <ul className="space-y-2">
                            {a.documents.map((d) => (
                              <li key={d.id} className="text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span style={{ color: "var(--text-primary)" }}>
                                    {d.kind} · {d.identity_status}
                                  </span>
                                  {d.identity_status === "self_declared" && (
                                    <span className="flex gap-1.5">
                                      <button className="btn-ghost text-[10px]" disabled={busy}
                                        onClick={() => reviewDoc(d.id, "admin_verified")}>Accept</button>
                                      <button className="btn-ghost text-[10px]" disabled={busy}
                                        onClick={() => reviewDoc(d.id, "rejected")}>Reject</button>
                                    </span>
                                  )}
                                </div>
                                <a href={api.getDocumentContentUrl(d.id)} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1 mt-0.5"
                                  style={{ color: ACCENT }}>
                                  <FileText className="w-3 h-3" /> {d.original_filename}
                                </a>
                                {d.reviewer_note && (
                                  <p className="mt-0.5" style={{ color: "var(--text-tertiary)" }}>{d.reviewer_note}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--text-tertiary)" }}>
                          Recorded mock consultations
                        </h3>
                        {a.mock_consultations.length === 0 ? (
                          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            None recorded yet.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {a.mock_consultations.map((m) => (
                              <li key={m.id} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                <span className="flex items-center gap-1" style={{ color: m.verdict === "pass" ? ACCENT : m.verdict === "conditional" ? "#EAB308" : "var(--danger)" }}>
                                  <Video className="w-3 h-3" /> {m.verdict}
                                </span>
                                <span className="block mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                                  acc {m.scores.accuracy} · clar {m.scores.clarity} · emp{" "}
                                  {m.scores.empathy} · str {m.scores.structure}
                                </span>
                                {m.notes && <span className="block mt-0.5">{m.notes}</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <ReviewerActions application={a} onChanged={() => refresh(tab)} />

                    <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      <p className="text-xs mb-2" style={{ color: "var(--text-tertiary)" }}>
                        Move to:
                      </p>
                      {next.length === 0 ? (
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {a.status === "rejected"
                            ? "A rejected applicant starts over from draft."
                            : "No further action available."}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {next.map((s) => (
                            <button key={s} className="btn-secondary text-xs" disabled={busy}
                              onClick={() => setStatus(a.id, s)}>
                              {s === "rejected" ? "Reject" : STATUS_LABEL[s] ?? s}
                            </button>
                          ))}
                        </div>
                      )}
                      {busy && (
                        <Loader2 className="w-3.5 h-3.5 mt-2 animate-spin" style={{ color: ACCENT }} />
                      )}
                    </div>

                    <AuditTrail applicationId={a.id} summaryCount={a.events.length} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[11px] mt-8" style={{ color: "var(--text-tertiary)" }}>
        <Link href="/astrologer/apply" style={{ color: ACCENT }}>Applicant view</Link>{" "}
        — for comparison. Documents open in a new tab; send the token yourself if the
        browser blocks it.
      </p>
    </div>
  );
}
