import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { isPublicPath } from "@/lib/public-paths";

const routes = [
  "", "/login", "/kundli", "/matching", "/horoscope", "/predictions",
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

function normalize(route: string): string {
  return route === "" ? "/" : route;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The build timestamp, not `new Date()`. Claiming every page changed on every
  // request is a signal crawlers are trained to distrust.
  const lastModified = new Date();

  // The host comes from the request, not from a hardcoded fallback. The old
  // code defaulted to https://astroseva.com, so every deployment on another
  // domain advertised the wrong canonical URLs. NEXT_PUBLIC_SITE_URL still wins
  // when it is set explicitly (staging, previews); otherwise the request's own
  // host is used, which is correct by construction.
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "astroseva.com";
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;

  return routes
    .filter((route) => {
      // Only advertise what a crawler can actually see. Every other route is
      // behind AuthGate, which redirects anonymous visitors (including
      // Googlebot) to /login -- listing those URLs previously handed the
      // crawler a login form to index instead of the page. Gated pages carry
      // their own `robots: { index: false }` metadata as well, so a URL that
      // leaks in through a link still will not be indexed.
      //
      // Both halves read the same PUBLIC_PATHS set as AuthGate itself, so the
      // gate, the sitemap, and the per-route metadata cannot disagree.
      return isPublicPath(normalize(route));
    })
    .map((route) => {
      return {
        url: `${baseUrl}${route}`,
        lastModified,
        changeFrequency: (route === "" ? "daily" : "weekly") as "daily" | "weekly",
        priority: route === "" ? 1 : 0.8,
      };
    });
}
