import Link from "next/link";
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
  return (
    <section aria-label="Explore the World of Astrology" className="relative">
      <div className="max-w-6xl mx-auto px-5 pt-14 pb-4 md:pt-16 md:pb-6 text-center">
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
          {ITEMS.map(({ href, label, descriptor, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex lg:flex-col items-center gap-4 lg:gap-3 lg:text-center text-left lg:px-7 lg:first:pl-2 lg:last:pr-2 py-4 lg:py-2 rounded-xl transition-transform duration-100 active:scale-[0.98]"
            >
              <span
                className="flex shrink-0 items-center justify-center w-14 h-14 rounded-full transition-colors"
                style={{ border: "1.5px solid var(--gold)", color: "var(--accent-text)", background: "var(--bg-card)" }}
              >
                <Icon size={24} />
              </span>
              <span className="flex flex-col lg:items-center gap-1">
                <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {label}
                </span>
                <span className="text-xs leading-snug" style={{ color: "var(--text-tertiary)" }}>
                  {descriptor}
                </span>
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
