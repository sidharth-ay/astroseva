import type { NextConfig } from "next";

/**
 * Where the API lives, used to build `connect-src`.
 *
 * This was hardcoded to the two localhost origins, so the policy broke in every
 * deployed environment: a browser would refuse the API calls and the site would
 * appear not to work, with no error in the server logs because the requests
 * never left the browser.
 *
 * `NEXT_PUBLIC_API_URL` is inlined at build time, so setting it before
 * `next build` is what puts a real deployment's origin in the policy.
 */
const apiOrigin = (() => {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) {
    try {
      // `origin` drops the path and trailing slash, so the value compares
      // equal to what the browser sends in the Origin header.
      return new URL(configured).origin;
    } catch {
      console.warn(
        `[csp] NEXT_PUBLIC_API_URL is not a valid URL: ${configured}. ` +
          `Falling back to same-origin only, which will block API calls.`,
      );
    }
  }
  return null;
})();

// `'self'` alone is the right default: in production the API is normally
// served behind the same host, so naming no domain is both correct and safe.
const connectSrc =
  apiOrigin === null ? "'self'" : `'self' ${apiOrigin}`;

/**
 * `'unsafe-eval'` and `'unsafe-inline'` in `script-src` together remove almost
 * all of what a Content-Security-Policy is for: they permit `eval` and inline
 * `<script>`, so any injected script executes. The `'unsafe-inline'` is kept
 * because Next.js injects bootstrap and inline style props at runtime, and
 * removing it without nonces produces a blank page.
 *
 * `'unsafe-eval'` is not needed for a production React build and has been
 * dropped. If a dev-mode page breaks, it is because this is a production
 * header file; `next dev` does not apply it.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      // `object-src`, `base-uri` and `form-action` do not fall back to
      // `default-src`, so they have to be stated. `frame-ancestors` covers
      // framing for clients that read CSP; `X-Frame-Options` above covers the
      // rest.
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      `connect-src ${connectSrc}`,
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // These features were removed. The paths were listed in sitemap.ts and may
  // be indexed, so send them somewhere useful instead of a dead-end 404.
  async redirects() {
    return ["/voice", "/kp", "/chinese-astrology", "/age-palm"].map((source) => ({
      source,
      destination: "/services",
      permanent: true,
    }));
  },
};

export default nextConfig;
