"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Calendar, Clock, Sun, Sunrise, Sunset, MapPin, Sparkles, Info,
} from "lucide-react";

import { api, type CityEntry, type Festival, type FestivalsResponse } from "@/lib/api";
import CitySearch from "@/components/CitySearch";
import {
  useReducedMotion,
  staggerContainerCustom,
  staggerItem,
  slideUp,
} from "@/lib/motion";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CATEGORIES = [
  { id: "", label: "All" },
  { id: "major", label: "Major" },
  { id: "minor", label: "Observances" },
  { id: "vrat", label: "Vrat" },
];

const DEFAULT_LOCATION = {
  latitude: 28.6139, longitude: 77.2090, timezone_offset: 5.5, label: "New Delhi, India",
};

/** Cities offered as quick picks; the search box covers the rest. */
const PRESETS: (typeof DEFAULT_LOCATION & { name: string })[] = [
  { name: "New Delhi", ...DEFAULT_LOCATION },
  { name: "Mumbai", latitude: 19.076, longitude: 72.8777, timezone_offset: 5.5, label: "Mumbai" },
  { name: "Kolkata", latitude: 22.5726, longitude: 88.3639, timezone_offset: 5.5, label: "Kolkata" },
  { name: "Chennai", latitude: 13.0827, longitude: 80.2707, timezone_offset: 5.5, label: "Chennai" },
  { name: "Bengaluru", latitude: 12.9716, longitude: 77.5946, timezone_offset: 5.5, label: "Bengaluru" },
  { name: "London", latitude: 51.5074, longitude: -0.1278, timezone_offset: 0, label: "London" },
  { name: "New York", latitude: 40.7128, longitude: -74.006, timezone_offset: -5, label: "New York" },
  { name: "Singapore", latitude: 1.3521, longitude: 103.8198, timezone_offset: 8, label: "Singapore" },
];

function prettyDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function shortDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  });
}

function nextYearOptions() {
  const y = new Date().getFullYear();
  return [y - 1, y, y + 1, y + 2, y + 3, y + 4, y + 5];
}

