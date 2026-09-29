const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
    const { signal: _externalSignal, ...rest } = init || {};
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(id);
    if (external && typeof external.removeEventListener === "function") {
      external.removeEventListener("abort", onExternalAbort);
    }
  }
}

export interface CityEntry {
  name: string;
  lat: number;
  lng: number;
  tz: number;
  state?: string;
}

import citiesJson from "./cities.json";
export const cities: CityEntry[] = citiesJson as CityEntry[];

export interface BirthData {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  latitude: number;
  longitude: number;
  timezone_offset: number;
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
        naisargika: number; drik: number; total_rupa: number;
        rupor_virupada: number;
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
        occupied_sign: number; total_points: number;
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

export interface MantraCategories {
  deity: { id: string; name: string; description: string; mantra_count: number }[];
  purpose: { id: string; name: string; description: string; mantra_count: number; related_mantras: string[] }[];
  planet: { id: string; name: string; description: string; mantra_count: number; related_mantras: string[] }[];
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

export interface LalKitabResponse {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  houses: Record<string, { planet: string; sign: string; degree: number }[]>;
  planets: { planet: string; house: number; sign: string; degree: number }[];
  remedies: { planet: string; house: number; sign: string; remedy: string; gemstone?: string; mantra?: string }[];
}

export interface ReportResponse {
  report_type: string;
  content: string;
  sections?: { title: string; content: string }[];
  house_analysis?: Record<string, string>;
  ai_model: string;
}

export interface PanchangResponse {
  date: string;
  tithi: { tithi_number: number; tithi_name: string; paksha: string };
  nakshatra: { nakshatra_name: string; pada: number };
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
    // FastAPI 422 details arrive as an array — humanize them.
    let message: string;
    if (Array.isArray(error.detail)) {
      message = error.detail
        .map((d: { loc?: (string | number)[]; msg?: string }) => {
          const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "input";
          return `${field}: ${d.msg || "invalid value"}`;
        })
        .join("; ");
    } else {
      message = error.detail || "API request failed";
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
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

export interface AuthUser {
  id: number;
  email: string;
  name: string;
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

export function setSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChange();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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

export const api = {
  generateKundli: (data: BirthData) =>
    fetchAPI<KundliResponse>("/api/v1/kundli/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getSampleKundli: () =>
    fetchAPI<KundliResponse>("/api/v1/kundli/sample"),

  exportKundliPdf: async (data: BirthData) => {
    const res = await fetch(`${API_BASE}/api/v1/kundli/export-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("PDF export failed");
    return res.blob();
  },

  analyzeMatching: (boy: BirthData, girl: BirthData) =>
    fetchAPI<MatchingResponse>("/api/v1/matching/analyze", {
      method: "POST",
      body: JSON.stringify({ boy, girl }),
    }),

  exportMatchingPdf: async (boy: BirthData, girl: BirthData) => {
    const res = await fetch(`${API_BASE}/api/v1/matching/export-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boy, girl }),
    });
    if (!res.ok) throw new Error("PDF export failed");
    return res.blob();
  },

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

  getPanchang: (lat = 28.6139, lng = 77.209) =>
    fetchAPI<PanchangResponse>(`/api/v1/panchang/daily?latitude=${lat}&longitude=${lng}`),

  getChoghadiya: (lat = 28.6139, lng = 77.209) =>
    fetchAPI<{ date: string; sunrise: string; sunset: string; day_choghadiya: { name: string; start: string; end: string; type: string }[]; night_choghadiya: { name: string; start: string; end: string; type: string }[] }>(`/api/v1/panchang/choghadiya?latitude=${lat}&longitude=${lng}`),

  getHora: (lat = 28.6139, lng = 77.209) =>
    fetchAPI<{ date: string; day_hora: { planet: string; start: string; end: string; type: string }[]; night_hora: { planet: string; start: string; end: string; type: string }[] }>(`/api/v1/panchang/hora?latitude=${lat}&longitude=${lng}`),

  getGowri: (lat = 28.6139) =>
    fetchAPI<{ date: string; periods: { name: string; start: string; end: string; nature: string }[] }>(`/api/v1/panchang/gowri?latitude=${lat}`),

  getGhatiMuhurat: (lat = 28.6139, lng = 77.209) =>
    fetchAPI<{ date: string; muhurats: { start: string; end: string; name: string }[] }>(`/api/v1/panchang/ghati?latitude=${lat}&longitude=${lng}`),

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
    fetchAPI<{ doshas: DoshaResponse; remedies: unknown; language: string }>(`/api/v1/doshas/remedies?language=${language}`, {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    }),

  getSadePeriods: (data: BirthData) =>
    fetchAPI<{ moon_sign: number; periods: { phase: string; start: string; end: string; saturn_sign: number; saturn_sign_name?: string }[] }>("/api/v1/doshas/sade-sati-periods", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  chatSend: (message: string, history: { role: string; content: string }[], language: string = "en", birthDetails?: Record<string, any>) =>
    fetchAPI<{ response: string; model: string }>("/api/v1/chat/send", {
      method: "POST",
      body: JSON.stringify({ message, history, language, birth_details: birthDetails || null }),
    }),

  chatSuggestions: () =>
    fetchAPI<{ suggestions: string[] }>("/api/v1/chat/suggestions"),

  getTransit: (signal?: AbortSignal) =>
    fetchAPI<{ date: string; transits: { planet: string; current_sign: string; current_sign_index: number; retrograde: boolean; speed: number }[]; current_signs: Record<string, string> }>(`/api/v1/transit/today`, { signal }),

  getGemstones: (data: BirthData) =>
    fetchAPI<{ birth_data: Record<string, unknown>; gemstones: { planet: string; gemstone: string; weight: string; metal: string; finger: string; day: string; alternative: string }[]; recommendations: string }>("/api/v1/gemstones/recommend", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getVarshphal: (data: BirthData, year: number) =>
    fetchAPI<{ birth_data: Record<string, unknown>; year: number; varshphal_chart: Record<string, unknown>; predictions: Record<string, string>; auspicious_months: string[]; challenging_months: string[] }>("/api/v1/varshphal/calculate", {
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
    fetchAPI<{ message: string; token: string; user: AuthUser }>("/api/v1/auth/login", {
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
};
