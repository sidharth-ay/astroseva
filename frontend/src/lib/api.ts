/**
 * Where the API lives.
 *
 * The fallback is half of a pair with the identical default in
 * next.config.ts: the Content-Security-Policy's `connect-src` is computed from
 * `NEXT_PUBLIC_API_URL` with the same value, because the browser applies that
 * policy *before* a request is sent. If the two disagree, a request to this
 * origin is blocked and the page reports "Failed to fetch" -- with no failed
 * request in the API logs, because it never left the browser. Change both.
 */
const API_BASE_FALLBACK = "http://127.0.0.1:8000";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || API_BASE_FALLBACK;

const REQUEST_TIMEOUT = 60000;

async function fetchWithTimeout(url: string, init?: RequestInit, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  // Honor a caller-provided AbortSignal (e.g. tab switches) so in-flight
  // requests are genuinely cancelled instead of piling up.
  const external = init?.signal as AbortSignal | null | undefined;
  const onExternalAbort = () => controller.abort();
  if (external) {
    if (external.aborted) {
      controller.abort();
    } else if (typeof external.addEventListener === "function") {
      external.addEventListener("abort", onExternalAbort, { once: true });
    }
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { signal: _ignore, ...rest } = init || {};
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(id);
    if (external && typeof external.removeEventListener === "function") {
      external.removeEventListener("abort", onExternalAbort);
    }
  }
}

/**
 * `fetchAPI` for endpoints that answer with a file rather than JSON.
 *
 * The PDF export endpoints are behind the same auth gate as everything else, so
 * they need the bearer token. Both used to call bare `fetch`, which sent no
 * `Authorization` header, got a 401, and threw "PDF export failed" -- which the
 * caller swallowed, so the button silently did nothing.
 *
 * The body is read as JSON for the error message on failure and as a Blob on
 * success, so a 500 from reportlab surfaces its `detail` rather than a generic
 * failure, and the 401 handling is identical to `fetchAPI`.
 */
export async function fetchBlob(endpoint: string, options?: RequestInit): Promise<Blob> {
  const token = getToken();
  const res = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401 && !NO_REDIRECT_ON_401.some((p) => endpoint.startsWith(p))) {
      const refresh = typeof window !== "undefined" ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
      if (refresh && !(options as RequestInit & { _isRetry?: boolean })?._isRetry) {
        try {
          const refreshRes = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refresh })
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            if (typeof window !== "undefined") {
              localStorage.setItem(TOKEN_KEY, data.token);
              localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
            }
            return fetchAPI(endpoint, { ...options, _isRetry: true } as RequestInit & { _isRetry?: boolean });
          }
        } catch {
          // fallthrough to logout
        }
      }
      handleExpiredSession();
    }
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    const message = error.detail || error.error || res.statusText || "Request failed";
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.blob();
}

/**
 * POST a `FormData` body (file uploads). Unlike `fetchAPI` this must not set
 * `Content-Type` itself: the browser derives the multipart boundary, and an
 * explicit JSON content type would both break the upload and lie about it.
 * Auth, refresh-on-401 and error surfacing mirror `fetchAPI`.
 */
