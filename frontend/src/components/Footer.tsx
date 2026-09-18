"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-auto"
      style={{ background: "rgba(5, 5, 16, 0.9)" }}>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ background: "linear-gradient(135deg, var(--accent-deep), #6d28d9)" }}>
                &#x2728;
              </div>
              <h3 className="font-bold text-lg" style={{ color: "var(--gold)" }}>AstroSeva</h3>
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Free Vedic Astrology platform. Get accurate Kundli, matching, predictions, and more.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Quick Links</h4>
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
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>More Tools</h4>
            <ul className="space-y-2 text-sm">
              {[
                { href: "/numerology", label: "Numerology" },
                { href: "/panchang", label: "Panchang" },
                { href: "/ai", label: "AI Astrologer" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors duration-200"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-6 text-center text-xs"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
          <p>AstroSeva - Vedic Astrology Platform. For educational purposes only. &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
