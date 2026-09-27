"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Baby, Star, Sparkles } from "lucide-react";

import { api } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  stagger,
} from "@/lib/motion";

interface BabyName {
  name: string;
  meaning: string;
  origin: string;
  lucky_number: number;
}

interface BabyNamesResult {
  gender: string;
  names: BabyName[];
  lucky_numbers: number[];
  lucky_letters: string[];
}

export default function BabyNamesPage() {
  const [gender, setGender] = useState<"boy" | "girl">("boy");
  const [birthDate, setBirthDate] = useState("");
  const [result, setResult] = useState<BabyNamesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Baby Names | AstroSeva";
  }, []);

  const fetchNames = async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await api.getBabyNames(gender, birthDate || ""));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to fetch baby names."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="heading-display text-2xl md:text-3xl font-bold mb-1">
          <span className="text-gradient-gold">BABY NAMES</span>
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Meaningful Indian baby names with numerology insights
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainerCustom(stagger.normal, 0.1)}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="glass-card p-6 mb-10" variants={slideUp}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="input-label mb-2 block">Gender</label>
              <div className="flex gap-2">
                {(["boy", "girl"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200"
                    style={{
                      background:
                        gender === g
                          ? "linear-gradient(135deg, #C8956D, #B8854D)"
                          : "var(--bg-surface)",
                      color: gender === g ? "#060610" : "var(--text-secondary)",
                      border:
                        gender === g
                          ? "1px solid #C8956D"
                          : "1px solid var(--border-subtle)",
                    }}
                  >
                    {g === "boy" ? "Boy" : "Girl"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="input-label" htmlFor="baby-birthdate">
                <Sparkles size={12} className="inline mr-1" />
                Birth Date (Optional)
              </label>
              <input
                id="baby-birthdate"
                type="date"
                className="input-field"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                className="btn-primary w-full"
                onClick={fetchNames}
                disabled={loading}
              >
                {loading ? "Suggesting..." : "Suggest Names"}
              </button>
            </div>
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
                <div className="shimmer h-20 w-full rounded-lg" />
              </div>
            ))}
        </div>
      )}

      {result && !loading && (
        <motion.div
          variants={staggerContainerCustom(stagger.normal, 0.06)}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={staggerItem} className="flex flex-wrap gap-3 justify-center">
            <span
              className="px-4 py-2 rounded-lg text-xs"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              Lucky Numbers:{" "}
              <span className="font-semibold" style={{ color: "#E8B88A" }}>
                {result.lucky_numbers.join(", ")}
              </span>
            </span>
            <span
              className="px-4 py-2 rounded-lg text-xs"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              Lucky Letters:{" "}
              <span className="font-semibold" style={{ color: "#E8B88A" }}>
                {result.lucky_letters.join(", ")}
              </span>
            </span>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={staggerContainerCustom(stagger.fast, 0.04)}
            initial="hidden"
            animate="visible"
          >
            {result.names.map((n, i) => (
              <motion.div
                key={`${n.name}-${i}`}
                variants={staggerItem}
                whileHover={
                  reduced
                    ? undefined
                    : { scale: 1.02, transition: { duration: 0.15 } }
                }
                className="glass-card p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(200, 149, 109, 0.1)",
                        border: "1px solid rgba(200, 149, 109, 0.2)",
                      }}
                    >
                      <Baby size={14} style={{ color: "#C8956D" }} />
                    </div>
                    <h3
                      className="text-base font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {n.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star
                      size={12}
                      fill="#C8956D"
                      style={{ color: "#C8956D" }}
                    />
                    <span
                      className="text-xs font-bold"
                      style={{ color: "#C8956D" }}
                    >
                      {n.lucky_number}
                    </span>
                  </div>
                </div>
                <p
                  className="text-sm mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {n.meaning}
                </p>
                <span
                  className="text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {n.origin}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