export async function uploadFile<T>(endpoint: string, form: FormData): Promise<T> {
  const token = getToken();
  const res = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
    method: "POST",
    body: form,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    if (res.status === 401 && !NO_REDIRECT_ON_401.some((p) => endpoint.startsWith(p))) {
      handleExpiredSession();
    }
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    const message = error.detail || error.error || res.statusText || "Request failed";
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

/**
 * Hand a Blob to the browser as a download and release the object URL.
 *
 * The URL is revoked on the next tick rather than synchronously after
 * `click()`: revoking it in the same turn can cancel the download before the
 * browser has read it, which is how a generated PDF or image arrives as an
 * empty or missing file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * A location as returned by `GET /api/v1/cities`.
 *
 * `tz` is the offset that applies *now*. For a birth chart that can be wrong by
 * up to 90 minutes, so the record also carries `tz_iana`, and the backend
 * resolves the offset for the actual birth date via `zoneinfo`.
 */
export interface CityEntry {
  name: string;
  lat: number;
  lng: number;
  tz: number;
  tz_iana?: string;
  state?: string;
}

/**
 * The birth-location fields for a city chosen from `CitySearch`.
 *
 * Every page that takes a birthplace was repeating the same four assignments by
 * hand, which is how two of them came to disagree (one dropped the timezone, one
 * dropped the zone). Spread this into the form instead:
 *
 *     setForm((prev) => ({ ...prev, ...locationFromCity(city) }))
 *
 * `timezone_iana` travels with the coordinates so the backend can resolve the
 * offset that was in force on the birth date.
 */
export function locationFromCity(city: CityEntry) {
  return {
    birth_place: city.name,
    latitude: city.lat,
    longitude: city.lng,
    // `tz` is always populated by the dataset; the longitude fallback is only
    // reached if a record ever arrives without one.
    timezone_offset: typeof city.tz === "number" ? city.tz : Math.round(city.lng / 15),
    ...(city.tz_iana ? { timezone_iana: city.tz_iana } : {}),
  };
}

/**
 * `locationFromCity` without the `birth_place` field.
 *
 * A few forms (predictions, panchang, festivals) name their location field
 * differently. This lets them reuse the same coordinates-and-timezone logic
 * without sending a field their model does not declare.
 */
export function pickLocationFields(loc: ReturnType<typeof locationFromCity>) {
  const out: Omit<ReturnType<typeof locationFromCity>, "birth_place"> = {
    latitude: loc.latitude,
    longitude: loc.longitude,
    timezone_offset: loc.timezone_offset,
    ...(loc.timezone_iana ? { timezone_iana: loc.timezone_iana } : {}),
  };
  return out;
}

export interface BirthData {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  latitude: number;
  longitude: number;
  timezone_offset: number;
  /**
   * IANA zone for the birthplace, when the location came from CitySearch.
   *
   * The backend resolves the historical offset from this for the actual birth
   * date, so a 1942 Indian birth uses the +6:30 then in force rather than
   * today's +5:30. Optional: `timezone_offset` alone still works, so a saved
   * chart from before this field existed is still accepted.
   */
  timezone_iana?: string;
  gender?: string;
}

export interface Planet {
  planet: string;
  longitude: number;
  sign: number;
  sign_name: string;
  sign_degree: number;
  retrograde: boolean;
  dignity: string;
  is_own_sign: boolean;
  house?: number;
}

export interface DashaPeriod {
  lord: string;
  start: string;
  end: string;
  duration_years?: number;
  duration_days?: number;
}

export interface CurrentDasha {
  mahadasha: string;
  mahadasha_start: string;
  mahadasha_end: string;
  mahadasha_remaining_years: number;
  antardasha?: string;
  antardasha_start?: string;
  antardasha_end?: string;
  antardasha_remaining_days?: number;
  pratyantardasha?: string;
  pratyantardasha_start?: string;
  pratyantardasha_end?: string;
  sookshma?: string;
  sookshma_start?: string;
  sookshma_end?: string;
  prana?: string;
  prana_start?: string;
  prana_end?: string;
}

export interface DashaInfo {
  birth_nakshatra: { index: number; name: string; lord: string; pada: number };
  all_mahadashas: DashaPeriod[];
  current_dasha: CurrentDasha | null;
  current_yogini?: { yogini: string; start: string; end: string } | null;
  current_chara?: { sign: number; lord: string; start: string; end: string } | null;
  yogas?: { name: string; description: string; strength: string }[];
  navamsa?: Record<string, number>;
  extras?: {
    avakahada?: Record<string, string | number>;
    birth_panchang?: Record<string, string | number>;
    sunrise?: number;
    sunset?: number;
    julian_day?: number;
    ishta_devata?: { planet: string | null; deity: string | null };
    chara_karakas?: { role: string; planet: string }[];
    avastha?: Record<string, string>;
    friendships?: Record<string, { friends: string[]; enemies: string[]; neutral: string[] }>;
    aspects?: {
      by_planet: Record<string, { planet: string; aspect: string; aspect_index: number; nature: string; sign: number }[]>;
      on_sign: Record<string, string[]>;
    };
    consideration?: {
      planet: string; pakshi: string; sign: number | null; sign_degree: number | null;
      dignity: string; combust: boolean; combust_note: string | null; pakshi_note?: string;
    }[];
    ghatak?: {
      ascendant: number; asc_sign: number; benefic_count: number;
      ascendant_ghatak: { index: number; name: string; lord: string; longitude: number; sign: number; deg_in_sign: number; benefic_for_ascendant: boolean; applied: boolean }[];
      all: { index: number; name: string; lord: string; longitude: number; sign: number; deg_in_sign: number; benefic_for_ascendant: boolean; applied: boolean }[];
    };
    somatilak?: { asc_sign: number; somatilak: string; lord: string; nakshatra: string };
    vargas?: Record<string, {
      name: string;
      asc_sign: number;
      planets: Record<string, number>;
    }>;
    shadbala?: {
      max_rupa: number;
      asc_sign: number;
      strongest: string | null;
      weakest: string | null;
      planets: {
        planet: string; sign: number; house: number; retrograde: boolean;
        sthana: number; dig: number; kala: number; cheshta: number;
        naisargika: number; drik: number;
        /** The six components summed, on the classical 0-360 Rupor scale. */
        total_rupor: number;
        max_rupor: number;
        /** The same total in Rupa (60 Rupor), out of 6. */
        total_rupa: number;
        bhasa_rupa: boolean; bhava_rupa: boolean; dhruva_rupa: boolean;
      }[];
    };
    bhavabala?: {
      max_per_house: number; total_rava: number; max_total: number;
      strongest: number | null;
      houses: { house: number; sign: number; sign_name: string; planets: string[]; rava: number; raw_rava: number }[];
    };
    ashtakavarga?: {
      asc_sign: number; method: string; validated_against_published_tables: boolean;
      best_sign: number | null; best_house: number | null;
      per_graha: Record<string, {
        occupied_sign: number; total_points: number; max_total_points: number;
        in_own_sign: number; in_asc_sign: number;
        grade_own: string; grade_asc: string;
        signs: { sign: number; house: number; points: number; grade: string }[];
      }>;
      by_sign: { sign: number; house: number; grahas_binding: number; grahas: string[] }[];
    };
    pav?: {
      asc_sign: number; seventh_lord: string;
      lagna_total: number; sukarma_total: number; nabansaka_total: number;
      lagna_chart: { sign: number; house: number; points: number }[];
      sukarma_chart: { sign: number; house: number; points: number }[];
      nabansaka_chart: { sign: number; house: number; points: number }[];
    };
    navatara?: {
      most_suitable: string | null; least_suitable: string | null;
      grahas: {
        planet: string; sign: number; sign_name: string;
        total: number; published_total: number; suitable: boolean;
        factors: Record<string, number>;
        factor_names: string[];
      }[];
    };
    arudha?: {
      asc_sign: number; arudha_lagna: number; arudha_lagna_name: string;
      arudha_house: number;
      arudhas: { planet: string; sign: number; sign_name: string; arudha_sign: number; arudha_name: string; house: number }[];
      parivartana: { signs: number[]; planets: string[] }[];
    };
  } | null;
}

export interface KundliResponse {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  latitude: number;
  longitude: number;
  /** The offset the chart was computed with -- do not assume 5.5. */
  timezone_offset: number;
  timezone_iana?: string | null;
  ayanamsa: number;
  ascendant: number;
  asc_sign: number;
  asc_sign_name: string;
  asc_sign_degree: number;
  planets: Planet[];
  houses: Record<string, string[]>;
  chart: Record<string, { sign: number; planets: string[] }>;
  retrograde_planets: string[];
  exalted_planets: string[];
  debilitated_planets: string[];
  dasha_info?: DashaInfo;
  extras?: DashaInfo["extras"];
}

export interface MatchingResponse {
  boy_name: string;
  girl_name: string;
  total_score: number;
  max_score: number;
  compatibility_percentage: number;
  recommendation: string;
  nadi_dosha: boolean;
  kootas: Record<string, unknown>;
  boy_nakshatra: Record<string, unknown>;
  girl_nakshatra: Record<string, unknown>;
}

export interface HoroscopeResponse {
  zodiac_sign: string;
  date: string;
  prediction: string;
  love_rating: number;
  career_rating: number;
  health_rating: number;
  lucky_numbers: number[];
  lucky_color: string;
  ai_model: string;
}

export interface NumerologyResponse {
  life_path: { life_path_number: number; traits: string[]; planet: string };
  destiny: { destiny_number: number; traits: string[]; planet: string };
  soul_urge: { soul_urge_number: number };
  personality: { personality_number: number };
  birthday: { birthday_number: number };
  name_number?: { name_number: number };
  lucky_numbers: number[];
  compatibility?: { number1: number; number2: number; compatibility: string };
}

export interface Mantra {
  id: string;
  deity: string;
  mantra_hindi: string;
  transliteration: string;
  meaning: string;
  benefits: string;
  best_time: string;
  repetitions: number;
  category: string;
  purpose: string;
  planet: string;
}

export interface Chalisa {
  id: string;
  deity: string;
  author: string;
  language: string;
  description: string;
  verses_hindi: string[];
  verses_transliteration?: string[];
}

export interface Aarti {
  id: string;
  deity: string;
  aarti_name: string;
  language: string;
  description: string;
  aarti_hindi: string[];
  aarti_transliteration: string[];
}

export interface MantraCategory {
  id: string;
  name: string;
  description: string;
  mantra_count: number;
  related_mantras: string[];
}

export interface MantraCategories {
  deity: MantraCategory[];
  purpose: MantraCategory[];
  planet: MantraCategory[];
}

export interface MantraFilter {
  purpose?: string;
  planet?: string;
  deity?: string;
  q?: string;
}

export interface Celebrity {
  id: string;
  name: string;
  birth_date: string;
  birth_time?: string;
  birth_place: string;
  profession: string;
  famous_for: string;
  zodiac_sign?: string;
}

export interface HealingCrystal {
  name: string;
  properties: string;
  zodiac_associations: string[];
  chakra_associations: string[];
  benefits: string[];
}

export interface HealingRecommendation {
  name: string;
  birth_date: string;
  recommendation: {
    sun_sign: string;
    dominant_chakra: string;
    recommended_crystals: string[];
    chakras_to_focus_on: string[];
    recommended_aromatherapy: string[];
    recommended_sound_healing: Record<string, unknown>;
  };
}

/** Mirrors the backend remedy list: a list, not a dict keyed by planet. */
/**
 * What the varshphal endpoint actually computes.
 *
 * It returns the ephemeris for the requested year -- each graha's sidereal
 * position at the year's midpoint, and the Vimshottari dasha running through
 * it -- and no narrative. `predictions` is present but empty: the endpoint
 * previously returned one fixed sentence per topic that was the same for every
 * chart and every year, along with "auspicious" and "challenging" months
 * derived from `(asc_sign * 2 + m) % 12` rather than from anything
 * astronomical. Those fields are gone rather than replaced, and
 * `limitations` says so on the page.
 */
/**
 * A stone is recommended only where the chart supports one.
 *
 * The endpoint used to return all seven gemstones for every chart regardless of
 * any placement, while describing the list as coming "based on your birth
 * chart". `considerations` reports all seven grahas so it is visible which were
 * considered and left out, and why.
 */
export interface GemstoneResponse {
  birth_data: Record<string, unknown>;
  ascendant: string;
  gemstones: {
    planet: string;
    gemstone: string;
    weight: string;
    metal: string;
    finger: string;
    day: string;
    alternative: string;
    reason: string;
    condition: string;
  }[];
  considerations: {
    planet: string;
    sign: string;
    house: number;
    dignity: string;
    combust: boolean;
    condition: string;
  }[];
  basis: string;
  recommendations: string;
  disclaimer: string;
}

export interface VarshphalResponse {
  birth_data: Record<string, unknown>;
  year: number;
  varshphal_chart: { asc_sign: string; planets: Record<string, string> };
  annual_chart: {
    solar_transits: Record<string, {
      sign: string;
      sign_index: number;
      longitude: number;
      retrograde: boolean;
    }>;
    dasha_lord: string | null;
    dasha_period: string | null;
    antardasha_lord: string | null;
    antardasha_period: string | null;
    sun_sign_at_year_midpoint: string;
  };
  predictions: Record<string, string>;
  method: string;
  limitations: string[];
}

export interface LalKitabRemedy {
  planet: string;
  house: number;
  sign: string | null;
  remedy: string;
  general_remedy: string;
}

export interface LalKitabResponse {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  /** House keys are strings; each cell holds objects, not bare planet names. */
  houses: Record<string, { planet: string; sign: string | null }[]>;
  planets: { planet: string; house: number; sign: string | null; degree: number }[];
  remedies: LalKitabRemedy[];
}

export interface ReportResponse {
  report_type: string;
  content: string;
  sections?: { title: string; content: string }[];
  house_analysis?: Record<string, string>;
  ai_model: string;
}

/**
 * The panchang tab responses, named so the page can type its state with them
 * instead of `useState<any>`. Each mirrors the backend response for one tab;
 * they were previously written inline in the `fetchAPI<...>` calls, which left
 * the page holding untyped state and asserting its way through with `as any`.
 */
export interface ChoghadiyaResponse {
  date: string;
  sunrise: string;
  sunset: string;
  day_choghadiya: { name: string; start: string; end: string; type: string }[];
  night_choghadiya: { name: string; start: string; end: string; type: string }[];
}

export interface HoraResponse {
  date: string;
  day_hora: { planet: string; start: string; end: string; type: string }[];
  night_hora: { planet: string; start: string; end: string; type: string }[];
}

export interface GowriResponse {
  date: string;
  periods: { name: string; start: string; end: string; nature: string }[];
}

export interface GhatiMuhuratResponse {
  date: string;
  muhurats: { start: string; end: string; name: string }[];
}

export interface PanchangResponse {
  date: string;
  tithi: { tithi_number: number; tithi_name: string; paksha: string };  nakshatra: { nakshatra_name: string; pada: number };
  yoga: { yoga_name: string };
  karana: { karana_name: string };
  vara: { vara_name: string; vara_lord: string };
  rahu_kaal: { start: string; end: string };
  gulika_kaal: { start: string; end: string };
  sunrise: string;
  sunset: string;
}

export interface DoshaResponse {
  manglik: {
    is_manglik: boolean;
    severity: string;
    description?: string;
    has_placement?: boolean;
    lagna_manglik?: boolean;
    moon_manglik?: boolean;
    cancellation?: boolean;
    cancellation_reason?: string | null;
    positions?: { house?: number; chart?: string; severity?: string; description?: string }[];
  };
  kaal_sarp: {
    has_dosha: boolean;
    rahu_house?: number | null;
    ketu_house?: number | null;
    planets_between?: string[];
    planets_outside?: string[];
    kaal_sarp_type?: string | null;
    severity?: string;
    description?: string;
  };
  sade_sati: { is_active: boolean; description?: string; phase?: string | null; severity?: string; transit_based?: boolean; as_of_date?: string };
  pitru_dosha: { has_dosha: boolean; conditions: string[]; description: string };
  total_doshas: number;
}

/**
 * The remedy answer is a list of sections, never the model's raw text. When
 * the AI answer will not parse into this shape the backend serves its own
 * corpus under `source: "corpus"` instead.
 */
export interface RemedySection {
  title: string;
  actions: string[];
}

export interface RemedyReport {
  source: "ai" | "corpus";
  sections: RemedySection[];
  note?: string;
}

/**
 * Calculation preferences stored per user on the server. `house_system` is
 * not display-only: every chart endpoint reads it per request and includes
 * it in its cache key, so changing it changes the houses that are computed.
 */
export interface SettingsResponse {
  house_system: string;
  house_systems: string[];
  default_house_system: string;
}

// Endpoints where a 401 is a normal, expected response rather than an expired
// session: bad credentials on login, or a register attempt. Redirecting there
// would bounce the user off the form instead of showing the error.
const NO_REDIRECT_ON_401 = ["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/me"];

/** Clear the dead session and send the user to the login form. */
function handleExpiredSession() {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  // Already on the login page: let the form render its own error.
  if (pathname.startsWith("/login")) return;
  clearSession();
  window.location.replace(`/login?next=${encodeURIComponent(pathname + search)}`);
}

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Feature routers are gated server-side, so every call must carry the token.
  // Previously only fetchAuth() sent one, which left all feature calls anonymous.
  const token = getToken();
  const res = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
    if (!res.ok) {
      if (res.status === 401 && !NO_REDIRECT_ON_401.some((p) => endpoint.startsWith(p))) {
        handleExpiredSession();
      }
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      let message: string;
      if (Array.isArray(error.detail)) {
        // FastAPI 422: an array of per-field problems.
        message = error.detail
          .map((d: { loc?: (string | number)[]; msg?: string }) => {
            const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "input";
            return `${field}: ${d.msg || "invalid value"}`;
          })
          .join("; ");
      } else {
        // `detail` is FastAPI's convention, but the rate-limit handler and the
        // global 500 handler use `error`. Reading only `detail` turned a rate
        // limit into a bare "API request failed", which looks like a broken
        // site rather than a temporary condition.
        message = error.detail || error.error || res.statusText || "API request failed";
      }
      const err = new Error(message) as Error & { status?: number; retryAfter?: number };
      err.status = res.status;
      const retryAfter = res.headers.get("Retry-After");
      if (retryAfter) err.retryAfter = Number(retryAfter);
      throw err;
    }
    return res.json();
}

