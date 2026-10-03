"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, CalendarDays, Leaf, Phone, ShieldAlert, Sparkles, Sun } from "lucide-react";

const ITEMS = [
  { href: "/kundli", label: "Kundli", descriptor: "Generate & analyse", Icon: Sparkles },
  { href: "/horoscope", label: "Horoscope", descriptor: "Your daily guidance", Icon: Sun },
  { href: "/panchang", label: "Panchang", descriptor: "Tithi & timings today", Icon: CalendarDays },
  { href: "/doshas", label: "Dosha Check", descriptor: "Find and reduce doshas", Icon: ShieldAlert },
  { href: "/remedies", label: "Remedies", descriptor: "Personalised solutions", Icon: Leaf },
  { href: "/ai", label: "AI Astrology", descriptor: "Get instant answers", Icon: Brain },
  { href: "/astrologers", label: "Consultation", descriptor: "Talk to expert astrologers", Icon: Phone },
];

/**
 * The ivory band directly under the hero. Seven ways in, composed as one
 * horizontal index separated by hairlines -- not seven cards and not a menu
 * pasted under the hero. On narrow screens the same items stack as divided
 * rows, icon first, so the order and the rhythm survive the reflow.
 */
export default function QuickAccess() {
  // The item matching the current route carries a quiet emphasis: the ring
  // fills gold and the label holds the accent colour. Everything else only
  // reacts on hover, so the row never shouts.
  const pathname = usePathname();
  return (
    <section aria-label="Explore the World of Astrology" className="relative overflow-hidden">
      {/* faint drafting-compass arcs, barely there: the band is paper, not blank */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 300"
      >
        <g fill="none" stroke="#8A6A3A" strokeOpacity="0.07">
          <circle cx="1050" cy="150" r="40" />
          <circle cx="1050" cy="150" r="70" />
          <circle cx="1050" cy="150" r="100" />
          <circle cx="150" cy="150" r="40" />
          <circle cx="150" cy="150" r="70" />
          <circle cx="150" cy="150" r="100" />
          <circle cx="600" cy="150" r="130" strokeDasharray="2 8" />
        </g>
      </svg>
      <div className="relative max-w-6xl mx-auto px-5 pt-14 pb-4 md:pt-16 md:pb-6 text-center">
        <p className="heading-section mb-3">Begin here</p>
        <h2
          className="font-display mb-2"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2.1rem)", fontWeight: 600, color: "var(--text-primary)" }}
        >
          Explore the World of Astrology
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Choose a starting point — every tool reads your real chart.
        </p>
      </div>
      <div className="max-w-6xl mx-auto px-5 pb-14 md:pb-16">
        <nav
          aria-label="Astrology tools"
          className="flex flex-col lg:flex-row lg:items-stretch lg:justify-center divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)] border-y lg:border-y-0 border-[var(--border-subtle)]"
        >
          {ITEMS.map(({ href, label, descriptor, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="group flex lg:flex-col items-center gap-4 lg:gap-3 lg:text-center text-left lg:px-7 lg:first:pl-2 lg:last:pr-2 py-4 lg:py-2 rounded-xl transition-transform duration-100 active:scale-[0.98]"
              >
                <span
                  className="flex shrink-0 items-center justify-center w-14 h-14 rounded-full transition-all duration-200 group-hover:scale-105 group-hover:bg-[rgba(201,162,39,0.1)]"
                  style={{
                    border: "1.5px solid var(--gold)",
                    color: active ? "var(--gold)" : "var(--accent-text)",
                    background: active ? "rgba(201, 162, 39, 0.12)" : "var(--bg-card)",
                  }}
                >
                  <Icon size={24} />
                </span>
                <span className="flex flex-col lg:items-center gap-1">
                  <span
                    className="text-[15px] font-semibold transition-colors duration-200"
                    style={{ color: active ? "var(--accent-text)" : "var(--text-primary)" }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-xs leading-snug transition-colors duration-200 group-hover:text-[var(--text-secondary)]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {descriptor}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
