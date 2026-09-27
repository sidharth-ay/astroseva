"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

interface CtaBannerProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonHref?: string;
}

export default function CtaBanner({
  title = "LET'S START YOUR JOURNEY",
  subtitle = "Discover the power of Vedic astrology. Get your free birth chart today.",
  buttonText = "Get Started",
  buttonHref = "/kundli",
}: CtaBannerProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      className="w-full"
      style={{
        background:
          "linear-gradient(135deg, rgba(200, 149, 109, 0.15) 0%, rgba(139, 107, 74, 0.1) 100%)",
        borderTop: "1px solid rgba(200, 149, 109, 0.2)",
        borderBottom: "1px solid rgba(200, 149, 109, 0.2)",
      }}
    >
      <motion.div
        className="mx-auto max-w-3xl py-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.6, ease: "easeOut" }
        }
      >
        <h2 className="font-display heading-display text-3xl uppercase tracking-wide text-white md:text-4xl lg:text-5xl">
          {title}
        </h2>

        <p className="text-secondary mx-auto mt-4 max-w-md text-lg">
          {subtitle}
        </p>

        <Link
          href={buttonHref}
          className="btn-primary mt-8 inline-block"
        >
          {buttonText}
        </Link>
      </motion.div>
    </section>
  );
}