export interface Festival {
  name: string;
  date: string;
  end_date: string;
  span_days: number;
  category: "major" | "minor" | "vrat";
  description: string;
  significance: string;
  rule_time: string;
  rule_time_label: string;
  paksha: string;
  paksha_hi: string;
  tithi_name: string;
  tithi_name_hi: string;
  tithi_number: number;
  nakshatra: string;
  nakshatra_pada: number;
  sunrise: string;
  sunset: string;
  muhurat: { label: string; start: string; end: string };
  rahu_kaal: { start: string; end: string };
  tithi_basis?: "rule_window" | "evening";
}

export interface FestivalsResponse {
  year: number;
  month: number | null;
  location: { latitude: number; longitude: number; timezone_offset: number; label: string };
  count: number;
  festivals: Festival[];
  note: string;
}

export interface BabyName {
  name: string;
  meaning: string;
  origin: string;
  destiny_number: number;
  is_master_number: boolean;
  traits: string[];
  compatibility: string;
  compatibility_note: string;
}

export interface BabyNamesResponse {
  gender: string;
  birth_date: string | null;
  life_path: {
    life_path_number: number;
    is_master_number: boolean;
    reduction: string;
    traits: string[];
    lucky_color: string;
    lucky_gem: string;
    lucky_day: string;
    planet: string;
  } | null;
  count: number;
  names: BabyName[];
}

