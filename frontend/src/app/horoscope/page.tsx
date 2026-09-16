"use client";

import { useState, useEffect } from "react";
import { api, HoroscopeResponse } from "@/lib/api";

const signs = [
  { id: "aries", name: "Aries", symbol: "♈" }, { id: "taurus", name: "Taurus", symbol: "♉" },
  { id: "gemini", name: "Gemini", symbol: "♊" }, { id: "cancer", name: "Cancer", symbol: "♋" },
  { id: "leo", name: "Leo", symbol: "♌" }, { id: "virgo", name: "Virgo", symbol: "♍" },
  { id: "libra", name: "Libra", symbol: "♎" }, { id: "scorpio", name: "Scorpio", symbol: "♏" },
  { id: "sagittarius", name: "Sagittarius", symbol: "♐" }, { id: "capricorn", name: "Capricorn", symbol: "♑" },
  { id: "aquarius", name: "Aquarius", symbol: "♒" }, { id: "pisces", name: "Pisces", symbol: "♓" },
];

export default function HoroscopePage() {
  const [selected, setSelected] = useState("aries");
  const [data, setData] = useState<HoroscopeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchHoroscope = (sign: string) => {
    setLoading(true);
    setError("");
    api.getDailyHoroscope(sign)
      .then((result) => {
        setData(result);
        setLoading(false);
        // If response is local, auto-refetch after 15s to get AI version
        if (result.ai_model === "astroseva-local") {
          setTimeout(() => {
            api.getDailyHoroscope(sign).then((aiResult) => {
              if (aiResult.ai_model !== "astroseva-local") setData(aiResult);
            }).catch(() => {});
          }, 15000);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load horoscope");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHoroscope(selected);
  }, [selected]);

  const Stars = ({ count }: { count: number }) => (
    <div className="flex gap-1" aria-label={`${count} out of 5 stars`} role="img">{Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < count ? "text-yellow-400" : "text-gray-300"}>★</span>
    ))}</div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Daily Horoscope</h1>
      <p className="text-gray-700 mb-8">Get your daily horoscope predictions</p>

      {/* Zodiac Selector */}
      <div className="flex flex-wrap gap-2 mb-8">
        {signs.map((s) => (
          <button key={s.id} onClick={() => setSelected(s.id)}
            className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selected === s.id ? "bg-purple-600 text-white" : "bg-white border border-gray-300 hover:border-purple-500"}`}>
            <span>{s.symbol}</span> {s.name}
          </button>
        ))}
      </div>

      {/* Horoscope Card */}
      {loading ? (
        <div className="text-center py-20 text-gray-700">Loading...</div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => fetchHoroscope(selected)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2 rounded-lg">
            Retry
          </button>
        </div>
      ) : data ? (
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-5xl">{signs.find((s) => s.id === selected)?.symbol}</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 capitalize">{selected}</h2>
              <p className="text-gray-700 text-sm">{data.date}</p>
            </div>
          </div>

          <div className="prose max-w-none mb-6 text-gray-900 whitespace-pre-wrap">{data.prediction}</div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-pink-50 rounded-lg p-4">
              <div className="text-base text-gray-900 mb-1 font-medium">Love</div>
              <Stars count={data.love_rating} />
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-base text-gray-900 mb-1 font-medium">Career</div>
              <Stars count={data.career_rating} />
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-base text-gray-900 mb-1 font-medium">Health</div>
              <Stars count={data.health_rating} />
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-base text-gray-900 mb-1 font-medium">Lucky</div>
              <div className="font-bold text-lg text-purple-600">{data.lucky_numbers.join(", ")}</div>
              <div className="text-sm text-gray-700">Color: {data.lucky_color}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
