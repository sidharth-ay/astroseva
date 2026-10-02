"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Star,
  ChevronRight,
  RotateCcw,
  User,
  Calendar,
  Briefcase,
  Globe,
} from "lucide-react";

import { api } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainer,
  staggerItem} from "@/lib/motion";

interface Celebrity {
  id: string;
  name: string;
  profession: string;
  birth_date: string;
  zodiac_sign?: string;
  famous_for?: string;
}

interface CelebrityDetail {
  id: string;
  name: string;
  profession: string;
  birth_date: string;
  birth_time?: string;
  birth_place?: string;
  zodiac_sign: string;
  ascendant: string;
  key_placements: string[];
  exalted_planets?: string[];
  debilitated_planets?: string[];
  retrograde_planets?: string[];
  notable_features: string[];
  chart_highlights?: string[];
}

const PROFESSION_MATCH: Record<string, string[]> = {
  Politicians: ["politician", "freedom fighter", "officer", "activist"],
  Actors: ["actor", "singer", "composer", "music", "producer"],
  Cricketers: ["cricketer"],
  Business: ["business", "industrialist", "philanthropist", "tycoon"],
  Spiritual: ["spiritual", "guru", "yogi"],
  Sports: ["cricketer", "tennis", "player", "athlete", "sport", "chess", "badminton"],
};

