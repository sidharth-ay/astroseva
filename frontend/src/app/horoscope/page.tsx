"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api, type HoroscopeResponse } from "@/lib/api";
import { zodiacSymbols, zodiacIcons } from "@/components/icons/ZodiacIcons";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  stagger,
} from "@/lib/motion";

const zodiacSigns = [
  { sign: "aries", name: "Aries", date: "Mar 21 - Apr 19", element: "fire" },
  { sign: "taurus", name: "Taurus", date: "Apr 20 - May 20", element: "earth" },
  { sign: "gemini", name: "Gemini", date: "May 21 - Jun 20", element: "air" },
  { sign: "cancer", name: "Cancer", date: "Jun 21 - Jul 22", element: "water" },
  { sign: "leo", name: "Leo", date: "Jul 23 - Aug 22", element: "fire" },
  { sign: "virgo", name: "Virgo", date: "Aug 23 - Sep 22", element: "earth" },
  { sign: "libra", name: "Libra", date: "Sep 23 - Oct 22", element: "air" },
  { sign: "scorpio", name: "Scorpio", date: "Oct 23 - Nov 21", element: "water" },
  { sign: "sagittarius", name: "Sagittarius", date: "Nov 22 - Dec 21", element: "fire" },
  { sign: "capricorn", name: "Capricorn", date: "Dec 22 - Jan 19", element: "earth" },
  { sign: "aquarius", name: "Aquarius", date: "Jan 20 - Feb 18", element: "air" },
  { sign: "pisces", name: "Pisces", date: "Feb 19 - Mar 20", element: "water" },
];

const tabs = ["Daily", "Weekly", "Monthly", "Yearly", "Love"] as const;
type Tab = (typeof tabs)[number];

const GOLD = "#C8956D";
const GOLD_BRIGHT = "#E8B88A";
const PINK = "#E8A0BF";
const GREEN = "#5DC88F";
const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

const tabDescriptions: Record<Tab, string> = {
  Daily: "Your cosmic forecast for today",
  Weekly: "What the stars hold for this week",
  Monthly: "Your monthly astrological outlook",
  Yearly: "Your year-long horoscope reading",
  Love: "Romance and relationship insights",
};

const fetchers: Record<Tab, (sign: string, signal?: AbortSignal) => Promise<HoroscopeResponse>> = {
  Daily: api.getDailyHoroscope,
  Weekly: api.getWeeklyHoroscope,
  Monthly: api.getMonthlyHoroscope,
  Yearly: api.getYearlyHoroscope,
  Love: api.getLoveHoroscope,
};

