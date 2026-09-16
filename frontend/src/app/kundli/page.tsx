"use client";

import { useState } from "react";
import { api, cities, KundliResponse } from "@/lib/api";
import KundliChart from "@/components/KundliChart";

const zodiacMap: Record<number, { en: string; hi: string }> = {
  0: { en: "Aries", hi: "मेष" }, 1: { en: "Taurus", hi: "वृषभ" },
  2: { en: "Gemini", hi: "मिथुन" }, 3: { en: "Cancer", hi: "कर्क" },
  4: { en: "Leo", hi: "सिंह" }, 5: { en: "Virgo", hi: "कन्या" },
  6: { en: "Libra", hi: "तुला" }, 7: { en: "Scorpio", hi: "वृश्चिक" },
  8: { en: "Sagittarius", hi: "धनु" }, 9: { en: "Capricorn", hi: "मकर" },
  10: { en: "Aquarius", hi: "कुम्भ" }, 11: { en: "Pisces", hi: "मीन" },
};

export default function KundliPage() {
  const [form, setForm] = useState({
    name: "",
    birth_date: "1990-05-15",
    birth_time: "10:30",
    city: "Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    timezone_offset: 5.5,
  });
  const [result, setResult] = useState<KundliResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleCityChange = (cityName: string) => {
    const city = cities.find((c) => c.name === cityName);
    if (city) {
      setForm({ ...form, city: cityName, latitude: city.lat, longitude: city.lng, timezone_offset: city.tz });
    }
  };

  const handleGenerate = async () => {
    if (!form.name) { setError("Please enter your name"); return; }
    setLoading(true); setError("");
    try {
      const data = await api.generateKundli({
        name: form.name, birth_date: form.birth_date, birth_time: form.birth_time,
        birth_place: form.city, latitude: form.latitude, longitude: form.longitude,
        timezone_offset: form.timezone_offset,
      });
      setResult(data);
      // Save to localStorage
      const saved = JSON.parse(localStorage.getItem("kundli_history") || "[]");
      saved.unshift({ ...data, saved_at: new Date().toISOString() });
      localStorage.setItem("kundli_history", JSON.stringify(saved.slice(0, 10)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate kundli");
    } finally { setLoading(false); }
  };

  const handleSample = async () => {
    setLoading(true); setError("");
    try { const data = await api.getSampleKundli(); setResult(data); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };

  const handleExportPdf = async () => {
    if (!result) return;
    setExportingPdf(true);
    try {
      const blob = await api.exportKundliPdf({
        name: result.name, birth_date: result.birth_date, birth_time: result.birth_time,
        birth_place: result.birth_place, latitude: result.latitude, longitude: result.longitude,
        timezone_offset: form.timezone_offset,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kundli_${result.name.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF export failed");
    } finally { setExportingPdf(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Kundli Generator</h1>
      <p className="text-gray-700 mb-8">Generate your Vedic birth chart with planetary positions</p>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
            <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Birth Time</label>
            <input type="time" value={form.birth_time} onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Birth City</label>
            <select value={form.city} onChange={(e) => handleCityChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500">
              {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleGenerate} disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2 rounded-lg disabled:opacity-50">
              {loading ? "Generating..." : "Generate Kundli"}
            </button>
            <button onClick={handleSample}
              className="border border-purple-600 text-purple-600 hover:bg-purple-50 font-bold px-6 py-2 rounded-lg">
              Load Sample
            </button>
          </div>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Birth Chart Details</h2>
              <button onClick={handleExportPdf} disabled={exportingPdf}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {exportingPdf ? "Exporting..." : "📄 Export PDF"}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base">
              <div><span className="text-gray-700">Name:</span> <strong className="text-gray-900">{result.name}</strong></div>
              <div><span className="text-gray-700">Date:</span> <strong className="text-gray-900">{result.birth_date}</strong></div>
              <div><span className="text-gray-700">Time:</span> <strong className="text-gray-900">{result.birth_time}</strong></div>
              <div><span className="text-gray-700">Place:</span> <strong className="text-gray-900">{result.birth_place}</strong></div>
              <div><span className="text-gray-700">Ascendant:</span> <strong className="text-gray-900">{zodiacMap[result.asc_sign]?.en} {result.asc_sign_degree.toFixed(2)}°</strong></div>
              <div><span className="text-gray-700">Ayanamsa:</span> <strong className="text-gray-900">{result.ayanamsa.toFixed(4)}° (Lahiri)</strong></div>
              <div><span className="text-gray-700">Retrograde:</span> <strong className="text-red-500">{result.retrograde_planets.join(", ") || "None"}</strong></div>
              <div><span className="text-gray-700">Exalted:</span> <strong className="text-green-500">{result.exalted_planets.join(", ") || "None"}</strong></div>
            </div>
          </div>

          {/* Chart Visualization */}
          <KundliChart chart={result.chart} ascSign={result.asc_sign} />

          {/* Planetary Positions */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Planetary Positions (Graha Sthiti)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-base text-gray-900">
                <thead>
                  <tr className="bg-purple-100">
                    <th className="px-4 py-3 text-left">Planet</th>
                    <th className="px-4 py-3 text-left">Sign</th>
                    <th className="px-4 py-3 text-left">Degree</th>
                    <th className="px-4 py-3 text-left">Retrograde</th>
                    <th className="px-4 py-3 text-left">Dignity</th>
                  </tr>
                </thead>
                <tbody>
                  {result.planets.map((p) => (
                    <tr key={p.planet} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">{p.planet}</td>
                      <td className="px-4 py-3">{p.sign_name}</td>
                      <td className="px-4 py-3">{p.sign_degree.toFixed(2)}°</td>
                      <td className="px-4 py-3">{p.retrograde ? <span className="text-red-500 font-bold">Yes (R)</span> : "No"}</td>
                      <td className="px-4 py-3">{p.dignity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Houses */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">House Placements (Bhava)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(result.houses).map(([house, planets]) => (
                <div key={house} className={`rounded-lg p-4 ${planets.length > 0 ? "bg-purple-50 border border-purple-200" : "bg-gray-50"}`}>
                  <div className="text-sm text-gray-700 mb-1">House {house}</div>
                  <div className="font-semibold text-base text-gray-900">
                    {planets.length > 0 ? planets.join(", ") : <span className="text-gray-500">Empty</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vimshottari Dasha */}
          {result.dasha_info && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Vimshottari Dasha</h2>
              <p className="text-sm text-gray-700 mb-4">
                Birth Nakshatra: {result.dasha_info.birth_nakshatra.name} (Pada {result.dasha_info.birth_nakshatra.pada})
                {" "}&mdash; Dasha Lord: {result.dasha_info.birth_nakshatra.lord}
              </p>
              {result.dasha_info.current_dasha && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Current Dasha Period</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-900">
                    <div>
                      <span className="text-gray-700">Mahadasha:</span>{" "}
                      <strong>{result.dasha_info.current_dasha.mahadasha}</strong>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(result.dasha_info.current_dasha.mahadasha_start).toLocaleDateString()} &mdash;{" "}
                        {new Date(result.dasha_info.current_dasha.mahadasha_end).toLocaleDateString()}
                        <br />({result.dasha_info.current_dasha.mahadasha_remaining_years} yrs remaining)
                      </div>
                    </div>
                    {result.dasha_info.current_dasha.antardasha && (
                      <div>
                        <span className="text-gray-700">Antardasha:</span>{" "}
                        <strong>{result.dasha_info.current_dasha.antardasha}</strong>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(result.dasha_info.current_dasha.antardasha_start!).toLocaleDateString()} &mdash;{" "}
                          {new Date(result.dasha_info.current_dasha.antardasha_end!).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    {result.dasha_info.current_dasha.pratyantardasha && (
                      <div>
                        <span className="text-gray-700">Pratyantardasha:</span>{" "}
                        <strong>{result.dasha_info.current_dasha.pratyantardasha}</strong>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(result.dasha_info.current_dasha.pratyantardasha_start!).toLocaleDateString()} &mdash;{" "}
                          {new Date(result.dasha_info.current_dasha.pratyantardasha_end!).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <h3 className="font-semibold text-gray-800 mb-2">All Mahadashas</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                {result.dasha_info.all_mahadashas.slice(0, 9).map((d, i) => {
                  const isCurrent = result.dasha_info?.current_dasha?.mahadasha === d.lord;
                  return (
                    <div key={`${d.lord}-${i}`} className={`text-center p-3 rounded-lg ${isCurrent ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                      <div className="text-sm font-semibold">{d.lord}</div>
                      <div className="text-xs">{d.duration_years} yrs</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
