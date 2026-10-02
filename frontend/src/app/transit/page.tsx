"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/lib/api";
import { planetIcons, planetColors } from "@/components/icons/PlanetIcons";
import { zodiacSymbols, zodiacIcons } from "@/components/icons/ZodiacIcons";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  stagger} from "@/lib/motion";

interface TransitEntry {
  planet: string;
  current_sign: string;
  current_sign_index: number;
  sign_degree: number;
  retrograde: boolean;
  /** Sidereal degrees covered per day; negative when retrograde. */
  daily_motion: number;
  motion: "direct" | "retrograde" | "stationary";
}

interface TransitData {
  date: string;
  transits: TransitEntry[];
  current_signs: Record<string, string>;
}

const GOLD = "#C8956D";

const transitEffects: Record<string, string> = {
  Sun: "The Sun transit influences vitality, self-expression, and authority. It highlights the house it occupies in your birth chart, bringing focus to matters of confidence and leadership.",
  Moon: "Moon transits affect emotions, intuition, and daily moods. Fast-moving, it shifts signs every 2.5 days, creating short-lived emotional currents and heightened sensitivity.",
  Mars: "Mars transits drive energy, ambition, and assertiveness. They can bring courage and initiative but also impulsiveness and conflict depending on the sign and house placement.",
  Mercury: "Mercury governs communication, thinking, and travel. Its transits affect how we process information, negotiate, and connect with others intellectually.",
  Jupiter: "Jupiter transits bring expansion, optimism, and growth. They open doors to new opportunities, learning, and abundance in the areas of life they touch.",
  Venus: "Venus transits influence love, beauty, and finances. They create favorable conditions for romance, artistic expression, and material comfort.",
  Saturn: "Saturn transits bring discipline, structure, and lessons. They may feel restrictive but ultimately build resilience, maturity, and long-term foundations.",
  Rahu: "Rahu transits amplify desires and create obsessive focus on material pursuits. They bring unexpected changes and karmic lessons tied to worldly ambitions.",
  Ketu: "Ketu transits encourage detachment and spiritual growth. They can bring sudden liberation from past patterns but also confusion and loss of direction.",
};

const signNameToKey: Record<string, string> = {
  Aries: "aries",
  Taurus: "taurus",
  Gemini: "gemini",
  Cancer: "cancer",
  Leo: "leo",
  Virgo: "virgo",
  Libra: "libra",
  Scorpio: "scorpio",
  Sagittarius: "sagittarius",
  Capricorn: "capricorn",
  Aquarius: "aquarius",
  Pisces: "pisces",
};

/**
 * Describe a graha's daily motion.
 *
 * The previous version read a `speed` field that the backend never sent. The
 * endpoint reported `p.get("speed", 1.0)`, so every graha arrived at exactly
 * 1.0 and every card read "Normal". The threshold was also absolute-speed
 * based, so even a computed value would have called a retrograde graha fast.
 *
 * `daily_motion` is degrees of sidereal longitude per day and carries its sign,
 * so each graha is compared against its own typical rate.
 */
const MOTION_TYPICAL: Record<string, number> = {
  Sun: 1.0,
  Moon: 13.2,
  Mars: 0.5,
  Mercury: 1.2,
  Jupiter: 0.2,
  Venus: 1.2,
  Saturn: 0.1,
};

const motionLabel = (
  planet: string,
  motion: number
): { label: string; color: string } => {
  if (motion === 0) return { label: "Stationary", color: "var(--text-tertiary)" };
  const typical = MOTION_TYPICAL[planet];
  if (!typical) {
    return { label: `${motion > 0 ? "+" : ""}${motion.toFixed(2)}°/day`, color: GOLD };
  }
  if (motion < 0) {
    // Retrograde is its own state, not "slow": the graha is moving against
    // its direction, which is what the tradition reads it as.
    return { label: "Retrograde", color: "#E85D5D" };
  }
  const ratio = motion / typical;
  if (ratio > 1.15) return { label: "Fast", color: "#5DC88F" };
  if (ratio < 0.85) return { label: "Slow", color: "#E85D5D" };
  return { label: "Normal", color: GOLD };
};

