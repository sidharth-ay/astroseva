"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Calculator, Monitor, Save, CheckCircle, AlertTriangle } from "lucide-react";
import { api, type SettingsResponse } from "@/lib/api";
import { useReducedMotion, slideUp } from "@/lib/motion";
import { LocalKeys, readLocal, writeLocal } from "@/lib/local";

const LANGUAGE_IDS = ["en", "hi"] as const;
type LanguageChoice = (typeof LANGUAGE_IDS)[number];

const LANGUAGES: { id: LanguageChoice; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिन्दी" },
];

const HOUSE_BLURBS: Record<string, string> = {
  "whole-sign": "Each sign is one whole house counted from the Lagna. The traditional Parashari default.",
  equal: "Each house spans exactly 30° measured from the Lagna degree.",
};

function readStored<T extends string>(key: (typeof LocalKeys)[keyof typeof LocalKeys], fallback: T, allowed: readonly T[]): T {
  const raw = readLocal<string | null>(key, null);
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [houseSystem, setHouseSystem] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  // Device preferences are read lazily so no effect has to write state back
  // after mount (`react-hooks/set-state-in-effect`). On the server the guard
  // inside `readStored` yields the fallback; on the client the first render
  // already shows the saved choice.
  const [language, setLanguage] = useState<LanguageChoice>(() => readStored(LocalKeys.language, "en", LANGUAGE_IDS));
  const reduced = useReducedMotion();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getSettings();
      setSettings(res);
      setHouseSystem(res.house_system);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Settings | AstroSeva";
    // Loading the saved setting on mount is exactly what effects are for;
    // the loading flag is set rather than derived so a slow first paint
    // still shows a skeleton instead of an empty form.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, [fetchSettings]);

  const saveHouseSystem = async () => {
    if (!houseSystem || (settings && houseSystem === settings.house_system)) return;
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const res = await api.updateSettings(houseSystem);
      setSettings(res);
      setHouseSystem(res.house_system);
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const chooseLanguage = (choice: LanguageChoice) => {
    setLanguage(choice);
    writeLocal(LocalKeys.language, choice);
  };

  const dirty = settings !== null && houseSystem !== "" && houseSystem !== settings.house_system;

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <motion.div
        className="text-center mb-8"
        variants={slideUp}
        initial={reduced ? false : "hidden"}
        animate="visible"
      >
        <p className="heading-section mb-3">SETTINGS</p>
        <h1
          className="heading-display font-bold mb-4"
          style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}
        >
          HOW YOUR <span className="text-gradient-gold">CHARTS</span> ARE DRAWN
        </h1>
        <p className="max-w-lg mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Calculation settings are saved to your account and change every chart. Display
          preferences stay on this device.
        </p>
      </motion.div>

      {/* Calculation */}
      <div className="glass-card p-5 mb-8">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <Calculator size={16} /> Calculation
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          The house system is used by Kundli, Doshas, Matching, Gemstones, Lal Kitab, and
          Reports. Charts you already generated keep the system they were drawn with.
        </p>

        {loading && <p style={{ color: "var(--text-secondary)" }}>Loading your settings…</p>}

        {error && !loading && (
          <div className="flex items-center gap-3 flex-wrap">
            <p className="flex items-center gap-2" style={{ color: "var(--color-error, #f87171)" }}>
              <AlertTriangle size={16} /> {error}
            </p>
            <button type="button" className="btn-secondary" onClick={fetchSettings}>
              Retry
            </button>
          </div>
        )}

        {settings && !loading && (
          <div>
            <div className="grid md:grid-cols-2 gap-3 mb-4" role="radiogroup" aria-label="House system">
              {settings.house_systems.map((system) => (
                <label
                  key={system}
                  className={`block p-4 rounded-lg cursor-pointer border transition-colors ${
                    houseSystem === system ? "border-amber-400" : "border-transparent"
                  }`}
                  style={{
                    background: "var(--surface-2)",
                    outline: houseSystem === system ? "1px solid var(--color-gold, #d4a017)" : "none",
                  }}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="house-system"
                      value={system}
                      checked={houseSystem === system}
                      onChange={() => {
                        setHouseSystem(system);
                        setSaved(false);
                        setSaveError("");
                      }}
                    />
                    {system === "whole-sign" ? "Whole Sign" : system === "equal" ? "Equal House" : system}
                    {system === settings.default_house_system && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface-3)" }}>
                        Default
                      </span>
                    )}
                  </span>
                  <span className="block text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    {HOUSE_BLURBS[system] ?? "A supported house system."}
                  </span>
                </label>
              ))}
            </div>

            {saveError && (
              <p className="flex items-center gap-2 mb-3" style={{ color: "var(--color-error, #f87171)" }}>
                <AlertTriangle size={16} /> {saveError}
              </p>
            )}
            {saved && !dirty && (
              <p className="flex items-center gap-2 mb-3" style={{ color: "var(--color-success, #4ade80)" }}>
                <CheckCircle size={16} /> Saved — new charts will use{" "}
                {houseSystem === "whole-sign" ? "Whole Sign" : houseSystem === "equal" ? "Equal House" : houseSystem}.
              </p>
            )}

            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2"
              onClick={saveHouseSystem}
              disabled={!dirty || saving}
            >
              <Save size={16} /> {saving ? "Saving…" : "Save calculation settings"}
            </button>
          </div>
        )}
      </div>

      {/* Display preferences */}
      <div className="glass-card p-5">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <Monitor size={16} /> This device
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Stored only in this browser — signing in elsewhere will not carry them over.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <span className="input-label" id="settings-theme-label">Theme</span>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Dark — the only theme. There is no light palette, so no light
              option is offered; a control promising one would be lying about
              what it does.
            </p>
          </div>

          <div>
            <label className="input-label" htmlFor="settings-language">
              Language
            </label>
            <select
              id="settings-language"
              className="input-field"
              value={language}
              onChange={(e) => chooseLanguage(e.target.value as LanguageChoice)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
