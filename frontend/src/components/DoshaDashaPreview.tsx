"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { api, getToken, type BirthData, type DoshaResponse } from "@/lib/api";
import { fetchLatestChart } from "@/lib/latest-chart";
import Reveal from "@/components/Reveal";

interface DoshaRow {
  name: string;
  present: boolean;
  detail: string;
}

/** Collapse a dosha response into four honest rows. Absence is shown as
 * clearly as presence: "Not present" is an answer, not an empty state. */
function toRows(d: DoshaResponse): DoshaRow[] {
  return [
    {
      name: "Mangal Dosha",
      present: d.manglik.is_manglik,
      detail: d.manglik.is_manglik
        ? d.manglik.severity || "Present"
        : "Not present",
    },
    {
      name: "Kaal Sarp Dosha",
      present: d.kaal_sarp.has_dosha,
      detail: d.kaal_sarp.has_dosha
        ? d.kaal_sarp.kaal_sarp_type || d.kaal_sarp.severity || "Present"
        : "Not present",
    },
    {
      name: "Pitra Dosha",
      present: d.pitru_dosha.has_dosha,
      detail: d.pitru_dosha.has_dosha ? "Present" : "Not present",
    },
    {
      name: "Shani (Sade Sati)",
      present: d.sade_sati.is_active,
      detail: d.sade_sati.is_active
        ? d.sade_sati.phase || "Active"
        : "Not active",
    },
  ];
}

/**
 * The homepage's light Dosha + Dasha split. Members with a saved chart get
 * their doshas detected from that chart's own birth details (the same
 * `detectDoshas` endpoint /doshas uses) and their dasha timeline from the
 * chart's stored dasha data -- no second computation. Guests, and members
 * with no saved chart yet, get the explanation and the way in.
 */
export default function DoshaDashaPreview() {
  const [rows, setRows] = useState<DoshaRow[] | null>(null);
  const [dasha, setDasha] = useState<{ maha: string; range: string; antar: string } | null>(null);
  const [source, setSource] = useState("");
  const [noChart, setNoChart] = useState(false);
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
    let usable = false;
    fetchLatestChart()
      .then((found) => {
        if (cancelled) return null;
        if (!found) return null;
        usable = true;
        const data = found.data;
        setSource(found.name);
        const current = data.dasha_info?.current_dasha;
        if (current) {
          setDasha({
            maha: current.mahadasha,
            range: `${current.mahadasha_start} – ${current.mahadasha_end}`,
            antar: current.antardasha ?? "",
          });
        }
        const birth: BirthData = {
          name: found.name,
          birth_date: data.birth_date,
          birth_time: data.birth_time,
          birth_place: data.birth_place,
          latitude: data.latitude,
          longitude: data.longitude,
          timezone_offset: data.timezone_offset,
        };
        return api.detectDoshas(birth);
      })
      .then((doshas) => {
        if (!cancelled && doshas) setRows(toRows(doshas));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          // A member with no usable chart lands here with rows still null,
          // which renders the honest prompt instead of skeletons.
          if (!usable) setNoChart(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authed]);

  const ready = authed && !loading && rows != null;

  return (
    <section aria-label="Dosha and dasha preview" className="relative">
      <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <Reveal>
          <p className="heading-section mb-3">Afflictions &amp; periods</p>
          <h2
            className="font-display mb-2"
            style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)", fontWeight: 600, color: "var(--text-primary)" }}
          >
            Dosha &amp; Dasha
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            {ready
              ? `Detected from “${source}” — your saved chart, not a generic reading.`
              : "What weighs on a chart, and which planetary period is running."}
          </p>
        </Reveal>

        {!authed && !loading ? (
          <Reveal delay={90}>
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <p className="font-display text-xl mb-2" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                Your doshas and dashas, read from your chart
              </p>
              <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                Save a birth chart once, and this panel reports its doshas and current period.
              </p>
              <Link href="/kundli" className="btn-gold-pill text-sm">
                Generate Your Kundli
              </Link>
            </div>
          </Reveal>
        ) : noChart ? (
          <Reveal delay={90}>
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <p className="font-display text-xl mb-2" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                Nothing to read yet
              </p>
              <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                Save your first birth chart and this panel will report its doshas and current period.
              </p>
              <Link href="/kundli" className="btn-gold-pill text-sm">
                Generate Your Kundli
              </Link>
            </div>
          </Reveal>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <Reveal delay={90}>
              <div
                className="rounded-2xl p-6"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  Dosha Analysis
                </p>
                {loading ? (
                  <div className="space-y-3">
                    <div className="shimmer rounded-lg h-12 w-full" />
                    <div className="shimmer rounded-lg h-12 w-full" />
                    <div className="shimmer rounded-lg h-12 w-full" />
                  </div>
                ) : rows ? (
                  <ul className="space-y-2.5">
                    {rows.map((r) => (
                      <li
                        key={r.name}
                        className="flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{
                          background: r.present
                            ? "rgba(198, 40, 40, 0.06)"
                            : "rgba(46, 125, 50, 0.07)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        {r.present ? (
                          <ShieldAlert size={18} style={{ color: "var(--danger)" }} aria-hidden="true" />
                        ) : (
                          <ShieldCheck size={18} style={{ color: "var(--success)" }} aria-hidden="true" />
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                            {r.name}
                          </span>
                          <span className="block text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {r.detail}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    The analysis could not be computed for this chart — open it
                    in the Kundli tool to read the full dosha report.
                  </p>
                )}
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div
                className="rounded-2xl p-6"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  Current Dasha
                </p>
                {loading ? (
                  <div className="space-y-3">
                    <div className="shimmer rounded-lg h-8 w-2/3" />
                    <div className="shimmer rounded-lg h-5 w-full" />
                  </div>
                ) : dasha ? (
                  <div>
                    <p className="font-display text-2xl mb-1" style={{ fontWeight: 600, color: "var(--accent-text)" }}>
                      {dasha.maha} Mahadasha
                    </p>
                    <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
                      {dasha.range}
                      {dasha.antar ? ` · Antar: ${dasha.antar}` : ""}
                    </p>
                    <div className="h-px mb-5" style={{ background: "var(--border-subtle)" }} aria-hidden="true" />
                    <Link
                      href="/kundli"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold transition-transform duration-150 hover:translate-x-0.5"
                      style={{ color: "var(--accent-text)" }}
                    >
                      Open full dasha timeline <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    This chart carries no period data — generate a fresh chart to see its dasha here.
                  </p>
                )}
              </div>
            </Reveal>
          </div>
        )}
      </div>
    </section>
  );
}
