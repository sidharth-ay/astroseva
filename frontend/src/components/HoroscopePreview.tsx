"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api, getToken, type HoroscopeResponse } from "@/lib/api";
import { zodiacIcons } from "@/components/icons/ZodiacIcons";
import Reveal from "@/components/Reveal";

const SIGNS = [
  { id: "aries", name: "Aries", dates: "Mar 21 – Apr 19" },
  { id: "taurus", name: "Taurus", dates: "Apr 20 – May 20" },
  { id: "gemini", name: "Gemini", dates: "May 21 – Jun 20" },
  { id: "cancer", name: "Cancer", dates: "Jun 21 – Jul 22" },
  { id: "leo", name: "Leo", dates: "Jul 23 – Aug 22" },
  { id: "virgo", name: "Virgo", dates: "Aug 23 – Sep 22" },
  { id: "libra", name: "Libra", dates: "Sep 23 – Oct 22" },
  { id: "scorpio", name: "Scorpio", dates: "Oct 23 – Nov 21" },
  { id: "sagittarius", name: "Sagittarius", dates: "Nov 22 – Dec 21" },
  { id: "capricorn", name: "Capricorn", dates: "Dec 22 – Jan 19" },
  { id: "aquarius", name: "Aquarius", dates: "Jan 20 – Feb 18" },
  { id: "pisces", name: "Pisces", dates: "Feb 19 – Mar 20" },
];

