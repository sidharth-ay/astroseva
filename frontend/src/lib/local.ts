/**
 * Every localStorage key this app uses, owned in one place.
 *
 * Previously each page declared its own `const KEY = "astroseva_..."` and read
 * and wrote raw localStorage, which meant the analytics page reached into five
 * other pages' keys by string literal: renaming a key in one file silently
 * zeroed out another page's numbers. Now the key strings live here exactly
 * once, and every read and write goes through the guarded helpers below so the
 * server case (no `window` during prerender) and private browsing (throws on
 * access) behave the same everywhere: fall back, never crash.
 *
 * Auth tokens stay in `api.ts` next to the session logic that owns them; this
 * module is for UI state only.
 */
export const LocalKeys = {
  visits: "astroseva_visits",
  academy: "astroseva_academy",
  remedyDone: "astroseva_remedy_done",
  moles: "astroseva_moles",
  photoConsults: "astroseva_photo_consults",
  community: "astroseva_community",
  notifPrefs: "astroseva_notif_prefs",
  kundliHistory: "kundli_history",
  theme: "astroseva-theme",
  language: "astroseva-language",
  ageOk: "astroseva_age_ok",
} as const;

export type LocalKey = (typeof LocalKeys)[keyof typeof LocalKeys];

/** Read and JSON-parse a key, returning `fallback` for missing/corrupt/absent storage. */
export function readLocal<T>(key: LocalKey | string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Write a key as JSON. Silently no-ops where storage is unavailable. */
export function writeLocal(key: LocalKey | string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing and full storage: the choice applies for this session.
  }
}

/** Remove a key. Silently no-ops where storage is unavailable. */
export function removeLocal(key: LocalKey | string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
