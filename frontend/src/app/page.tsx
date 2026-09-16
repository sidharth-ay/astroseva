"use client";

import Link from "next/link";

const features = [
  {
    title: "Kundli Generator",
    description: "Generate your Vedic birth chart with planetary positions, houses, and analysis.",
    href: "/kundli",
    icon: " ",
    color: "from-orange-500 to-red-500",
  },
  {
    title: "Marriage Matching",
    description: "Ashtakoot gun milan for marriage compatibility analysis.",
    href: "/matching",
    icon: " ",
    color: "from-pink-500 to-rose-500",
  },
  {
    title: "AI Predictions",
    description: "Get personalized predictions powered by AI for career, marriage, health, and more.",
    href: "/predictions",
    icon: " ",
    color: "from-purple-500 to-indigo-500",
  },
  {
    title: "Daily Horoscope",
    description: "Your daily horoscope with love, career, and health ratings.",
    href: "/horoscope",
    icon: " ",
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Numerology",
    description: "Calculate your life path, destiny, and soul urge numbers.",
    href: "/numerology",
    icon: " ",
    color: "from-yellow-500 to-orange-500",
  },
  {
    title: "Panchang",
    description: "Daily panchang with tithi, nakshatra, yoga, and auspicious timings.",
    href: "/panchang",
    icon: " ",
    color: "from-green-500 to-emerald-500",
  },
];

const zodiacSigns = [
  { name: "Aries", symbol: "♈", sign: "aries" },
  { name: "Taurus", symbol: "♉", sign: "taurus" },
  { name: "Gemini", symbol: "♊", sign: "gemini" },
  { name: "Cancer", symbol: "♋", sign: "cancer" },
  { name: "Leo", symbol: "♌", sign: "leo" },
  { name: "Virgo", symbol: "♍", sign: "virgo" },
  { name: "Libra", symbol: "♎", sign: "libra" },
  { name: "Scorpio", symbol: "♏", sign: "scorpio" },
  { name: "Sagittarius", symbol: "♐", sign: "sagittarius" },
  { name: "Capricorn", symbol: "♑", sign: "capricorn" },
  { name: "Aquarius", symbol: "♒", sign: "aquarius" },
  { name: "Pisces", symbol: "♓", sign: "pisces" },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-yellow-400">AstroSeva</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Free Vedic Astrology Platform - Get your Kundli, Marriage Matching, AI Predictions, and more
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/kundli"
              className="bg-yellow-500 hover:bg-yellow-400 text-purple-900 font-bold px-8 py-3 rounded-lg transition-colors"
            >
              Generate Kundli
            </Link>
            <Link
              href="/matching"
              className="border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-purple-900 font-bold px-8 py-3 rounded-lg transition-colors"
            >
              Marriage Matching
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Our Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Link
                key={feature.href}
                href={feature.href}
                className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border border-gray-100"
              >
                <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center text-2xl mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-900">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Zodiac Signs */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Daily Horoscope
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {zodiacSigns.map((z) => (
              <Link
                key={z.sign}
                href={`/horoscope?sign=${z.sign}`}
                className="text-center p-4 rounded-xl hover:bg-purple-50 transition-colors group"
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                  {z.symbol}
                </div>
                <div className="text-sm font-medium text-gray-700">{z.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            About AstroSeva
          </h2>
          <p className="text-gray-900 text-lg mb-4">
            AstroSeva is a free Vedic Astrology platform that provides accurate birth chart generation,
            marriage matching, AI-powered predictions, and all essential astrology tools.
          </p>
          <p className="text-gray-900 text-lg">
            Our calculations are based on the ancient Vedic astrology system with Lahiri ayanamsa.
            Get personalized predictions powered by modern AI technology.
          </p>
        </div>
      </section>
    </div>
  );
}