const TOKEN_KEY = "astroseva_token";
const USER_KEY = "astroseva_user";
const REFRESH_TOKEN_KEY = "astroseva_refresh_token";

/** Mirrors the backend `users.role` column. Unknown/legacy values read as client. */
export type UserRole = "client" | "astrologer" | "reviewer" | "admin";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role?: UserRole;
}

// --- astrologer marketplace -------------------------------------------------

/** Applicant lifecycle. Terminal outcomes are verified/probation/rejected. */
export type OnboardingStatus =
  | "draft"
  | "applied"
  | "under_review"
  | "assessment_pending"
  | "mock_pending"
  | "verified"
  | "probation"
  | "rejected"
  | "suspended";

export interface AccuracySummary {
  score: number;
  scale: string;
  assessment_pass_rate: number | null;
  total_assessments: number;
  mock_consultations: number;
}

export interface DirectoryEntry {
  id: number;
  slug: string;
  name: string | null;
  headline: string;
  experience_years: number;
  languages: string[];
  specialties: string[];
  location: string | null;
  status: OnboardingStatus;
  is_on_probation: boolean;
  accuracy_score: number;
}

export interface AstrologerProfile extends DirectoryEntry {
  bio: string | null;
  probation_until: string | null;
  accuracy: AccuracySummary;
  availability: {
    weekday: number;
    start_minute: number;
    end_minute: number;
    timezone_offset: number;
    slot_minutes: number;
  }[];
}

export interface DirectoryResponse {
  count: number;
  total: number;
  offset: number;
  limit: number;
  astrologers: DirectoryEntry[];
}

