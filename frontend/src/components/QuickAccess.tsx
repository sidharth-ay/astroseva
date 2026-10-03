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
 * The ivory band directly under the hero: seven ways in, each an icon, a name
 * and one honest line about what it does. These are plain navigations, not
 * dashboard widgets, so there are no cards, no metrics and no buttons -- just
 * a legible row that reads as a contents page for the product.
 */
export default function QuickAccess() {
  return (
    <section aria-label="Explore the World of Astrology" className="relative">
      <div className="max-w-6xl mx-auto px-5 py-14 md:py-16 text-center">
        <p className="heading-section mb-3">Begin here</p>
        <h2
          className="font-display mb-2"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2.1rem)", fontWeight: 600, color: "var(--text-primary)" }}
        >
          Explore the World of Astrology
        </h2>
        <p className="text-sm mb-10" style={{ color: "var(--text-secondary)" }}>
          Choose a starting point — every tool reads your real chart.
        </p>
        <nav aria-label="Astrology tools" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-8">
          {ITEMS.map(({ href, label, descriptor, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col items-center gap-2.5 rounded-xl transition-transform duration-100 active:scale-95"
            >
              <span
                className="flex items-center justify-center w-12 h-12 rounded-full transition-colors"
                style={{ border: "1.5px solid var(--gold)", color: "var(--accent-text)", background: "var(--bg-card)" }}
              >
                <Icon size={20} />
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {label}
              </span>
              <span className="text-xs leading-snug" style={{ color: "var(--text-tertiary)" }}>
                {descriptor}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
