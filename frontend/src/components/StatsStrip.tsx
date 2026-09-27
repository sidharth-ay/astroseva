"use client";

import { motion } from "motion/react";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
} from "@/lib/motion";
import { AnimatedNumber } from "@/components/motion-primitives/animated-number";

const stats = [
  { value: 500, suffix: "+", label: "Charts Generated" },
  { value: 50, suffix: "K+", label: "Happy Users" },
  { value: 12, suffix: "", label: "Zodiac Signs" },
  { value: 100, suffix: "%", label: "Free Service" },
];

export default function StatsStrip() {
  const reduced = useReducedMotion();
  const container = staggerContainerCustom(0.12, 0.1);

  return (
    <section
      className="w-full"
      style={{ borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}
    >
      <motion.div
        className="max-w-5xl mx-auto py-16 px-5 grid grid-cols-2 md:grid-cols-4 gap-10 text-center"
        variants={reduced ? { hidden: { opacity: 1 }, visible: { opacity: 1 } } : container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={reduced ? { hidden: { opacity: 1 }, visible: { opacity: 1 } } : staggerItem}
            className="flex flex-col items-center gap-2"
          >
            <span
              className="text-5xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              <AnimatedNumber
                value={stat.value}
                className="inline"
                springOptions={{ stiffness: 80, damping: 20 }}
              />
              {stat.suffix}
            </span>
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-secondary)" }}
            >
              {stat.label}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
