"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { useReducedMotion, slideUp } from "@/lib/motion";

const sections = [
  {
    title: "1. Data We Collect",
    body: "Account data (name, email, hashed password), birth details you enter for chart generation, saved charts, and basic usage logs. We never ask for government IDs, bank details, or biometric data.",
  },
  {
    title: "2. How We Use Data",
    body: "Your data is used to generate astrological calculations, maintain your saved charts, and improve the platform. Birth details may be sent to our AI provider solely to generate your requested reading.",
  },
  {
    title: "3. Data Storage",
    body: "Account and chart data is stored in our application database. Passwords are stored only as irreversible hashes. Session tokens expire automatically.",
  },
  {
    title: "4. Your Rights",
    body: "You may request access, correction, or deletion of your personal data at any time by writing to info@astroseva.com. Deleting your account removes your profile and saved charts.",
  },
  {
    title: "5. Data Retention",
    body: "Account data is retained while your account is active. Saved charts are kept until you delete them. Logs are rotated periodically.",
  },
  {
    title: "6. Children",
    body: "AstroSeva is for users aged 18 and above. We do not knowingly collect data from minors.",
  },
  {
    title: "7. Contact",
    body: "For privacy requests or grievances, contact info@astroseva.com. We aim to respond within 30 days.",
  },
];

export default function PrivacyPage() {
  const reduced = useReducedMotion();
  useEffect(() => {
    document.title = "Privacy Policy | AstroSeva";
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">LEGAL</p>
        <h1 className="heading-display font-bold" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          PRIVACY <span className="text-gradient-gold">POLICY</span>
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
