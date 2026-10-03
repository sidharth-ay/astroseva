"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Save } from "lucide-react";

import { api, locationFromCity, type BirthProfile, type CityEntry } from "@/lib/api";
import CitySearch from "@/components/CitySearch";

/**
 * Editor for the birth profile the account carries.
 *
 * This is the single source of truth every chart reads, so the panel says so
 * plainly and warns before a change: correcting these details recalculates
 * every future chart. Saved charts are left alone -- they are records of what
 * was true when they were drawn, not a second copy of the profile.
 */
export default function BirthProfileEditor() {
  const [profile, setProfile] = useState<(BirthProfile & { name: string }) | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [place, setPlace] = useState("");
  const [city, setCity] = useState<CityEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const applyProfile = useCallback((me: BirthProfile & { name: string }) => {
    setProfile(me);
    setName(me.name ?? "");
    setGender(me.gender ?? "");
    setBirthDate(me.birth_date ?? "");
    setBirthTime(me.birth_time ?? "");
    setPlace(me.birth_place ?? "");
    // Rebuild the selected city from what the profile already stores. Without
    // this the city only ever existed as typed text, so saving an unrelated
    // field failed with "pick your birth city" for a user who had already
    // picked one -- the form demanded a choice the page was showing as made.
    setCity(
      me.birth_place && me.latitude !== null
        ? {
            name: me.birth_place,
            lat: me.latitude,
            lng: me.longitude ?? 0,
            tz: me.timezone_offset ?? 0,
            tz_iana: me.timezone_iana ?? undefined,
          }
        : null,
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Reading the profile on mount is what effects are for; it settles
    // asynchronously and reports failure rather than cascading renders.
    api.getMe().then(
      (me) => {
        if (!cancelled) {
          setLoading(false);
          applyProfile(me);
        }
      },
      (e: unknown) => {
        if (!cancelled) {
          setLoading(false);
          setLoadError(e instanceof Error ? e.message : "Could not load your profile.");
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [applyProfile]);

  const save = async () => {
    if (!profile) return;
    setSaveError("");
    setSaved(false);
    if (!birthDate) {
      setSaveError("Enter your date of birth.");
      return;
    }
    if (!birthTime) {
      setSaveError("Enter your birth time. An approximate time is fine.");
      return;
    }
    if (!city) {
      setSaveError("Pick your birth city from the list.");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        name: name.trim(),
        gender: gender || null,
        birth_date: birthDate,
        birth_time: birthTime,
        ...locationFromCity(city),
      });
      applyProfile(updated);
      // Re-apply the values the response did not echo back (it carries no
      // name), so a partial response cannot blank the form.
      setName(name.trim() || profile.name || "");
      setCity({
        name: updated.birth_place ?? place,
        lat: updated.latitude ?? 0,
        lng: updated.longitude ?? 0,
        tz: updated.timezone_offset ?? 0,
        tz_iana: updated.timezone_iana ?? undefined,
      });
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save your details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p style={{ color: "var(--text-secondary)" }}>Loading your birth details…</p>;
  }

  if (loadError || !profile) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <p className="flex items-center gap-2" style={{ color: "var(--color-error, #f87171)" }}>
          <AlertTriangle size={16} /> {loadError || "Your profile could not be loaded."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs mb-4 p-3 rounded-lg" style={{ color: "var(--text-tertiary)", background: "var(--surface-2)", lineHeight: 1.6 }}>
        These details are the source for every chart, horoscope and dosha on the
        site. Changing them recalculates future charts; charts you have already
        saved stay as they were drawn.
      </p>

      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="input-label" htmlFor="set-name">Name</label>
          <input
            id="set-name"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="input-label" htmlFor="set-gender">Gender</label>
          <select
            id="set-gender"
            className="input-field"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="input-label" htmlFor="set-birth-date">Date of birth</label>
          <input
            id="set-birth-date"
            type="date"
            className="input-field"
            value={birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>
        <div>
          <label className="input-label" htmlFor="set-birth-time">Time of birth</label>
          <input
            id="set-birth-time"
            type="time"
            className="input-field"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="input-label" htmlFor="set-birth-place">Birth place</label>
        <CitySearch
          id="set-birth-place"
          value={place}
          onChange={(c) => {
            setCity(c);
            setPlace(c.name);
          }}
          placeholder="Search your birth city"
        />
      </div>

      {saveError && (
        <p className="flex items-center gap-2 mb-3" style={{ color: "var(--color-error, #f87171)" }}>
          <AlertTriangle size={16} /> {saveError}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-2 mb-3" style={{ color: "var(--color-success, #4ade80)" }}>
          <CheckCircle size={16} /> Saved. Your charts will use these details from now on.
        </p>
      )}

      <button
        type="button"
        className="btn-primary inline-flex items-center gap-2"
        onClick={save}
        disabled={saving}
      >
        <Save size={16} /> {saving ? "Saving…" : "Save birth details"}
      </button>
    </div>
  );
}