const ZODIAC_SIGNS = [
  "All",
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

const SIGN_GRADIENTS: Record<string, string> = {
  Aries: "from-red-600 to-red-900",
  Taurus: "from-green-600 to-emerald-900",
  Gemini: "from-yellow-500 to-amber-800",
  Cancer: "from-silver-400 to-slate-700",
  Leo: "from-yellow-400 to-orange-800",
  Virgo: "from-teal-500 to-teal-900",
  Libra: "from-pink-400 to-rose-800",
  Scorpio: "from-red-800 to-black",
  Sagittarius: "from-purple-500 to-indigo-900",
  Capricorn: "from-gray-500 to-gray-900",
  Aquarius: "from-cyan-400 to-blue-900",
  Pisces: "from-blue-400 to-purple-900",
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function CelebritiesPage() {
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedZodiac, setSelectedZodiac] = useState("All");
  const [selectedProfession, setSelectedProfession] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "birth" | "zodiac">("name");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CelebrityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const seqRef = useRef(0);
  const detailSeqRef = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Celebrity Horoscopes | AstroSeva";
  }, []);

  // Single effect drives all list fetches (mount + zodiac changes).
  useEffect(() => {
    if (selectedZodiac !== "All") {
      fetchByZodiac(selectedZodiac);
    } else {
      fetchCelebrities();
    }
  }, [selectedZodiac]);

  async function fetchCelebrities() {
    const seq = ++seqRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await api.getCelebrities();
      if (seq !== seqRef.current) return;
      setCelebrities((data.celebrities || []) as unknown as Celebrity[]);
    } catch (e) {
      if (seq !== seqRef.current) return;
      setError(
        e instanceof Error ? e.message : "Failed to load celebrities."
      );
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }

  async function fetchByZodiac(sign: string) {
    const seq = ++seqRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await api.getCelebritiesByZodiac(sign.toLowerCase());
      if (seq !== seqRef.current) return;
      setCelebrities((data.celebrities || []) as unknown as Celebrity[]);
    } catch (e) {
      if (seq !== seqRef.current) return;
      setError(
        e instanceof Error ? e.message : "Failed to filter celebrities."
      );
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }

  const retryList = () => {
    if (selectedZodiac !== "All") {
      fetchByZodiac(selectedZodiac);
    } else {
      fetchCelebrities();
    }
  };

  const fetchDetail = async (id: string) => {
    if (expandedId === id) {
      // Collapse: invalidate any in-flight detail request so it can't
      // write state or flip the loader after close.
      detailSeqRef.current += 1;
      setExpandedId(null);
      setDetail(null);
      setDetailLoading(false);
      setDetailError("");
      return;
    }
    setExpandedId(id);
    await loadDetail(id);
  };

  async function loadDetail(id: string) {
    const seq = ++detailSeqRef.current;
    setDetail(null);
    setDetailLoading(true);
    setDetailError("");
    try {
      const raw = (await api.getCelebrityDetail(id)) as unknown as {
        celebrity?: Record<string, string>;
        chart_summary?: {
          ascendant?: string;
          key_placements?: string[];
          exalted_planets?: string[];
          debilitated_planets?: string[];
          retrograde_planets?: string[];
          notable_features?: string[];
          chart_highlights?: string[];
        };
      };
      if (seq !== detailSeqRef.current) return;
      const cel = raw.celebrity || {};
      const summary = raw.chart_summary || {};
      setDetail({
        id: String(cel.id || id),
        name: String(cel.name || ""),
        profession: String(cel.profession || ""),
        birth_date: String(cel.birth_date || ""),
        birth_time: cel.birth_time ? String(cel.birth_time) : undefined,
        birth_place: cel.birth_place ? String(cel.birth_place) : undefined,
        zodiac_sign: String(cel.zodiac_sign || ""),
        ascendant: String(summary.ascendant || ""),
        key_placements: Array.isArray(summary.key_placements) ? summary.key_placements.map(String) : [],
        exalted_planets: Array.isArray(summary.exalted_planets) ? summary.exalted_planets.map(String) : [],
        debilitated_planets: Array.isArray(summary.debilitated_planets) ? summary.debilitated_planets.map(String) : [],
        retrograde_planets: Array.isArray(summary.retrograde_planets) ? summary.retrograde_planets.map(String) : [],
        notable_features: Array.isArray(summary.notable_features) ? summary.notable_features.map(String) : [],
        chart_highlights: Array.isArray(summary.chart_highlights) ? summary.chart_highlights.map(String) : [],
      });
    } catch (e) {
      if (seq !== detailSeqRef.current) return;
      setDetailError(
        e instanceof Error ? e.message : "Failed to load chart details."
      );
    } finally {
      if (seq === detailSeqRef.current) setDetailLoading(false);
    }
  }

  const filtered = celebrities.filter((c) => {
    if (selectedProfession !== "All") {
      const keywords = PROFESSION_MATCH[selectedProfession] || [selectedProfession.toLowerCase()];
      const prof = (c.profession || "").toLowerCase();
      if (!keywords.some((k) => prof.includes(k))) return false;
    }
    const q = query.trim().toLowerCase();
    if (q) {
      const hay = `${c.name} ${c.famous_for || ""} ${c.profession}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const ZODIAC_ORDER = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "birth") return a.birth_date.localeCompare(b.birth_date);
    if (sort === "zodiac") {
      return ZODIAC_ORDER.indexOf((a.zodiac_sign || "").toLowerCase()) - ZODIAC_ORDER.indexOf((b.zodiac_sign || "").toLowerCase());
    }
    return a.name.localeCompare(b.name);
  });

  const hasActiveFilters = selectedZodiac !== "All" || selectedProfession !== "All" || query.trim() !== "" || sort !== "name";
  const resetAll = () => {
    setSelectedZodiac("All");
    setSelectedProfession("All");
    setQuery("");
    setSort("name");
  };

  // Deep-link support: ?zodiac=&profession=&id= — read on mount, sync on change.
  // Hydrating the filters from the URL (and fetching the linked chart) on mount
  // is what this effect is for.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const z = params.get("zodiac");
      const p = params.get("profession");
      const id = params.get("id");
      if (z && (ZODIAC_SIGNS as readonly string[]).includes(z)) setSelectedZodiac(z);
      if (p && (["All", ...Object.keys(PROFESSION_MATCH)] as string[]).includes(p)) setSelectedProfession(p);
      if (id) {
        setExpandedId(id);
        loadDetail(id);
      }
    } catch { /* ignore */ }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    try {
      const params = new URLSearchParams();
      if (selectedZodiac !== "All") params.set("zodiac", selectedZodiac);
      if (selectedProfession !== "All") params.set("profession", selectedProfession);
      if (expandedId) params.set("id", expandedId);
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `/celebrities?${qs}` : "/celebrities");
    } catch { /* ignore */ }
  }, [selectedZodiac, selectedProfession, expandedId]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="heading-display text-2xl md:text-3xl mb-1">
          <span className="text-gradient-gold">CELEBRITY HOROSCOPES</span>
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          Explore birth charts of famous personalities across the world
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="glass-card p-4 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Briefcase size={13} style={{ color: "#C8956D" }} />
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "#C8956D" }}
          >
            Profession
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filter by profession">
          {["All", ...Object.keys(PROFESSION_MATCH)].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedProfession(cat)}
              aria-pressed={selectedProfession === cat}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background:
                  selectedProfession === cat
                    ? "linear-gradient(135deg, #C8956D, #E8B88A)"
                    : "var(--bg-surface)",
                color:
                  selectedProfession === cat ? "#1a0f0a" : "var(--text-secondary)",
                border: `1px solid ${
                  selectedProfession === cat ? "#C8956D" : "var(--border-subtle)"
                }`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Star size={13} style={{ color: "#C8956D" }} />
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "#C8956D" }}
          >
            Zodiac Sign
          </span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by zodiac sign">
          {ZODIAC_SIGNS.map((sign) => (
            <button
              key={sign}
              onClick={() => setSelectedZodiac(sign)}
              aria-pressed={selectedZodiac === sign}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background:
                  selectedZodiac === sign
                    ? "linear-gradient(135deg, #C8956D, #E8B88A)"
                    : "var(--bg-surface)",
                color:
                  selectedZodiac === sign ? "#1a0f0a" : "var(--text-secondary)",
                border: `1px solid ${
                  selectedZodiac === sign ? "#C8956D" : "var(--border-subtle)"
                }`,
              }}
            >
              {sign}
            </button>
          ))}
        </div>

        {/* Search + sort + reset */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <input
            className="input-field text-xs grow"
            placeholder="Search by name or fame…"
            aria-label="Search celebrities by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="input-field text-xs sm:max-w-40"
            aria-label="Sort celebrities"
            value={sort}
            onChange={(e) => setSort(e.target.value as "name" | "birth" | "zodiac")}
          >
            <option value="name">Sort: Name</option>
            <option value="birth">Sort: Oldest first</option>
            <option value="zodiac">Sort: Zodiac order</option>
          </select>
          {hasActiveFilters && (
            <button onClick={resetAll} className="btn-ghost text-xs shrink-0">
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </motion.div>

      {/* Loading Shimmer */}
      {loading && (
        <motion.div
          role="status"
          aria-label="Loading celebrities"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-lg p-4 animate-pulse"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                className="h-24 rounded-lg mb-3 animate-pulse"
                style={{ background: "var(--border-subtle)" }}
              />
              <div
                className="h-4 w-28 rounded mb-2"
                style={{ background: "var(--border)" }}
              />
              <div
                className="h-3 w-20 rounded mb-2"
                style={{ background: "var(--border)" }}
              />
              <div
                className="h-3 w-24 rounded"
                style={{ background: "var(--border-subtle)" }}
              />
            </div>
          ))}
        </motion.div>
      )}

      {/* Error */}
      {error && !loading && (
        <motion.div
          role="alert"
          className="glass-card p-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>
            {error}
          </p>
          <button className="btn-ghost" onClick={retryList}>
            <RotateCcw size={13} /> Try Again
          </button>
        </motion.div>
      )}

      {/* Celebrity Grid */}
      {!loading && !error && sorted.length > 0 && (
        <>
        <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }} role="status">
          Showing {sorted.length} of {celebrities.length} celebrities
        </p>
        <motion.div
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {sorted.map((cel) => {
            const signKey = (cel.zodiac_sign || "").toLowerCase();
            const gradientKey = signKey.charAt(0).toUpperCase() + signKey.slice(1);
            const gradient =
              SIGN_GRADIENTS[gradientKey] || "from-amber-600 to-amber-900";
            const badge = signKey
              ? signKey.charAt(0).toUpperCase() + signKey.slice(1)
              : "—";
            return (
              <motion.div key={cel.id} variants={staggerItem}>
                <motion.div
                  className="glass-card overflow-hidden"
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                  style={{
                    border:
                      expandedId === cel.id
                        ? "1px solid #C8956D"
                        : "1px solid var(--border-subtle)",
                  }}
                >
                  {/* Photo Placeholder */}
                  <div
                    className={`h-28 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}
                  >
                    <User size={36} className="text-white/40" />
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/40 text-white">
                      {badge}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3
                        className="text-sm font-semibold"
                        style={{ color: "#E8B88A" }}
                      >
                        {cel.name}
                      </h3>
                      <button
                        onClick={() => fetchDetail(cel.id)}
                        aria-expanded={expandedId === cel.id}
                        aria-controls={`cel-detail-${cel.id}`}
                        aria-label={expandedId === cel.id ? `Collapse ${cel.name} chart` : `View ${cel.name} chart`}
                        className="mt-0.5 shrink-0 p-1 rounded-full"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <ChevronRight
                          size={14}
                          aria-hidden="true"
                          style={{
                            transform: expandedId === cel.id ? "rotate(90deg)" : "none",
                            transition: "transform 0.2s",
                          }}
                        />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        <Briefcase size={10} />
                        {cel.profession}
                      </div>
                      {cel.famous_for && (
                        <div className="text-xs italic" style={{ color: "var(--text-secondary)" }}>
                          {cel.famous_for}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        <Calendar size={10} />
                        {formatDate(cel.birth_date)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        <Star size={10} />
                        {badge}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  <AnimatePresence>
                    {expandedId === cel.id && (
                      <motion.div
                        id={`cel-detail-${cel.id}`}
                        role="region"
                        aria-label={`${cel.name} birth chart details`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div
                          className="px-4 pb-4 pt-2"
                          style={{ borderTop: "1px solid var(--border-subtle)" }}
                        >
                          {detailLoading && (
                            <div className="space-y-2 py-2">
                              {[1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className="h-3 rounded animate-pulse"
                                  style={{ background: "var(--border-subtle)" }}
                                />
                              ))}
                            </div>
                          )}
                          {detailError && (
                            <div className="py-2">
                              <p
                                className="text-xs mb-2"
                                style={{ color: "var(--danger)" }}
                              >
                                {detailError}
                              </p>
                              <button
                                className="btn-ghost text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (expandedId) loadDetail(expandedId);
                                }}
                              >
                                <RotateCcw size={12} /> Retry
                              </button>
                            </div>
                          )}
                          {detail && detail.id === cel.id && !detailLoading && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.1 }}
                              className="space-y-3"
                            >
                              {(detail.birth_place || detail.birth_time) && (
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                                  <Globe size={10} />
                                  {[detail.birth_place, detail.birth_time ? `born ${detail.birth_time}` : ""]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </div>
                              )}

                              {detail.ascendant && (
                              <div>
                                <span
                                  className="text-[10px] font-semibold uppercase tracking-wider"
                                  style={{ color: "#C8956D" }}
                                >
                                  Ascendant
                                </span>
                                <p
                                  className="text-xs mt-0.5"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {detail.ascendant}
                                </p>
                              </div>
                              )}

                              {detail.key_placements.length > 0 && (
                                <div>
                                  <span
                                    className="text-[10px] font-semibold uppercase tracking-wider"
                                    style={{ color: "#C8956D" }}
                                  >
                                    Key Placements
                                  </span>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {detail.key_placements.map((p, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                                        style={{
                                          background: "var(--bg-surface)",
                                          border: "1px solid var(--border-subtle)",
                                          color: "var(--text-secondary)",
                                        }}
                                      >
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(detail.exalted_planets?.length || detail.debilitated_planets?.length || detail.retrograde_planets?.length) ? (
                                <div>
                                  <span
                                    className="text-[10px] font-semibold uppercase tracking-wider"
                                    style={{ color: "#C8956D" }}
                                  >
                                    Planetary States
                                  </span>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {(detail.exalted_planets || []).map((p) => (
                                      <span key={`ex-${p}`} className="px-2 py-0.5 rounded text-[10px] font-medium"
                                        style={{ background: "rgba(93,200,143,0.1)", border: "1px solid rgba(93,200,143,0.2)", color: "var(--success)" }}>
                                        {p} exalted
                                      </span>
                                    ))}
                                    {(detail.debilitated_planets || []).map((p) => (
                                      <span key={`de-${p}`} className="px-2 py-0.5 rounded text-[10px] font-medium"
                                        style={{ background: "rgba(232,93,93,0.1)", border: "1px solid rgba(232,93,93,0.2)", color: "var(--danger)" }}>
                                        {p} debilitated
                                      </span>
                                    ))}
                                    {(detail.retrograde_planets || []).map((p) => (
                                      <span key={`re-${p}`} className="px-2 py-0.5 rounded text-[10px] font-medium"
                                        style={{ background: "rgba(232,184,138,0.1)", border: "1px solid rgba(232,184,138,0.25)", color: "var(--champagne)" }}>
                                        {p} (R)
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {detail.notable_features.length > 0 && (
                                <div>
                                  <span
                                    className="text-[10px] font-semibold uppercase tracking-wider"
                                    style={{ color: "#C8956D" }}
                                  >
                                    Notable Features
                                  </span>
                                  <ul className="mt-1 space-y-1">
                                    {detail.notable_features.map((f, i) => (
                                      <li
                                        key={i}
                                        className="text-xs flex items-start gap-1.5"
                                        style={{ color: "var(--text-secondary)" }}
                                      >
                                        <span style={{ color: "#C8956D" }}>·</span>
                                        {f}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {(detail.chart_highlights || []).length > 0 && (
                                <div>
                                  <span
                                    className="text-[10px] font-semibold uppercase tracking-wider"
                                    style={{ color: "#C8956D" }}
                                  >
                                    Chart Highlights
                                  </span>
                                  <ul className="mt-1 space-y-1">
                                    {(detail.chart_highlights || []).map((f, i) => (
                                      <li
                                        key={i}
                                        className="text-xs flex items-start gap-1.5"
                                        style={{ color: "var(--text-secondary)" }}
                                      >
                                        <span style={{ color: "#C8956D" }}>·</span>
                                        {f}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
        </>
      )}

      {/* Empty State */}
      {!loading && !error && sorted.length === 0 && (
        <motion.div
          className="glass-card p-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Star
            size={28}
            className="mx-auto mb-3"
            style={{ color: "var(--text-tertiary)" }}
          />
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            No celebrities found for the selected filters.
          </p>
          <button
            className="btn-ghost mt-3"
            onClick={resetAll}
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
        </motion.div>
      )}
    </div>
  );
}