function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} out of 5`} className="text-sm tracking-widest">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= value ? "var(--gold)" : "rgba(245, 241, 232, 0.22)" }}>
          {n <= value ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

/**
 * The homepage's dark horoscope band. Same endpoint and same response type as
 * the /horoscope page (`getDailyHoroscope`), with the same abort-and-supersede
 * discipline, so rapid sign-hopping can never show a stale sign's prediction.
 * What it shows is exactly what the API returns -- prediction, three ratings,
 * lucky number and colour -- and nothing the API does not provide.
 */
export default function HoroscopePreview() {
  const [sign, setSign] = useState("aries");
  const [result, setResult] = useState<HoroscopeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  // The homepage is public, but the forecast endpoint is authenticated -- and
  // any anonymous 401 triggers the global expired-session redirect. So the
  // band never fetches without a token: guests get the selector and an honest
  // sign-in prompt instead of a forced trip to /login.
  const [authed, setAuthed] = useState(false);

  const fetchFor = useCallback((zodiac: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;
    setLoading(true);
    setError("");
    setResult(null);
    api
      .getDailyHoroscope(zodiac, controller.signal)
      .then((data) => {
        if (seq === seqRef.current) setResult(data);
      })
      .catch((e: unknown) => {
        if (seq !== seqRef.current) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Could not load today's horoscope.");
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
    return () => controller.abort();
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
    // Fetching the forecast on mount and on sign change is exactly what
    // effects are for; the loading flag is set rather than derived so a slow
    // first paint still shows a skeleton instead of an empty panel. A
    // stale-token 401 still redirects via fetchAPI, which is correct for a
    // truly dead session -- the guard above only skips the never-authed case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const cleanup = fetchFor(sign);
    return cleanup;
  }, [sign, fetchFor, authed]);

  const active = SIGNS.find((s) => s.id === sign) ?? SIGNS[0];
  const Glyph = zodiacIcons[active.id];
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section
      aria-label="Daily horoscope preview"
      className="relative overflow-hidden"
      style={{ background: "var(--midnight)" }}
    >
      {/* scoped night sky: dots, a plum bloom, vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 20%, rgba(245,241,232,0.28), transparent)," +
            "radial-gradient(1px 1px at 32% 68%, rgba(245,241,232,0.16), transparent)," +
            "radial-gradient(1.5px 1.5px at 55% 14%, rgba(227,199,107,0.4), transparent)," +
            "radial-gradient(1px 1px at 74% 42%, rgba(245,241,232,0.2), transparent)," +
            "radial-gradient(1px 1px at 88% 76%, rgba(245,241,232,0.16), transparent)," +
            "radial-gradient(1px 1px at 8% 84%, rgba(227,199,107,0.3), transparent)",
          backgroundSize: "420px 320px",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: "radial-gradient(ellipse 55% 45% at 78% 18%, rgba(91,75,138,0.28) 0%, transparent 65%)" }}
      />

      <div className="relative max-w-6xl mx-auto px-5 py-16 md:py-20">
        <Reveal>
          <p className="heading-section mb-3" style={{ color: "var(--gold-bright)" }}>
            Daily horoscope
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
            <h2
              className="font-display"
              style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)", fontWeight: 600, color: "var(--on-dark)" }}
            >
              What today holds
            </h2>
            <p className="text-xs" style={{ color: "var(--on-dark-faint)" }}>
              {today}
            </p>
          </div>
        </Reveal>

        <Reveal delay={90}>
          <div
            role="tablist"
            aria-label="Choose your sign"
            className="flex gap-2 overflow-x-auto scrollbar-hide py-4 mb-6 -mx-5 px-5"
          >
            {SIGNS.map((s) => {
              const selected = s.id === sign;
              const Icon = zodiacIcons[s.id];
              return (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setSign(s.id)}
                  className="flex shrink-0 flex-col items-center gap-1.5 w-16 py-3 rounded-xl transition-all duration-200 active:scale-95"
                  style={{
                    border: selected ? "1px solid var(--gold)" : "1px solid transparent",
                    background: selected ? "rgba(201, 162, 39, 0.12)" : "transparent",
                    color: selected ? "var(--gold)" : "var(--on-dark-dim)",
                  }}
                >
                  {Icon ? <Icon size={22} /> : null}
                  <span className="text-[11px] font-medium">{s.name}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <div key={sign} className="horo-enter">
          {!authed && !loading && (
            <div className="rounded-2xl p-8 text-center" style={{ border: "1px solid var(--border-active)", background: "rgba(201, 162, 39, 0.06)" }}>
              <p className="font-display text-xl mb-2" style={{ fontWeight: 600, color: "var(--on-dark)" }}>
                Today&rsquo;s {active.name} reading is waiting
              </p>
              <p className="text-sm mb-5" style={{ color: "var(--on-dark-dim)" }}>
                Sign in to reveal the full prediction, ratings and lucky details.
              </p>
              <Link href="/login" className="btn-gold-pill text-sm">
                Sign in to reveal
              </Link>
            </div>
          )}
          {authed && loading && (
            <div className="grid md:grid-cols-[1fr_1.6fr] gap-8 items-start">
              <div className="shimmer rounded-2xl h-44" />
              <div className="space-y-3">
                <div className="shimmer rounded-lg h-5 w-2/3" />
                <div className="shimmer rounded-lg h-5 w-full" />
                <div className="shimmer rounded-lg h-5 w-5/6" />
              </div>
            </div>
          )}
          {authed && error && !loading && (
            <div className="rounded-2xl p-6 text-center" style={{ border: "1px solid var(--border-active)" }}>
              <p className="text-sm mb-4" style={{ color: "var(--on-dark-dim)" }}>
                {error}
              </p>
              <button type="button" onClick={() => fetchFor(sign)} className="btn-gold-pill text-sm">
                Try again
              </button>
            </div>
          )}
          {authed && result && !loading && (
            <div className="grid md:grid-cols-[1fr_1.6fr] gap-8 items-start">
              <div className="flex items-center gap-5">
                <span
                  className="flex shrink-0 items-center justify-center w-20 h-20 rounded-full"
                  style={{ border: "1.5px solid var(--gold)", background: "rgba(201, 162, 39, 0.1)", color: "var(--gold)" }}
                >
                  {Glyph ? <Glyph size={38} /> : null}
                </span>
                <span>
                  <span className="font-display block text-2xl" style={{ fontWeight: 600, color: "var(--on-dark)" }}>
                    {active.name}
                  </span>
                  <span className="text-xs" style={{ color: "var(--on-dark-faint)" }}>
                    {active.dates}
                  </span>
                </span>
              </div>
              <div>
                <p className="text-[15px] leading-relaxed mb-6" style={{ color: "var(--on-dark-dim)" }}>
                  {result.prediction}
                </p>
                <dl className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Love", value: result.love_rating },
                    { label: "Career", value: result.career_rating },
                    { label: "Health", value: result.health_rating },
                  ].map((r) => (
                    <div key={r.label}>
                      <dt className="text-[11px] font-semibold uppercase mb-1.5" style={{ color: "var(--on-dark-faint)", letterSpacing: "0.08em" }}>
                        {r.label}
                      </dt>
                      <dd>
                        <Stars value={r.value} />
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs" style={{ color: "var(--on-dark-dim)" }}>
                  <span>
                    Lucky number{" "}
                    <strong className="font-semibold" style={{ color: "var(--gold)" }}>
                      {result.lucky_numbers.join(", ")}
                    </strong>
                  </span>
                  <span>
                    Lucky colour{" "}
                    <strong className="font-semibold" style={{ color: "var(--gold)" }}>
                      {result.lucky_color}
                    </strong>
                  </span>
                  <Link
                    href="/horoscope"
                    className="inline-flex items-center gap-1.5 font-semibold transition-transform duration-150 hover:translate-x-0.5"
                    style={{ color: "var(--on-dark)" }}
                  >
                    Open full horoscope <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
