"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Trash2 } from "lucide-react";
import { useReducedMotion, staggerContainerCustom, staggerItem, slideUp, stagger } from "@/lib/motion";
import HonestyNote from "@/components/HonestyNote";
import { LocalKeys, readLocal, writeLocal } from "@/lib/local";

interface MoleEntry {
  id: string;
  zone: string;
  side: string;
  size: string;
  color: string;
  noted: string;
  notes: string;
  log: { date: string; note: string }[];
}

const ZONES = [
  "Forehead", "Eyebrow", "Eyelid", "Nose", "Cheek (L)", "Cheek (R)",
  "Upper Lip", "Lower Lip", "Chin", "Ear (L)", "Ear (R)", "Neck",
  "Shoulder (L)", "Shoulder (R)", "Arm (L)", "Arm (R)", "Palm (L)", "Palm (R)",
  "Chest", "Back", "Abdomen", "Hip (L)", "Hip (R)", "Thigh (L)",
  "Thigh (R)", "Knee (L)", "Knee (R)", "Calf (L)", "Calf (R)", "Foot (L)", "Foot (R)",
];

const ZONE_MEANINGS: Record<string, string> = {
  Forehead: "Authority and fortune — right side traditionally more auspicious.",
  Cheek: "Relationships and social standing; clear skin here is prized in Samudra Sastra.",
  Nose: "Wealth and self-respect; a mole on the tip relates to quick spending.",
  Chin: "Determination and love of travel.",
  Neck: "Responsibility; front neck moles suggest artistic temperament.",
  Palm: "Rare and significant — traditionally read alongside palm lines.",
  Chest: "Ambition and drive; right side linked with success.",
  Back: "Hidden burdens or secret strengths carried quietly.",
};

function load(): MoleEntry[] {
  return readLocal<MoleEntry[]>(LocalKeys.moles, []);
}

export default function MolesPage() {
  const [entries, setEntries] = useState<MoleEntry[]>(() => load());
  const [zone, setZone] = useState(ZONES[0]);
  const [side, setSide] = useState("Right");
  const [size, setSize] = useState("Small");
  const [color, setColor] = useState("Brown");
  const [notes, setNotes] = useState("");
  const [logNote, setLogNote] = useState<Record<string, string>>({});
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = "Mole Tracker | AstroSeva";
  }, []);

  const persist = (list: MoleEntry[]) => {
    setEntries(list);
    writeLocal(LocalKeys.moles, list);
  };

  const add = () => {
    const entry: MoleEntry = {
      id: `${Date.now()}`,
      zone,
      side,
      size,
      color,
      noted: new Date().toISOString().slice(0, 10),
      notes,
      log: [{ date: new Date().toISOString().slice(0, 10), note: "First recorded." }],
    };
    persist([entry, ...entries]);
    setNotes("");
  };

  const remove = (id: string) => {
    if (!confirm("Delete this mole entry?")) return;
    persist(entries.filter((e) => e.id !== id));
  };

  const addLog = (id: string) => {
    const note = (logNote[id] || "").trim();
    if (!note) return;
    persist(
      entries.map((e) =>
        e.id === id
          ? { ...e, log: [...e.log, { date: new Date().toISOString().slice(0, 10), note }] }
          : e
      )
    );
    setLogNote((prev) => ({ ...prev, [id]: "" }));
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div variants={slideUp} initial={reduced ? false : "hidden"} animate="visible" className="text-center mb-8">
        <p className="heading-section mb-3">SAMUDRA SASTRA</p>
        <h1 className="heading-display font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>
          MOLE TRACKER <span className="text-gradient-gold">& DIARY</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Record mole positions on an interactive body map and keep a change diary.
          Moles that change shape, size, or color should be shown to a doctor first.
        </p>
          <HonestyNote>Records are stored on this device only and never leave your browser.</HonestyNote>
      </motion.div>

      {/* Add form */}
      <div className="glass-card p-5 mb-8">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Add Mole Entry</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="col-span-2">
            <label className="input-label" htmlFor="mole-zone">Body Zone</label>
            <select id="mole-zone" className="input-field" value={zone} onChange={(e) => setZone(e.target.value)}>
              {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="mole-side">Side</label>
            <select id="mole-side" className="input-field" value={side} onChange={(e) => setSide(e.target.value)}>
              {["Left", "Right", "Center"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="mole-size">Size</label>
            <select id="mole-size" className="input-field" value={size} onChange={(e) => setSize(e.target.value)}>
              {["Tiny", "Small", "Medium", "Large"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="input-label" htmlFor="mole-color">Color</label>
            <select id="mole-color" className="input-field" value={color} onChange={(e) => setColor(e.target.value)}>
              {["Brown", "Black", "Red", "Skin-toned"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="mole-notes">Notes</label>
            <input id="mole-notes" className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Shape, elevation…" />
          </div>
        </div>
        {(ZONE_MEANINGS[zone] || ZONE_MEANINGS[zone.replace(/ \(.*/, "")]) && (
          <p className="text-xs mb-4" style={{ color: "var(--champagne)" }}>
            Traditional note: {ZONE_MEANINGS[zone] || ZONE_MEANINGS[zone.replace(/ \(.*/, "")]}
          </p>
        )}
        <button onClick={add} className="btn-primary text-sm"><Plus size={14} /> Add Entry</button>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="glass-card p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          No moles recorded yet. Add your first entry above.
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          variants={staggerContainerCustom(stagger.normal, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {entries.map((e) => (
            <motion.div key={e.id} className="glass-card p-5" variants={staggerItem}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                    {e.zone} · {e.side}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {e.size} · {e.color} · noted {e.noted}
                  </p>
                </div>
                <button onClick={() => remove(e.id)} className="btn-ghost text-xs" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
              {e.notes && (
                <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>{e.notes}</p>
              )}
              <div className="space-y-1.5 mb-3">
                {e.log.map((l, i) => (
                  <p key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "#C8956D" }}>{l.date}</span> — {l.note}
                  </p>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input-field text-xs"
                  placeholder="Log a change…"
                  value={logNote[e.id] || ""}
                  onChange={(ev) => setLogNote((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                  onKeyDown={(ev) => { if (ev.key === "Enter") addLog(e.id); }}
                />
                <button onClick={() => addLog(e.id)} className="btn-ghost text-xs shrink-0">Log</button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
