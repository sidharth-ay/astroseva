import { describe, expect, test } from "vitest";

import nextConfig from "../next.config";

/**
 * Next 16 blocks dev-only asset requests from any origin other than the one
 * the dev server was initialised with (localhost). Opened as
 * http://127.0.0.1:3000 the site loaded but never hydrated: buttons rendered,
 * clicks did nothing, and every failure was invisible in the server log
 * because the pages returned 200. Without this entry the dev server is inert
 * from 127.0.0.1, so the config is pinned here.
 */
describe("next.config", () => {
  test("allows the dev server to hydrate from 127.0.0.1", () => {
    expect(nextConfig.allowedDevOrigins).toContain("127.0.0.1");
  });
});
