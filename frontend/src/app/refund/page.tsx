"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { useReducedMotion, slideUp } from "@/lib/motion";

const sections = [
  {
    title: "1. Free Services",
    body: "All AstroSeva astrology tools are currently free. No charges are levied for kundli generation, matching, horoscopes, predictions, or reports, so no refunds arise at this time.",
  },
  {
    title: "2. Future Paid Services",
    body: "If paid consultations, premium reports, or shop orders are introduced, this policy will be updated before launch with eligibility windows, processing timelines, and escalation contacts.",
  },
  {
    title: "3. How to Raise a Concern",
    body: "For any billing concern in the future, write to info@astroseva.com with your account email and transaction reference.",
  },
];

export default function RefundPage() {
  const reduced = useReducedMotion();
  useEffect(() => {
    document.title = "Refund Policy | AstroSeva";
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">LEGAL</p>
        <h1 className="heading-display font-bold" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          REFUND <span className="text-gradient-gold">POLICY</span>
        </h1>
        <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>Last updated: 2026</p>
      </motion.div>
      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.title} className="glass-card p-5">
            <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{s.title}</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
