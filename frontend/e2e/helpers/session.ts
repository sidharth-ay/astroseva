import type { APIRequestContext, Page } from "@playwright/test";

/**
 * A signed-in E2E session, obtained once per spec file.
 *
 * `/auth/login` is rate limited to 10/minute per address and every spec in a
 * run shares 127.0.0.1, so signing in through the form once per test pushes
 * the run into 429 partway through -- a self-inflicted flake that reads like a
 * product bug. Specs that are not about authentication therefore log in once
 * here and seed the session the app itself writes; `auth-and-settings.spec.ts`
 * keeps driving the real form, because testing it is that spec's job.
 */
export interface E2EAccount {
  email: string;
  password: string;
  token: string;
  refreshToken: string;
}

export async function registerAndLogin(
  request: APIRequestContext,
  prefix: string,
  apiBase = "http://127.0.0.1:8010",
): Promise<E2EAccount> {
  const email = `e2e_${prefix}_${Date.now()}@example.com`;
  const password = "E2ePassw0rd!";

  const reg = await request.post(`${apiBase}/api/v1/auth/register`, {
    data: { email, name: `E2E ${prefix} User`, password },
  });
  expectOk(reg.status(), await reg.text(), "register");

  const login = await request.post(`${apiBase}/api/v1/auth/login`, {
    data: { email, password },
  });
  expectOk(login.status(), await login.text(), "login");

  const body = await login.json();
  return { email, password, token: body.token, refreshToken: body.refresh_token };
}

function expectOk(status: number, text: string, what: string): void {
  if (status !== 200) {
    throw new Error(`E2E ${what} failed with ${status}: ${text}`);
  }
}

/** Seed the age gate and the session, then land on a page that needs auth. */
export async function signInWithToken(page: Page, account: E2EAccount): Promise<void> {
  await page.addInitScript(
    ({ token, refreshToken, email, name }) => {
      window.localStorage.setItem("astroseva_age_ok", "1");
      window.localStorage.setItem("astroseva_token", token);
      window.localStorage.setItem("astroseva_refresh_token", refreshToken);
      window.localStorage.setItem("astroseva_user", JSON.stringify({ id: 1, email, name }));
    },
    {
      token: account.token,
      refreshToken: account.refreshToken,
      email: account.email,
      name: `E2E ${account.email.split("_")[1]} User`,
    },
  );
}