import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";

/**
 * The closing dark band: headline, two ways forward, nothing else. It
 * carries no statistics of its own -- the honest numbers already appear on
 * the page, and repeating invented ones here is exactly what the reference
 * must not talk us into.
 */
export default function FinalCTA() {
  return (
    <section
      aria-label="Get started"
      className="relative overflow-hidden"
      style={{ background: "var(--midnight)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 18% 24%, rgba(245,241,232,0.3), transparent)," +
            "radial-gradient(1px 1px at 42% 70%, rgba(245,241,232,0.16), transparent)," +
            "radial-gradient(1.5px 1.5px at 66% 20%, rgba(227,199,107,0.42), transparent)," +
            "radial-gradient(1px 1px at 84% 60%, rgba(245,241,232,0.2), transparent)",
          backgroundSize: "440px 330px",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: "radial-gradient(ellipse 60% 60% at 50% 110%, rgba(201,162,39,0.14) 0%, transparent 65%)" }}
      />
      <div className="relative max-w-3xl mx-auto px-5 py-20 md:py-24 text-center">
        <Reveal>
          <p className="heading-section mb-3" style={{ color: "var(--gold-bright)" }}>
            Begin tonight
          </p>
          <h2
            className="font-display mb-4"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)", fontWeight: 600, lineHeight: 1.1, color: "var(--on-dark)" }}
          >
            Discover What the Stars Have in Store
          </h2>
          <p className="text-sm mb-8 max-w-xl mx-auto" style={{ color: "var(--on-dark-dim)", lineHeight: 1.7 }}>
            Your chart takes a minute to generate and is free to keep -- start
            with tonight&rsquo;s sky and go from there.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/kundli" className="btn-gold-pill text-sm inline-flex items-center gap-2">
              Generate Your Kundli <ArrowRight size={15} />
            </Link>
            <Link href="/services" className="btn-outline-light text-sm">
              Explore All Features
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
