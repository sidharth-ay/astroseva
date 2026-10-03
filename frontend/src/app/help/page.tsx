import type { Metadata } from "next";
import Link from "next/link";
import { Compass, LifeBuoy, MessageSquareWarning, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Help & Support | AstroSeva",
  description:
    "Answers to common AstroSeva questions, plus how to reach the team or report a problem.",
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Where do I see my Kundali?",
    a: "My Kundali generates from the birth details saved on your profile. Edit them under Profile or Settings and the chart is recalculated from the new details.",
  },
  {
    q: "I do not know my exact birth time. What should I do?",
    a: "Enter the closest time you have. The chart is still calculated, and you can refine the time later from your profile — each edit recalculates the chart.",
  },
  {
    q: "Why did my horoscope change after I updated my birth details?",
    a: "Every calculation reads the birth details on your profile, so correcting them corrects all of your charts. That is intended — one profile, one set of results.",
  },
  {
    q: "How do I change my email or phone number?",
    a: "Open Settings. Changing either one asks for your current password first, so nobody else can alter your account details.",
  },
  {
    q: "Is my birth data private?",
    a: "Your birth details are stored on your account and used to calculate your charts. See our Privacy Policy for the full detail on what we collect and why.",
  },
  {
    q: "A page is not loading or looks wrong. What should I do?",
    a: "Use Report a Problem below and include what you were doing and what you saw. It reaches the same team inbox.",
  },
];

/**
 * Help & Support. The FAQs here are only ones we can answer honestly from
 * behaviour the product actually has -- no invented turnaround times, no
 * support email we do not monitor. Destinations point at pages that exist.
 */
export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-16">
      <header className="mb-12">
        <p
          className="text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--accent-text)" }}
        >
          Support
        </p>
        <h1
          className="mt-3 font-display text-4xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Help &amp; Support
        </h1>
        <p className="mt-3 max-w-xl" style={{ color: "var(--text-secondary)" }}>
          The questions we are asked most, and where to reach a person when the answer
          is not here.
        </p>
      </header>

      <section aria-labelledby="faq-heading" className="mb-14">
        <h2
          id="faq-heading"
          className="mb-5 flex items-center gap-2 font-display text-2xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          <Compass size={20} aria-hidden="true" style={{ color: "var(--gold)" }} />
          Common questions
        </h2>
        <dl className="flex flex-col gap-3">
          {FAQS.map((item) => (
            <div
              key={item.q}
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
            >
              <dt className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {item.q}
              </dt>
              <dd className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="contact-heading">
        <h2
          id="contact-heading"
          className="mb-5 flex items-center gap-2 font-display text-2xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          <LifeBuoy size={20} aria-hidden="true" style={{ color: "var(--gold)" }} />
          Contact &amp; report
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/grievance"
            className="group rounded-xl border p-5 transition-colors hover:border-[var(--gold)]"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
          >
            <span className="flex items-center gap-2 font-semibold" style={{ color: "var(--text-primary)" }}>
              <MessageSquareWarning size={18} aria-hidden="true" style={{ color: "var(--accent-text)" }} />
              Report a Problem
            </span>
            <span className="mt-2 block text-sm" style={{ color: "var(--text-secondary)" }}>
              Something broken, wrong or missing? Send us the details and we will look
              into it.
            </span>
          </Link>
          <Link
            href="/privacy"
            className="group rounded-xl border p-5 transition-colors hover:border-[var(--gold)]"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
          >
            <span className="flex items-center gap-2 font-semibold" style={{ color: "var(--text-primary)" }}>
              <ShieldCheck size={18} aria-hidden="true" style={{ color: "var(--accent-text)" }} />
              Privacy Policy
            </span>
            <span className="mt-2 block text-sm" style={{ color: "var(--text-secondary)" }}>
              What we store about your account, and what we do with it.
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}