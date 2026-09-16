"use client";

import { useState } from "react";
import { api, NumerologyResponse } from "@/lib/api";

export default function NumerologyPage() {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("1990-05-15");
  const [result, setResult] = useState<NumerologyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!name) { setError("Please enter your name"); return; }
    setLoading(true); setError("");
    try {
      const data = await api.getNumerology(name, birthDate);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Numerology</h1>
      <p className="text-gray-700 mb-8">Discover your life path and destiny numbers</p>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label htmlFor="birth-date" className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
            <input id="birth-date" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500" />
          </div>
          <button onClick={handleAnalyze} disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2 rounded-lg disabled:opacity-50">
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>

      {result && (
        <div className="space-y-6">
          {/* Main Numbers */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Life Path", value: result.life_path.life_path_number, planet: result.life_path.planet, color: "bg-purple-500" },
              { label: "Destiny", value: result.destiny.destiny_number, planet: result.destiny.planet, color: "bg-indigo-500" },
              { label: "Birthday", value: result.birthday.birthday_number, planet: "", color: "bg-pink-500" },
              { label: "Soul Urge", value: result.soul_urge.soul_urge_number, planet: "", color: "bg-blue-500" },
              { label: "Personality", value: result.personality.personality_number, planet: "", color: "bg-green-500" },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-xl shadow-md p-6 text-center">
                <div className={`w-20 h-20 ${item.color} rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3`}>
                  {item.value}
                </div>
                <div className="font-semibold text-base text-gray-900">{item.label}</div>
                {item.planet && <div className="text-sm text-gray-700">{item.planet}</div>}
              </div>
            ))}
          </div>

          {/* Traits */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Traits</h2>
            <div className="flex flex-wrap gap-2">
              {result.life_path.traits.map((trait) => (
                <span key={trait} className="bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-base font-medium">{trait}</span>
              ))}
              {result.destiny.traits.map((trait) => (
                <span key={trait} className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-base font-medium">{trait}</span>
              ))}
            </div>
          </div>

          {/* Lucky Numbers */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Lucky Numbers</h2>
            <div className="flex gap-4">
              {result.lucky_numbers.map((num) => (
                <div key={num} className="w-14 h-14 bg-yellow-400 text-purple-900 rounded-full flex items-center justify-center text-2xl font-bold">
                  {num}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
