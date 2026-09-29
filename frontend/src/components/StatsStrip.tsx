"use client";

import { motion } from "motion/react";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
} from "@/lib/motion";
import { AnimatedNumber } from "@/components/motion-primitives/animated-number";

// These are properties of the product, not traffic figures.
//
// "500+ charts" and "50K+ happy users" were previously shown here with a
// count-up animation. They were invented, and a fabricated user count is a
// false-advertising exposure, so anything the code cannot substantiate is gone.
// A traffic counter on the homepage would only ever report the visitor's own
// session, which is not a user count.
const stats = [
  { value: 12, suffix: "", label: "Zodiac Signs" },
  { value: 27, suffix: "", label: "Nakshatras" },
  { value: 9, suffix: "", label: "Grahas" },
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
