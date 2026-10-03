import type { Metadata } from "next";
import { Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import PageTransition from "@/components/PageTransition";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import AgeGate from "@/components/AgeGate";
import VisitTracker from "@/components/VisitTracker";
import AuthGate from "@/components/AuthGate";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

/* Playfair carries the astrology voice (display serif), Inter carries the
   interface (UI sans). Both load through the same next/font mechanism the old
   pairing used, so no new dependency. Geist Mono stays for numerals and code;
   Cinzel is gone -- a Roman-inscription face read as engraved rather than
   elegant, and Playfair replaces it everywhere the display font is referenced. */
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

/* Runs before first paint, so the stored theme is on <html> before React
   hydrates and there is no flash of the wrong theme. Kept inline and tiny
   rather than in a component: anything that waits for the bundle would flash.
   The stored value is JSON-encoded by `writeLocal`, so the raw string has to be
   decoded before it can be compared. The CSP already permits 'unsafe-inline'
   for exactly this class of bootstrap (see next.config.ts). */
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("astroseva-theme");try{t=JSON.parse(t)}catch(e){}if(t!=="light"&&t!=="dark")t="light";document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="light";}})();`;

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
    // `suppressHydrationWarning`: the bootstrap script above sets data-theme
    // before hydration, so the server-rendered attribute (absent) briefly
    // disagrees with the client. That is the intended behaviour, not a bug.
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
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
      <body className={`${inter.variable} ${geistMono.variable} ${playfair.variable} min-h-screen flex flex-col relative`}>
        <div className="noise-overlay">
          <svg width="100%" height="100%">
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)" />
          </svg>
        </div>
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
