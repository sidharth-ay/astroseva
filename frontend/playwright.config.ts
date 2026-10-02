import { defineConfig, devices } from "@playwright/test";

// Playwright drives the Chrome that is already installed (`channel: "chrome"`)
// rather than downloading its own browser, which would add ~150 MB to every
// machine that clones this repository. A CI runner is the exception -- it has no
// Chrome to reuse -- so `E2E_BROWSER_CHANNEL=chromium` selects the bundled build
// there instead. See .github/workflows/ci.yml.
//
// Both servers are started for the run. The backend gets its own database file
// and its own port so a run can never touch the development database or collide
// with a dev server the developer already has open.
const API_PORT = 8010;
const WEB_PORT = 3100;
const API_URL = `http://127.0.0.1:${API_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // The specs share one database and one registered account. Running them in
  // parallel would mean each worker racing to create the same user.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: "retain-on-failure",
    // The app is dark-only with a gold accent on a near-black background, so
    // motion is disabled by default for stability.
    reducedMotion: "reduce",
  },

  projects: [
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.E2E_BROWSER_CHANNEL || "chrome",
      },
    },
  ],

  webServer: [
    {
      command: `python -m uvicorn app.main:app --host 127.0.0.1 --port ${API_PORT}`,
      cwd: "../backend",
      url: `${API_URL}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        // A throwaway database. `*.db` is gitignored, and `init_db()` creates
        // the schema on startup, so this needs no migration step.
        DATABASE_URL: "sqlite:///./e2e-test.db",
        REDIS_URL: "",
        JWT_SECRET: "e2e-not-a-real-secret",
        GEMINI_API_KEY: "",
        // The client runs on WEB_PORT, not the 3000/3001 the backend allows by
        // default. Without this the browser blocks every API call as
        // cross-origin and the page reports "Failed to fetch" -- the same
        // symptom as the Content-Security-Policy defect fixed in 3825ecc, from a
        // completely different cause.
        CORS_ORIGINS: `http://127.0.0.1:${WEB_PORT},http://localhost:${WEB_PORT}`,
      },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      // `next start` rather than `next dev`: dev rewrites frontend/AGENTS.md on
      // every run, which would leave an unrelated modified file in the working
      // tree. NEXT_PUBLIC_API_URL is inlined at build time, so `npm run e2e`
      // builds with this value before starting the server.
      command: `npx next start --port ${WEB_PORT}`,
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { NEXT_PUBLIC_API_URL: API_URL },
    },
  ],
});