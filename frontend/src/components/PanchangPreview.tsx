"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, MoonStar, Sunrise, Sunset } from "lucide-react";
import { api, getToken, type PanchangResponse } from "@/lib/api";
import Reveal from "@/components/Reveal";

/**
 * The homepage's light Panchang band: today's tithi, nakshatra, yoga and
 * karana plus sunrise, sunset and the two kaal windows the API provides.
 * Same `getPanchang` endpoint and Delhi default as the /panchang page, which
 * is stated outright -- the band computes for New Delhi and says so, with a
 * link to set any other city. Guests get the structure and the way in, never
 * a fetch: the endpoint is authenticated and an anonymous call would bounce
 * the whole public homepage to /login.
 */
export default function PanchangPreview() {
  const [data, setData] = useState<PanchangResponse | null>(null);
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
      .getPanchang()
      .then((res) => {
        if (!cancelled) {
          setData(res);
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

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const rows =
    data != null
      ? [
          { label: "Tithi", value: data.tithi.tithi_name, sub: data.tithi.paksha },
          {
            label: "Nakshatra",
            value: data.nakshatra.nakshatra_name,
            sub: `Pada ${data.nakshatra.pada}`,
          },
          { label: "Yoga", value: data.yoga.yoga_name, sub: "" },
          { label: "Karana", value: data.karana.karana_name, sub: "" },
        ]
      : [];

  return (
    <section aria-label="Today's Panchang preview" className="relative">
      <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <Reveal>
          <p className="heading-section mb-3">Daily almanac</p>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
            <h2
              className="font-display"
              style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)", fontWeight: 600, color: "var(--text-primary)" }}
            >
              Today&rsquo;s Panchang
            </h2>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {today} · New Delhi —{" "}
              <Link href="/panchang" className="font-semibold" style={{ color: "var(--accent-text)" }}>
                set your city
              </Link>
            </p>
          </div>
        </Reveal>

        {!authed && !loading ? (
          <Reveal delay={90}>
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <p className="font-display text-xl mb-2" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                Today&rsquo;s tithi, nakshatra and timings are waiting
              </p>
              <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                Sign in to read the daily almanac computed for your sky.
              </p>
              <Link href="/login" className="btn-gold-pill text-sm">
                Sign in to reveal
              </Link>
            </div>
          </Reveal>
        ) : (
          <div className="grid lg:grid-cols-[1fr_1fr] gap-6 items-start">
            <Reveal delay={90}>
              <div
                className="rounded-2xl p-6"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                {loading ? (
                  <div className="space-y-3">
                    <div className="shimmer rounded-lg h-6 w-1/2" />
                    <div className="shimmer rounded-lg h-6 w-full" />
                    <div className="shimmer rounded-lg h-6 w-2/3" />
                  </div>
                ) : (
                  <dl className="divide-y divide-[var(--border)]">
                    {rows.map((r) => (
                      <div key={r.label} className="flex items-baseline justify-between gap-4 py-3">
                        <dt className="text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>
                          {r.label}
                        </dt>
                        <dd className="text-right">
                          <span className="block text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                            {r.value}
                          </span>
                          {r.sub && (
                            <span className="block text-xs" style={{ color: "var(--text-tertiary)" }}>
                              {r.sub}
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div
                className="rounded-2xl p-6"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  Sun &amp; timings
                </p>
                {loading ? (
                  <div className="shimmer rounded-lg h-16 w-full" />
                ) : data ? (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div className="flex items-center gap-3">
                        <Sunrise size={22} style={{ color: "var(--gold)" }} aria-hidden="true" />
                        <span>
                          <span className="block text-[11px] uppercase font-semibold" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>
                            Sunrise
                          </span>
                          <span className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {data.sunrise}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Sunset size={22} style={{ color: "var(--gold)" }} aria-hidden="true" />
                        <span>
                          <span className="block text-[11px] uppercase font-semibold" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>
                            Sunset
                          </span>
                          <span className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {data.sunset}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                      <p className="flex justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5">
                          <MoonStar size={13} style={{ color: "var(--accent-text)" }} aria-hidden="true" />
                          Rahu Kaal
                        </span>
                        <span style={{ color: "var(--text-primary)" }}>
                          {data.rahu_kaal.start} – {data.rahu_kaal.end}
                        </span>
                      </p>
                      <p className="flex justify-between gap-3">
                        <span>Gulika Kaal</span>
                        <span style={{ color: "var(--text-primary)" }}>
                          {data.gulika_kaal.start} – {data.gulika_kaal.end}
                        </span>
                      </p>
                    </div>
                    <Link
                      href="/panchang"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold mt-5 transition-transform duration-150 hover:translate-x-0.5"
                      style={{ color: "var(--accent-text)" }}
                    >
                      Open full Panchang <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    The almanac could not be loaded.{" "}
                    <Link href="/panchang" className="font-semibold" style={{ color: "var(--accent-text)" }}>
                      Try the full page
                    </Link>
                    .
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