export interface SpecialtyOptions {
  specialties: string[];
  languages: string[];
}

export interface MyDocument {
  id: number;
  kind: string;
  identity_status: string;
  original_filename: string;
  uploaded_at: string;
  reviewer_note: string | null;
  size_bytes?: number;
  reviewed_at?: string | null;
}

export interface AvailabilityWindow {
  id: number;
  weekday: number;
  start_minute: number;
  end_minute: number;
  timezone_offset: number;
  slot_minutes: number;
  is_active?: boolean;
}

export interface MyApplication {
  id: number;
  slug: string;
  headline: string;
  bio: string | null;
  experience_years: number;
  languages: string[];
  specialties: string[];
  location: string | null;
  status: OnboardingStatus;
  rejection_reason: string | null;
  probation_until: string | null;
  accuracy: AccuracySummary;
  documents: MyDocument[];
  availability: AvailabilityWindow[];
  next_step: string | null;
  is_practising: boolean;
}

export interface AssessmentQuestion {
  id: number;
  prompt: string;
  options: string[];
}

export interface AssessmentView {
  questions: AssessmentQuestion[];
  pass_mark: number;
  attempts: number;
  latest: {
    attempt_no: number;
    score: number;
    max_score: number;
    passed: boolean;
    submitted_at: string;
  } | null;
}

export interface AssessmentResult {
  attempt_no: number;
  score: number;
  max_score: number;
  pass_mark: number;
  passed: boolean;
  details: { id: number; correct: boolean; explanation: string }[];
}

export interface OnboardingEvent {
  id: number;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
  actor_user_id?: number | null;
  payload?: Record<string, unknown>;
}

export interface TimelineResponse {
  events: OnboardingEvent[];
}

export interface MockConsult {
  id: number;
  verdict: string;
  scores: { accuracy: number; clarity: number; empathy: number; structure: number };
  notes: string | null;
  evaluated_at: string;
}

/** A graded assessment attempt. Answers and the key are never sent to a client. */
export interface AdminAssessmentAttempt {
  id: number;
  attempt_no: number;
  score: number;
  max_score: number;
  passed: boolean;
  pass_mark: number;
  overridden_by: number | null;
  override_note: string | null;
  submitted_at: string;
}

export interface AdminApplication {
  id: number;
  user_id: number;
  slug: string;
  headline: string;
  bio: string | null;
  experience_years: number;
  languages: string[];
  specialties: string[];
  location: string | null;
  status: OnboardingStatus;
  rejection_reason: string | null;
  probation_until: string | null;
  accuracy: AccuracySummary;
  documents: MyDocument[];
  mock_consultations: MockConsult[];
  assessments: AdminAssessmentAttempt[];
  events: OnboardingEvent[];
}

export interface AdminQueueResponse {
  count: number;
  applications: AdminApplication[];
}

