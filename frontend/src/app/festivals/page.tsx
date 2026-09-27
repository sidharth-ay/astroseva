"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, Tag } from "lucide-react";

import { api } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  stagger,
} from "@/lib/motion";

interface Festival {
  name: string;
  date: string;
  description: string;
  type: string;
}

interface FestivalsResult {
  month: number;
  year: number;
  festivals: Festival[];
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const typeColors: Record<string, string> = {
  religious: "#C8956D",
  celebration: "#E8B88A",
  harvest: "#5DC88F",
  seasonal: "#87CEEB",
  new_year: "#FFD700",
  auspicious: "#DDA0DD",
};

export default function FestivalsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [result, setResult] = useState<FestivalsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Festivals | AstroSeva";
  }, []);

  const fetchFestivals = async (m: number) => {
    setMonth(m);
    setLoading(true);
    setError("");
    try {
      setResult(await api.getFestivals(m, year));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to fetch festivals."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFestivals(month);
  }, []);

  const badgeColor = (type: string) => typeColors[type] || "#C8956D";

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="heading-display text-2xl md:text-3xl font-bold mb-1">
          <span className="text-gradient-gold">FESTIVALS</span>
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Hindu festival calendar with dates and significance
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainerCustom(stagger.normal, 0.1)}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="glass-card p-5 mb-8" variants={slideUp}>
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {year}
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
            {months.map((name, i) => {
              const m = i + 1;
              const isActive = month === m;
              return (
                <button
                  key={m}
                  onClick={() => fetchFestivals(m)}
                  className="py-2 px-1 rounded-lg text-[10px] md:text-xs font-medium transition-all duration-200"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #C8956D, #B8854D)"
                      : "var(--bg-surface)",
                    color: isActive ? "#060610" : "var(--text-secondary)",
                    border: isActive
                      ? "1px solid #C8956D"
                      : "1px solid var(--border-subtle)",
                  }}
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>

      {error && (
        <p className="text-xs mb-4" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {loading && (
        <div className="space-y-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="glass-card p-6">
                <div className="shimmer h-24 w-full rounded-lg" />
              </div>
            ))}
        </div>
      )}

      {result && !loading && (
        <motion.div
          variants={staggerContainerCustom(stagger.normal, 0.08)}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {result.festivals.length === 0 ? (
            <motion.div variants={staggerItem} className="glass-card p-10 text-center">
              <Calendar
                size={32}
                className="mx-auto mb-3"
                style={{ color: "var(--text-tertiary)" }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                No festivals found for {months[month - 1]} {year}.
              </p>
            </motion.div>
          ) : (
            result.festivals.map((festival, i) => (
              <motion.div
                key={`${festival.name}-${i}`}
                variants={staggerItem}
                whileHover={
                  reduced
                    ? undefined
                    : { scale: 1.01, transition: { duration: 0.15 } }
                }
                className="glass-card p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(200, 149, 109, 0.1)",
                      border: "1px solid rgba(200, 149, 109, 0.2)",
                    }}
                  >
                    <Calendar size={16} style={{ color: "#C8956D" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3
                        className="text-sm font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {festival.name}
                      </h3>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                        style={{
                          background: `${badgeColor(festival.type)}18`,
                          color: badgeColor(festival.type),
                          border: `1px solid ${badgeColor(festival.type)}30`,
                        }}
                      >
                        <Tag size={8} />
                        {festival.type.replace("_", " ")}
                      </span>
                    </div>
                    <p
                      className="text-xs mb-2"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {festival.date}
                    </p>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {festival.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}
