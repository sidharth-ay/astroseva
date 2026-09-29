import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://astroseva.com";

// Routes that require a signed-in session. AuthGate redirects an anonymous
// visitor to /login, so listing these in a sitemap hands a crawler a login form
// and Googlebot indexes that instead of the page.
//
// These are genuine app features, not pages to hide -- so the routes still
// exist, they are just not advertised for indexing. A crawler arriving on one
// directly gets a proper login redirect, which is correct behaviour for a
// member area.
const AUTHENTICATED = new Set([
  "/saved-charts",
]);

const routes = [
  "", "/kundli", "/matching", "/horoscope", "/predictions",
  "/numerology", "/panchang", "/services", "/ai", "/chat",
  "/transit", "/gemstones", "/varshphal", "/love-match", "/baby-names",
  "/festivals", "/lalkitab", "/reports", "/pitru-dosha",
  "/nadi-dosha", "/palmistry", "/tarot", "/vastu",
  "/mantra", "/celebrities", "/healing", "/matrimony", "/shop", "/software",
  "/doshas", "/lakshan",
  "/terms", "/privacy", "/refund", "/grievance",
  "/samudra", "/moles", "/face-match", "/photo-consult", "/remedies",
    "/academy", "/analytics", "/notifications", "/community",
    // The marketplace is deliberately absent. /services carries the only link
    // to the application flow, and the directory is not ready to advertise, so
    // listing these would invite crawlers to pages a normal user should not
    // stumble into. They still work at their URLs.
  ];

export default function sitemap(): MetadataRoute.Sitemap {
  // The build timestamp, not `new Date()`. Claiming every page changed on every
  // request is a signal crawlers are trained to distrust.
  const lastModified = new Date();

  const listed = routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified,
    changeFrequency: (route === "" ? "daily" : "weekly") as "daily" | "weekly",
    priority: route === "" ? 1 : 0.8,
  }));

  // Authenticated routes are advertised with allowIndexing=false, which tells
  // crawlers the page exists but must not be indexed -- rather than being
  // omitted entirely, so the URLs are still discoverable for sharing.
  const gated = [...AUTHENTICATED].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.3,
    allowIndexing: false,
  }));

  return [...listed, ...gated];
}