export default function TransitPage() {
  const [data, setData] = useState<TransitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    document.title = "Transit Today | AstroSeva";
  }, []);

  const fetchTransit = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;

    setLoading(true);
    setError(null);

    api
      .getTransit(controller.signal)
      .then((res) => {
        if (seq !== seqRef.current) return;
        setData(res);
      })
      .catch((e: unknown) => {
        if (seq !== seqRef.current) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load transit data.");
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchTransit();
    return () => abortRef.current?.abort();
  }, [fetchTransit]);

  const handleRetry = () => fetchTransit();

  const retrogradeCount = data?.transits.filter((t) => t.retrograde).length ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* Header */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-8"
      >
        <h1 className="heading-display text-3xl md:text-4xl font-bold mb-2">
          <span className="text-gradient-gold">TRANSIT TODAY</span>
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Current planetary positions and their influence
        </p>
        {data && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <span
              className="text-xs px-3 py-1 rounded-full"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              {new Date(data.date).toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            {retrogradeCount > 0 && (
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  background: "#E85D5D10",
                  border: "1px solid #E85D5D30",
                  color: "#E85D5D",
                }}
              >
                {retrogradeCount} Retrograde
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Loading shimmer */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
          {Array(9)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="glass-card p-5">
                <div className="shimmer h-20 w-full rounded-lg" />
              </div>
            ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="glass-card p-8 text-center mb-10">
          <p
            className="text-sm mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Could not load transit data. Please try again.
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>{error}</p>
          <button
            onClick={handleRetry}
            className="btn-primary text-xs px-4 py-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Planet Transit Grid */}
      <AnimatePresence mode="wait">
        {data && !loading && !error && (
          <motion.section
            key="transit-grid"
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-10"
              variants={staggerContainerCustom(stagger.normal, 0.05)}
              initial="hidden"
              animate="visible"
            >
              {data.transits.map((t) => {
                const Icon = planetIcons[t.planet];
                const color = planetColors[t.planet] ?? GOLD;
                const isSelected = selectedPlanet === t.planet;
                const signKey = signNameToKey[t.current_sign];
                const signIcon = signKey ? zodiacIcons[signKey] : null;
                const speedInfo = motionLabel(t.planet, t.daily_motion);

                return (
                  <motion.button
                    key={t.planet}
                    onClick={() =>
                      setSelectedPlanet(isSelected ? null : t.planet)
                    }
                    className="glass-card p-5 text-left relative overflow-hidden transition-all duration-200"
                    variants={staggerItem}
                    whileHover={
                      reduced
                        ? undefined
                        : { scale: 1.02, transition: { duration: 0.12 } }
                    }
                    whileTap={reduced ? undefined : { scale: 0.97 }}
                    style={{
                      border: isSelected
                        ? `1px solid ${color}50`
                        : "1px solid var(--border-subtle)",
                      background: isSelected
                        ? `linear-gradient(135deg, ${color}10, ${color}05)`
                        : "var(--bg-surface)",
                    }}
                  >
                    {/* Retrograde badge */}
                    {t.retrograde && (
                      <span
                        className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: "#E85D5D20",
                          color: "#E85D5D",
                          border: "1px solid #E85D5D40",
                        }}
                      >
                        R
                      </span>
                    )}

                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: `${color}15`,
                          border: `1px solid ${color}30`,
                        }}
                      >
                        {Icon && <Icon size={20} color={color} />}
                      </div>
                      <div className="min-w-0">
                        <h3
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {t.planet}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {signIcon && (
                            <span
                              className="text-xs"
                              style={{ color }}
                            >
                              {(() => { const C = signIcon; return <C size={14} color={color} />; })()}
                            </span>
                          )}
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {t.current_sign}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Speed indicator */}
                    <div className="mt-3 flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: speedInfo.color }}
                      />
                      <span
                        className="text-[10px] tracking-wide"
                        style={{ color: speedInfo.color }}
                      >
                        {speedInfo.label}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Selected planet detail */}
            <AnimatePresence mode="wait">
              {selectedPlanet && data.transits.find((t) => t.planet === selectedPlanet) && (
                <motion.div
                  key={selectedPlanet}
                  className="glass-card p-6 mb-10"
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${planetColors[selectedPlanet] ?? GOLD}15`,
                        border: `1px solid ${planetColors[selectedPlanet] ?? GOLD}30`,
                      }}
                    >
                      {planetIcons[selectedPlanet] && (() => {
                        const Icon = planetIcons[selectedPlanet];
                        return <Icon size={24} color={planetColors[selectedPlanet] ?? GOLD} />;
                      })()}
                    </div>
                    <div>
                      <h3
                        className="text-lg font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {selectedPlanet}
                      </h3>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        in {data.transits.find((t) => t.planet === selectedPlanet)?.current_sign}
                      </p>
                    </div>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {transitEffects[selectedPlanet] ?? "Transit information for this celestial body."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Zodiac Positions Section */}
            {Object.keys(data.current_signs).length > 0 && (
              <motion.section
                className="mb-10"
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2
                  className="text-sm font-bold tracking-[0.2em] uppercase mb-5"
                  style={{ color: GOLD }}
                >
                  Zodiac Positions
                </h2>
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
                  variants={staggerContainerCustom(stagger.fast, 0.04)}
                  initial="hidden"
                  animate="visible"
                >
                  {Object.entries(data.current_signs).map(([planet, sign]) => {
                    const Icon = planetIcons[planet];
                    const color = planetColors[planet] ?? GOLD;
                    const signKey = signNameToKey[sign];
                    const signIcon = signKey ? zodiacSymbols[signKey] : null;

                    return (
                      <motion.div
                        key={planet}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        variants={staggerItem}
                        style={{
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: `${color}12`,
                          }}
                        >
                          {Icon && <Icon size={16} color={color} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-xs font-semibold truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {planet}
                          </div>
                          <div className="flex items-center gap-1">
                            {signIcon && (
                              <span className="text-[11px]" style={{ color }}>
                                {signIcon}
                              </span>
                            )}
                            <span
                              className="text-[11px] truncate"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {sign}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.section>
            )}

            {/* General Transit Effects */}
            <motion.section
              className="glass-card p-6"
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2
                className="text-sm font-bold tracking-[0.2em] uppercase mb-4"
                style={{ color: GOLD }}
              >
                About Transits
              </h2>
              <div className="space-y-4">
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Planetary transits (Gochar) describe the current movement of
                  planets through the zodiac. Each transit influences different
                  aspects of life based on the planet involved and the sign it
                  occupies. Retrograde periods bring introspection and karmic
                  review, while forward motion drives progress and action.
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  To understand how these transits specifically affect your
                  birth chart, generate your Kundli and observe how current
                  transits interact with your natal planetary positions and
                  house cusps.
                </p>
                <a
                  href="/kundli"
                  className="btn-primary inline-flex items-center gap-2 text-xs px-4 py-2"
                >
                  Generate Kundli
                </a>
              </div>
            </motion.section>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
