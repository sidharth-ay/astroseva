import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://astroseva.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "", "/kundli", "/matching", "/horoscope", "/predictions",
    "/numerology", "/panchang", "/services", "/ai", "/chat",
    "/transit", "/gemstones", "/varshphal", "/love-match", "/baby-names",
    "/festivals", "/lalkitab", "/kp", "/reports", "/pitru-dosha",
    "/nadi-dosha", "/palmistry", "/tarot", "/vastu", "/chinese-astrology",
    "/mantra", "/celebrities", "/healing", "/matrimony", "/shop", "/software",
    "/doshas", "/saved-charts", "/lakshan",
    "/terms", "/privacy", "/refund", "/grievance",
    "/samudra", "/voice", "/moles", "/age-palm", "/face-match", "/photo-consult", "/remedies",
    "/academy", "/analytics", "/notifications", "/community",
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
