import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["400", "700", "900"] });

export const metadata: Metadata = {
  title: "AstroSeva - Vedic Astrology Platform",
  description: "Free Vedic Astrology - Kundli, Marriage Matching, Predictions, Horoscope, Panchang, Numerology",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} min-h-screen flex flex-col relative`}>
        <div className="noise-overlay">
          <svg width="100%" height="100%">
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)" />
          </svg>
        </div>
        <main className="flex-1 relative z-10">{children}</main>
      </body>
    </html>
  );
}
