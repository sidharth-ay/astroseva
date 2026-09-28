"use client";

import { useState } from "react";
import Link from "next/link";
import KundliChart from "@/components/KundliChart";
import {
  TabBar, StaggerWrap, ComingSoon, SubHeading, Field, Pill, Box, BoxLabel, Value,
  type KundliTabId,
} from "@/components/kundli/KundliTabs";
import { api, type KundliResponse, type Planet, type BirthData, type DoshaResponse } from "@/lib/api";

const SIGN_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const NAK_NAMES = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];

const CHART_GRAHAS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];

function fmtHour(h: unknown): string {
  if (typeof h !== "number" || isNaN(h)) return "—";
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export default function KundliTabsPanel({
  result,
  chartStyle,
  setChartStyle,
}: {
  result: KundliResponse;
  chartStyle: "north" | "south";
  setChartStyle: (s: "north" | "south") => void;
}) {
  const [tab, setTab] = useState<KundliTabId>("chart");

  return (
    <div>
      <TabBar active={tab} onChange={setTab} />
      <StaggerWrap tabKey={tab}>
        {tab === "chart" && <ChartTab result={result} chartStyle={chartStyle} setChartStyle={setChartStyle} />}
        {tab === "planets" && <PlanetsTab result={result} />}
        {tab === "dasha" && <DashaTab result={result} />}
        {tab === "divisional" && <DivisionalTab result={result} />}
        {tab === "strength" && <StrengthTab result={result} />}
        {tab === "nakshatra" && <NakshatraTab result={result} />}
        {tab === "relationships" && <RelationshipsTab result={result} />}
        {tab === "karma" && <KarmaTab result={result} />}
      </StaggerWrap>
    </div>
  );
}

/* ─── 1. Chart ─────────────────────────────────────────────── */

function ChartTab({
  result,
  chartStyle,
  setChartStyle,
}: {
  result: KundliResponse;
  chartStyle: "north" | "south";
  setChartStyle: (s: "north" | "south") => void;
}) {
  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <SubHeading>Basic Details</SubHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Name" value={result.name || "—"} />
          <Field label="Date" value={result.birth_date} />
          <Field label="Time" value={result.birth_time} />
          <Field label="Place" value={result.birth_place} />
          <Field label="Latitude" value={result.latitude.toFixed(4)} />
          <Field label="Longitude" value={result.longitude.toFixed(4)} />
          <Field label="Ascendant" value={`${SIGN_NAMES[result.asc_sign]} ${result.asc_sign_degree.toFixed(1)}°`} />
          <Field label="Ayanamsa" value={`${result.ayanamsa.toFixed(2)}°`} />
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C8956D" }}>
            Birth Chart — {chartStyle === "north" ? "North Indian" : "South Indian"} Style
          </h3>
          <div
            className="flex gap-1 p-0.5 rounded-lg"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
            role="group"
            aria-label="Chart style"
          >
            {(["north", "south"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setChartStyle(s)}
                aria-pressed={chartStyle === s}
                className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors"
                style={
                  chartStyle === s
                    ? { background: "rgba(200, 149, 109, 0.15)", color: "#C8956D" }
                    : { color: "var(--text-tertiary)" }
                }
              >
                {s === "north" ? "North" : "South"}
              </button>
            ))}
          </div>
        </div>
        <KundliChart
          chart={result.chart}
          ascSign={result.asc_sign}
          chartStyle={chartStyle}
          planets={result.planets}
        />
        <p className="text-[10px] mt-3 text-center" style={{ color: "var(--text-tertiary)" }}>
          Numbers are signs; <span style={{ color: "var(--champagne)" }}>As</span> marks the ascendant. Su Mo Ma Me Ju Ve Sa Ra Ke, ℞ = retrograde.
        </p>
      </div>
    </div>
  );
}

/* ─── 2. Planets ───────────────────────────────────────────── */