export default function FestivalsPage() {
  const now = new Date();
  const [month, setMonth] = useState<number | "all">(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [cityText, setCityText] = useState(DEFAULT_LOCATION.label);
  const [result, setResult] = useState<FestivalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getFestivals({
        month: month === "all" ? undefined : month,
        year,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone_offset: location.timezone_offset,
        category: category || undefined,
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load festivals.");
    } finally {
      setLoading(false);
    }
  }, [month, year, category, location]);

  // Fetching on mount and whenever a control changes is exactly what effects
  // are for; the loading flag is set here rather than derived so a slow first
  // paint still shows a skeleton.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const onPickCity = (city: CityEntry) => {
    setCityText(city.name);
    setLocation({
      latitude: city.lat,
      longitude: city.lng,
      // CityEntry carries a tz field; fall back to a longitude-derived offset.
      timezone_offset: city.tz ?? Math.round(city.lng / 15),
      label: city.name,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-14">
      <motion.div
        initial={reduced ? false : "hidden"}
        animate="visible"
        variants={slideUp}
        className="text-center mb-10"
      >
        <h1 className="heading-display text-3xl md:text-4xl font-bold mb-3">
          <span className="text-gradient-gold">Festival Calendar</span>
        </h1>
        <p className="text-sm max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          Every festival with the tithi it falls on, the sunrise and sunset that
          bound its day, and the muhurat in which it is observed. Dates are
          computed from the sky, not from a fixed list, so they hold for any
          year and for your location.
        </p>
      </motion.div>

      {/* Controls */}
      <div className="glass-card p-5 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="input-label" htmlFor="fest-year">Year</label>
            <select
              id="fest-year"
              className="input-field"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {nextYearOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="fest-month">Month</label>
            <select
              id="fest-month"
              className="input-field"
              value={month}
              onChange={(e) => setMonth(e.target.value === "all" ? "all" : Number(e.target.value))}
            >
              <option value="all">Whole year</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="fest-cat">Type</label>
            <select
              id="fest-cat"
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

          <div>
            <label className="input-label" htmlFor="fest-city">Location</label>
            <CitySearch id="fest-city" value={cityText} onChange={onPickCity} />
            <div className="flex flex-wrap gap-2 mt-3">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setCityText(p.name);
                    setLocation({ latitude: p.latitude, longitude: p.longitude, timezone_offset: p.timezone_offset, label: p.name });
                  }}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{
                    background: location.label === p.name ? "var(--gold)" : "rgba(200,149,109,0.12)",
                    color: location.label === p.name ? "#0a0a0f" : "var(--text-secondary)",
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
      </div>

      {error && (
        <p className="text-center mb-6" style={{ color: "var(--danger)" }}>{error}</p>
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6">
              <div className="shimmer h-24 w-full rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {!loading && result && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              <MapPin size={13} className="inline mr-1" />
              {result.location.label} &middot; {result.count} festival{result.count === 1 ? "" : "s"}
              {result.month ? ` in ${MONTHS[result.month - 1]}` : " this year"}
            </p>
          </div>

          {result.festivals.length === 0 && (
            <p className="text-center py-10" style={{ color: "var(--text-secondary)" }}>
              No festivals for this selection.
            </p>
          )}

          <motion.div
            variants={staggerContainerCustom(0.05)}
            initial={reduced ? false : "hidden"}
            animate="visible"
            className="space-y-4"
          >
            {result.festivals.map((f: Festival) => (
              <FestivalCard key={`${f.name}-${f.date}`} f={f} />
            ))}
          </motion.div>

          <p
            className="text-xs mt-8 flex items-start gap-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <Info size={13} className="mt-0.5 shrink-0" />
            {result.note}
          </p>
        </>
      )}
    </div>
  );
}

function FestivalCard({ f }: { f: Festival }) {
  const isSpan = f.span_days > 1;
  const catColor =
    f.category === "major" ? "#C8956D" : f.category === "vrat" ? "#87CEEB" : "#5DC88F";

  return (
    <motion.article variants={staggerItem} className="glass-card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <Sparkles size={16} style={{ color: catColor }} className="shrink-0" />
            {f.name}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            <Calendar size={13} className="inline mr-1" />
            {isSpan ? `${shortDate(f.date)} – ${shortDate(f.end_date)}` : prettyDate(f.date)}
          </p>
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full shrink-0"
          style={{ background: "rgba(200,149,109,0.14)", color: catColor }}
        >
          {f.category === "vrat" ? "Vrat" : f.category === "minor" ? "Observance" : "Major"}
        </span>
      </div>

      <p className="text-sm mt-3">{f.description}</p>
      {f.significance && (
        <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
          {f.significance}
        </p>
      )}

      {/* Timing grid */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4"
        style={{ borderTop: "1px solid rgba(200,149,109,0.12)" }}
      >
        <div>
          <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--text-secondary)" }}>
            <Sunrise size={11} className="inline mr-1" />Sunrise
          </div>
          <div className="text-sm font-mono">{f.sunrise}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--text-secondary)" }}>
            <Sunset size={11} className="inline mr-1" />Sunset
          </div>
          <div className="text-sm font-mono">{f.sunset}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--accent)" }}>
            <Clock size={11} className="inline mr-1" />Muhurat
          </div>
          <div className="text-sm font-mono">{f.muhurat.start} – {f.muhurat.end}</div>
          <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{f.muhurat.label}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--text-secondary)" }}>
            <Sun size={11} className="inline mr-1" />Rahu Kaal
          </div>
          <div className="text-sm font-mono">{f.rahu_kaal.start} – {f.rahu_kaal.end}</div>
        </div>
      </div>

      {/* Astronomical basis */}
      <div
        className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px]"
        style={{ color: "var(--text-secondary)" }}
      >
        <span>
          {f.paksha} {f.tithi_name} ({f.tithi_name_hi})
        </span>
        <span>Nakshatra {f.nakshatra} &middot; Pada {f.nakshatra_pada}</span>
        <span>Judged at {f.rule_time_label}</span>
        {f.tithi_basis === "evening" && (
          <span title="This tithi was skipped at the daytime window and is present only in the evening.">
            Evening tithi
          </span>
        )}
      </div>
    </motion.article>
  );
}
