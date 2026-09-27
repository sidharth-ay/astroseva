"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { useReducedMotion, slideUp } from "@/lib/motion";

const sections = [
  {
    title: "1. Nature of Service",
    body: "AstroSeva provides Vedic astrology calculations, horoscopes, compatibility analysis, and AI-assisted interpretations for educational and entertainment purposes only. Nothing on this platform constitutes professional medical, legal, or financial advice.",
  },
  {
    title: "2. Eligibility",
    body: "You must be 18 years or older to use AstroSeva. By using the platform you confirm you meet this requirement.",
  },
  {
    title: "3. Accounts",
    body: "You are responsible for maintaining the confidentiality of your login credentials. Accounts are for personal, non-commercial use unless otherwise agreed.",
  },
  {
    title: "4. Acceptable Use",
    body: "You agree not to misuse the platform, attempt to disrupt its operation, scrape content at abusive rates, or misrepresent astrologers' guidance as guaranteed outcomes.",
  },
  {
    title: "5. No Guaranteed Outcomes",
    body: "Astrological guidance describes tendencies and timings, never certainties. No remedy, gemstone, or prediction on AstroSeva guarantees any specific life outcome.",
  },
  {
    title: "6. Intellectual Property",
    body: "All content, calculations, designs, and text on AstroSeva are owned by the platform or its licensors. You may share generated reports for personal use with attribution.",
  },
  {
    title: "7. Limitation of Liability",
    body: "To the maximum extent permitted by law, AstroSeva is not liable for decisions you make based on astrological content.",
  },
  {
    title: "8. Changes",
    body: "These terms may be updated periodically. Continued use of the platform constitutes acceptance of the current terms.",
  },
];

export default function TermsPage() {
  const reduced = useReducedMotion();
  useEffect(() => {
    document.title = "Terms of Service | AstroSeva";
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">LEGAL</p>
        <h1 className="heading-display font-bold" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          TERMS OF <span className="text-gradient-gold">SERVICE</span>
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
