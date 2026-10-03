import { expect, test, type Page } from "@playwright/test";
import { registerAndLogin, signInWithToken, type E2EAccount } from "./helpers/session";

/**
 * The drawer is the account menu: it must open, close, navigate, mark the
 * active page, and refuse to log the user out on a single tap. These cover the
 * wiring; the visual design is reviewed by screenshot, not assertion.
 */

test.beforeEach(async ({ context }) => {
  // AgeGate overlays the root layout (same rationale as
  // auth-and-settings.spec.ts): seed rather than click.
  await context.addInitScript(() => {
    window.localStorage.setItem("astroseva_age_ok", "1");
  });
});

// One account for the signed-in tests: specs share a database, so the address
// must be unique to this file (same rationale as auth-and-settings.spec.ts).
let account: E2EAccount;

test.beforeAll(async ({ request }) => {
  account = await registerAndLogin(request, "drawer");
});

/**
 * Sign in by seeding the session the app itself writes, rather than driving the
 * login form once per test. `/auth/login` is rate limited to 10/minute per
 * address and every spec in a run shares 127.0.0.1, so a file that logs in five
 * times pushes the whole run into 429 -- a self-inflicted flake that looks like
 * a product bug. One login happens in beforeAll; every test reuses its token.
 */
async function signIn(page: Page) {
  await signInWithToken(page, account);
  await page.goto("/profile");
  await expect(page).not.toHaveURL(/\/login/);
}

async function openDrawer(page: Page) {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: /navigation menu/i });
  await trigger.click();
  await expect(page.locator("#site-drawer")).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

test("hamburger opens the drawer and morphs into a close control", async ({ page }) => {
  await openDrawer(page);
  await expect(page.getByRole("button", { name: "Close navigation menu" })).toBeVisible();
  await expect(page.getByText("Astrology").first()).toBeVisible();
  await expect(page.getByText("Account").first()).toBeVisible();
});

test("the drawer offers exactly the nine promised destinations", async ({ page }) => {
  await signIn(page);
  await openDrawer(page);
  const drawer = page.locator("#site-drawer");
  for (const label of [
    "My Kundali",
    "Profile",
    "Horoscope",
    "Dosha Check",
    "Remedies",
    "Notifications",
    "Help & Support",
    "Settings",
    "Logout",
  ]) {
    await expect(drawer.getByText(label, { exact: true }).first()).toBeVisible();
  }
  // The old six-section index had duplicate entries for the same pages.
  await expect(drawer.getByRole("link", { name: "Kundli Generator" })).toHaveCount(0);
  await expect(drawer.getByRole("button", { expanded: true })).toHaveCount(0);
});

test("escape closes the drawer and returns focus to the trigger", async ({ page }) => {
  await openDrawer(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#site-drawer")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeFocused();
});

test("clicking the backdrop closes the drawer", async ({ page }) => {
  await openDrawer(page);
  // Top-right corner: backdrop is everywhere the 400px panel is not.
  await page.mouse.click(1200, 450);
  await expect(page.locator("#site-drawer")).not.toBeVisible();
});

test("a drawer link navigates to a real page", async ({ page }) => {
  await signIn(page);
  await openDrawer(page);
  // Scoped to the drawer: the desktop bar carries its own Panchang link,
  // which sits under the open backdrop and cannot receive pointer events.
  await page.locator("#site-drawer").getByRole("link", { name: "My Kundali" }).click();
  await expect(page).toHaveURL(/\/kundli/);
  await expect(page.locator("#site-drawer")).not.toBeVisible();
});

test("logout asks first and cancelling keeps the session", async ({ page }) => {
  await signIn(page);
  await openDrawer(page);
  const drawer = page.locator("#site-drawer");

  await drawer.getByRole("button", { name: "Logout" }).click();
  await expect(drawer.getByRole("group", { name: "Confirm logout" })).toBeVisible();

  await drawer.getByRole("button", { name: "Cancel" }).click();
  await expect(drawer.getByRole("group", { name: "Confirm logout" })).toHaveCount(0);
  // Still signed in: reloading any account page must not bounce to /login.
  await page.goto("/settings");
  await expect(page).not.toHaveURL(/\/login/);
});

test("logout does not arm itself when the drawer is reopened", async ({ page }) => {
  await signIn(page);
  await openDrawer(page);
  await page.locator("#site-drawer").getByRole("button", { name: "Logout" }).click();
  await expect(page.locator("#site-drawer").getByRole("group", { name: "Confirm logout" })).toBeVisible();

  await page.keyboard.press("Escape");
  await openDrawer(page);
  await expect(page.locator("#site-drawer").getByRole("group", { name: "Confirm logout" })).toHaveCount(0);
});

test("help and support opens the help page", async ({ page }) => {
  await openDrawer(page);
  await page.locator("#site-drawer").getByRole("link", { name: "Help & Support" }).click();
  await expect(page).toHaveURL(/\/help/);
  await expect(page.getByRole("heading", { name: "Help & Support" })).toBeVisible();
});

test("the current page is marked in an opened drawer", async ({ page }) => {
  await signIn(page);
  await page.goto("/doshas");
  await expect(page).not.toHaveURL(/\/login/);
  await page.getByRole("button", { name: /navigation menu/i }).click();
  const dosha = page.getByRole("link", { name: "Dosha Check" });
  await expect(dosha).toHaveAttribute("aria-current", "page");
});
