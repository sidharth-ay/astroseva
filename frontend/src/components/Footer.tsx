"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto">
      <div className="footer-gradient-border" />
      <div style={{ background: "rgba(11, 11, 25, 0.95)" }}>
        <div className="max-w-6xl mx-auto px-5 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, var(--accent-deep), var(--accent))" }}
                >
                  <Sparkles size={14} color="var(--ivory)" />
                </div>
                <h3 className="font-bold text-lg font-display text-gradient-gold">AstroSeva</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Free Vedic Astrology platform. Accurate Kundli, matching, predictions, and more.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm" style={{ color: "var(--text-primary)" }}>Tools</h4>
              <ul className="space-y-2 text-sm">
                {[
                  { href: "/kundli", label: "Kundli Generator" },
                  { href: "/matching", label: "Marriage Matching" },
                  { href: "/horoscope", label: "Daily Horoscope" },
                  { href: "/predictions", label: "AI Predictions" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors duration-200"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--champagne)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm" style={{ color: "var(--text-primary)" }}>More</h4>
              <ul className="space-y-2 text-sm">
                {[
                  { href: "/numerology", label: "Numerology" },
                  { href: "/panchang", label: "Panchang" },
                  { href: "/chat", label: "AI Astrologer" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors duration-200"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--champagne)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 text-center text-xs"
            style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}>
            <p>AstroSeva &mdash; Vedic Astrology Platform. For educational purposes only. &copy; {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
