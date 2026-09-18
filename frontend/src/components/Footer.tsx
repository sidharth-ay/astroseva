"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto">
      <div className="footer-gradient-border" />
      <div style={{ background: "rgba(10, 10, 26, 0.9)" }}>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: "linear-gradient(135deg, var(--accent-deep), var(--accent))" }}>
                  &#x2728;
                </div>
                <h3 className="font-bold text-lg text-gradient-gold">AstroSeva</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Free Vedic Astrology platform. Get accurate Kundli, matching, predictions, and more.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Quick Links</h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { href: "/kundli", label: "Kundli Generator" },
                  { href: "/matching", label: "Marriage Matching" },
                  { href: "/horoscope", label: "Daily Horoscope" },
                  { href: "/predictions", label: "AI Predictions" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-all duration-200 hover:translate-x-1 inline-block"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>More Tools</h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { href: "/numerology", label: "Numerology" },
                  { href: "/panchang", label: "Panchang" },
                  { href: "/ai", label: "AI Astrologer" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-all duration-200 hover:translate-x-1 inline-block"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 text-center text-xs"
            style={{ borderTop: "1px solid rgba(139, 126, 200, 0.08)", color: "var(--text-secondary)" }}>
            <p>AstroSeva &mdash; Vedic Astrology Platform. For educational purposes only. &copy; {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
