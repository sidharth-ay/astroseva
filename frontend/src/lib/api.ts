const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const REQUEST_TIMEOUT = 60000;

async function fetchWithTimeout(url: string, init?: RequestInit, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export const cities = [
  { name: "Delhi", lat: 28.6139, lng: 77.209, tz: 5.5 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777, tz: 5.5 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639, tz: 5.5 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707, tz: 5.5 },
  { name: "Bangalore", lat: 12.9716, lng: 77.5946, tz: 5.5 },
  { name: "Hyderabad", lat: 17.385, lng: 78.4867, tz: 5.5 },
  { name: "Pune", lat: 18.5204, lng: 73.8567, tz: 5.5 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873, tz: 5.5 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462, tz: 5.5 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714, tz: 5.5 },
  { name: "New York", lat: 40.7128, lng: -74.006, tz: -4 },
  { name: "London", lat: 51.5074, lng: -0.1278, tz: 1 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093, tz: 10 },
];

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
}

export interface DashaInfo {
  birth_nakshatra: { index: number; name: string; lord: string; pada: number };
  all_mahadashas: DashaPeriod[];
  current_dasha: CurrentDasha | null;
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
  lucky_numbers: number[];
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
  manglik: { is_manglik: boolean; severity: string };
  kaal_sarp: { has_dosha: boolean };
  sade_sati: { is_active: boolean };
  pitru_dosha: { has_dosha: boolean };
  total_doshas: number;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API request failed");
  }
  return res.json();
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

  getDailyHoroscope: (sign: string) =>
    fetchAPI<HoroscopeResponse>(`/api/v1/horoscope/daily/${sign}?t=${Date.now()}`),

  getAllHoroscopes: () =>
    fetchAPI<{ horoscopes: HoroscopeResponse[] }>("/api/v1/horoscope/daily"),

  getNumerology: (name: string, birth_date: string) =>
    fetchAPI<NumerologyResponse>("/api/v1/numerology/analyze", {
      method: "POST",
      body: JSON.stringify({ name, birth_date }),
    }),

  getPanchang: (lat = 28.6139, lng = 77.209) =>
    fetchAPI<PanchangResponse>(`/api/v1/panchang/daily?latitude=${lat}&longitude=${lng}`),

  generatePrediction: (data: BirthData, prediction_type: string) =>
    fetchAPI<{ content: string; ai_model: string }>("/api/v1/predictions/generate", {
      method: "POST",
      body: JSON.stringify({ birth_data: data, prediction_type, language: "en" }),
    }),

  detectDoshas: (data: BirthData) =>
    fetchAPI<DoshaResponse>("/api/v1/doshas/detect", {
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
};
