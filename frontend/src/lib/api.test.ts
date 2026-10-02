import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, clearSession, fetchBlob, getToken, setSession, type AuthUser } from "./api";

/**
 * The client had no tests at all, so these start with the failures that are
 * invisible on screen:
 *
 *  - a request that omits the bearer token gets a 401, and the caller renders
 *    "no results" rather than an error, so a broken search looks like an empty
 *    one;
 *  - a dropped query parameter returns everything, so a filter appears to work
 *    while silently ignoring the input;
 *  - a JSON error body is discarded in favour of the status text, so the user
 *    is told "Request failed" instead of what the backend actually said.
 *
 * `fetch` is stubbed rather than allowed to run: these assert what goes *out*,
 * which is the part that regresses.
 */

type Call = { url: string; init: RequestInit | undefined };

// Typed rather than cast, so a change to AuthUser breaks this file too.
const TEST_USER: AuthUser = { id: 1, email: "a@b.c", name: "A", role: "client" };
let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

function lastCall(): Call {
  // Read the mock's own log rather than recording inside its implementation:
  // `mockResolvedValueOnce` replaces the implementation outright, so a recorder
  // living in the default implementation silently sees nothing.
  const entry = fetchMock.mock.calls.at(-1);
  if (!entry) throw new Error("no request was made");
  return { url: String(entry[0]), init: entry[1] as RequestInit | undefined };
}

function headerOf(call: Call, name: string): string | null {
  const headers = (call.init?.headers ?? {}) as Record<string, string>;
  return headers[name] ?? null;
}

describe("session token", () => {
  it("reads the token it was given", () => {
    setSession("token-abc", TEST_USER);
    expect(getToken()).toBe("token-abc");
  });

  it("clears the token", () => {
    setSession("token-abc", TEST_USER);
    clearSession();
    expect(getToken()).toBeNull();
  });
});

describe("every feature request carries the bearer token", () => {
  // These endpoints sit behind the router-level auth gate. A call without the
  // header is answered 401 and the page reports an empty result.
  it.each([
    ["getSettings", () => api.getSettings(), "GET", "/api/v1/settings"],
    ["searchCities", () => api.searchCities("pune"), "GET", "/api/v1/cities?q=pune"],
    ["listMantras", () => api.listMantras(), "GET", "/api/v1/mantra"],
    ["updateSettings", () => api.updateSettings("equal"), "PUT", "/api/v1/settings"],
    ["getCrystals", () => api.getCrystals(), "GET", "/api/v1/healing/crystals"],
  ])("%s sends Authorization", async (_name, call, method, path) => {
    setSession("token-abc", TEST_USER);
    await call();

    expect(lastCall().url).toContain(path);
    expect(lastCall().init?.method ?? "GET").toBe(method);
    expect(headerOf(lastCall(), "Authorization")).toBe("Bearer token-abc");
  });

  it("sends no Authorization header when there is no session", async () => {
    await api.getSettings();
    expect(headerOf(lastCall(), "Authorization")).toBeNull();
  });
});

describe("query parameters reach the server", () => {
  it("encodes a city search so punctuation cannot break the URL", async () => {
    await api.searchCities("ban aras?");
    expect(lastCall().url).toContain("/api/v1/cities?q=ban%20aras%3F");
  });

  it("omits filters that were not set", async () => {
    await api.listMantras();
    expect(lastCall().url).not.toContain("purpose=");
    expect(lastCall().url).not.toContain("q=");
  });

  it("sends every filter that was set", async () => {
    await api.listMantras({ purpose: "peace", planet: "Moon", deity: "Shiva", q: "om" });
    const url = lastCall().url;
    expect(url).toContain("purpose=peace");
    expect(url).toContain("planet=Moon");
    expect(url).toContain("deity=Shiva");
    expect(url).toContain("q=om");
  });

  it("sends only the crystal filters that were set", async () => {
    await api.getCrystals();
    expect(lastCall().url).not.toContain("chakra=");

    await api.getCrystals({ chakra: "heart", zodiac: "Leo" });
    const url = lastCall().url;
    expect(url).toContain("chakra=heart");
    expect(url).toContain("zodiac=Leo");
  });
});

describe("request bodies", () => {
  it("sends the house system as JSON on a PUT", async () => {
    await api.updateSettings("equal");
    expect(lastCall().init?.method).toBe("PUT");
    expect(JSON.parse(String(lastCall().init?.body))).toEqual({
      house_system: "equal",
    });
  });
});

describe("errors are surfaced, not swallowed", () => {
  it("reports the backend's message rather than the status text", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: "house_system must be one of: whole-sign, equal" }, 422),
    );

    await expect(api.updateSettings("placidus")).rejects.toThrow(
      "house_system must be one of: whole-sign, equal",
    );
  });

  it("keeps the HTTP status on the thrown error so callers can branch on it", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "nope" }, 422));

    await expect(api.updateSettings("placidus")).rejects.toMatchObject({ status: 422 });
  });

  it("returns the parsed body on success", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ house_system: "equal", house_systems: ["whole-sign", "equal"] }),
    );

    await expect(api.getSettings()).resolves.toMatchObject({ house_system: "equal" });
  });
});

describe("PDF export", () => {
  it("sends the bearer token, which the export endpoints require", async () => {
    // Both export endpoints are behind the same auth gate as everything else.
    // They used bare fetch with no header, got a 401, and the caller swallowed
    // the error -- so the button silently did nothing.
    setSession("token-abc", TEST_USER);
    fetchMock.mockResolvedValueOnce(new Response("%PDF-1.4", { status: 200 }));

    const blob = await fetchBlob("/api/v1/kundli/export-pdf", { method: "POST" });

    expect(blob.size).toBeGreaterThan(0);
    expect(headerOf(lastCall(), "Authorization")).toBe("Bearer token-abc");
  });

  it("reports the backend's message when the export fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Invalid birth data" }, 400));

    await expect(fetchBlob("/api/v1/kundli/export-pdf", { method: "POST" })).rejects.toThrow(
      "Invalid birth data",
    );
  });
});