function PlanetsTab({ result }: { result: KundliResponse }) {
  const byHouse = new Map<number, Planet[]>();
  for (const p of result.planets) {
    if (!p.house) continue;
    if (!byHouse.has(p.house)) byHouse.set(p.house, []);
    byHouse.get(p.house)!.push(p);
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <SubHeading>Planetary Positions</SubHeading>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Planet", "Sign", "Degree", "House", "Retro", "Dignity"].map((h) => (
                  <th key={h} className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-tertiary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.planets.map((p) => (
                <tr key={p.planet} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="py-2 px-2 font-medium" style={{ color: "var(--text-primary)" }}>
                    {p.planet}
                    {!CHART_GRAHAS.includes(p.planet) && (
                      <span className="ml-1 text-[9px]" style={{ color: "var(--text-tertiary)" }}>(outer)</span>
                    )}
                  </td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.sign_name}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.sign_degree.toFixed(2)}°</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.house ?? "—"}</td>
                  <td className="py-2 px-2">
                    {p.retrograde && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: "rgba(200, 149, 109, 0.08)", color: "var(--danger)" }}>
                        ℞
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.dignity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card p-4">
        <SubHeading>House Occupants</SubHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <Box key={h}>
              <BoxLabel>House {h}</BoxLabel>
              <div className="flex flex-wrap gap-1">
                {(byHouse.get(h) ?? []).map((p) => (
                  <Pill key={p.planet} small>{p.planet}{p.retrograde ? " ℞" : ""}</Pill>
                ))}
                {(byHouse.get(h) ?? []).length === 0 && (
                  <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>empty</span>
                )}
              </div>
            </Box>
          ))}
        </div>
      </div>

      <ConsiderationTab result={result} />
    </div>
  );
}

/* ─── 2b. Planets Consideration ────────────────────────────── */

