import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// There was no frontend test runner in this project at all, so this starts from
// the assumption that nothing is under test. The first targets are deliberately
// pure logic -- request construction, response handling, ranking -- because those
// are the parts where a mistake is silent: a wrong query parameter or a dropped
// bearer token produces a page that looks fine and shows nothing.
//
// `next` is deliberately absent from the plugins. Vitest does not run the Next
// build pipeline, and pulling it in would only slow collection down.
export default defineConfig({
  plugins: [react()],
  // Next resolves the `@/` alias from tsconfig paths; Vitest does not read that
  // file, so component tests would fail to import any module that uses it.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // `.next` and node_modules hold compiled copies of these files; testing
    // those would report failures against build output rather than source.
    exclude: ["node_modules/**", ".next/**"],
  },
});