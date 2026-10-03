"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Flame, Gem, Leaf, MoonStar, ScrollText } from "lucide-react";
import { api, getToken, type Mantra } from "@/lib/api";
import Reveal from "@/components/Reveal";

const TILES = [
  { href: "/mantra", label: "Mantra", descriptor: "Daily verses & chalisa", Icon: ScrollText },
  { href: "/remedies", label: "Puja", descriptor: "Structured remedies", Icon: Flame },
  { href: "/remedies", label: "Gemstone", descriptor: "Chart-based picks", Icon: Gem },
  { href: "/remedies", label: "Lifestyle", descriptor: "Habits & discipline", Icon: Leaf },
  { href: "/remedies", label: "Spiritual Practice", descriptor: "Sadhana guides", Icon: MoonStar },
];

/**
 * The homepage's light remedies band: today's mantra, served live, beside
 * five category doors. Every tile lands on a real route (/mantra for verses,
 * /remedies for the planner that covers the rest) -- none of them pretends
 * to be a remedy in itself.
 */
export default function RemediesPreview() {
  const [mantra, setMantra] = useState<Mantra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = false;
    try {
      ok = !!getToken();
    } catch {
      ok = false;
    }
    if (!ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .getDailyMantra()
      .then((res) => {
        if (!cancelled) {
          setMantra(res.mantra);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Remedies preview" className="relative">
      <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <Reveal>
          <p className="heading-section mb-3">Upaya</p>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
            <h2
              className="font-display"
              style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)", fontWeight: 600, color: "var(--text-primary)" }}
            >
              Personalised Remedies
            </h2>
            <Link
              href="/remedies"
              className="inline-flex items-center gap-1.5 text-sm font-semibold transition-transform duration-150 hover:translate-x-0.5"
              style={{ color: "var(--accent-text)" }}
            >
              Open remedy planner <ArrowRight size={14} />
            </Link>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
          <Reveal delay={90}>
            <div
              className="rounded-2xl p-7 h-full"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid var(--gold)" }}
            >
              <p className="text-[11px] font-semibold uppercase mb-3" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>
                Today&rsquo;s mantra
              </p>
              {loading ? (
                <div className="space-y-3">
                  <div className="shimmer rounded-lg h-7 w-2/3" />
                  <div className="shimmer rounded-lg h-5 w-full" />
                </div>
              ) : mantra ? (
                <div key={mantra.id} className="horo-enter">
                  <p className="font-display text-2xl mb-1" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {mantra.mantra_hindi}
                  </p>
                  <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                    {mantra.transliteration}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {mantra.deity} · {mantra.repetitions} repetitions · {mantra.best_time}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[15px] mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    Sign in to receive today&rsquo;s mantra with its meaning and count.
                  </p>
                  <Link href="/login" className="btn-gold-pill text-sm">
                    Sign in to reveal
                  </Link>
                </div>
              )}
            </div>
          </Reveal>
          <Reveal delay={160}>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {TILES.map(({ href, label, descriptor, Icon }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="group flex flex-col gap-2 rounded-2xl p-4 h-full transition-transform duration-100 active:scale-[0.98] hover:-translate-y-0.5"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    <Icon size={20} style={{ color: "var(--accent-text)" }} aria-hidden="true" />
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {label}
                    </span>
                    <span className="text-xs leading-snug" style={{ color: "var(--text-tertiary)" }}>
                      {descriptor}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
