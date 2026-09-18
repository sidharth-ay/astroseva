"use client";

import { useState, useEffect } from "react";
import { api, PanchangResponse } from "@/lib/api";
import CitySearch from "@/components/CitySearch";

const defaultCity = { name: "Delhi", lat: 28.6139, lng: 77.209, tz: 5.5 };

export default function PanchangPage() {
  const [data, setData] = useState<PanchangResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(defaultCity);

  const fetchPanchang = () => {
    setLoading(true);
    setError("");
    api.getPanchang(selected.lat, selected.lng)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load panchang"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPanchang();
  }, [selected]);

  if (loading) return <div className="text-center py-20 text-gray-700">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Panchang</h1>
      <p className="text-gray-700 mb-8">Daily Hindu calendar and auspicious timings</p>

      {/* City Selector */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <CitySearch value={selected.name} onChange={setSelected} placeholder="Search city..." className="w-full md:w-64" />
      </div>

      {error && (
        <div className="text-center py-10">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchPanchang}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2 rounded-lg">
            Retry
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-purple-600 mb-4">📅 {data.date}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-700">Tithi (Lunar Day)</div>
                <div className="font-bold text-lg">{data.tithi.tithi_name}</div>
                <div className="text-sm text-gray-700">{data.tithi.paksha} Paksha</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-700">Nakshatra (Star)</div>
                <div className="font-bold text-lg">{data.nakshatra.nakshatra_name}</div>
                <div className="text-sm text-gray-700">Pada {data.nakshatra.pada}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-700">Yoga</div>
                <div className="font-bold text-lg">{data.yoga.yoga_name}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-700">Karana</div>
                <div className="font-bold text-lg">{data.karana.karana_name}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-700">Vara (Day)</div>
                <div className="font-bold text-lg">{data.vara.vara_name}</div>
                <div className="text-sm text-gray-700">Lord: {data.vara.vara_lord}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-700">Sunrise / Sunset</div>
                <div className="font-bold text-lg">{data.sunrise} / {data.sunset}</div>
              </div>
            </div>
          </div>

          {/* Timings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-50 rounded-xl shadow-md p-6 border border-red-200">
              <h3 className="text-lg font-bold text-red-700 mb-2">⚠️ Rahu Kaal</h3>
              <div className="text-2xl font-bold text-red-600">{data.rahu_kaal.start} - {data.rahu_kaal.end}</div>
              <p className="text-sm text-red-600 mt-2">Avoid important work during this period</p>
            </div>
            <div className="bg-gray-50 rounded-xl shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-700 mb-2">Gulika Kaal</h3>
              <div className="text-2xl font-bold text-gray-900">{data.gulika_kaal.start} - {data.gulika_kaal.end}</div>
              <p className="text-sm text-gray-700 mt-2">Inauspicious period to avoid</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
