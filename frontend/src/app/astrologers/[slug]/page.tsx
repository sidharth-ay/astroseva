"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CalendarClock,
  MessageCircle,
  ArrowLeft,
} from "lucide-react";

import { api, type AstrologerProfile } from "@/lib/api";

const ACCENT = "#C8956D";
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Minutes-from-midnight to a readable clock time. */
function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export default function AstrologerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [profile, setProfile] = useState<AstrologerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The slug is the only thing that changes, so a fetch callback keyed on it
  // covers a client-side navigation without a reset-on-effect pass.
  const load = useCallback(
    (signal: AbortSignal) => api.getAstrologer(slug, signal),
    [slug]
  );

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    load(controller.signal)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((e) => {
        if (cancelled || controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Could not load profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [load]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center text-sm" style={{ color: "var(--text-tertiary)" }} role="status">
        Loading profile…
      </div>
    );
  }

  if (error || !profile) {
    const missing = error?.toLowerCase().includes("not found");
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: ACCENT }} />
        <h1 className="font-display text-2xl mb-2" style={{ color: "var(--text-primary)" }}>
          {missing ? "Astrologer not found" : "Something went wrong"}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          {missing
            ? "This profile is either unavailable or no longer listed."
            : error}
        </p>
        <Link href="/astrologers" className="btn-secondary text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to directory
        </Link>
      </div>
    );
  }

  const a = profile.accuracy;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <Link
        href="/astrologers"
        className="inline-flex items-center gap-1.5 text-xs mb-6"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All astrologers
      </Link>

      <div
        className="rounded-2xl p-6 sm:p-8 mb-6"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="font-display text-3xl mb-1.5" style={{ color: "var(--text-primary)" }}>
              {profile.name ?? "AstroSeva Astrologer"}
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {profile.headline}
            </p>
            <div
              className="flex flex-wrap items-center gap-4 mt-3 text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {profile.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {profile.experience_years} years experience
              </span>
            </div>
          </div>

          <div className="text-right">
            <div
              className="inline-flex items-center gap-1.5 text-2xl mb-1"
              style={{ color: ACCENT }}
            >
              <Star className="w-5 h-5" />
              {a.score.toFixed(1)}
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                / 10
              </span>
            </div>
            {profile.is_on_probation ? (
              <span
                className="text-[10px] px-2 py-1 rounded-full"
                style={{ background: "rgba(234,179,8,0.15)", color: "#EAB308" }}
              >
                On probation{profile.probation_until ? ` until ${profile.probation_until}` : ""}
              </span>
            ) : (
              <span
                className="text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1"
                style={{ background: "rgba(200,149,109,0.15)", color: ACCENT }}
              >
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
            {profile.bio}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-6">
          {profile.specialties.map((s) => (
            <span
              key={s}
              className="text-[11px] px-2.5 py-1 rounded"
              style={{ background: "var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              {s}
            </span>
          ))}
        </div>

        {/* This button used to read "Consult now" and link to /chat, which is
            the general AI assistant and knows nothing about this practitioner
            -- so a visitor who clicked it expecting this astrologer was misled.
            The label now says what actually happens. */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/chat" className="btn-secondary text-sm">
            <MessageCircle className="w-4 h-4" /> Try the AI assistant instead
          </Link>
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            One-to-one consultations with this practitioner are not available yet, and
            availability above is published for reference only.
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section
          className="rounded-xl p-5"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <ShieldCheck className="w-4 h-4" style={{ color: ACCENT }} /> Verification record
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt style={{ color: "var(--text-tertiary)" }}>Assessment pass rate</dt>
              <dd style={{ color: "var(--text-primary)" }}>
                {a.assessment_pass_rate == null
                  ? "—"
                  : `${(a.assessment_pass_rate * 100).toFixed(0)}%`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt style={{ color: "var(--text-tertiary)" }}>Assessments completed</dt>
              <dd style={{ color: "var(--text-primary)" }}>{a.total_assessments}</dd>
            </div>
            <div className="flex justify-between">
              <dt style={{ color: "var(--text-tertiary)" }}>Mock consultations reviewed</dt>
              <dd style={{ color: "var(--text-primary)" }}>{a.mock_consultations}</dd>
            </div>
            <div className="flex justify-between">
              <dt style={{ color: "var(--text-tertiary)" }}>Speaks</dt>
              <dd className="text-right" style={{ color: "var(--text-primary)" }}>
                {profile.languages.join(", ") || "—"}
              </dd>
            </div>
          </dl>
          <p className="text-[11px] mt-4 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            The accuracy score is computed from assessment and mock-consultation results. It
            is not a measure of prediction accuracy for any individual chart.
          </p>
        </section>

        <section
          className="rounded-xl p-5"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <CalendarClock className="w-4 h-4" style={{ color: ACCENT }} /> Availability
          </h2>
          {profile.availability.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              No availability published yet.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {profile.availability.map((w, i) => (
                <li
                  key={i}
                  className="flex justify-between"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span>{WEEKDAYS[w.weekday]}</span>
                  <span style={{ color: "var(--text-primary)" }}>
                    {hhmm(w.start_minute)} – {hhmm(w.end_minute)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] mt-4 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            Times are shown in the practitioner&apos;s own timezone. Booking is not yet
            available.
          </p>
        </section>
      </div>
    </div>
  );
}
