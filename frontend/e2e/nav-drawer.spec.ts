import { expect, test, type Page } from "@playwright/test";

/**
 * The drawer is the complete astrology index: it must open, close, navigate,
 * and mark the active page, for mouse, touch and keyboard alike. These cover
 * the wiring; the visual design is reviewed by screenshot, not assertion.
 */

test.beforeEach(async ({ context }) => {
  // AgeGate overlays the root layout (same rationale as
  // auth-and-settings.spec.ts): seed rather than click.
  await context.addInitScript(() => {
    window.localStorage.setItem("astroseva_age_ok", "1");
  });
});

// One account for the signed-in test: specs share a database, so the address
// must be unique to this file (same rationale as auth-and-settings.spec.ts).
let account: { email: string; password: string };

test.beforeAll(async ({ request }) => {
  const email = `e2e_drawer_${Date.now()}@example.com`;
  const password = "E2ePassw0rd!";
  const res = await request.post("http://127.0.0.1:8010/api/v1/auth/register", {
    data: { email, name: "E2E Drawer User", password },
  });
  expect(res.status(), await res.text()).toBe(200);
  account = { email, password };
});

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  const password = page.getByLabel("Password");
  await password.fill(account.password);
  // Enter submits: the page has both a "Login" mode toggle and a submit button
  // with the same name, so a click-by-name locator would be ambiguous.
  await password.press("Enter");
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
  await expect(page.getByText("My Astrology").first()).toBeVisible();
  await expect(page.getByText("Your personal astrology workspace")).toBeVisible();
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
  await page.goto("/");
  await page.getByRole("button", { name: /navigation menu/i }).click();
  await expect(page.locator("#site-drawer")).toBeVisible();
  // Scoped to the drawer: the desktop bar carries its own Panchang link,
  // which sits under the open backdrop and cannot receive pointer events.
  await page.locator("#site-drawer").getByRole("link", { name: "Panchang" }).click();
  await expect(page).toHaveURL(/\/panchang/);
  await expect(page.locator("#site-drawer")).not.toBeVisible();
});

test("the current page is marked in an opened drawer", async ({ page }) => {
  await signIn(page);
  await page.goto("/doshas");
  await expect(page).not.toHaveURL(/\/login/);
  await page.getByRole("button", { name: /navigation menu/i }).click();
  const dosha = page.getByRole("link", { name: "Dosha Check" });
  await expect(dosha).toHaveAttribute("aria-current", "page");
});
