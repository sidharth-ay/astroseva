"use client";

import { useState } from "react";
import { api, cities, MatchingResponse } from "@/lib/api";

export default function MatchingPage() {
  const [boy, setBoy] = useState({ name: "", birth_date: "1990-01-01", birth_time: "10:00", birth_place: "Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5 });
  const [girl, setGirl] = useState({ name: "", birth_date: "1992-05-15", birth_time: "14:00", birth_place: "Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5 });
  const [result, setResult] = useState<MatchingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCity = (setter: typeof setBoy, city: string) => {
    const c = cities.find((x) => x.name === city);
    if (c) setter((prev) => ({ ...prev, birth_place: city, latitude: c.lat, longitude: c.lng, timezone_offset: c.tz }));
  };

  const handleAnalyze = async () => {
    if (!boy.name || !girl.name) { setError("Please enter both names"); return; }
    setLoading(true); setError("");
    try {
      const data = await api.analyzeMatching(boy, girl);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  };

  const getScoreColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 75) return "text-green-600";
    if (pct >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Marriage Matching</h1>
      <p className="text-gray-700 mb-8">Ashtakoot Gun Milan for marriage compatibility</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Boy Form */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-blue-600 mb-4">Groom Details</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="boy-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input id="boy-name" type="text" placeholder="Name" value={boy.name} onChange={(e) => setBoy({ ...boy, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label htmlFor="boy-date" className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
              <input id="boy-date" type="date" value={boy.birth_date} onChange={(e) => setBoy({ ...boy, birth_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label htmlFor="boy-time" className="block text-sm font-medium text-gray-700 mb-1">Birth Time</label>
              <input id="boy-time" type="time" value={boy.birth_time} onChange={(e) => setBoy({ ...boy, birth_time: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label htmlFor="boy-city" className="block text-sm font-medium text-gray-700 mb-1">Birth City</label>
              <select id="boy-city" value={boy.birth_place} onChange={(e) => handleCity(setBoy, e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500">
                {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Girl Form */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-pink-600 mb-4">Bride Details</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="girl-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input id="girl-name" type="text" placeholder="Name" value={girl.name} onChange={(e) => setGirl({ ...girl, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label htmlFor="girl-date" className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
              <input id="girl-date" type="date" value={girl.birth_date} onChange={(e) => setGirl({ ...girl, birth_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label htmlFor="girl-time" className="block text-sm font-medium text-gray-700 mb-1">Birth Time</label>
              <input id="girl-time" type="time" value={girl.birth_time} onChange={(e) => setGirl({ ...girl, birth_time: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label htmlFor="girl-city" className="block text-sm font-medium text-gray-700 mb-1">Birth City</label>
              <select id="girl-city" value={girl.birth_place} onChange={(e) => handleCity(setGirl, e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500">
                {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleAnalyze} disabled={loading}
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 rounded-lg disabled:opacity-50 mb-8">
        {loading ? "Analyzing..." : "Analyze Matching"}
      </button>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Score Card */}
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {result.boy_name} & {result.girl_name}
            </h2>
            <div className="text-6xl font-bold text-purple-600 mb-2">
              {result.total_score}/{result.max_score}
            </div>
            <div className="text-xl text-gray-900 mb-2">
              {result.compatibility_percentage}% Compatible
            </div>
            <div className={`text-lg font-semibold ${getScoreColor(result.total_score, result.max_score)}`}>
              {result.recommendation}
            </div>
            {result.nadi_dosha && (
              <div className="mt-4 bg-red-50 text-red-700 px-4 py-2 rounded-lg">
                Nadi Dosha Detected - Consult an astrologer
              </div>
            )}
          </div>

          {/* Koota Details */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Ashtakoot Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(result.kootas).map(([key, koota]: [string, any]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-base text-gray-900 capitalize">{koota.koota}</span>
                    <span className={`font-bold text-lg ${getScoreColor(koota.score, koota.max_points)}`}>
                      {koota.score}/{koota.max_points}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-purple-600 h-3 rounded-full" style={{ width: `${(koota.score / koota.max_points) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
