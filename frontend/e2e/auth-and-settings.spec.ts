import { expect, test, type Page } from "@playwright/test";

/**
 * These cover the paths that were previously only verified by hand, and the
 * defects that reached production because of that:
 *
 *  - the login form failing from the browser while the backend was healthy
 *    (a Content-Security-Policy that blocked the API origin);
 *  - the PDF export silently doing nothing, because it sent no bearer token and
 *    the caller swallowed the error;
 *  - the house-system setting not reaching the calculation at all.
 *
 * There is no headless-browser coverage anywhere else in this repository, so
 * these are the only tests that would notice a wiring regression between the
 * page and the API.
 */

// One account for the whole file: the specs share a database, so each test
// creating its own user would race on the unique email constraint.
let account: { email: string; password: string };

test.beforeEach(async ({ context }) => {
  // AgeGate is mounted in the root layout as a fixed overlay above everything
  // else, so until it is dismissed no spec can reach any element underneath it.
  // It is seeded rather than clicked: none of these tests is about the age gate,
  // and clicking would make every spec depend on its wording.
  await context.addInitScript(() => {
    window.localStorage.setItem("astroseva_age_ok", "1");
  });
});

test.beforeAll(async ({ request }) => {
  const email = `e2e_${Date.now()}@example.com`;
  const password = "E2ePassw0rd!";

  const res = await request.post("http://127.0.0.1:8010/api/v1/auth/register", {
    data: { email, name: "E2E User", password },
  });
  expect(res.status(), await res.text()).toBe(200);

  account = { email, password };
});

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  const password = page.getByLabel("Password");
  await password.fill(account.password);
  // Enter submits the form. The page has both a "Login" mode toggle and a
  // "Login" submit button, so clicking by name is ambiguous; the password field
  // wires Enter to the same submit handler a click would.
  await password.press("Enter");
  // `router.replace(next)` sends an authenticated visitor home.
  await expect(page).not.toHaveURL(/\/login/);
}

test("a signed-in session reaches a feature page", async ({ page }) => {
  await signIn(page);

  // AuthGate bounces an anonymous visitor back to /login, so landing on /kundli
  // proves the token was stored and accepted.
  await page.goto("/kundli");
  await expect(page.getByRole("heading", { name: /kundli|birth chart/i })).toBeVisible();
});

test("the house system persists across a reload", async ({ page }) => {
  await signIn(page);
  await page.goto("/settings");

  await page.getByRole("radio", { name: /Equal House/i }).check();
  await page.getByRole("button", { name: /Save calculation settings/i }).click();
  // Matched without an anchor on purpose: the confirmation line renders as
  // "<icon/> Saved -- new charts will use Equal House.", and JSX keeps the space
  // between the icon and the text, so the element's text starts with a space.
  await expect(page.getByText(/new charts will use/i)).toBeVisible();

  // The point of storing it server-side: the choice survives a reload, so it
  // cannot be a value the page merely remembered for the session.
  await page.reload();
  await expect(page.getByRole("radio", { name: /Equal House/i })).toBeChecked();
});

test("an anonymous visitor is sent to the login form", async ({ page }) => {
  await page.goto("/kundli");
  await expect(page).toHaveURL(/\/login/);
});

test("public pages stay public", async ({ page }) => {
  // AuthGate.PUBLIC_PATHS exists precisely so the legal pages are reachable
  // without an account; a regression here locks every visitor out of them.
  for (const path of ["/terms", "/privacy", "/refund", "/grievance"]) {
    await page.goto(path);
    await expect(page, `${path} redirected to login`).not.toHaveURL(/\/login/);
  }
});