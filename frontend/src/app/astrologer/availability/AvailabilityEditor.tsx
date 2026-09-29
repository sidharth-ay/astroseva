"use client";

/**
 * Availability window editor.
 *
 * The backend for this (GET/POST/DELETE, with overlap detection that returns a
 * 409) was complete and tested, but nothing in the UI ever called it, so a
 * practitioner could not publish a single window and the public profile always
 * said "No availability published yet".
 *
 * Times are stored as minutes from midnight in the practitioner's own timezone
 * offset, which is why the offset is part of each window rather than a profile
 * field.
 */

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Clock, AlertTriangle } from "lucide-react";

import { api, type AvailabilityWindow } from "@/lib/api";

const ACCENT = "#C8956D";
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Minutes from midnight to a 12-hour clock string. */
function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "18:30" -> minutes from midnight. */
function toMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * The browser's own UTC offset, in HOURS -- the unit the backend validates
 * (-12..14) and the unit the column defaults to (5.5, i.e. IST). Sending
 * minutes here is rejected with a 422.
 */
function localOffsetHours(): number {
  return -new Date().getTimezoneOffset() / 60;
}

function offsetLabel(hours: number): string {
  const sign = hours < 0 ? "-" : "+";
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

export default function AvailabilityEditor({ onChanged }: { onChanged?: () => void }) {
  const [rows, setRows] = useState<AvailabilityWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weekday, setWeekday] = useState("1");
  const [from, setFrom] = useState("18:00");
  const [to, setTo] = useState("20:00");
  const [slot, setSlot] = useState("30");

  const load = useCallback(async () => {
    try {
      const data = await api.getMyAvailability();
      setRows(data.availability);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your availability.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getMyAvailability()
      .then((d) => {
        if (!cancelled) setRows(d.availability);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load your availability.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const add = async () => {
    const start = toMinutes(from);
    const end = toMinutes(to);
    if (end <= start) {
      setError("The end time must be after the start time.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.addAvailability({
        weekday: Number(weekday),
        start_minute: start,
        end_minute: end,
        timezone_offset: localOffsetHours(),
        slot_minutes: Number(slot),
      });
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the window.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    setError(null);
    try {
      await api.removeAvailability(id);
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove the window.");
    } finally {
      setBusy(false);
    }
  };

  // Group by day so a practitioner reads their week, not a flat list.
  const byDay = rows.reduce<Record<number, AvailabilityWindow[]>>((acc, r) => {
    (acc[r.weekday] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div>
      {error && (
        <p className="text-xs mb-3 flex items-start gap-1.5" style={{ color: "var(--danger)" }} role="alert">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: ACCENT }} />
      ) : rows.length === 0 ? (
        <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
          No windows published. Until you add one, your public profile shows no
          availability.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {Object.entries(byDay)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([day, windows]) => (
              <li key={day} className="text-xs flex flex-wrap items-center gap-2">
                <span className="w-20 shrink-0" style={{ color: "var(--text-primary)" }}>
                  {WEEKDAYS[Number(day)]}
                </span>
                {windows
                  .sort((a, b) => a.start_minute - b.start_minute)
                  .map((w) => (
                    <span
                      key={w.id}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded"
                      style={{ background: "var(--border-subtle)", color: "var(--text-secondary)" }}
                    >
                      <Clock className="w-3 h-3" />
                      {hhmm(w.start_minute)} – {hhmm(w.end_minute)}
                      <span style={{ color: "var(--text-tertiary)" }}>
                        {Math.round((w.end_minute - w.start_minute) / w.slot_minutes)} slots
                      </span>
                      <button
                        onClick={() => remove(w.id)}
                        disabled={busy}
                        aria-label={`Remove ${WEEKDAYS[Number(day)]} window`}
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </li>
            ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="input-label text-[11px]" htmlFor="avail-day">Day</label>
          <select
            id="avail-day"
            className="input-field text-xs"
            value={weekday}
            onChange={(e) => setWeekday(e.target.value)}
          >
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label text-[11px]" htmlFor="avail-from">From</label>
          <input
            id="avail-from"
            type="time"
            className="input-field text-xs"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="input-label text-[11px]" htmlFor="avail-to">To</label>
          <input
            id="avail-to"
            type="time"
            className="input-field text-xs"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label className="input-label text-[11px]" htmlFor="avail-slot">Slot</label>
          <select
            id="avail-slot"
            className="input-field text-xs"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
          >
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
          </select>
        </div>
        <button className="btn-secondary text-xs" onClick={add} disabled={busy}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add window
        </button>
      </div>

      <p className="text-[11px] mt-2" style={{ color: "var(--text-tertiary)" }}>
        Windows are stored in your own timezone ({offsetLabel(localOffsetHours())}). Overlapping
        windows on the same day are rejected. Booking is not enabled yet, so these describe when
        you are available rather than reserving a slot.
      </p>
    </div>
  );
}
