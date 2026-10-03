"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api, getToken, type KundliResponse } from "@/lib/api";
import { fetchLatestChart } from "@/lib/latest-chart";
import { LocalKeys, readLocal, writeLocal } from "@/lib/local";
import KundliChart from "@/components/KundliChart";
import Reveal from "@/components/Reveal";

interface Insights {
  lagna: string;
  rashi: string;
  nakshatra: string;
  dasha: string;
}

/**
 * Read the four headline facts out of a chart. Every field is guarded: a
 * chart saved by an older build can carry a thinner shape, and a summary that
 * throws on it would blank the whole band.
 */
function summarize(data: KundliResponse): Insights | null {
  const moon = data.planets.find((p) => p.planet === "Moon");
  const nakshatra = data.dasha_info?.birth_nakshatra?.name ?? "";
  const dasha = data.dasha_info?.current_dasha?.mahadasha ?? "";
  if (!data.asc_sign_name || !moon?.sign_name || !nakshatra || !dasha) return null;
  return { lagna: data.asc_sign_name, rashi: moon.sign_name, nakshatra, dasha };
}

/** An empty North-Indian diamond grid: a preview frame, never invented data. */
function EmptyChart() {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-auto" role="img" aria-label="Empty birth chart frame">
      <rect x="4" y="4" width="392" height="392" fill="none" stroke="var(--border)" strokeWidth="1.5" />
      <g stroke="var(--border)" strokeWidth="1">
        <line x1="4" y1="4" x2="396" y2="396" />
        <line x1="396" y1="4" x2="4" y2="396" />
        <line x1="200" y1="4" x2="4" y2="200" />
        <line x1="200" y1="4" x2="396" y2="200" />
        <line x1="200" y1="396" x2="4" y2="200" />
        <line x1="200" y1="396" x2="396" y2="200" />
      </g>
    </svg>
  );
}

const POINTS = [
  { title: "Your whole sky, computed", text: "Planetary positions, houses and strengths from real ephemeris data." },
  { title: "Dasha timelines included", text: "Mahadasha and antardasha periods with dates, not vague seasons." },
  { title: "Saved to your profile", text: "Keep charts for yourself and family, and revisit them any time." },
];

/**
 * The homepage's light Kundli band. Members see their own latest saved chart
 * (or the sample when they have none); guests see an empty preview frame and
 * the way in. The chart endpoints are authenticated, so -- exactly like the
 * horoscope band -- nothing fetches without a token, and a stale token still
 * redirects via fetchAPI, which is correct for a truly dead session.
 */
export default function KundliPreview() {
  const [chart, setChart] = useState<KundliResponse | null>(null);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [chartStyle, setChartStyle] = useState<"north" | "south">(() => {
    const stored = readLocal<string | null>(LocalKeys.chartStyle, null);
    return stored === "south" ? "south" : "north";
  });
  const [authed, setAuthed] = useState(false);

  const changeStyle = useCallback((style: "north" | "south") => {
    setChartStyle(style);
    writeLocal(LocalKeys.chartStyle, style);
  }, []);

  useEffect(() => {
    // The session is determined after mount, never during render: the server
    // and the first client render always agree (guest skeleton), and a member
    // upgrades to the live view one render later. Reading storage in a state
    // initializer instead would hydrate differently for members than the
    // server rendered, which breaks hydration.
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
    if (!authed) {
      return;
    }
    let cancelled = false;
    // Newest saved chart first; the sample only when there is nothing saved.
    fetchLatestChart()
      .then(async (found) => {
        if (cancelled) return;
        if (found) {
          setChart(found.data);
          setSource(found.name);
        } else {
          const sample = await api.getSampleKundli();
          if (cancelled) return;
          setChart(sample);
          setSource("Sample chart");
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authed]);

  const insights = chart ? summarize(chart) : null;

  return (
    <section aria-label="Kundli preview" className="relative">
      <div className="max-w-6xl mx-auto px-5 py-16 md:py-20 grid lg:grid-cols-[45fr_55fr] gap-12 lg:gap-14 items-center">
        <Reveal>
          <p className="heading-section mb-3">Birth chart</p>
          <h2
            className="font-display mb-4"
            style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)", fontWeight: 600, lineHeight: 1.15, color: "var(--text-primary)" }}
          >
            Generate Your Kundli
          </h2>
          <p className="text-sm mb-7 max-w-md" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Enter your birth details to create an accurate Vedic chart and read
            what it says -- positions, dashas and doshas, computed live.
          </p>
          <ul className="space-y-4 mb-8">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span
                  className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--gold)" }}
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    {p.title}
                  </span>
                  <span className="block text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                    {p.text}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/kundli" className="btn-gold-pill text-sm inline-flex items-center gap-2">
            Generate Your Kundli <ArrowRight size={15} />
          </Link>
        </Reveal>

        <Reveal delay={110}>
          <div
            className="rounded-2xl p-5 md:p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {chart ? `Your Birth Chart Preview${source ? ` — ${source}` : ""}` : "Your Birth Chart Preview"}
              </p>
              <div className="flex rounded-full p-0.5" style={{ border: "1px solid var(--border)" }} role="group" aria-label="Chart style">
                {(["north", "south"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeStyle(s)}
                    aria-pressed={chartStyle === s}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                    style={{
                      background: chartStyle === s ? "var(--gold)" : "transparent",
                      color: chartStyle === s ? "var(--midnight)" : "var(--text-secondary)",
                    }}
                  >
                    {s === "north" ? "North Indian" : "South Indian"}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="shimmer rounded-xl aspect-square w-full" aria-label="Loading chart" />
            ) : chart ? (
              <div key={`${chartStyle}-${source}`} className="horo-enter">
                <KundliChart
                  chart={chart.chart}
                  ascSign={chart.asc_sign}
                  chartStyle={chartStyle}
                  planets={chart.planets}
                />
              </div>
            ) : (
              <div>
                <EmptyChart />
                <p className="text-xs text-center mt-3" style={{ color: "var(--text-tertiary)" }}>
                  {authed
                    ? "Your chart will appear here."
                    : "Sign in and generate a chart to see your preview here."}
                </p>
              </div>
            )}

            {insights && (
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                {[
                  { label: "Rashi", value: insights.rashi },
                  { label: "Nakshatra", value: insights.nakshatra },
                  { label: "Lagna", value: insights.lagna },
                  { label: "Current Dasha", value: insights.dasha },
                ].map((k) => (
                  <div key={k.label}>
                    <dt className="text-[11px] font-semibold uppercase mb-1" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>
                      {k.label}
                    </dt>
                    <dd className="text-sm font-semibold" style={{ color: "var(--accent-text)" }}>
                      {k.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
