// Per-metric numeric goal targets shown as a dashed ReferenceLine on the chart.
// Shape: { [metricKey: string]: number }

const STORAGE_KEY = "lucerna.overview.goals.v1";

export function loadGoals() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveGoals(goals) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals || {}));
  } catch {
    // ignore
  }
}
