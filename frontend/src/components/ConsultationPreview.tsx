"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Clock, ShieldCheck, Star } from "lucide-react";
import { api, getToken, type DirectoryEntry } from "@/lib/api";
import Reveal from "@/components/Reveal";

/**
 * The homepage's light consultation band: the first three directory entries,
 * rendered in the directory's own language (initial avatar, Verified badge,
 * experience, specialties, accuracy out of 10, profile link). What it does
 * NOT show is what the directory does not have: there are no photos, no
 * per-minute prices and no star ratings in the data, so none appear here --
 * an initial stands in for a portrait, and the accuracy figure is labelled
 * as exactly what it is.
 */
export default function ConsultationPreview() {
  const [rows, setRows] = useState<DirectoryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let ok = false;
    try {
      ok = !!getToken();
    } catch {
      ok = false;
    }
    if (ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthed(true);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    api
      .listAstrologers({ limit: 3 })
      .then((res) => {
        if (!cancelled) {
          setRows(res.astrologers.slice(0, 3));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authed]);

  return (
    <section aria-label="Consultation preview" className="relative">
      <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <Reveal>
          <p className="heading-section mb-3">Guidance</p>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
            <h2
              className="font-display"
              style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)", fontWeight: 600, color: "var(--text-primary)" }}
            >
              Consult with Expert Astrologers
            </h2>
            <Link
              href="/astrologers"
              className="inline-flex items-center gap-1.5 text-sm font-semibold transition-transform duration-150 hover:translate-x-0.5"
              style={{ color: "var(--accent-text)" }}
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
        </Reveal>

        {!authed && !loading ? (
          <Reveal delay={90}>
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <p className="font-display text-xl mb-2" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                Verified astrologers, one directory away
              </p>
              <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                Sign in to browse experience, specialties and accuracy scores.
              </p>
              <Link href="/login" className="btn-gold-pill text-sm">
                Sign in to browse
              </Link>
            </div>
          </Reveal>
        ) : loading || !rows ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => <div key={i} className="shimmer rounded-2xl h-52" />)}
          </div>
        ) : rows.length === 0 ? (
          <Reveal delay={90}>
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <p className="font-display text-xl mb-2" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                The directory is still opening
              </p>
              <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                Practitioners are listed as their applications are reviewed.{" "}
                <Link href="/astrologer/apply" className="font-semibold" style={{ color: "var(--accent-text)" }}>
                  Apply as an astrologer
                </Link>
                .
              </p>
              <Link href="/astrologers" className="btn-gold-pill text-sm">
                Visit the directory
              </Link>
            </div>
          </Reveal>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rows.map((a, i) => (
              <Reveal key={a.id} delay={90 + i * 80}>
                    <Link
                      href={`/astrologers/${a.slug}`}
                      className="rounded-2xl p-5 flex flex-col gap-3 h-full transition-transform duration-200 hover:-translate-y-1"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex shrink-0 items-center justify-center w-12 h-12 rounded-full font-display text-lg"
                          style={{ background: "rgba(201, 162, 39, 0.12)", color: "var(--accent-text)", fontWeight: 600 }}
                          aria-hidden="true"
                        >
                          {(a.name ?? "A").trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                            {a.name ?? "AstroSeva Astrologer"}
                          </span>
                          <span className="block text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                            {a.headline}
                          </span>
                        </span>
                        {a.is_on_probation ? (
                          <span
                            className="text-[10px] px-2 py-1 rounded-full shrink-0"
                            style={{ background: "rgba(234,179,8,0.15)", color: "#B8912A" }}
                          >
                            Probation
                          </span>
                        ) : (
                          <span
                            className="text-[10px] px-2 py-1 rounded-full shrink-0 inline-flex items-center gap-1"
                            style={{ background: "rgba(201,162,39,0.15)", color: "var(--accent-text)" }}
                          >
                            <ShieldCheck size={11} /> Verified
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        <Clock size={12} aria-hidden="true" /> {a.experience_years} yr experience
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        {a.specialties.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] px-2 py-0.5 rounded"
                            style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}
                          >
                            {s}
                          </span>
                        ))}
                      </span>
                      <span
                        className="mt-auto pt-3 flex items-center justify-between text-xs"
                        style={{ borderTop: "1px solid var(--border-subtle)" }}
                      >
                        <span className="inline-flex items-center gap-1" style={{ color: "var(--accent-text)" }}>
                          <Star size={13} aria-hidden="true" />
                          {a.accuracy_score.toFixed(1)}
                          <span style={{ color: "var(--text-tertiary)" }}>/ 10 accuracy</span>
                        </span>
                        <span style={{ color: "var(--text-tertiary)" }}>View profile →</span>
                      </span>
                    </Link>
                  </Reveal>
                ))}
          </div>
        )}
      </div>
    </section>
  );
}
