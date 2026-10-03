"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { api, getToken } from "@/lib/api";
import Reveal from "@/components/Reveal";

/**
 * The homepage's dark AI band. The conversation lives on /ai -- this band
 * does not fake one. What it shows is real: the suggestion chips come from
 * the same `chatSuggestions` endpoint the assistant offers, and both the
 * chips and the input-styled bar navigate to /ai. The bar is a link styled
 * as an input (the standard "tap to search" pattern), never a text field
 * that would swallow what you type.
 */
export default function AIPreview() {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let ok = false;
    try {
      ok = !!getToken();
    } catch {
      ok = false;
    }
    if (!ok) return;
    let cancelled = false;
    api
      .chatSuggestions()
      .then((res) => {
        if (!cancelled && Array.isArray(res.suggestions)) {
          setSuggestions(res.suggestions.slice(0, 4));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      aria-label="AI astrology assistant preview"
      className="relative overflow-hidden"
      style={{ background: "var(--midnight)" }}
    >
      {/* scoped night sky */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 15% 22%, rgba(245,241,232,0.3), transparent)," +
            "radial-gradient(1px 1px at 35% 70%, rgba(245,241,232,0.16), transparent)," +
            "radial-gradient(1.5px 1.5px at 60% 16%, rgba(227,199,107,0.42), transparent)," +
            "radial-gradient(1px 1px at 80% 55%, rgba(245,241,232,0.2), transparent)," +
            "radial-gradient(1px 1px at 92% 82%, rgba(245,241,232,0.15), transparent)",
          backgroundSize: "440px 330px",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: "radial-gradient(ellipse 50% 42% at 82% 30%, rgba(91,75,138,0.3) 0%, transparent 65%)" }}
      />

      <div className="relative max-w-6xl mx-auto px-5 py-16 md:py-20 grid lg:grid-cols-2 gap-10 items-center">
        <Reveal>
          <p className="heading-section mb-3" style={{ color: "var(--gold-bright)" }}>
            AI astrologer
          </p>
          <h2
            className="font-display mb-4"
            style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)", fontWeight: 600, color: "var(--on-dark)" }}
          >
            AI Astrology Assistant
          </h2>
          <p className="text-sm mb-7 max-w-md" style={{ color: "var(--on-dark-dim)", lineHeight: 1.7 }}>
            Ask about career, love, doshas or timing -- answered from your
            chart, with the planetary reasoning shown.
          </p>
          <Link href="/ai" className="btn-gold-pill text-sm inline-flex items-center gap-2">
            Ask the AI Astrologer <ArrowRight size={15} />
          </Link>
        </Reveal>

        <Reveal delay={110}>
          <div
            className="rounded-2xl p-5 md:p-6"
            style={{ background: "rgba(245, 241, 232, 0.04)", border: "1px solid rgba(201, 162, 39, 0.25)" }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <span
                className="flex items-center justify-center w-9 h-9 rounded-full"
                style={{ background: "rgba(201, 162, 39, 0.15)", color: "var(--gold)" }}
              >
                <Sparkles size={17} />
              </span>
              <p className="text-sm font-semibold" style={{ color: "var(--on-dark)" }}>
                Start with a question
              </p>
            </div>
            {suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-5">
                {suggestions.map((q) => (
                  <Link
                    key={q}
                    href="/ai"
                    className="text-[13px] px-3.5 py-2 rounded-full transition-colors hover:border-[var(--gold)]"
                    style={{ border: "1px solid rgba(245, 241, 232, 0.2)", color: "var(--on-dark-dim)" }}
                  >
                    {q}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-5" aria-hidden="true">
                {["Career", "Love", "Doshas", "Timing"].map((t) => (
                  <Link
                    key={t}
                    href="/ai"
                    className="text-[13px] px-3.5 py-2 rounded-full transition-colors hover:border-[var(--gold)]"
                    style={{ border: "1px solid rgba(245, 241, 232, 0.2)", color: "var(--on-dark-dim)" }}
                  >
                    {t}
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/ai"
              className="flex items-center gap-3 rounded-full pl-5 pr-2 py-2 transition-colors hover:border-[var(--gold)]"
              style={{ border: "1px solid rgba(245, 241, 232, 0.2)" }}
              aria-label="Open the AI astrologer"
            >
              <span className="flex-1 text-sm truncate" style={{ color: "var(--on-dark-faint)" }}>
                Ask about career, love, doshas…
              </span>
              <span
                className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                style={{ background: "var(--gold)", color: "var(--midnight)" }}
              >
                <ArrowRight size={16} />
              </span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
