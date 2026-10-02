/**
 * Routes usable WITHOUT logging in. Everything else requires a session.
 *
 * This is the single source of truth, imported by both `AuthGate` (which
 * enforces it in the browser) and `sitemap.ts` (which decides what to advertise
 * for indexing). They must never disagree: a route the sitemap lists as
 * indexable but the gate blocks hands a crawler a login form, and Googlebot
 * indexes that instead of the page.
 */
export const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  "/",
  "/login",
  "/terms",
  "/privacy",
  "/refund",
  "/grievance",
]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}
