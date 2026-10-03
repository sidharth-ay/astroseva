import { expect, test, type Page } from "@playwright/test";
import { registerAndLogin, signInWithToken, type E2EAccount } from "./helpers/session";

/**
 * The Profile and Settings pages were reworked to stop advertising controls
 * that do nothing: the language dropdown only ever wrote a key nothing read,
 * and account actions were spread across pages with no sign-out anywhere.
 * This spec pins the sections that replaced them, so a regression that drops
 * the sessions panel or the sign-out button fails here rather than in review.
 */

let account: E2EAccount;

test.beforeEach(async ({ context }) => {
  // AgeGate overlays the root layout (same rationale as
  // auth-and-settings.spec.ts): seed rather than click, so this spec does not
  // depend on the gate's wording.
  await context.addInitScript(() => {
    window.localStorage.setItem("astroseva_age_ok", "1");
  });
});

test.beforeAll(async ({ request }) => {
  account = await registerAndLogin(request, "profile");
});

async function signIn(page: Page) {
  // Seeded, not driven through the form: this spec is about the Profile and
  // Settings pages, and every spec shares the 10/minute login rate limit. See
  // e2e/helpers/session.ts.
  await signInWithToken(page, account);
  await page.goto("/profile");
  await expect(page).not.toHaveURL(/\/login/);
}

test("profile shows the summary, sessions, and account sections", async ({ page }) => {
  await signIn(page);
  await page.goto("/profile");

  await expect(page.getByRole("heading", { name: "Astrology Summary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Active Sessions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved Birth Profiles" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Data & Privacy" })).toBeVisible();
  // New accounts have no chart, so the empty state must offer a way forward
  // instead of a dead panel.
  await expect(page.getByRole("link", { name: /Generate Kundli/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Manage Settings/ })).toBeVisible();
});

test("settings replaces dead controls with honest sections", async ({ page }) => {
  await signIn(page);
  await page.goto("/settings");

  // The house system still persists (covered by auth-and-settings.spec.ts);
  // this covers what was added around it.
  await expect(page.getByRole("heading", { name: "Account & security" })).toBeVisible();
  await expect(page.getByText(/English — no translation exists yet/)).toBeVisible();
  await expect(page.getByText(/Ayanamsa is fixed at Lahiri/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Grievance redressal/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Terms of service/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Privacy policy/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign out of AstroSeva/ })).toBeVisible();
});
