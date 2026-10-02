"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, ChevronDown, RefreshCw, Sparkles, X } from "lucide-react";
import { api, type Mantra, type Chalisa, type Aarti, type MantraCategories, type MantraFilter } from "@/lib/api";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  slideUp,
  stagger,
} from "@/lib/motion";

type TabId = "mantras" | "chalisa" | "aarti";

const TABS: { id: TabId; label: string }[] = [
  { id: "mantras", label: "Mantras" },
  { id: "chalisa", label: "Chalisa" },
  { id: "aarti", label: "Aarti" },
];

export default function MantraPage() {
  const [activeTab, setActiveTab] = useState<TabId>("mantras");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [daily, setDaily] = useState<Mantra | null>(null);
  const [chalisas, setChalisas] = useState<Chalisa[]>([]);
  const [aartis, setAartis] = useState<Aarti[]>([]);
  const [categories, setCategories] = useState<MantraCategories | null>(null);
  const [purpose, setPurpose] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mantras, setMantras] = useState<Mantra[]>([]);
  const [mantraTotal, setMantraTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MantraFilter | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const reduced = useReducedMotion();
  const seqRef = useRef(0);
  const listSeqRef = useRef(0);

  useEffect(() => {
    document.title = "Mantra, Chalisa & Aarti | AstroSeva";
  }, []);

  const fetchDaily = async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError("");
    try {
      const res = await api.getDailyMantra();
      if (seq !== seqRef.current) return;
      setDaily(res.mantra);
    } catch (e) {
      if (seq !== seqRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to fetch mantra");
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  };

  const fetchTab = async (tab: TabId) => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError("");
    try {
      if (tab === "mantras") {
        const [d, c] = await Promise.all([api.getDailyMantra(), api.getMantraCategories()]);
        if (seq !== seqRef.current) return;
        setDaily(d.mantra);
        setCategories(c);
      } else if (tab === "chalisa" && chalisas.length === 0) {
        const res = await api.getChalisas();
        if (seq !== seqRef.current) return;
        setChalisas(res.chalisas);
      } else if (tab === "aarti" && aartis.length === 0) {
        const res = await api.getAartis();
        if (seq !== seqRef.current) return;
        setAartis(res.aartis);
      }
    } catch (e) {
      if (seq !== seqRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to fetch data");
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    // Loading the tab content on mount is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTab("mantras");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab !== "mantras") return;
    const seq = ++listSeqRef.current;
    // Debounced so typing does not fire a request per keystroke; category
    // clicks (search empty) run immediately. State is only touched inside the
    // timer callback so the effect body itself stays side-effect free.
    const timer = setTimeout(async () => {
      setListLoading(true);
      setListError("");
      try {
        const res = await api.listMantras({
          ...filter,
          q: search.trim() || undefined,
        });
        if (seq !== listSeqRef.current) return;
        setMantras(res.mantras);
        setMantraTotal(res.total);
      } catch (e) {
        if (seq !== listSeqRef.current) return;
        setListError(e instanceof Error ? e.message : "Failed to load mantras");
      } finally {
        if (seq === listSeqRef.current) setListLoading(false);
      }
    }, search.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [activeTab, search, filter]);

  const clearFilters = () => {
    setFilter(null);
    setSearch("");
    setPurpose("all");
  };

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    setExpanded(null);
    fetchTab(tab);
  };

  const purposes = categories ? ["all", ...categories.purpose.map((p) => p.id)] : ["all"];

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div
        className="text-center mb-8"
        variants={slideUp}
        initial={reduced ? false : "hidden"}
        animate="visible"
      >
        <p className="heading-section mb-3">SACRED SOUNDS</p>
        <h1
          className="heading-display font-bold mb-4"
          style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}
        >
          MANTRA, <span className="text-gradient-gold">CHALISA & AARTI</span>
        </h1>
        <p className="max-w-lg mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Vedic mantras with meanings and benefits, full chalisa texts, and devotional aartis.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-8 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={activeTab === t.id ? "btn-primary" : "btn-ghost"}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="glass-card p-4 mb-6 text-center text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {/* Daily mantra */}
      {activeTab === "mantras" && daily && (
        <motion.div
          className="glass-card p-6 mb-8 relative overflow-hidden"
          variants={slideUp}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} style={{ color: "#C8956D" }} />
              <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: "#C8956D" }}>
                Daily Mantra · {daily.deity}
              </span>
            </div>
            <button onClick={fetchDaily} disabled={loading} className="btn-ghost text-xs" title="New mantra">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> New
            </button>
          </div>
          <p className="text-xl md:text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            {daily.mantra_hindi}
          </p>
          <p className="text-sm italic mb-3" style={{ color: "var(--champagne)" }}>{daily.transliteration}</p>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{daily.meaning}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded-full" style={{ background: "rgba(200,149,109,0.12)", color: "#C8956D" }}>
              {daily.benefits}
            </span>
            <span className="px-2 py-1 rounded-full" style={{ background: "rgba(200,149,109,0.08)", color: "var(--text-secondary)" }}>
              {daily.best_time} · {daily.repetitions}× · {daily.planet}
            </span>
          </div>
        </motion.div>
      )}

      {/* Purpose filter + categories */}
      {activeTab === "mantras" && categories && (
        <div className="mb-8">
          <div className="flex gap-2 flex-wrap mb-5 justify-center">
            {purposes.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPurpose(p);
                  setFilter(p === "all" ? null : { purpose: p });
                }}
                className={purpose === p ? "btn-primary text-xs" : "btn-ghost text-xs"}
              >
                {p === "all" ? "All" : p}
              </button>
            ))}
          </div>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={staggerContainerCustom(stagger.normal, 0.05)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            {(purpose === "all"
              ? [...categories.deity.map((d) => ({ ...d, kind: "Deity" })), ...categories.planet.map((p) => ({ ...p, kind: "Planet" }))]
              : categories.purpose.filter((p) => p.id === purpose).map((p) => ({ ...p, kind: "Purpose" }))
            ).map((c) => {
              const kind = c.kind.toLowerCase();
              const active = Boolean(filter && filter[kind as keyof MantraFilter] === c.id);
              const next: MantraFilter =
                kind === "deity" ? { deity: c.id } : kind === "planet" ? { planet: c.id } : { purpose: c.id };
              return (
                <motion.button
                  type="button"
                  key={`${c.kind}-${c.id}`}
                  onClick={() => {
                    // A category used to be countable but not openable: the card
                    // showed a total and a list of raw ids, and nothing fetched
                    // them. Clicking now loads the mantras behind it.
                    setPurpose("all");
                    setFilter(active ? null : next);
                  }}
                  className="glass-card p-5 text-left w-full cursor-pointer"
                  style={active ? { boxShadow: "0 0 0 1px #C8956D" } : undefined}
                  variants={staggerItem}
                >
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: "#C8956D" }}>
                    {c.kind}
                  </p>
                  <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                    {c.name}
                  </h3>
                  <p className="text-xs mb-2" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {c.description}
                  </p>
                  <p className="text-xs" style={{ color: active ? "#C8956D" : "var(--text-secondary)" }}>
                    {c.mantra_count} {c.mantra_count === 1 ? "mantra" : "mantras"}
                    {active ? " · selected" : ""}
                    {c.mantra_count === 0 ? " · none declared yet" : ""}
                  </p>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* Mantra search and results */}
      {activeTab === "mantras" && (
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-4">
            <input
              type="search"
              className="input-field text-sm flex-1"
              placeholder="Search mantras by name, meaning or deity"
              aria-label="Search mantras"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {(filter || search.trim()) && (
              <button type="button" onClick={clearFilters} className="btn-ghost text-xs whitespace-nowrap">
                <X size={14} /> Clear
              </button>
            )}
          </div>

          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            {listLoading
              ? "Loading mantras…"
              : `${mantraTotal} ${mantraTotal === 1 ? "mantra" : "mantras"}${filter ? " matching" : ""}`}
          </p>

          {listError && (
            <div className="glass-card p-4 mb-4 text-center text-sm" style={{ color: "var(--danger)" }}>
              {listError}
            </div>
          )}

          {!listLoading && !listError && mantras.length === 0 && (
            <div className="glass-card p-8 text-center">
              <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                {search.trim()
                  ? `No mantras match \u201c${search.trim()}\u201d.`
                  : "No mantras in this category yet."}
              </p>
              <button type="button" onClick={clearFilters} className="btn-ghost text-xs">
                Show all mantras
              </button>
            </div>
          )}

          <div className="space-y-4">
            {mantras.map((m) => (
              <div key={m.id} className="glass-card p-5">
                <button
                  onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                  className="w-full flex items-start justify-between gap-3 text-left"
                >
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                      {m.deity}
                    </h3>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {m.purpose} · {m.planet} · {m.repetitions}×
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    style={{
                      color: "#C8956D",
                      transform: expanded === m.id ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>
                <AnimatePresence>
                  {expanded === m.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-lg mt-3 mb-2" style={{ color: "var(--text-primary)", lineHeight: 1.8 }}>
                        {m.mantra_hindi}
                      </p>
                      <p className="text-sm italic mb-3" style={{ color: "var(--champagne)" }}>
                        {m.transliteration}
                      </p>
                      <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        {m.meaning}
                      </p>
                      <p className="text-xs mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        {m.benefits}
                      </p>
                      <p className="text-xs" style={{ color: "#C8956D" }}>
                        Best time: {m.best_time}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chalisa list */}
      {activeTab === "chalisa" && (
        <div className="space-y-4">
          {loading && <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>Loading chalisas…</p>}
          {chalisas.map((c) => (
            <div key={c.id} className="glass-card p-5">
              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div>
                  <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                    {c.deity} Chalisa
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {c.author} · {c.language} · {c.verses_hindi.length} verses
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  style={{
                    color: "#C8956D",
                    transform: expanded === c.id ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
              <AnimatePresence>
                {expanded === c.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs mt-3 mb-3" style={{ color: "var(--text-secondary)" }}>{c.description}</p>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {c.verses_hindi.map((v, i) => (
                        <div key={i}>
                          <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.8 }}>{v}</p>
                          {c.verses_transliteration?.[i] && (
                            <p className="text-xs italic" style={{ color: "var(--text-secondary)" }}>
                              {c.verses_transliteration[i]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Aarti list */}
      {activeTab === "aarti" && (
        <div className="space-y-4">
          {loading && <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>Loading aartis…</p>}
          {aartis.map((a) => (
            <div key={a.id} className="glass-card p-5">
              <button
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={18} style={{ color: "#C8956D" }} />
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                      {a.aarti_name}
                    </h3>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {a.deity} · {a.language}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  style={{
                    color: "#C8956D",
                    transform: expanded === a.id ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
              <AnimatePresence>
                {expanded === a.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs mt-3 mb-3" style={{ color: "var(--text-secondary)" }}>{a.description}</p>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {a.aarti_hindi.map((v, i) => (
                        <div key={i}>
                          <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.8 }}>{v}</p>
                          {a.aarti_transliteration?.[i] && (
                            <p className="text-xs italic" style={{ color: "var(--text-secondary)" }}>
                              {a.aarti_transliteration[i]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
