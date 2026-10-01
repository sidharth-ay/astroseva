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
          `Falling back to the local default.`,
      );
    }
  }
  // Unset, so this must be the same fallback the client uses. It was `'self'`
  // here while `api.ts` defaulted to 127.0.0.1:8000, and the two files have to
  // agree: the browser checks this policy before the request is made, so a
  // `connect-src` that omits the API's real address produces "Failed to
  // fetch" on login and registration while the backend is perfectly healthy.
  // `API_BASE_FALLBACK` in src/lib/api.ts is the other half of this pair.
  return "http://127.0.0.1:8000";
})();

// `'self'` covers a same-origin API; the explicit origin covers a split one.
const connectSrc = `'self' ${apiOrigin}`;

/**
 * `'unsafe-eval'` and `'unsafe-inline'` in `script-src` together remove almost
 * all of what a Content-Security-Policy is for: they permit `eval` and inline
 * `<script>`, so any injected script executes. The `'unsafe-inline'` is kept
 * because Next.js injects bootstrap and inline style props at runtime, and
 * removing it without nonces produces a blank page.
 *
 * `'unsafe-eval'` is not needed by a production React build, so it is only
 * granted in development. React's dev runtime calls `eval` to reconstruct
 * callstacks, and the development overlay needs it; without it the client
 * throws during evaluation and the page never hydrates. It was previously
 * dropped unconditionally on the assumption that `next dev` skips this file --
 * it does not, `headers()` applies in dev as well as production, so the dev
 * server was serving a policy that broke its own runtime.
 */
const scriptSrc =
  process.env.NODE_ENV === "development"
    ? "'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com"
    : "'self' 'unsafe-inline' https://fonts.googleapis.com";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
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
