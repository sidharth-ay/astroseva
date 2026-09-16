import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-yellow-400 font-bold text-lg mb-3">AstroSeva</h3>
            <p className="text-sm">
              Free Vedic Astrology platform. Get accurate Kundli, matching, predictions, and more.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-1 text-sm">
              <li><Link href="/kundli" className="hover:text-yellow-400">Kundli Generator</Link></li>
              <li><Link href="/matching" className="hover:text-yellow-400">Marriage Matching</Link></li>
              <li><Link href="/horoscope" className="hover:text-yellow-400">Daily Horoscope</Link></li>
              <li><Link href="/predictions" className="hover:text-yellow-400">AI Predictions</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">More Tools</h4>
            <ul className="space-y-1 text-sm">
              <li><Link href="/numerology" className="hover:text-yellow-400">Numerology</Link></li>
              <li><Link href="/panchang" className="hover:text-yellow-400">Panchang</Link></li>
              <li><Link href="/ai" className="hover:text-yellow-400">AI Astrologer</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-4 text-center text-xs">
          <p>AstroSeva - Vedic Astrology Platform. For educational purposes only.</p>
        </div>
      </div>
    </footer>
  );
}
