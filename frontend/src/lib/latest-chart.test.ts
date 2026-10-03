import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setSession, type AuthUser } from "./api";
import { fetchLatestChart } from "./latest-chart";

/**
 * The list endpoint is newest-first metadata; the payload is one GET behind
 * it. Both halves of that contract have been violated before -- the oldest
 * chart was picked, and `chart_data` was read off the list where it never
 * appears -- so each violation has a test that fails if it returns.
 */

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const CHART = {
  asc_sign_name: "Cancer",
  asc_sign: 4,
  planets: [{ planet: "Moon", sign_name: "Sagittarius" }],
  chart: {},
};

beforeEach(() => {
  fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
  window.localStorage.clear();
  // fetchAuth refuses anonymous calls before any request is made.
  setSession("token-abc", { id: 1, email: "a@b.c", name: "A", role: "client" } as AuthUser);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

function queueList(ids: number[]) {
  fetchMock.mockResolvedValueOnce(
    jsonResponse({
      charts: ids.map((id) => ({
        id,
        name: `Chart ${id}`,
        birth_date: "1990-01-01",
        birth_time: "10:00",
        birth_place: "Delhi",
        created_at: "2026-01-01",
      })),
      total: ids.length,
    }),
  );
}

describe("fetchLatestChart", () => {
  it("resolves the newest chart by fetching its full payload", async () => {
    // List order is newest-first: id 9 before id 4.
    queueList([9, 4]);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 9, name: "Chart 9", chart_data: CHART }),
    );

    const found = await fetchLatestChart();

    expect(found).toEqual({ name: "Chart 9", data: CHART });
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls).toEqual([
      expect.stringContaining("/api/v1/charts/list"),
      expect.stringContaining("/api/v1/charts/9"),
    ]);
  });

  it("returns null without a second call when no chart is saved", async () => {
    queueList([]);

    await expect(fetchLatestChart()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats a missing or malformed payload as no usable chart", async () => {
    queueList([7]);
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 7, chart_data: null }));
    await expect(fetchLatestChart()).resolves.toBeNull();

    queueList([7]);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 7, chart_data: { asc_sign_name: "Cancer" } }),
    );
    await expect(fetchLatestChart()).resolves.toBeNull();
  });
});
