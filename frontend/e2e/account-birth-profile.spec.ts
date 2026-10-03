import { expect, test, type Page } from "@playwright/test";

/**
 * The account is the source of the birth profile: registration asks for the
 * details once, the profile shows them, settings can change them behind the
 * current password, and My Kundali builds itself from them. This walks that
 * path end to end, because each link is only as good as the one before it.
 */

const PASSWORD = "E2ePassw0rd!";

/** Register through the real form, birth details included. */
async function registerWithBirth(page: Page) {
  const email = `e2e_acct_${Date.now()}@example.com`;
  await page.context().addInitScript(() => {
    window.localStorage.setItem("astroseva_age_ok", "1");
  });
  await page.goto("/login?mode=register");

  await page.getByLabel("Name").fill("Asha Verma");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByLabel("Date of birth").fill("1994-03-18");
  await page.getByLabel("Time of birth").fill("07:45");

// The city must be picked from the list, not typed: a chart is only as
  // accurate as its coordinates and timezone. ArrowDown + Enter is the path
  // CitySearch supports for exactly this, and it does not depend on the
  // dropdown being the topmost element at that scroll position.
  const place = page.getByLabel("Birth place");
  await place.click();
  await place.fill("Varanasi");
  await expect(page.getByRole("listbox")).toBeVisible();
  await place.press("ArrowDown");
  await place.press("Enter");
  await expect(page.getByRole("option", { name: /Varanasi/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Register", exact: true }).last().click();

  // Registration signs the new account straight in.
  await expect(page).not.toHaveURL(/\/login/);
  return { email, password: PASSWORD };
}

async function signIn(page: Page, account: { email: string; password: string }) {
  await page.context().addInitScript(() => {
    window.localStorage.setItem("astroseva_age_ok", "1");
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByLabel("Password").press("Enter");
  await expect(page).not.toHaveURL(/\/login/);
}

test("registration captures the birth profile and signs the user in", async ({ page }) => {
  const account = await registerWithBirth(page);

await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Birth Profile" }).first()).toBeVisible();
  // The details entered at sign-up are the ones the profile reports.
  await expect(page.getByText("1994-03-18")).toBeVisible();
  await expect(page.getByText(/07:45/)).toBeVisible();
  await expect(account.email).toBeTruthy();
});

test("My Kundali builds itself from the profile", async ({ page }) => {
  await registerWithBirth(page);
  await page.goto("/kundli");

  // No Generate click. The form arrives pre-filled from the profile, and the
  // chart is already drawn -- the details panel reports the sign-up values.
  await expect(page.getByLabel("Birth Date")).toHaveValue("1994-03-18", {
    timeout: 30_000,
  });
  await expect(page.getByLabel("Birth Time")).toHaveValue("07:45:00");
  await expect(page.getByRole("combobox")).toHaveValue(/Varanasi/);
  await expect(page.getByText(/Ascendant/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Generate Kundli/ })).toBeVisible();
});

test("a profile without birth details says so instead of inventing one", async ({ page, request }) => {
  // Registered the old way: an account with no birth profile.
  const email = `e2e_nobirth_${Date.now()}@example.com`;
  const res = await request.post("http://127.0.0.1:8010/api/v1/auth/register", {
    data: { email, name: "No Birth", password: PASSWORD },
  });
  expect(res.status()).toBe(200);

  await signIn(page, { email, password: PASSWORD });
  await page.goto("/kundli");
  await expect(page.getByText(/no birth details yet/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Add birth details/ })).toBeVisible();
});

test("changing the phone needs the current password and a wrong one changes nothing", async ({
  page,
}) => {
  const account = await registerWithBirth(page);
  await page.goto("/settings");

  await page.getByRole("button", { name: /Change phone/i }).click();
  // The edit field only appears once the prompt is open.
  await page.getByLabel("New phone").fill("+919876543210");
  await page.getByLabel(/Confirm your current password/).fill("WrongPass123!");
  await page.getByRole("button", { name: "Save change" }).click();
  await expect(page.getByText(/Current password is incorrect/i)).toBeVisible();
  await expect(page.getByLabel("New phone")).toHaveValue("+919876543210");

  // Now the real password: the number is stored.
  await page.getByLabel(/Confirm your current password/).fill(account.password);
  await page.getByRole("button", { name: "Save change" }).click();
  await expect(page.getByText(/Phone number updated/i)).toBeVisible();

  await page.reload();
  await expect(page.getByText("+919876543210")).toBeVisible();
});

test("birth details can be corrected from settings", async ({ page }) => {
  await registerWithBirth(page);
  await page.goto("/settings");

  await page.getByLabel("Time of birth").fill("23:30");
  await page.getByRole("button", { name: /Save birth details/ }).click();
  await expect(page.getByText(/Saved\. Your charts will use these details/i)).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByText(/23:30/)).toBeVisible();
});