export interface QueueCounts {
  counts: Record<string, number>;
  total: number;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

// Fired whenever the stored session changes so components (the Navbar's
// logout control) can react without needing a context provider.
export const AUTH_CHANGE_EVENT = "astroseva:auth-change";

function notifyAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function setSession(token: string, user: AuthUser, refreshToken?: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  notifyAuthChange();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  notifyAuthChange();
}

export async function fetchAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("Please log in to continue.");
  return fetchAPI<T>(endpoint, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Multipart upload. fetchAPI always sets Content-Type: application/json, which
 * would strip the multipart boundary the backend needs, so the header is left
 * for the browser to generate.
 */
async function fetchUpload<T>(endpoint: string, form: FormData): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("Please log in to continue.");
  const res = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
    method: "POST",
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    if (res.status === 401) handleExpiredSession();
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    const err = new Error(error.detail || "Upload failed") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Query string for a panchang request: the coordinates, the offset, and
 * (when the caller has one) the IANA zone.
 *
 * The dataset stores a single offset per city, which is only right for the day
 * it was built -- Sydney's record says +10, but a January request is on AEDT,
 * so sunrise came out an hour early. With `tzIana` the backend resolves the
 * offset for the date asked about instead; without it the old fixed offset
 * still applies, so a caller that only knows lat/lng behaves as before.
 */
function panchangQuery(lat: number, lng: number, tz: number, tzIana?: string): string {
  const zone = tzIana ? `&timezone_iana=${encodeURIComponent(tzIana)}` : "";
  return `latitude=${lat}&longitude=${lng}&timezone_offset=${tz}${zone}`;
}

export const api = {
  /**
   * Search the shared city/town dataset.
   *
   * This goes through `fetchAPI` because `/api/v1/cities` sits behind the same
   * auth gate as everything else. The component previously called bare `fetch`
   * with no `Authorization` header, so it received a 401 and an empty list --
   * indistinguishable from "no matches", which is why a broken search looks like
   * a dataset that does not contain the town.
   *
   * `dedupe` stops the second keystroke replacing the first result set with a
   * stale response.
   */
  searchCities: (q: string, signal?: AbortSignal) =>
    fetchAPI<{ cities: CityEntry[]; total: number }>(
      `/api/v1/cities?q=${encodeURIComponent(q)}`,
      signal ? { signal } : undefined,
    ).then((r) => r.cities ?? []),

  generateKundli: (data: BirthData) =>
    fetchAPI<KundliResponse>("/api/v1/kundli/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getSampleKundli: () =>
    fetchAPI<KundliResponse>("/api/v1/kundli/sample"),

  exportKundliPdf: (data: BirthData) =>
    fetchBlob("/api/v1/kundli/export-pdf", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  analyzeMatching: (boy: BirthData, girl: BirthData) =>
    fetchAPI<MatchingResponse>("/api/v1/matching/analyze", {
      method: "POST",
      body: JSON.stringify({ boy, girl }),
    }),

  exportMatchingPdf: (boy: BirthData, girl: BirthData) =>
    fetchBlob("/api/v1/matching/export-pdf", {
      method: "POST",
      body: JSON.stringify({ boy, girl }),
    }),

  getDailyHoroscope: (sign: string, signal?: AbortSignal) =>
    fetchAPI<HoroscopeResponse>(`/api/v1/horoscope/daily/${sign}?t=${Date.now()}`, { signal }),

  getAllHoroscopes: () =>
    fetchAPI<{ horoscopes: HoroscopeResponse[] }>("/api/v1/horoscope/daily"),

  getWeeklyHoroscope: (sign: string, signal?: AbortSignal) =>
    fetchAPI<HoroscopeResponse>(`/api/v1/horoscope/weekly/${sign}?t=${Date.now()}`, { signal }),

  getMonthlyHoroscope: (sign: string, signal?: AbortSignal) =>
    fetchAPI<HoroscopeResponse>(`/api/v1/horoscope/monthly/${sign}?t=${Date.now()}`, { signal }),

  getYearlyHoroscope: (sign: string, signal?: AbortSignal) =>
    fetchAPI<HoroscopeResponse>(`/api/v1/horoscope/yearly/${sign}?t=${Date.now()}`, { signal }),

  getLoveHoroscope: (sign: string, signal?: AbortSignal) =>
    fetchAPI<HoroscopeResponse>(`/api/v1/horoscope/love/${sign}?t=${Date.now()}`, { signal }),

  getNumerology: (name: string, birth_date: string) =>
    fetchAPI<NumerologyResponse>("/api/v1/numerology/analyze", {
      method: "POST",
      body: JSON.stringify({ name, birth_date }),
    }),

  getPanchang: (lat = 28.6139, lng = 77.209, tz = 5.5, tzIana?: string) =>
    fetchAPI<PanchangResponse>(`/api/v1/panchang/daily?${panchangQuery(lat, lng, tz, tzIana)}`),

  getChoghadiya: (lat = 28.6139, lng = 77.209, tz = 5.5, tzIana?: string) =>
    fetchAPI<ChoghadiyaResponse>(`/api/v1/panchang/choghadiya?${panchangQuery(lat, lng, tz, tzIana)}`),

  getHora: (lat = 28.6139, lng = 77.209, tz = 5.5, tzIana?: string) =>
    fetchAPI<HoraResponse>(`/api/v1/panchang/hora?${panchangQuery(lat, lng, tz, tzIana)}`),

  getGowri: (lat = 28.6139, lng = 77.209, tz = 5.5, tzIana?: string) =>
    fetchAPI<GowriResponse>(`/api/v1/panchang/gowri?${panchangQuery(lat, lng, tz, tzIana)}`),

  getGhatiMuhurat: (lat = 28.6139, lng = 77.209, tz = 5.5, tzIana?: string) =>
    fetchAPI<GhatiMuhuratResponse>(`/api/v1/panchang/ghati?${panchangQuery(lat, lng, tz, tzIana)}`),

  generatePrediction: (data: BirthData, prediction_type: string) =>
    fetchAPI<{ content: string; ai_model: string }>("/api/v1/predictions/generate", {
      method: "POST",
      body: JSON.stringify({ birth_data: data, prediction_type, language: "en" }),
    }),

  detectDoshas: (data: BirthData, signal?: AbortSignal) =>
    fetchAPI<DoshaResponse>("/api/v1/doshas/detect", {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    }),

  getDoshaRemedies: (data: BirthData, language: string = "en", signal?: AbortSignal) =>
    fetchAPI<{ doshas: DoshaResponse; remedies: RemedyReport; language: string }>(`/api/v1/doshas/remedies?language=${language}`, {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    }),

  getSadePeriods: (data: BirthData) =>
    fetchAPI<{ moon_sign: number; periods: { phase: string; start: string; end: string; saturn_sign: number; saturn_sign_name?: string }[] }>("/api/v1/doshas/sade-sati-periods", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  chatSend: (message: string, history: { role: string; content: string }[], language: string = "en", birthDetails?: Record<string, unknown>) =>
    fetchAPI<{ response: string; model: string }>("/api/v1/chat/send", {
      method: "POST",
      body: JSON.stringify({ message, history, language, birth_details: birthDetails || null }),
    }),

  chatSuggestions: () =>
    fetchAPI<{ suggestions: string[] }>("/api/v1/chat/suggestions"),

  getTransit: (signal?: AbortSignal) =>
    fetchAPI<{ date: string; transits: {
      planet: string;
      current_sign: string;
      current_sign_index: number;
      sign_degree: number;
      retrograde: boolean;
      /** Sidereal degrees covered per day; negative when retrograde. */
      daily_motion: number;
      motion: "direct" | "retrograde" | "stationary";
    }[]; current_signs: Record<string, string> }>(`/api/v1/transit/today`, { signal }),

  getGemstones: (data: BirthData) =>
    fetchAPI<GemstoneResponse>("/api/v1/gemstones/recommend", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getVarshphal: (data: BirthData, year: number) =>
    fetchAPI<VarshphalResponse>("/api/v1/varshphal/calculate", {
      method: "POST",
      body: JSON.stringify({ ...data, year }),
    }),

  getLoveMatch: (data1: BirthData, data2: BirthData) =>
    fetchAPI<{ partner1: string; partner2: string; overall_score: number; romantic_compatibility: number; emotional_compatibility: number; intellectual_compatibility: number; physical_compatibility: number; recommendations: string }>("/api/v1/matching/love-match", {
      method: "POST",
      body: JSON.stringify({ partner1: data1, partner2: data2 }),
    }),

  getBabyNames: (gender: string, birth_date: string) =>
    fetchAPI<BabyNamesResponse>(`/api/v1/baby-names/suggest?gender=${gender}&birth_date=${birth_date}`),

  getFestivals: (opts: {
    month?: number;
    year?: number;
    latitude?: number;
    longitude?: number;
    timezone_offset?: number;
    category?: string;
  } = {}) => {
    const params = new URLSearchParams();
    if (opts.month) params.set("month", String(opts.month));
    if (opts.year) params.set("year", String(opts.year));
    if (opts.latitude != null) params.set("latitude", String(opts.latitude));
    if (opts.longitude != null) params.set("longitude", String(opts.longitude));
    if (opts.timezone_offset != null) params.set("timezone_offset", String(opts.timezone_offset));
    if (opts.category) params.set("category", opts.category);
    return fetchAPI<FestivalsResponse>(`/api/v1/festivals/list?${params.toString()}`);
  },

  getFestivalCategories: () =>
    fetchAPI<{ categories: { id: string; label: string }[] }>("/api/v1/festivals/categories"),

  getDailyMantra: () =>
    fetchAPI<{ date: string; mantra: Mantra }>("/api/v1/mantra/daily"),

  getChalisas: () =>
    fetchAPI<{ total: number; chalisas: Chalisa[] }>("/api/v1/mantra/chalisa"),

  getAartis: () =>
    fetchAPI<{ total: number; aartis: Aarti[] }>("/api/v1/mantra/aarti"),

  getMantraCategories: () =>
    fetchAPI<MantraCategories>("/api/v1/mantra/categories"),

  listMantras: (filter: MantraFilter = {}) => {
    const params = new URLSearchParams();
    if (filter.purpose) params.set("purpose", filter.purpose);
    if (filter.planet) params.set("planet", filter.planet);
    if (filter.deity) params.set("deity", filter.deity);
    if (filter.q) params.set("q", filter.q);
    const qs = params.toString();
    return fetchAPI<{ total: number; mantras: Mantra[] }>(
      `/api/v1/mantra${qs ? `?${qs}` : ""}`
    );
  },

  getMantra: (id: string) =>
    fetchAPI<{ mantra: Mantra }>(`/api/v1/mantra/${encodeURIComponent(id)}`),

  getCelebrities: () =>
    fetchAPI<{ celebrities: Celebrity[] }>("/api/v1/celebrity/list"),

  getCelebritiesByZodiac: (sign: string) =>
    fetchAPI<{ celebrities: Celebrity[] }>(`/api/v1/celebrity/zodiac/${sign}`),

  getCelebrityDetail: (id: string) =>
    fetchAPI<Record<string, unknown>>(`/api/v1/celebrity/${id}`),

  getHealingRecommendation: (data: BirthData) =>
    fetchAPI<HealingRecommendation>("/api/v1/healing/recommend", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * The crystal catalog, filtered server-side. The page used to carry its own
   * nine-entry copy and filter it locally, while this endpoint served fourteen
   * -- same question, different answers depending on where it was asked.
   */
  getCrystals: (filter: { chakra?: string; zodiac?: string; q?: string } = {}) => {
    const params = new URLSearchParams();
    if (filter.chakra) params.set("chakra", filter.chakra);
    if (filter.zodiac) params.set("zodiac", filter.zodiac);
    if (filter.q) params.set("q", filter.q);
    const qs = params.toString();
    return fetchAPI<{ crystals: HealingCrystal[]; total: number }>(
      `/api/v1/healing/crystals${qs ? `?${qs}` : ""}`
    );
  },

  /**
   * Store a palm photo and return its reference key. Uploading and analyzing
   * are separate steps: this stores the file, it does not read the palm.
   */
  uploadPalmImage: (file: File) => {
    const form = new FormData();
    form.append("file", file, file.name);
    return uploadFile<{ key: string; content_type: string; size_bytes: number }>(
      "/api/v1/palmistry/upload",
      form
    );
  },

  getLalKitabChart: (data: BirthData) =>
    fetchAPI<LalKitabResponse>("/api/v1/lalkitab/chart", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  generateReport: (birth_data: BirthData, report_type: string) =>
    fetchAPI<ReportResponse>("/api/v1/reports/generate", {
      method: "POST",
      body: JSON.stringify({ birth_data, report_type }),
    }),

  register: (email: string, name: string, password: string) =>
    fetchAPI<{ message: string }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, name, password }),
    }),

  login: (email: string, password: string) =>
    fetchAPI<{ message: string; token: string; refresh_token: string; user: AuthUser }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    fetchAuth<{ message: string }>("/api/v1/auth/logout", { method: "POST" }),

  changePassword: (current_password: string, new_password: string) =>
    fetchAuth<{ message: string }>("/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),

  getMe: () => fetchAuth<{ id: number; email: string; name: string; created_at: string }>("/api/v1/auth/me"),

  saveChart: (data: { name: string; birth_date: string; birth_time: string; birth_place: string; latitude: number; longitude: number; timezone_offset: number; chart_data: Record<string, unknown> }) =>
    fetchAuth<{ message: string; chart_id: number }>("/api/v1/charts/save", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listCharts: () =>
    fetchAuth<{ charts: { id: number; name: string; birth_date: string; birth_time: string; birth_place: string; created_at: string }[]; total: number }>("/api/v1/charts/list"),

  getChart: (id: number) =>
    fetchAuth<Record<string, unknown>>(`/api/v1/charts/${id}`),

  deleteChart: (id: number) =>
    fetchAuth<{ message: string }>(`/api/v1/charts/${id}`, { method: "DELETE" }),

  // --- astrologer marketplace ---------------------------------------------

  /** Public directory. Requires a login, like every other feature. */
  listAstrologers: (
    opts: {
      specialty?: string;
      language?: string;
      min_experience?: number;
      search?: string;
      on_probation?: boolean;
      limit?: number;
      offset?: number;
    } = {},
    signal?: AbortSignal
  ) => {
    const params = new URLSearchParams();
    if (opts.specialty) params.set("specialty", opts.specialty);
    if (opts.language) params.set("language", opts.language);
    if (opts.min_experience != null) params.set("min_experience", String(opts.min_experience));
    if (opts.search) params.set("search", opts.search);
    if (opts.on_probation != null) params.set("on_probation", String(opts.on_probation));
    if (opts.limit != null) params.set("limit", String(opts.limit));
    if (opts.offset != null) params.set("offset", String(opts.offset));
    const qs = params.toString();
    return fetchAPI<DirectoryResponse>(
      `/api/v1/astrologers${qs ? `?${qs}` : ""}`,
      signal ? { signal } : undefined
    );
  },

  getAstrologerFilters: () =>
    fetchAPI<SpecialtyOptions>("/api/v1/astrologers/specialties"),

  getAstrologer: (slug: string, signal?: AbortSignal) =>
    fetchAPI<AstrologerProfile>(
      `/api/v1/astrologers/${encodeURIComponent(slug)}`,
      signal ? { signal } : undefined
    ),

  /**
   * The caller's own application. Read-only: the server creates no row here,
   * so this is safe to call while merely rendering a page. A caller who has
   * not started gets `{ has_application: false, application: null }` rather
   * than a 404, so callers do not have to treat "no application" as an error.
   */
  getMyApplication: () =>
    fetchAuth<{ has_application: boolean; application: MyApplication | null }>(
      "/api/v1/astrologer/me"
    ),

  /**
   * Whether the caller has started an application. Backs the
   * "Become an Astrologer" / "My Application" label on /services, so it must
   * never write -- rendering that page cannot create an application row.
   */
  hasApplication: () =>
    fetchAuth<{ has_application: boolean }>("/api/v1/astrologer/me/exists"),

  /** Begin an application. The only call that creates a row, and idempotent. */
  startApplication: () =>
    fetchAuth<MyApplication>("/api/v1/astrologer/me/start", { method: "POST" }),

  updateMyApplication: (payload: {
    headline: string;
    bio: string;
    experience_years: number;
    languages: string[];
    specialties: string[];
    location: string | null;
  }) =>
    fetchAuth<MyApplication>("/api/v1/astrologer/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  submitApplication: () =>
    fetchAuth<MyApplication>("/api/v1/astrologer/apply", { method: "POST" }),

  uploadDocument: (kind: string, file: File) => {
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    return fetchUpload<{ id: number }>("/api/v1/astrologer/documents", form);
  },

  deleteDocument: (id: number) =>
    fetchAuth<{ deleted: boolean }>(`/api/v1/astrologer/documents/${id}`, {
      method: "DELETE",
    }),

  getAssessment: () => fetchAuth<AssessmentView>("/api/v1/astrologer/assessment"),

  submitAssessment: (answers: Record<string, number>) =>
    fetchAuth<AssessmentResult>("/api/v1/astrologer/assessment", {
      method: "POST",
      body: JSON.stringify(answers),
    }),

  getMyAvailability: () =>
    fetchAuth<{ availability: AvailabilityWindow[] }>("/api/v1/astrologer/availability"),

  addAvailability: (payload: {
    weekday: number;
    start_minute: number;
    end_minute: number;
    timezone_offset: number;
    slot_minutes: number;
  }) =>
    fetchAuth<{ id: number }>("/api/v1/astrologer/availability", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  removeAvailability: (id: number) =>
    fetchAuth<{ deleted: boolean }>(`/api/v1/astrologer/availability/${id}`, {
      method: "DELETE",
    }),

  getMyTimeline: () => fetchAuth<TimelineResponse>("/api/v1/astrologer/timeline"),

  // --- reviewer queue -------------------------------------------------------

  getReviewQueue: (status?: string) =>
    fetchAuth<AdminQueueResponse>(
      `/api/v1/admin/astrologers${status ? `?status=${encodeURIComponent(status)}` : ""}`
    ),

  getQueueCounts: () => fetchAuth<QueueCounts>("/api/v1/admin/astrologers/counts"),

  getApplication: (id: number) =>
    fetchAuth<AdminApplication>(`/api/v1/admin/astrologers/${id}`),

  /**
   * The backend names the field `rejection_reason`, not `reason`. Sending
   * `reason` left it unset, so a rejection was recorded with the fallback
   * "Not stated by reviewer" and the applicant saw that instead of what the
   * reviewer had written.
   */
  setApplicationStatus: (id: number, to_status: string, reason?: string) =>
    fetchAuth<{ id: number; status: string }>(`/api/v1/admin/astrologers/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ to_status, rejection_reason: reason }),
    }),

  /**
   * The backend names the field `identity_status` and uses "admin_verified"
   * rather than "approved": a human confirmed a self-declared scan, which is
   * deliberately not the same as government identity verification.
   */
  reviewDocument: (
    documentId: number,
    payload: { identity_status: "admin_verified" | "rejected"; reviewer_note?: string }
  ) =>
    fetchAuth<{ id: number; identity_status: string }>(
      `/api/v1/admin/astrologers/documents/${documentId}/review`,
      { method: "POST", body: JSON.stringify(payload) }
    ),

  /** Returns the raw file for a reviewer to inspect in the browser. */
  getDocumentContentUrl: (documentId: number) =>
    `${API_BASE}/api/v1/admin/astrologers/documents/${documentId}/content`,

  recordMockConsult: (
    id: number,
    payload: {
      scenario: string;
      response: string;
      score_accuracy: number;
      score_clarity: number;
      score_empathy: number;
      score_structure: number;
      verdict: string;
      notes?: string;
    }
  ) =>
    fetchAuth<{ id: number; verdict: string; accuracy_score: number }>(
      `/api/v1/admin/astrologers/${id}/mock-consults`,
      { method: "POST", body: JSON.stringify(payload) }
    ),

  overrideAssessment: (id: number, attemptId: number, passed: boolean, note?: string) =>
    fetchAuth<{ id: number; passed: boolean }>(
      `/api/v1/admin/astrologers/${id}/assessments/${attemptId}/override?passed=${passed}` +
        (note ? `&note=${encodeURIComponent(note)}` : ""),
      { method: "POST" }
    ),



  forgotPassword: (email: string) =>
    fetchAPI<{ message: string }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string) =>
    fetchAPI<{ message: string }>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password }),
    }),

  verifyEmail: (token: string) =>
    fetchAPI<{ message: string }>("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  resendVerification: (email: string) =>
    fetchAPI<{ message: string }>("/api/v1/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  getSessions: () => fetchAPI<{ sessions: Record<string, unknown>[] }>("/api/v1/auth/sessions"),

  deleteSession: (id: number) => fetchAPI<{ message: string }>(`/api/v1/auth/sessions/${id}`, { method: "DELETE" }),

  deleteAccount: (password: string) => fetchAPI<{ message: string }>("/api/v1/auth/account", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  }),

  exportData: () => fetchAPI<Record<string, unknown>>("/api/v1/auth/export"),

  getAuditTrail: (id: number) =>
    fetchAuth<{ events: OnboardingEvent[] }>(`/api/v1/admin/astrologers/${id}/audit`),

  getSettings: () => fetchAPI<SettingsResponse>("/api/v1/settings"),

  updateSettings: (house_system: string) =>
    fetchAPI<SettingsResponse>("/api/v1/settings", {
      method: "PUT",
      body: JSON.stringify({ house_system }),
    }),
};
