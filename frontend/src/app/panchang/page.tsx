"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  useReducedMotion,
  staggerItem,
  staggerContainerCustom,
  stagger,
  slideUp,
} from "@/lib/motion";
import { MapPin } from "lucide-react";
import { api } from "@/lib/api";
import CitySearch from "@/components/CitySearch";

type TabId = "daily" | "choghadiya" | "hora" | "gowri" | "ghati";

const TABS: { id: TabId; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "choghadiya", label: "Choghadiya" },
  { id: "hora", label: "Hora" },
  { id: "gowri", label: "Gowri" },
  { id: "ghati", label: "Ghati" },
];

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${dayNames[dt.getDay()]}, ${dt.getDate()} ${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
}

function choghadiyaColor(type: string) {
  const t = type.toLowerCase();
  if (t === "good" || t === "amrit" || t === "shubh") return "var(--champagne, #C8956D)";
  if (t === "bad" || t === "rog" || t === "kaal" || t === "death") return "var(--danger, #e5484d)";
  return "var(--text-secondary, #a1a1aa)";
}

function horaColor(type: string) {
  const t = type.toLowerCase();
  if (t === "good") return "var(--champagne, #C8956D)";
  if (t === "bad") return "var(--danger, #e5484d)";
  return "var(--text-secondary, #a1a1aa)";
}

function gowriColor(nature: string) {
  const n = nature.toLowerCase();
  if (n === "good" || n === "amrit" || n === "shubh" || n === "prosperous") return "var(--champagne, #C8956D)";
  if (n === "bad" || n === "rog" || n === "death") return "var(--danger, #e5484d)";
  return "var(--text-secondary, #a1a1aa)";
}