function ConsiderationTab({ result }: { result: KundliResponse }) {
  const cons = result.extras?.consideration ?? [];
  if (cons.length === 0) return <ComingSoon what="Planets Consideration" />;

  return (
    <div className="glass-card p-4">
      <SubHeading count={cons.length}>Planets Consideration</SubHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Graha", "Pakshi", "Sign", "Dignity", "Combust"].map((h) => (
                <th key={h} className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-tertiary)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cons.map((c) => (
              <tr key={c.planet} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td className="py-2 px-2 font-medium" style={{ color: "var(--text-primary)" }}>{c.planet}</td>
                <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{c.pakshi}</td>
                <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>
                  {c.sign !== null ? SIGN_NAMES[c.sign] : "—"}
                  {c.sign_degree !== null ? ` ${Math.floor(c.sign_degree)}°` : ""}
                </td>
                <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{c.dignity}</td>
                <td className="py-2 px-2">
                  {c.combust ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                      style={{ background: "rgba(239,83,80,0.1)", color: "var(--danger)" }}>
                      Combust
                    </span>
                  ) : (
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      {c.pakshi_note || "—"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 3. Dasha ─────────────────────────────────────────────── */

function DashaTab({ result }: { result: KundliResponse }) {
  const d = result.dasha_info;
  if (!d) return <ComingSoon what="Vimshottari Dasha" />;
  const cur = d.current_dasha;

  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <SubHeading>Birth Nakshatra</SubHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Nakshatra" value={d.birth_nakshatra?.name ?? "—"} />
          <Field label="Pada" value={d.birth_nakshatra?.pada ?? "—"} />
          <Field label="Lord" value={d.birth_nakshatra?.lord ?? "—"} />
        </div>
      </div>

      {cur && (
        <div className="glass-card p-4">
          <SubHeading>Vimshottari Dasha — Current</SubHeading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "Mahadasha", v: cur.mahadasha, p: `${cur.mahadasha_start} — ${cur.mahadasha_end}` },
              { label: "Antardasha", v: cur.antardasha || "—", p: cur.antardasha ? `${cur.antardasha_start} — ${cur.antardasha_end}` : "" },
              { label: "Pratyantardasha", v: cur.pratyantardasha || "—", p: cur.pratyantardasha ? `${cur.pratyantardasha_start} — ${cur.pratyantardasha_end}` : "" },
              { label: "Sookshma", v: cur.sookshma || "—", p: cur.sookshma ? `${cur.sookshma_start} — ${cur.sookshma_end}` : "" },
              { label: "Prana", v: cur.prana || "—", p: cur.prana ? `${cur.prana_start} — ${cur.prana_end}` : "" },
            ].map((x) => (
              <Box key={x.label}>
                <BoxLabel>{x.label}</BoxLabel>
                <Value>{x.v}</Value>
                {x.p && <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{x.p}</div>}
              </Box>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-4">
        <SubHeading>Mahadasha Timeline</SubHeading>
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {(d.all_mahadashas ?? []).map((m, i) => {
            const isNow = cur?.mahadasha === m.lord;
            return (
              <div
                key={`${m.lord}-${i}`}
                className="flex items-center justify-between text-xs px-3 py-2 rounded-lg"
                style={{
                  background: isNow ? "rgba(200,149,109,0.08)" : "var(--bg-surface)",
                  border: `1px solid ${isNow ? "var(--border-active)" : "var(--border-subtle)"}`,
                }}
              >
                <span className="font-medium" style={{ color: isNow ? "var(--champagne)" : "var(--text-primary)" }}>
                  {m.lord}{isNow ? " · now" : ""}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>{m.start} → {m.end}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-4">
        <SubHeading>Yogini & Chara Dasha</SubHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Box>
            <BoxLabel>Yogini Dasha</BoxLabel>
            {d.current_yogini ? <Value>{d.current_yogini.yogini}</Value> : <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>—</span>}
            {d.current_yogini && <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{d.current_yogini.start} → {d.current_yogini.end}</div>}
          </Box>
          <Box>
            <BoxLabel>Chara Dasha</BoxLabel>
            {d.current_chara ? <Value>{SIGN_NAMES[d.current_chara.sign]} · {d.current_chara.lord}</Value> : <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>—</span>}
            {d.current_chara && <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{d.current_chara.start} → {d.current_chara.end}</div>}
          </Box>
        </div>
      </div>
    </div>
  );
}

/* ─── 4. Divisional ────────────────────────────────────────── */

function DivisionalTab({ result }: { result: KundliResponse }) {
  const vargas = result.extras?.vargas;
  const [picked, setPicked] = useState("D9");
  if (!vargas) return <ComingSoon what="Shodashvarga charts" />;

  const charts = Object.entries(vargas);
  const active = vargas[picked];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        {charts.map(([code, v]) => (
          <button
            key={code}
            onClick={() => setPicked(code)}
            aria-pressed={picked === code}
            className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors"
            style={{
              background: picked === code ? "rgba(200,149,109,0.15)" : "var(--bg-surface)",
              border: `1px solid ${picked === code ? "var(--border-active)" : "var(--border-subtle)"}`,
              color: picked === code ? "var(--champagne)" : "var(--text-tertiary)",
            }}
          >
            {code} · {v.name}
          </button>
        ))}
      </div>

      {active && (
        <div className="glass-card p-4">
          <SubHeading>
            {picked} {active.name} — Ascendant in {SIGN_NAMES[active.asc_sign]}
          </SubHeading>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(active.planets).map(([planet, sign]) => (
              <Box key={planet}>
                <BoxLabel>{planet}</BoxLabel>
                <Value>{SIGN_NAMES[sign as number]}</Value>
              </Box>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-4">
        <SubHeading count={charts.length}>All Divisional Charts</SubHeading>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Chart", "Name", "As", "Sun", "Moon", "Mars", "Mer", "Jup", "Ven", "Sat", "Rahu", "Ketu"].map((h) => (
                  <th key={h} className="text-left py-2 px-2 font-medium whitespace-nowrap" style={{ color: "var(--text-tertiary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {charts.map(([code, v]) => (
                <tr key={code} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="py-2 px-2 font-medium" style={{ color: "var(--champagne)" }}>{code}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{v.name}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{SIGN_NAMES[v.asc_sign]}</td>
                  {(["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as const).map((g) => {
                    const s = v.planets[g];
                    return (
                      <td key={g} className="py-2 px-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                        {s === undefined ? "—" : SIGN_NAMES[s].slice(0, 3)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── 5. Strength ──────────────────────────────────────────── */

function StrengthTab({ result }: { result: KundliResponse }) {
  const sh = result.extras?.shadbala;
  const bh = result.extras?.bhavabala;
  const av = result.extras?.ashtakavarga;
  const pav = result.extras?.pav;
  if (!sh || !bh || !av) return <ComingSoon what="Shadbala, Bhavabala & Ashtakavarga" />;

  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <SubHeading>Shadbala — Six-Fold Strength</SubHeading>
        <p className="text-[10px] mb-3" style={{ color: "var(--text-tertiary)" }}>
          Sthana, Dig, Kala, Cheshta, Naisargika and Drik, each max 60. Total
          strength is shown in Rupas (max 6.0).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Graha", "H", "Sth", "Dig", "Kala", "Cheshta", "Nais", "Drik", "Total", "Grades"].map((h) => (
                  <th key={h} className="text-left py-2 px-2 font-medium whitespace-nowrap" style={{ color: "var(--text-tertiary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sh.planets.map((p) => (
                <tr key={p.planet} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="py-2 px-2 font-medium" style={{ color: "var(--text-primary)" }}>{p.planet}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.house}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.sthana.toFixed(0)}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.dig.toFixed(0)}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.kala.toFixed(0)}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.cheshta.toFixed(0)}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.naisargika.toFixed(0)}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{p.drik.toFixed(0)}</td>
                  <td className="py-2 px-2 font-medium" style={{ color: "var(--champagne)" }}>{p.total_rupa.toFixed(2)}</td>
                  <td className="py-2 px-2 whitespace-nowrap" style={{ color: "var(--text-tertiary)" }}>
                    {[
                      p.bhasa_rupa ? "Bhasa" : null,
                      p.bhava_rupa ? "Bhava" : null,
                      p.dhruva_rupa ? "Dhruva" : null,
                    ].filter(Boolean).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] mt-3" style={{ color: "var(--text-tertiary)" }}>
          Strongest: {sh.strongest ?? "—"} · Weakest: {sh.weakest ?? "—"}
        </p>
      </div>

      <div className="glass-card p-4">
        <SubHeading>Bhavabala — House Strength</SubHeading>
        <p className="text-[10px] mb-3" style={{ color: "var(--text-tertiary)" }}>
          Total {bh.total_rava} of {bh.max_total} rawa. Strongest house: {bh.strongest ?? "—"}.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {bh.houses.map((h) => (
            <Box key={h.house}>
              <BoxLabel>H{h.house} · {h.sign_name}</BoxLabel>
              <Value>{h.rava.toFixed(1)}</Value>
              {h.planets.length > 0 && (
                <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                  {h.planets.join(", ")}
                </div>
              )}
            </Box>
          ))}
        </div>
      </div>

      <div className="glass-card p-4">
        <SubHeading>Ashtakavarga</SubHeading>
        <p className="text-[10px] mb-3" style={{ color: "var(--text-tertiary)" }}>
          {av.method}. Not yet validated against published binding tables, so
          treat point totals as a faithful reconstruction.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Graha", "Sign", "Total", "Own sign", "Asc sign"].map((h) => (
                  <th key={h} className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(av.per_graha).map(([graha, v]) => (
                <tr key={graha} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="py-2 px-2 font-medium" style={{ color: "var(--text-primary)" }}>{graha}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{SIGN_NAMES[v.occupied_sign]}</td>
                  <td className="py-2 px-2 font-medium" style={{ color: "var(--champagne)" }}>{v.total_points}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{v.in_own_sign} · {v.grade_own}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{v.in_asc_sign} · {v.grade_asc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          {av.by_sign.map((x) => (
            <Box key={x.sign}>
              <BoxLabel>H{x.house} · {SIGN_NAMES[x.sign]}</BoxLabel>
              <Value>{x.grahas_binding} / 7</Value>
            </Box>
          ))}
        </div>
      </div>

      {pav && (
        <div className="glass-card p-4">
          <SubHeading>Prastharashtakvarga</SubHeading>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Box><BoxLabel>Lagna chart</BoxLabel><Value>{pav.lagna_total}</Value></Box>
            <Box><BoxLabel>Sukarma</BoxLabel><Value>{pav.sukarma_total}</Value></Box>
            <Box><BoxLabel>Nabansaka ({pav.seventh_lord})</BoxLabel><Value>{pav.nabansaka_total}</Value></Box>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {pav.lagna_chart.map((x) => (
              <Box key={x.sign}>
                <BoxLabel>H{x.house} · {SIGN_NAMES[x.sign]}</BoxLabel>
                <Value>{x.points}</Value>
              </Box>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 6. Nakshatra ─────────────────────────────────────────── */

function NakshatraTab({ result }: { result: KundliResponse }) {
  const birthNak = result.dasha_info?.birth_nakshatra;
  const moon = result.planets.find((p) => p.planet === "Moon");
  const moonSignNak = moon ? Math.floor((moon.sign * 30 + moon.sign_degree) / (360 / 27)) : null;

  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <SubHeading>Your Nakshatra</SubHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Nakshatra" value={birthNak?.name ?? "—"} />
          <Field label="Pada" value={birthNak?.pada ?? "—"} />
          <Field label="Lord" value={birthNak?.lord ?? "—"} />
          <Field label="Moon sign" value={moon?.sign_name ?? "—"} />
        </div>
        {moonSignNak !== null && (
          <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
            Moon falls in <strong style={{ color: "var(--champagne)" }}>{NAK_NAMES[moonSignNak]}</strong>.
          </p>
        )}
      </div>
      <NakshatraProfileTab result={result} />
    </div>
  );
}

/* ─── 6b. Vimshopaka Bala ──────────────────────────────────── */

const VIMSHOPAKA = [
  { name: "Bala", lord: "Sun", scores: [1.5, 1.5, 0.5, 0.5, 2.0, 1.0, 3.5, 1.5, 2.5, 2.0, 1.0, 0.5] },
  { name: "Kala", lord: "Saturn", scores: [3.0, 1.5, 1.5, 3.0, 3.0, 3.0, 2.5, 0.0, 0.0, 2.0, 1.5, 5.0] },
  { name: "Cheshta", lord: "Jupiter", scores: [5.0, 1.0, 1.5, 1.0, 1.5, 1.0, 1.0, 2.5, 5.0, 3.0, 1.0, 6.0] },
  { name: "Aiswarya", lord: "Mercury", scores: [1.0, 6.0, 2.0, 1.5, 2.5, 5.0, 2.0, 4.0, 2.0, 2.0, 4.0, 1.5] },
  { name: "Maitri", lord: "Mars", scores: [3.5, 1.5, 1.5, 3.0, 3.5, 1.0, 0.5, 1.5, 1.5, 4.0, 4.0, 1.0] },
  { name: "Dhana", lord: "Venus", scores: [2.0, 6.0, 2.0, 2.0, 2.0, 2.0, 6.0, 2.0, 2.0, 1.5, 5.0, 1.0] },
];

const VIMSHOPAKA_TOTAL = 20.0

function NakshatraProfileTab({ result }: { result: KundliResponse }) {
  const asc = result.asc_sign;
  const dasha = result.dasha_info;
  const moon = result.planets.find((p) => p.planet === "Moon");

  const scoreFor = (signIdx: number) =>
    VIMSHOPAKA.reduce((tot, v) => tot + v.scores[signIdx], 0);

  const ascTotal = scoreFor(asc);
  const moonTotal = moon ? scoreFor(moon.sign) : null;

  const rows = [
    { label: "Moon", idx: moon?.sign ?? null, total: moonTotal, nak: moonSignNak(moon) },
    { label: "Ascendant", idx: asc, total: ascTotal, nak: ascSignNak(asc) },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <SubHeading>Vimshopaka Bala</SubHeading>
        <p className="text-[10px] mb-3" style={{ color: "var(--text-tertiary)" }}>
          Six-fold strength of the six natural benefics by sign. Total 20 across all six.
        </p>
        <div className="space-y-2">
          {rows.map((r) => (
            <Box key={r.label}>
              <BoxLabel>{r.label}</BoxLabel>
              <Value>
                {r.idx !== null ? `${SIGN_NAMES[r.idx]} · ${r.total?.toFixed(2)} / ${VIMSHOPAKA_TOTAL}` : "—"}
              </Value>
              {r.nak && (
                <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                  {r.nak}
                </div>
              )}
            </Box>
          ))}
        </div>
      </div>

      <div className="glass-card p-4">
        <SubHeading>Nakshatra Breakdown</SubHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Birth nakshatra" value={dasha?.birth_nakshatra?.name ?? "—"} />
          <Field label="Pada" value={dasha?.birth_nakshatra?.pada ?? "—"} />
          <Field label="Nakshatra lord" value={dasha?.birth_nakshatra?.lord ?? "—"} />
          <Field label="Moon sign" value={moon?.sign_name ?? "—"} />
        </div>
      </div>
    </div>
  );
}

function moonSignNak(moon: Planet | undefined): string | null {
  if (!moon) return null;
  const idx = Math.floor((moon.sign * 30 + moon.sign_degree) / (360 / 27));
  return `${NAK_NAMES[Math.min(idx, 26)]} · pada ${Math.floor(
    ((moon.sign * 30 + moon.sign_degree) % (360 / 27)) / (360 / 108)
  ) + 1}`;
}

function ascSignNak(ascSign: number): string {
  const deg = 15;
  const idx = Math.floor((ascSign * 30 + deg) / (360 / 27));
  return `${NAK_NAMES[Math.min(idx, 26)]}`;
}

/* ─── 7. Relationships ─────────────────────────────────────── */

function RelationshipsTab({ result }: { result: KundliResponse }) {
  const friends = result.extras?.friendships;
  const grahas = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

  return (
    <div className="space-y-6">
      {friends && (
        <div className="glass-card p-4">
          <SubHeading>Friendship Table</SubHeading>
          <p className="text-[10px] mb-3" style={{ color: "var(--text-tertiary)" }}>
            Natural (Parasari) relationship of each graha to the others.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-tertiary)" }}>Graha</th>
                  <th className="text-left py-2 px-2 font-medium" style={{ color: "var(--success)" }}>Friends</th>
                  <th className="text-left py-2 px-2 font-medium" style={{ color: "var(--danger)" }}>Enemies</th>
                  <th className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-tertiary)" }}>Neutral</th>
                </tr>
              </thead>
              <tbody>
                {grahas.map((g) => {
                  const f = friends[g];
                  if (!f) return null;
                  return (
                    <tr key={g} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="py-2 px-2 font-medium" style={{ color: "var(--text-primary)" }}>{g}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{f.friends.join(", ") || "—"}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{f.enemies.join(", ") || "—"}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-secondary)" }}>{f.neutral.join(", ") || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AspectsTab result={result} />
      <GhatakTab result={result} />
      <NavataraArudhaTabs result={result} />
    </div>
  );
}

/* ─── 7d. Navatara & Arudha ────────────────────────────────── */

function NavataraArudhaTabs({ result }: { result: KundliResponse }) {
  const nav = result.extras?.navatara;
  const aru = result.extras?.arudha;
  if (!nav && !aru) return <ComingSoon what="Navatara & Arudha charts" />;

  return (
    <div className="space-y-6">
      {nav && (
        <div className="glass-card p-4">
          <SubHeading count={nav.grahas.length}>Navatara</SubHeading>
          <p className="text-[10px] mb-3" style={{ color: "var(--text-tertiary)" }}>
            Nine-fold gem suitability, from the graha's base score adjusted by
            its sign. Most suitable: {nav.most_suitable ?? "—"} · least: {nav.least_suitable ?? "—"}.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {nav.grahas.map((g) => (
              <Box key={g.planet}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{g.planet}</span>
                  <span className="text-sm font-medium" style={{ color: g.suitable ? "var(--success)" : "var(--danger)" }}>
                    {g.total}
                  </span>
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  {g.sign_name} · base {g.published_total} · {g.suitable ? "suitable" : "not suitable"}
                </div>
              </Box>
            ))}
          </div>
        </div>
      )}

      {aru && (
        <div className="glass-card p-4">
          <SubHeading>Arudha Chart</SubHeading>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <Field label="Arudha Lagna (A1)" value={aru.arudha_lagna_name} />
            <Field label="A1 house" value={String(aru.arudha_house)} />
            <Field label="Ascendant" value={SIGN_NAMES[aru.asc_sign]} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {aru.arudhas.map((a) => (
              <Box key={a.planet}>
                <BoxLabel>{a.planet} · {a.sign_name}</BoxLabel>
                <Value>{a.arudha_name}</Value>
                <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>House {a.house}</div>
              </Box>
            ))}
          </div>
          {aru.parivartana.length > 0 && (
            <div className="mt-3">
              <SubHeading>Parivartana (exchange)</SubHeading>
              {aru.parivartana.map((x, i) => (
                <p key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {x.planets.join(" ↔ ")} in {SIGN_NAMES[x.signs[0]]} ↔ {SIGN_NAMES[x.signs[1]]}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── 7b. Planetary Aspects ────────────────────────────────── */

function AspectsTab({ result }: { result: KundliResponse }) {
  const aspects = result.extras?.aspects;
  if (!aspects) return <ComingSoon what="Planetary Aspects" />;
  const rows = Object.entries(aspects.by_planet);
  if (rows.length === 0) return <ComingSoon what="Planetary Aspects" />;

  return (
    <div className="glass-card p-4">
      <SubHeading>Planetary Aspects</SubHeading>
      <p className="text-[10px] mb-3" style={{ color: "var(--text-tertiary)" }}>
        Every graha aspects the 7th from itself; Mars, Jupiter and Saturn add the
        5th, Jupiter and Saturn the 9th, Saturn the 3rd.
      </p>
      <div className="space-y-3">
        {rows.map(([planet, list]) => (
          <div key={planet} className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: "var(--champagne)", minWidth: 62 }}>
              {planet}
            </span>
            {list.map((a) => (
              <Pill
                key={`${a.planet}-${a.aspect_index}`}
                small
                color={a.nature === "Benefic" ? "var(--success)" : "var(--danger)"}
              >
                {a.planet} · {a.aspect}
              </Pill>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 7c. Ghatak & Somatilak ───────────────────────────────── */

function GhatakTab({ result }: { result: KundliResponse }) {
  const g = result.extras?.ghatak;
  const s = result.extras?.somatilak;
  if (!g) return null;

  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <SubHeading>Ghatak (Malefics) &amp; Favourable Points</SubHeading>
        {g.ascendant_ghatak.map((x) => (
          <Box key={x.index}>
            <BoxLabel>Ghatak {x.index + 1}</BoxLabel>
            <Value>
              {x.name} <span style={{ color: "var(--text-secondary)" }}>({x.lord})</span>
            </Value>
            <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
              {SIGN_NAMES[x.sign]} {x.deg_in_sign.toFixed(2)}° —{" "}
              {x.benefic_for_ascendant ? "favourable" : "malefic"} for this ascendant
            </div>
          </Box>
        ))}
        <p className="text-[10px] mt-3" style={{ color: "var(--text-tertiary)" }}>
          Favourable Ghatak points for this chart: {g.benefic_count} of 27.
        </p>
      </div>

      {s && (
        <div className="glass-card p-4">
          <SubHeading>Somatilak</SubHeading>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Somatilak" value={s.somatilak} />
            <Field label="Sign lord" value={s.lord} />
            <Field label="Nakshatra" value={s.nakshatra} />
          </div>
        </div>
      )}

      <div className="glass-card p-4">
        <SubHeading count={27}>All 27 Ghatakas</SubHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {g.all.map((x) => (
            <div
              key={x.index}
              className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg"
              style={{
                background: x.applied ? "rgba(200,149,109,0.1)" : "var(--bg-surface)",
                border: `1px solid ${x.applied ? "var(--border-active)" : "var(--border-subtle)"}`,
              }}
            >
              <span style={{ color: x.applied ? "var(--champagne)" : "var(--text-secondary)" }}>
                {x.index + 1}. {x.name}
              </span>
              <span style={{ color: x.benefic_for_ascendant ? "var(--success)" : "var(--text-tertiary)" }}>
                {x.benefic_for_ascendant ? "benefic" : "malefic"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── 8. Karma & Dosha ─────────────────────────────────────── */

function KarmaTab({ result }: { result: KundliResponse }) {
  const e = result.extras;
  const yogas = result.dasha_info?.yogas ?? [];

  return (
    <div className="space-y-6">
      {e?.avakahada && (
        <div className="glass-card p-4">
          <SubHeading>Avakahada Chakra</SubHeading>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(e.avakahada).map(([k, v]) => (
              <Field key={k} label={k.replace(/_/g, " ")} value={String(v)} />
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-4">
        <SubHeading>Karak & Ishta Devata</SubHeading>
        {e?.ishta_devata?.deity && (
          <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
            Ishta Devata: <strong style={{ color: "var(--champagne)" }}>{e.ishta_devata.deity}</strong>
            {e.ishta_devata.planet ? ` (Atmakaraka ${e.ishta_devata.planet})` : ""}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {(e?.chara_karakas ?? []).map((k) => (
            <Pill key={k.role}>{k.role}: {k.planet}</Pill>
          ))}
        </div>
        {(!e?.chara_karakas || e.chara_karakas.length === 0) && (
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            No karakas assigned — the seven-graha set was incomplete.
          </p>
        )}
      </div>

      {e?.avastha && Object.keys(e.avastha).length > 0 && (
        <div className="glass-card p-4">
          <SubHeading>Avastha</SubHeading>
          <p className="text-[10px] mb-3" style={{ color: "var(--text-tertiary)" }}>
            Graha age-stage by in-sign degree. Seven grahas only.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(e.avastha).map(([planet, state]) => (
              <Box key={planet}>
                <BoxLabel>{planet}</BoxLabel>
                <div className="text-xs" style={{ color: "var(--text-primary)" }}>{state}</div>
              </Box>
            ))}
          </div>
        </div>
      )}

      {e?.birth_panchang && (
        <div className="glass-card p-4">
          <SubHeading>Panchang at Birth</SubHeading>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Tithi" value={`${e.birth_panchang.tithi} (${e.birth_panchang.paksha})`} />
            <Field label="Nakshatra" value={`${e.birth_panchang.nakshatra} · Pada ${e.birth_panchang.pada}`} />
            <Field label="Yoga" value={String(e.birth_panchang.yoga)} />
            <Field label="Karana" value={String(e.birth_panchang.karana)} />
            <Field label="Sunrise" value={fmtHour(e.sunrise)} />
            <Field label="Sunset" value={fmtHour(e.sunset)} />
            <Field label="Julian Day" value={String(e.julian_day)} />
          </div>
        </div>
      )}

      {yogas.length > 0 && (
        <div className="glass-card p-4">
          <SubHeading count={yogas.length}>Yogas</SubHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {yogas.map((y) => (
              <Box key={y.name}>
                <div className="text-sm font-medium mb-1" style={{ color: "var(--champagne)" }}>{y.name}</div>
                <div className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{y.description}</div>
              </Box>
            ))}
          </div>
        </div>
      )}

      <DoshaPanel birthData={{
        name: result.name, birth_date: result.birth_date, birth_time: result.birth_time,
        birth_place: result.birth_place, latitude: result.latitude,
        longitude: result.longitude, timezone_offset: 5.5,
      }} />
    </div>
  );
}

/* ─── Dosha panel (lazy, via API — engine lives in core/doshas.py) ─── */

function DoshaPanel({ birthData }: { birthData: BirthData }) {
  const [doshas, setDoshas] = useState<DoshaResponse | null>(null);
  const [periods, setPeriods] = useState<{ phase: string; start: string; end: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPeriods, setShowPeriods] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setDoshas(await api.detectDoshas(birthData));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check doshas.");
    } finally {
      setLoading(false);
    }
  };

  const loadPeriods = async () => {
    setShowPeriods(true);
    if (periods) return;
    setError("");
    try {
      const res = await api.getSadePeriods(birthData);
      setPeriods(res.periods || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Sade Sati periods.");
    }
  };

  if (!doshas && !loading && !error) {
    return (
      <div className="glass-card p-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C8956D" }}>
            Doshas
          </h3>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
            Manglik, Kaal Sarp, Sade Sati and Pitru.
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-xs">Check Doshas</button>
      </div>
    );
  }

  if (loading && !doshas) {
    return <div className="shimmer h-24 w-full rounded-lg" />;
  }

  if (error && !doshas) {
    return (
      <div className="glass-card p-4 flex items-center justify-between gap-3">
        <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>
        <button onClick={load} className="btn-ghost text-xs">Retry</button>
      </div>
    );
  }

  if (!doshas) return null;
  const d = doshas;

  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <SubHeading>Doshas ({d.total_doshas} active)</SubHeading>
          <Link href="/doshas" className="text-xs font-medium" style={{ color: "#C8956D" }}>
            Full report &amp; remedies →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Manglik", on: d.manglik.is_manglik, note: d.manglik.severity },
            { label: "Kaal Sarp", on: d.kaal_sarp.has_dosha, note: d.kaal_sarp.kaal_sarp_type || "" },
            { label: "Sade Sati", on: d.sade_sati.is_active, note: (d.sade_sati.phase || "").split(" ")[0] },
            { label: "Pitru", on: d.pitru_dosha.has_dosha, note: `${d.pitru_dosha.conditions.length} condition${d.pitru_dosha.conditions.length === 1 ? "" : "s"}` },
          ].map((x) => (
            <Box key={x.label}>
              <BoxLabel>{x.label}</BoxLabel>
              <div className="text-sm font-medium" style={{ color: x.on ? "var(--danger)" : "var(--success)" }}>
                {x.on ? (x.note || "Present") : "Clear"}
              </div>
            </Box>
          ))}
        </div>
      </div>

      <div className="glass-card p-4">
        <SubHeading>Manglik Dosha</SubHeading>
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          {d.manglik.description}
        </p>
        {d.manglik.cancellation_reason && (
          <p className="text-xs mb-2" style={{ color: "var(--text-tertiary)" }}>
            {d.manglik.cancellation_reason}
          </p>
        )}
        {(d.manglik.positions || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {d.manglik.positions!.map((p, i) => (
              <Pill key={i} small color={p.severity === "High" ? "var(--danger)" : "var(--text-secondary)"}>
                H{p.house} {p.chart} · {p.severity}
              </Pill>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-4">
        <SubHeading>Kaal Sarp Dosha</SubHeading>
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          {d.kaal_sarp.description}
        </p>
        {d.kaal_sarp.has_dosha && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Type" value={d.kaal_sarp.kaal_sarp_type || "—"} />
            <Field label="Rahu house" value={d.kaal_sarp.rahu_house ?? "—"} />
            <Field label="Ketu house" value={d.kaal_sarp.ketu_house ?? "—"} />
          </div>
        )}
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <SubHeading>Sade Sati</SubHeading>
          {!showPeriods && (
            <button onClick={loadPeriods} className="btn-ghost text-xs">Load Periods</button>
          )}
        </div>
        <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
          {d.sade_sati.description}
        </p>
        {d.sade_sati.transit_based && (
          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            Based on transiting Saturn as of today.
          </p>
        )}
        {showPeriods && (
          <div className="mt-3">
            {periods === null ? (
              <div className="shimmer h-20 w-full rounded-lg" />
            ) : periods.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>No Sade Sati windows found.</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {periods.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                    <span className="font-medium" style={{ color: p.phase === "Peak" ? "var(--danger)" : "var(--champagne)" }}>{p.phase}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{p.start} → {p.end}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass-card p-4">
        <SubHeading>Pitru Dosha</SubHeading>
        <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
          {d.pitru_dosha.description}
        </p>
        {d.pitru_dosha.conditions.length > 0 && (
          <ul className="space-y-1">
            {d.pitru_dosha.conditions.map((c, i) => (
              <li key={i} className="text-xs flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--danger)" }}>·</span>{c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
