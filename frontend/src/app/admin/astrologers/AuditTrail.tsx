"use client";

/**
 * Audit trail, loaded on demand from GET /{id}/audit.
 *
 * The queue list already embeds a short event list, but the dedicated endpoint
 * also returns `payload` and `actor_user_id` for every event, which is what
 * makes an override or a status change reviewable after the fact. Fetching it
 * only when the reviewer opens it keeps the queue payload small.
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { api, type OnboardingEvent } from "@/lib/api";

export default function AuditTrail({
  applicationId,
  summaryCount,
}: {
  applicationId: number;
  summaryCount: number;
}) {
  const [events, setEvents] = useState<OnboardingEvent[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || events !== null) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAuditTrail(applicationId);
      setEvents(data.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the audit trail.");
    } finally {
      setLoading(false);
    }
  };

  const rows = events ?? [];

  return (
    <div className="mt-4">
      <button
        onClick={toggle}
        className="text-xs cursor-pointer"
        style={{ color: "var(--text-tertiary)" }}
        aria-expanded={open}
      >
        {open ? "Hide" : "Show"} audit trail ({summaryCount})
      </button>

      {open && (
        <div className="mt-2">
          {loading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#C8956D" }} />
          )}
          {error && (
            <p className="text-[11px]" style={{ color: "var(--danger)" }} role="alert">
              {error}
            </p>
          )}
          {!loading && !error && rows.length === 0 && (
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              No events recorded.
            </p>
          )}
          <ul className="space-y-1.5">
            {rows.map((e) => (
              <li key={e.id} className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                <span className="tabular-nums">{e.created_at.slice(0, 16).replace("T", " ")}</span>{" "}
                — {e.event_type.replace(/_/g, " ")}
                {e.from_status && e.to_status && e.from_status !== e.to_status && (
                  <span> ({e.from_status} → {e.to_status})</span>
                )}
                {e.actor_user_id != null && <span> · by user {e.actor_user_id}</span>}
                {e.payload && Object.keys(e.payload).length > 0 && (
                  <span className="block ml-2 opacity-80">
                    {Object.entries(e.payload)
                      .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
                      .join(" ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
