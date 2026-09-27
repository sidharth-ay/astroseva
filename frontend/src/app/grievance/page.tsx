"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { useReducedMotion, slideUp } from "@/lib/motion";

const steps = [
  {
    title: "Step 1 — Write to us",
    body: "Email info@astroseva.com with your account email, the page or feature involved, and a description of the issue. Attach screenshots if possible.",
  },
  {
    title: "Step 2 — Acknowledgement",
    body: "We acknowledge grievances within 3 working days with a reference number.",
  },
  {
    title: "Step 3 — Resolution",
    body: "Most issues are resolved within 15 working days. Account, data-deletion, and content concerns are prioritized.",
  },
  {
    title: "Step 4 — Escalation",
    body: "If you are unsatisfied with the resolution, reply on the same thread with your reference number for a senior review.",
  },
];

export default function GrievancePage() {
  const reduced = useReducedMotion();
  useEffect(() => {
    document.title = "Grievance Redressal | AstroSeva";
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">SUPPORT</p>
        <h1 className="heading-display font-bold" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          GRIEVANCE <span className="text-gradient-gold">REDRESSAL</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Grievance officer contact: <strong style={{ color: "var(--text-primary)" }}>info@astroseva.com</strong>
        </p>
      </motion.div>
      <div className="space-y-4">
        {steps.map((s) => (
          <div key={s.title} className="glass-card p-5">
            <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{s.title}</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
