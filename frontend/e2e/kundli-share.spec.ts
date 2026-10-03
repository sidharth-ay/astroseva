import { readFileSync } from "node:fs";

import { test, expect, type Page } from "@playwright/test";
import { registerAndLogin, signInWithToken, type E2EAccount } from "./helpers/session";

/**
 * Regression: the kundli chart SVGs carried only a `viewBox`, so the browser
 * rasterized them at its default 300x150 intrinsic size. The share path drew
 * that image onto a 400x400 canvas — the chart came out blank or squeezed into
 * a corner. The fix declares width/height on the SVG itself; this spec asserts
 * both the declaration and the pixels that follow from it.
 */

let account: E2EAccount;

test.beforeEach(async ({ context }) => {
  // AgeGate overlays the root layout, so no spec reaches the page underneath
  // until it is dismissed. Seeded rather than clicked (same rationale as
  // auth-and-settings.spec.ts): none of these tests is about the age gate.
  await context.addInitScript(() => {
    window.localStorage.setItem("astroseva_age_ok", "1");
  });
});

test.beforeAll(async ({ request }) => {
  // /kundli sits behind AuthGate, so the spec needs its own signed-in account
  // rather than depending on another spec file having registered one.
  account = await registerAndLogin(request, "share");
});

async function signIn(page: Page) {
  // Seeded, not driven through the form: this spec is about chart rendering,
  // and every spec shares the 10/minute login rate limit. See
  // e2e/helpers/session.ts.
  await signInWithToken(page, account);
  await page.goto("/kundli");
  await expect(page).not.toHaveURL(/\/login/);
}

async function loadSampleChart(page: Page) {
  await page.goto("/kundli");
  await page.getByRole("button", { name: "Load Sample" }).click();
  await expect(page.getByRole("button", { name: "Share Image" })).toBeVisible();
  const svg = page.locator("#kundli-chart-svg, #kundli-chart-svg-south").first();
  await expect(svg).toBeVisible();
  return svg;
}

test("chart svg declares an intrinsic size", async ({ page }) => {
  await signIn(page);
  const svg = await loadSampleChart(page);
  await expect(svg).toHaveAttribute("width", /^\d+$/);
  await expect(svg).toHaveAttribute("height", /^\d+$/);
});

test("share image downloads a PNG sized to the chart and not blank", async ({ page }) => {
  // Force the download path: without this, a navigator.canShare that answers
  // true routes into navigator.share, whose behaviour is up to the browser
  // rather than the app.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "canShare", { value: undefined });
  });
  await signIn(page);
  const svg = await loadSampleChart(page);

  const width = Number(await svg.getAttribute("width"));
  const height = Number(await svg.getAttribute("height"));
  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Share Image" }).click();
  const download = await downloadPromise;
  const file = await download.path();
  expect(file).toBeTruthy();

  const png = readFileSync(file as string);
  // PNG signature, then IHDR: width/height as big-endian uint32 at 16/20.
  expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  expect(png.readUInt32BE(16)).toBe(width);
  expect(png.readUInt32BE(20)).toBe(height);
  // A flat background PNG of this size compresses to ~1 KB; the chart carries
  // grid lines, glyphs, and text, so a correct render is far larger. Anything
  // under 5 KB means the canvas came out blank or nearly so.
  expect(png.length).toBeGreaterThan(5_000);

  await expect(page.getByText(/Chart image downloaded/)).toBeVisible();
});
