import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://astroseva.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "", "/kundli", "/matching", "/horoscope", "/predictions",
    "/numerology", "/panchang", "/services", "/ai", "/chat",
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
