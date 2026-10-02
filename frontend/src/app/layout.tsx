import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel } from "next/font/google";
import PageTransition from "@/components/PageTransition";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import AgeGate from "@/components/AgeGate";
import VisitTracker from "@/components/VisitTracker";
import AuthGate from "@/components/AuthGate";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["400", "700", "900"] });

export const metadata: Metadata = {
  title: {
    default: "AstroSeva - Free Vedic Astrology Platform",
    template: "%s | AstroSeva",
  },
  description: "Free Vedic Astrology platform. Generate your birth chart, check marriage compatibility, get AI predictions, daily horoscope, and more.",
  keywords: ["vedic astrology", "kundli", "birth chart", "horoscope", "marriage matching", "numerology", "panchang"],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "AstroSeva",
    title: "AstroSeva - Free Vedic Astrology Platform",
    description: "Free Vedic Astrology platform with AI-powered predictions, birth charts, and more.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AstroSeva - Free Vedic Astrology Platform",
    description: "Free Vedic Astrology platform with AI-powered predictions, birth charts, and more.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        {/* Structured data for search engines. Organization and WebSite are
            the two types every site qualifies for; anything more specific
            (FAQPage, Article) belongs on the pages that actually carry that
            content, not here. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: "AstroSeva",
                  url:
                    process.env.NEXT_PUBLIC_SITE_URL ||
                    "https://astroseva.com",
                  description:
                    "Free Vedic astrology platform: birth charts, horoscope matching, panchang, and remedies.",
                },
                {
                  "@type": "WebSite",
                  name: "AstroSeva",
                  url:
                    process.env.NEXT_PUBLIC_SITE_URL ||
                    "https://astroseva.com",
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} min-h-screen flex flex-col relative`}>
        <div className="noise-overlay">
          <svg width="100%" height="100%">
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)" />
          </svg>
        </div>
        <ScrollProgressBar />
        <AgeGate />
        <VisitTracker />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm" style={{ background: "var(--gold)", color: "var(--midnight)" }}>
          Skip to content
        </a>
        <Navbar />
        <main id="main-content" className="flex-1 relative z-10">
          <PageTransition>
            <AuthGate>{children}</AuthGate>
          </PageTransition>
        </main>
        <Footer />
      </body>
    </html>
  );
}
