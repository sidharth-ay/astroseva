"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Baby, Star, Sparkles, Target, Hash, Gem } from "lucide-react";

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
  destiny_number: number;
  is_master_number: boolean;
  traits: string[];
  compatibility: string;
  compatibility_note: string;
}

interface LifePath {
  life_path_number: number;
  is_master_number: boolean;
  reduction: string;
  traits: string[];
  lucky_color: string;
  lucky_gem: string;
  lucky_day: string;
  planet: string;
}

interface BabyNamesResult {
  gender: string;
  birth_date: string | null;
  life_path: LifePath | null;
  count: number;
  names: BabyName[];
}

const VERDICT_COLORS: Record<string, string> = {
  Excellent: "#5DC88F",
  Strong: "#C8956D",
  Good: "#E8B88A",
  Neutral: "var(--text-secondary)",
};

export default function BabyNamesPage() {
  const [gender, setGender] = useState<"boy" | "girl">("boy");
  const [birthDate, setBirthDate] = useState("");
  const [result, setResult] = useState<BabyNamesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

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
          Names ranked by numerological match with your child&apos;s Life Path
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
                Birth Date (optional)
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
          <p className="text-[11px] mt-3" style={{ color: "var(--text-secondary)" }}>
            Add a birth date to rank names by Destiny number against the
            child&apos;s Life Path number.
          </p>
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
          {result.life_path && (
            <motion.div
              variants={staggerItem}
              className="glass-card p-5"
            >
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Target size={15} style={{ color: "#C8956D" }} />
                Child&apos;s Life Path {result.life_path.life_path_number}
                {result.life_path.is_master_number && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(200,149,109,0.18)", color: "#C8956D" }}
                  >
                    Master number
                  </span>
                )}
              </h2>
              <p
                className="text-[11px] font-mono mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                {result.life_path.reduction}
              </p>
              <div
                className="flex flex-wrap gap-2 text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {result.life_path.planet && (
                  <span><Hash size={11} className="inline mr-1" />Ruling planet: {result.life_path.planet}</span>
                )}
                {result.life_path.lucky_color && (
                  <span>Lucky colour: {result.life_path.lucky_color}</span>
                )}
                {result.life_path.lucky_gem && (
                  <span><Gem size={11} className="inline mr-1" />{result.life_path.lucky_gem}</span>
                )}
                {result.life_path.lucky_day && (
                  <span>Lucky day: {result.life_path.lucky_day}</span>
                )}
              </div>
              {result.life_path.traits.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {result.life_path.traits.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(200,149,109,0.12)", color: "#E8B88A" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <motion.div
            variants={staggerItem}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {result.names.map((n) => (
              <motion.div
                key={n.name}
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
                    <h3 className="text-base font-bold">{n.name}</h3>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(200,149,109,0.14)",
                      color: VERDICT_COLORS[n.compatibility] ?? "#C8956D",
                    }}
                    title={n.compatibility_note}
                  >
                    {n.compatibility}
                  </span>
                </div>

                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                  {n.meaning}
                </p>

                <div
                  className="flex items-center justify-between mt-3 pt-3"
                  style={{ borderTop: "1px solid rgba(200,149,109,0.1)" }}
                >
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {n.origin}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: "#C8956D" }}>
                    <Star size={11} fill="#C8956D" />
                    <span className="font-bold">{n.destiny_number}</span>
                    <span
                      className="text-[10px] font-normal"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      destiny
                    </span>
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
