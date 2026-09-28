"use client";

import { useState } from "react";
import KundliChart from "@/components/KundliChart";
import {
  TabBar, StaggerWrap, ComingSoon, SubHeading, Field, Pill, Box, BoxLabel, Value,
  type KundliTabId,
} from "@/components/kundli/KundliTabs";
import type { KundliResponse, Planet } from "@/lib/api";

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
        {tab === "strength" && <ComingSoon what="Shadbala, Bhavabala & Prastharashtakavarga" />}
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

      <ComingSoon what="Planets Consideration (combust, pakshi, rules)" />
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
  const nav = result.dasha_info?.navamsa;
  return (
    <div className="space-y-6">
      {nav && Object.keys(nav).length > 0 && (
        <div className="glass-card p-4">
          <SubHeading>Navamsa (D9)</SubHeading>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(nav).map(([planet, sign]) => (
              <Box key={planet}>
                <BoxLabel>{planet}</BoxLabel>
                <Value>{SIGN_NAMES[sign as number]}</Value>
              </Box>
            ))}
          </div>
        </div>
      )}
      <ComingSoon what="Shodashvarga charts (D1–D12)" />
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
      <ComingSoon what="Vimshopaka bala & full nakshatra-pada profile" />
    </div>
  );
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
      <ComingSoon what="Planetary aspects, Navatara & Arudha charts" />
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

      <ComingSoon what="Manglik, Kaal Sarp, Sade Sati & Ghatak" />
    </div>
  );
}
