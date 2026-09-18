"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import CitySearch from "@/components/CitySearch";

const types = [
  { id: "career", label: "Career", icon: " " },
  { id: "marriage", label: "Marriage", icon: " " },
  { id: "health", label: "Health", icon: " " },
  { id: "finance", label: "Finance", icon: " " },
  { id: "love", label: "Love", icon: "❤️" },
  { id: "education", label: "Education", icon: " " },
];

export default function PredictionsPage() {
  const [form, setForm] = useState({
    name: "", birth_date: "1990-05-15", birth_time: "10:30",
    city: "Delhi", latitude: 28.6139, longitude: 77.209, timezone_offset: 5.5,
  });
  const [selectedType, setSelectedType] = useState("career");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCity = (city: { name: string; lat: number; lng: number; tz: number }) => {
    setForm((p) => ({ ...p, city: city.name, latitude: city.lat, longitude: city.lng, timezone_offset: city.tz }));
  };

  const handleGenerate = async () => {
    if (!form.name) { setError("Please enter your name"); return; }
    setLoading(true); setError(""); setResult("");
    try {
      const data = await api.generatePrediction({
        name: form.name, birth_date: form.birth_date, birth_time: form.birth_time,
        birth_place: form.city, latitude: form.latitude, longitude: form.longitude,
        timezone_offset: form.timezone_offset,
      }, selectedType);
      setResult(data.content);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Predictions</h1>
      <p className="text-gray-700 mb-8">Get personalized Vedic astrology predictions</p>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pred-name" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input id="pred-name" type="text" placeholder="Your Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label htmlFor="pred-date" className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
            <input id="pred-date" type="date" value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label htmlFor="pred-time" className="block text-sm font-medium text-gray-700 mb-1">Birth Time</label>
            <input id="pred-time" type="time" value={form.birth_time}
              onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label htmlFor="pred-city" className="block text-sm font-medium text-gray-700 mb-1">Birth City</label>
            <CitySearch value={form.city} onChange={handleCity} placeholder="Search city..." />
          </div>
        </div>
      </div>

      {/* Type Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {types.map((t) => (
          <button key={t.id} onClick={() => setSelectedType(t.id)}
            className={`flex items-center gap-1 px-5 py-2.5 rounded-full text-base font-medium transition-colors ${
              selectedType === t.id ? "bg-purple-600 text-white" : "bg-white border border-gray-300 hover:border-purple-500"}`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <button onClick={handleGenerate} disabled={loading}
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 rounded-lg disabled:opacity-50 mb-6">
        {loading ? "Generating..." : "Get Prediction"}
      </button>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {result && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-purple-600 mb-4">
            {types.find((t) => t.id === selectedType)?.icon} {types.find((t) => t.id === selectedType)?.label} Prediction
          </h2>
          <div className="prose max-w-none text-gray-900 whitespace-pre-wrap">{result}</div>
        </div>
      )}
    </div>
  );
}
