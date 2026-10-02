// Build the frontend with the API origin the end-to-end run will talk to.
//
// `NEXT_PUBLIC_API_URL` is inlined into the client bundle at build time -- the
// same variable that feeds the Content-Security-Policy -- so an e2e run that
// started a server without rebuilding first would silently talk to whatever
// origin was compiled into the previous build.
//
// This exists as a script rather than an `E2E_API_URL=... next build` prefix
// because that form only works in cmd.exe, and npm runs scripts through
// sh on Linux and CI.
import { spawnSync } from "node:child_process";

const apiUrl = process.env.E2E_API_URL || "http://127.0.0.1:8010";

console.log(`Building for e2e against ${apiUrl}`);

const result = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NEXT_PUBLIC_API_URL: apiUrl },
});

process.exit(result.status ?? 1);