export default function PanchangPage() {
  const [lat, setLat] = useState(28.6139);
  const [lng, setLng] = useState(77.209);
  /**
   * UTC offset for the chosen city. Kept because sunrise is a local
   * wall-clock hour: without it, choosing London still rendered Delhi's
   * sunrise, sunset, Rahu Kaal and every period derived from them.
   */
  const [tz, setTz] = useState(5.5);
  const [city, setCity] = useState("Delhi");
  const [activeTab, setActiveTab] = useState<TabId>("daily");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dailyData, setDailyData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chogData, setChogData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [horaData, setHoraData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gowriData, setGowriData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ghatiData, setGhatiData] = useState<any>(null);

  const reduced = useReducedMotion();
  const seqRef = useRef(0);

  useEffect(() => {
    document.title = "Panchang | AstroSeva";
  }, []);

  const handleCityChange = (c: { name: string; lat: number; lng: number; tz: number }) => {
    setCity(c.name);
    setLat(c.lat);
    setLng(c.lng);
    setTz(c.tz);
    // Results already on screen were computed for the previous city. Leaving
    // them up under the new city's label meant picking London showed Delhi's
    // Rahu Kaal while the header named London.
    setDailyData(null);
    setChogData(null);
    setHoraData(null);
    setGowriData(null);
    setGhatiData(null);
    setError("");
  };

  const fetchTab = async (tab: TabId) => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError("");
    try {
      switch (tab) {
        case "daily":
          setDailyData(await api.getPanchang(lat, lng, tz));
          break;
        case "choghadiya":
          setChogData(await api.getChoghadiya(lat, lng, tz));
          break;
        case "hora":
          setHoraData(await api.getHora(lat, lng, tz));
          break;
        case "gowri":
          setGowriData(await api.getGowri(lat, lng, tz));
          break;
        case "ghati":
          setGhatiData(await api.getGhatiMuhurat(lat, lng, tz));
          break;
      }
    } catch (e: unknown) {
      // Only the latest tab's outcome matters; stale responses are ignored.
      if (seq !== seqRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to fetch data");
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const tabDataLoaded = (tab: TabId) => {
    switch (tab) {
      case "daily": return !!dailyData;
      case "choghadiya": return !!chogData;
      case "hora": return !!horaData;
      case "gowri": return !!gowriData;
      case "ghati": return !!ghatiData;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* Header */}
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible">
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-1 heading-display">
          <span className="text-gradient-gold">Panchang</span>
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Daily Hindu calendar with tithi, nakshatra, yoga & auspicious timings
        </p>
      </motion.div>

      {/* City selector */}
      <motion.div className="glass-card p-5 mb-6" variants={slideUp}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="input-label" htmlFor="panchang-city">
              <MapPin size={12} className="inline mr-1" />City
            </label>
            <CitySearch
              id="panchang-city"
              value={city}
              onChange={handleCityChange}
              placeholder="Search city..."
            />
          </div>
          <div className="flex items-end">
            <button onClick={() => fetchTab(activeTab)} disabled={loading} className="btn-primary">
              {loading ? "Fetching..." : "Get Data"}
            </button>
          </div>
          <p className="text-xs self-end" style={{ color: "var(--text-tertiary)" }}>
            {city} &bull; {Math.abs(lat).toFixed(2)}°{lat >= 0 ? "N" : "S"},{" "}
            {Math.abs(lng).toFixed(2)}°{lng >= 0 ? "E" : "W"}
          </p>
        </div>
        {error && <p className="text-xs mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 overflow-x-auto" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              color: activeTab === tab.id ? "#C8956D" : "var(--text-tertiary)",
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="panchang-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                style={{ background: "#C8956D" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#C8956D" }} />
        </div>
      )}

      {/* Error (results area) */}
      {error && !loading && (
        <div className="glass-card p-8 text-center mb-10">
          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            Could not load {activeTab} data. Please try again.
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>{error}</p>
          <button onClick={() => fetchTab(activeTab)} className="btn-primary text-xs px-4 py-2">
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && (
        <motion.div
          key={activeTab}
          variants={staggerContainerCustom(stagger.normal, 0.05)}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          {activeTab === "daily" && dailyData && <DailyTab data={dailyData as any} />}
          {activeTab === "choghadiya" && chogData && <ChoghadiyaTab data={chogData as any} />}
          {activeTab === "hora" && horaData && <HoraTab data={horaData as any} />}
          {activeTab === "gowri" && gowriData && <GowriTab data={gowriData as any} />}
          {activeTab === "ghati" && ghatiData && <GhatiTab data={ghatiData as any} />}
          {!error && !tabDataLoaded(activeTab) && (
            <div className="glass-card p-10 text-center">
              <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                Nothing loaded for {city} yet.
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
                This tab is computed from {city}&apos;s sunrise, so it needs to be
                fetched for the location you selected.
              </p>
              <button onClick={() => fetchTab(activeTab)} className="btn-primary text-xs px-4 py-2">
                Get data
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ─── Daily ──────────────────────────────────────────────── */

function DailyTab({ data }: { data: any }) {
  const items = [
    { label: "Tithi", value: data.tithi.tithi_name, sub: `${data.tithi.paksha}` },
    { label: "Nakshatra", value: data.nakshatra.nakshatra_name, sub: `Pada ${data.nakshatra.pada}` },
    { label: "Yoga", value: data.yoga.yoga_name, sub: "" },
    { label: "Karana", value: data.karana.karana_name, sub: "" },
  ];

  return (
    <div className="space-y-6">
      {/* Date header */}
      <motion.div variants={staggerItem} className="glass-card p-5 text-center">
        <h2 className="text-lg font-display font-bold">{formatDate(data.date)}</h2>
      </motion.div>

      {/* Tithi / Nakshatra / Yoga / Karana grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <motion.div key={item.label} variants={staggerItem} className="glass-card p-5">
            <div className="text-[10px] uppercase tracking-wider mb-2 font-medium" style={{ color: "#C8956D" }}>
              {item.label}
            </div>
            <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {item.value}
            </div>
            {item.sub && (
              <div className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
                {item.sub}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Vara */}
      <motion.div variants={staggerItem} className="glass-card p-5 text-center">
        <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
          Vara (Day)
        </div>
        <div className="font-bold" style={{ color: "#C8956D" }}>
          {data.vara.vara_name} — Lord: {data.vara.vara_lord}
        </div>
      </motion.div>

      {/* Rahu & Gulika Kaal */}
      <motion.div variants={staggerItem} className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm" style={{ color: "#C8956D" }}>
          Rahu Kaal & Gulika Kaal
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: "rgba(200,149,109,0.06)", border: "1px solid rgba(200,149,109,0.12)" }}
          >
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--danger, #e5484d)" }}>
              Rahu Kaal
            </div>
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {data.rahu_kaal.start} — {data.rahu_kaal.end}
            </div>
          </div>
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: "rgba(200,149,109,0.06)", border: "1px solid rgba(200,149,109,0.12)" }}
          >
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#C8956D" }}>
              Gulika Kaal
            </div>
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {data.gulika_kaal.start} — {data.gulika_kaal.end}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sunrise / Sunset */}
      <motion.div variants={staggerItem} className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm" style={{ color: "#C8956D" }}>Sunrise & Sunset</h3>
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="text-2xl mb-1">☀</div>
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Sunrise</div>
            <div className="font-bold" style={{ color: "var(--text-primary)" }}>{data.sunrise}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">☾</div>
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Sunset</div>
            <div className="font-bold" style={{ color: "var(--text-primary)" }}>{data.sunset}</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Choghadiya ─────────────────────────────────────────── */

function ChoghadiyaTab({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <motion.div variants={staggerItem} className="glass-card p-5 text-center">
        <h2 className="text-lg font-display font-bold">{formatDate(data.date)}</h2>
        <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
          Sunrise {data.sunrise} · Sunset {data.sunset}
        </p>
      </motion.div>

      {/* Day Choghadiya */}
      <motion.div variants={staggerItem} className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm" style={{ color: "#C8956D" }}>Day Choghadiya</h3>
        <div className="space-y-2">
          {data.day_choghadiya?.map((ch: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ borderLeft: `3px solid ${choghadiyaColor(ch.type)}`, background: "var(--bg-surface)" }}
            >
              <div>
                <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{ch.name}</span>
                <span
                  className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ color: choghadiyaColor(ch.type), background: "rgba(200,149,109,0.08)" }}
                >
                  {ch.type}
                </span>
              </div>
              <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                {ch.start} — {ch.end}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Night Choghadiya */}
      <motion.div variants={staggerItem} className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm" style={{ color: "#C8956D" }}>Night Choghadiya</h3>
        <div className="space-y-2">
          {data.night_choghadiya?.map((ch: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ borderLeft: `3px solid ${choghadiyaColor(ch.type)}`, background: "var(--bg-surface)" }}
            >
              <div>
                <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{ch.name}</span>
                <span
                  className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ color: choghadiyaColor(ch.type), background: "rgba(200,149,109,0.08)" }}
                >
                  {ch.type}
                </span>
              </div>
              <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                {ch.start} — {ch.end}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Hora ───────────────────────────────────────────────── */

function HoraTab({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <motion.div variants={staggerItem} className="glass-card p-5 text-center">
        <h2 className="text-lg font-display font-bold">{formatDate(data.date)}</h2>
      </motion.div>

      {/* Day Hora */}
      <motion.div variants={staggerItem} className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm" style={{ color: "#C8956D" }}>Day Hora</h3>
        <div className="space-y-2">
          {data.day_hora?.map((h: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ borderLeft: `3px solid ${horaColor(h.type)}`, background: "var(--bg-surface)" }}
            >
              <div>
                <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{h.planet}</span>
                <span
                  className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ color: horaColor(h.type), background: "rgba(200,149,109,0.08)" }}
                >
                  {h.type}
                </span>
              </div>
              <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                {h.start} — {h.end}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Night Hora */}
      <motion.div variants={staggerItem} className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm" style={{ color: "#C8956D" }}>Night Hora</h3>
        <div className="space-y-2">
          {data.night_hora?.map((h: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ borderLeft: `3px solid ${horaColor(h.type)}`, background: "var(--bg-surface)" }}
            >
              <div>
                <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{h.planet}</span>
                <span
                  className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ color: horaColor(h.type), background: "rgba(200,149,109,0.08)" }}
                >
                  {h.type}
                </span>
              </div>
              <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                {h.start} — {h.end}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Gowri ──────────────────────────────────────────────── */

function GowriTab({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <motion.div variants={staggerItem} className="glass-card p-5 text-center">
        <h2 className="text-lg font-display font-bold">{formatDate(data.date)}</h2>
        <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Gowri Panchangam — 8 periods</p>
      </motion.div>

      <motion.div variants={staggerItem} className="glass-card p-5">
        <div className="space-y-2">
          {data.periods?.map((p: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ borderLeft: `3px solid ${gowriColor(p.nature)}`, background: "var(--bg-surface)" }}
            >
              <div>
                <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                <span
                  className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ color: gowriColor(p.nature), background: "rgba(200,149,109,0.08)" }}
                >
                  {p.nature}
                </span>
              </div>
              <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                {p.start} — {p.end}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Ghati Muhurat ──────────────────────────────────────── */

function GhatiTab({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <motion.div variants={staggerItem} className="glass-card p-5 text-center">
        <h2 className="text-lg font-display font-bold">{formatDate(data.date)}</h2>
        <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Do Ghati Muhurat Windows</p>
      </motion.div>

      <motion.div variants={staggerItem} className="glass-card p-5">
        <div className="space-y-2">
          {data.muhurats?.map((m: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ borderLeft: "3px solid #C8956D", background: "var(--bg-surface)" }}
            >
              <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{m.name}</span>
              <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                {m.start} — {m.end}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
