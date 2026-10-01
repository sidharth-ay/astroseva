"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, MapPin, User, Heart } from "lucide-react";
import CitySearch from "@/components/CitySearch";

import { api, type BirthData, type CityEntry, locationFromCity } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  slideInLeft,
  slideInRight,
  duration,
  ease,
  stagger,
} from "@/lib/motion";

interface LoveMatchResult {
  partner1: string;
  partner2: string;
  overall_score: number;
  romantic_compatibility: number;
  emotional_compatibility: number;
  intellectual_compatibility: number;
  physical_compatibility: number;
  recommendations: string;
}

const defaultForm = (name: string, date: string, time: string): BirthData => ({
  name,
  birth_date: date,
  birth_time: time,
  birth_place: "New Delhi",
  latitude: 28.6139,
  longitude: 77.209,
  timezone_offset: 5.5,
});

function FormFields({
  data,
  update,
  prefix,
}: {
  data: BirthData;
  update: (p: Partial<BirthData>) => void;
  prefix: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="input-label" htmlFor={`${prefix}-name`}>
          <User size={12} className="inline mr-1" />
          Name
        </label>
        <input
          id={`${prefix}-name`}
          className="input-field"
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="input-label" htmlFor={`${prefix}-date`}>
            <Calendar size={12} className="inline mr-1" />
            Date
          </label>
          <input
            id={`${prefix}-date`}
            type="date"
            className="input-field"
            value={data.birth_date}
            onChange={(e) => update({ birth_date: e.target.value })}
          />
        </div>
        <div>
          <label className="input-label" htmlFor={`${prefix}-time`}>
            <Clock size={12} className="inline mr-1" />
            Time
          </label>
          <input
            id={`${prefix}-time`}
            type="time"
            className="input-field"
            value={data.birth_time}
            onChange={(e) => update({ birth_time: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="input-label" htmlFor={`${prefix}-city`}>
          <MapPin size={12} className="inline mr-1" />
          City
        </label>
        <CitySearch
          value={data.birth_place}
          onChange={(c: CityEntry) =>
            update(locationFromCity(c))
          }
        />
      </div>
    </div>
  );
}

const compatibilityBars = [
  { key: "romantic_compatibility" as const, label: "Romantic", color: "#E8A0BF" },
  { key: "emotional_compatibility" as const, label: "Emotional", color: "#5DC88F" },
  { key: "intellectual_compatibility" as const, label: "Intellectual", color: "#87CEEB" },
  { key: "physical_compatibility" as const, label: "Physical", color: "#E8B88A" },
];

export default function LoveMatchPage() {
  const [partner1, setPartner1] = useState(defaultForm("Partner 1", "1990-01-01", "10:00"));
  const [partner2, setPartner2] = useState(defaultForm("Partner 2", "1992-05-15", "14:00"));
  const [result, setResult] = useState<LoveMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();
  const [displayScore, setDisplayScore] = useState(0);
  const animFrame = useRef<number>(0);

  useEffect(() => {
    document.title = "Love Match | AstroSeva";
  }, []);

  useEffect(() => {
    if (!result) {
      setDisplayScore(0);
      return;
    }
    const target = result.overall_score;
    const start = performance.now();
    const dur = 1200;
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * target));
      if (progress < 1) animFrame.current = requestAnimationFrame(step);
    };
    animFrame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame.current);
  }, [result]);

  const updateP1 = (patch: Partial<BirthData>) =>
    setPartner1((prev) => ({ ...prev, ...patch }));
  const updateP2 = (patch: Partial<BirthData>) =>
    setPartner2((prev) => ({ ...prev, ...patch }));

  const analyze = async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await api.getLoveMatch(partner1, partner2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to calculate love match.");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (pct: number) => {
    if (pct >= 75) return "var(--success)";
    if (pct >= 50) return "var(--champagne)";
    return "var(--danger)";
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="heading-display text-2xl md:text-3xl font-bold mb-1">
          <span className="text-gradient-gold">LOVE MATCH</span>
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Romantic compatibility analysis based on Vedic astrology
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <motion.div
          className="glass-card p-5"
          variants={slideInLeft}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "rgba(200, 149, 109, 0.1)",
                color: "#C8956D",
              }}
            >
              <Heart size={14} />
            </div>
            <h3 className="text-sm font-semibold">Partner 1</h3>
          </div>
          <FormFields data={partner1} update={updateP1} prefix="p1" />
        </motion.div>
        <motion.div
          className="glass-card p-5"
          variants={slideInRight}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "rgba(232, 184, 138, 0.08)",
                color: "#E8B88A",
              }}
            >
              <Heart size={14} />
            </div>
            <h3 className="text-sm font-semibold">Partner 2</h3>
          </div>
          <FormFields data={partner2} update={updateP2} prefix="p2" />
        </motion.div>
      </div>

      {error && (
        <p className="text-xs mb-4" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button className="btn-primary mb-8" onClick={analyze} disabled={loading}>
        {loading ? "Analyzing..." : "Check Compatibility"}
      </button>

      {result && (
        <motion.div
          variants={staggerContainerCustom(stagger.normal, 0.1)}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={staggerItem} className="glass-card p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Heart size={16} style={{ color: "#C8956D" }} />
              <h3
                className="text-sm font-semibold"
                style={{ color: "#C8956D" }}
              >
                Overall Love Score
              </h3>
            </div>
            <div
              className="text-5xl font-bold mb-1"
              style={{ color: "#C8956D" }}
            >
              {displayScore}
              <span
                className="text-lg font-normal"
                style={{ color: "var(--text-tertiary)" }}
              >
                %
              </span>
            </div>
            <p
              className="text-sm mb-1 font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {result.partner1} & {result.partner2}
            </p>
          </motion.div>

          <motion.div variants={staggerItem} className="glass-card p-5">
            <h3
              className="text-sm font-semibold mb-4"
              style={{ color: "#C8956D" }}
            >
              Compatibility Breakdown
            </h3>
            <div className="space-y-4">
              {compatibilityBars.map((bar) => {
                const val = result[bar.key];
                return (
                  <div key={bar.key}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span
                        className="text-xs font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {bar.label}
                      </span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: scoreColor(val) }}
                      >
                        {val}%
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--border)" }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${val}%` }}
                        transition={{
                          duration: duration.slow,
                          ease: ease.decelerate,
                        }}
                        style={{ background: bar.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {result.recommendations && (
            <motion.div variants={staggerItem} className="glass-card p-5">
              <h3
                className="text-sm font-semibold mb-3"
                style={{ color: "#C8956D" }}
              >
                Recommendations
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {result.recommendations}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
