import { api, type KundliResponse } from "./api";

export interface LatestChart {
  name: string;
  data: KundliResponse;
}

/** The shape a stored payload must have before any band trusts it. */
function looksLikeChart(value: unknown): value is KundliResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.asc_sign_name === "string" &&
    typeof v.asc_sign === "number" &&
    Array.isArray(v.planets) &&
    typeof v.chart === "object" &&
    v.chart !== null
  );
}

/**
 * The newest saved chart with its full computed data.
 *
 * Two facts about this backend have both been gotten wrong before, so they
 * live here exactly once instead of in every consumer:
 *
 * - the list endpoint is newest-first but carries metadata only (`id`,
 *   `name`, birth fields, `created_at`). Reading `chart_data` off it yields
 *   nothing, and indexing the last element picks the OLDEST chart;
 * - the payload lives behind `GET /{id}`, and old rows can carry a null or
 *   malformed payload, which must read as "no usable chart", not as a crash.
 *
 * Returns null when there is no saved chart or the newest one is unreadable.
 */
export async function fetchLatestChart(): Promise<LatestChart | null> {
  const res = await api.listCharts();
  const latest = res.charts[0];
  if (!latest) return null;
  const full = await api.getChart(latest.id);
  const data = (full as { chart_data?: unknown }).chart_data;
  if (!looksLikeChart(data)) return null;
  return { name: latest.name, data };
}