export default function HoroscopePage() {
  const [activeTab, setActiveTab] = useState<Tab>("Daily");
  const [sign, setSign] = useState("aries");
  const [result, setResult] = useState<HoroscopeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    document.title = `${activeTab} Horoscope | AstroSeva`;
  }, [activeTab]);

  useEffect(() => {
    // Deep links (?tab=Weekly) land on the right tab. Read once from the URL
    // rather than through state so a bad value falls back to Daily instead of
    // rendering an empty tab.
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab && (tabs as readonly string[]).includes(tab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tab as Tab);
    }
  }, []);

  const fetchHoroscope = useCallback(
    (tab: Tab, zodiac: string) => {
      // Genuinely cancel the previous request (signal is wired into fetch).
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const seq = ++seqRef.current;

      setLoading(true);
      setError(null);
      setResult(null);

      const fetcher = fetchers[tab];
      if (typeof fetcher !== "function") {
        setError(`Unknown tab "${tab}". Please try again.`);
        setLoading(false);
        return;
      }

      fetcher(zodiac, controller.signal)
        .then((data) => {
          // Ignore stale responses from superseded requests.
          if (seq !== seqRef.current) return;
          setResult(data);
        })
        .catch((e: unknown) => {
          if (seq !== seqRef.current) return;
          // Aborted requests are superseded by a newer fetch — not errors.
          if (e instanceof DOMException && e.name === "AbortError") return;
          setError(e instanceof Error ? e.message : "Failed to load horoscope.");
        })
        .finally(() => {
          // Always clear loading for the latest request — never latch.
          if (seq === seqRef.current) setLoading(false);
        });
    },
    []
  );

  useEffect(() => {
    // Loading the forecast on mount and on control change is what this effect
    // is for; the loading flag is set rather than derived so a slow first paint
    // still shows a skeleton instead of an empty form.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHoroscope(activeTab, sign);
  }, [activeTab, sign, fetchHoroscope]);

  const handleRetry = () => fetchHoroscope(activeTab, sign);

  const selected = zodiacSigns.find((z) => z.sign === sign);

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
          <span className="text-gradient-gold">HOROSCOPE</span>
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {tabDescriptions[activeTab]}
        </p>
      </motion.div>

      {/* Tab Bar */}
      <div className="flex justify-center mb-8">
        <div
          className="inline-flex gap-1 p-1 rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-colors duration-200"
                style={{
                  color: isActive ? GOLD : "var(--text-tertiary)",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: `${GOLD}14`,
                      borderBottom: `2px solid ${GOLD}`,
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Zodiac Grid */}
      <section className="mb-10">
        <motion.div
          className="grid grid-cols-3 sm:grid-cols-4"
          variants={staggerContainerCustom(stagger.fast, 0.04)}
          initial="hidden"
          animate="visible"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {zodiacSigns.map((z, i) => {
            const isActive = sign === z.sign;
            const Icon = zodiacIcons[z.sign];
            return (
              <motion.button
                key={z.sign}
                onClick={() => setSign(z.sign)}
                className="relative p-4 md:p-5 text-center transition-all duration-200"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${GOLD}18, ${GOLD}08)`
                    : "transparent",
                  borderRight:
                    (i + 1) % 4 !== 0 && (i + 1) % 3 !== 0
                      ? "1px solid var(--border-subtle)"
                      : "none",
                  borderBottom:
                    i < 9 ? "1px solid var(--border-subtle)" : "none",
                }}
                variants={staggerItem}
                whileHover={
                  reduced
                    ? undefined
                    : { scale: 1.03, transition: { duration: 0.12 } }
                }
                whileTap={reduced ? undefined : { scale: 0.95 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="zodiac-active-bg"
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${GOLD}14, ${GOLD}06)`,
                      borderBottom: `2px solid ${GOLD}`,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  {Icon && (
                    <Icon
                      size={28}
                      color={isActive ? GOLD : "var(--text-secondary)"}
                    />
                  )}
                  <span
                    className="text-[11px] md:text-xs font-semibold"
                    style={{
                      color: isActive ? GOLD : "var(--text-primary)",
                    }}
                  >
                    {z.name}
                  </span>
                  <span
                    className="text-[9px] md:text-[10px] hidden sm:block"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {z.date}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </section>

      {/* Loading shimmer */}
      {loading && (
        <div className="space-y-4 mb-10">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="glass-card p-6">
                <div className="shimmer h-24 w-full rounded-lg" />
              </div>
            ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="glass-card p-8 text-center mb-10">
          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            Could not load {activeTab.toLowerCase()} horoscope for {selected?.name}. Please try again.
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

      {/* Detail Section */}
      <AnimatePresence mode="wait">
        {result && !loading && !error && (
          <motion.section
            key={`${activeTab}-${sign}`}
            className="mb-12"
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Sign Header */}
            <div className="text-center mb-8">
              <motion.div
                className="inline-block mb-4"
                initial={reduced ? false : { scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD}20, ${GOLD}08)`,
                    border: `2px solid ${GOLD}40`,
                  }}
                >
                  <span className="text-4xl md:text-5xl" style={{ color: GOLD }}>
                    {zodiacSymbols[sign]}
                  </span>
                </div>
              </motion.div>
              <h2
                className="text-2xl md:text-3xl font-display font-bold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {selected?.name}
              </h2>
              <p className="text-xs tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                {selected?.date}
              </p>
            </div>

            {/* Horoscope Prediction */}
            <div className="glass-card p-6 md:p-8 mb-6">
              <h3
                className="text-xs font-bold tracking-[0.25em] uppercase mb-4"
                style={{ color: GOLD }}
              >
                {activeTab} Horoscope
              </h3>
              <p
                className="text-sm md:text-base leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {result.prediction}
              </p>
            </div>

            {/* Rating Cards */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
              variants={staggerContainerCustom(stagger.normal, 0.1)}
              initial="hidden"
              animate="visible"
            >
              {(
                [
                  { label: "Love", val: result.love_rating, color: PINK },
                  { label: "Career", val: result.career_rating, color: GOLD },
                  { label: "Health", val: result.health_rating, color: GREEN },
                ] as const
              ).map((cat) => (
                <motion.div
                  key={cat.label}
                  className="glass-card p-5 text-center"
                  variants={staggerItem}
                >
                  <h4
                    className="font-semibold text-xs tracking-wider uppercase mb-3"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {cat.label}
                  </h4>
                  <div className="flex justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className="text-lg"
                        style={{ color: n <= cat.val ? cat.color : "var(--border)" }}
                      >
                        {n <= cat.val ? "★" : "☆"}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    {ratingLabels[cat.val]}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Lucky Numbers & Color */}
            <motion.div
              className="flex flex-wrap justify-center gap-3"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span
                className="px-4 py-2 rounded-lg text-xs"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                Lucky Numbers:{" "}
                <span className="font-semibold" style={{ color: GOLD_BRIGHT }}>
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
                Lucky Color:{" "}
                <span className="font-semibold" style={{ color: GOLD_BRIGHT }}>
                  {result.lucky_color}
                </span>
              </span>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
