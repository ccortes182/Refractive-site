// Per-channel + company-total revenue goals. Same temporal model as budgets
// (annual + monthly overrides per year), but flat — no platform/type tiers.
// The special key `__total__` stores the company-wide top-line goal, which
// is independent of (and may differ from) the sum of channel goals.

const STORAGE_KEY = "lucerna.revenue.goals.v1";

export const TOTAL_KEY = "__total__";
export const GOALS_CHANGED_EVENT = "lucerna:revenue-goals-changed";

function emptyState() {
  return {};
}

export function loadRevenueGoals() {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : emptyState();
  } catch {
    return emptyState();
  }
}

export function saveRevenueGoals(goals) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    window.dispatchEvent(new CustomEvent(GOALS_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

function ensurePath(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    cur[k] = cur[k] || {};
    cur = cur[k];
  }
  return cur;
}

/**
 * scope: "annual" | "monthly"
 * key:   "YYYY"   | "YYYY-MM"
 * channel: a channel name OR `TOTAL_KEY` for the company total
 */
export function setRevenueGoal(goals, channel, scope, key, value) {
  const next = JSON.parse(JSON.stringify(goals || {}));
  ensurePath(next, channel, scope);
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) {
    delete next[channel][scope][key];
    if (Object.keys(next[channel][scope]).length === 0) delete next[channel][scope];
  } else {
    next[channel][scope][key] = v;
  }
  if (Object.keys(next[channel] || {}).length === 0) delete next[channel];
  return next;
}

export function clearRevenueGoals(goals, channel) {
  if (!goals[channel]) return goals;
  const next = { ...goals };
  delete next[channel];
  return next;
}

/**
 * Resolve a single month's goal for a channel (or company total).
 * Returns null if neither monthly nor annual override is set.
 */
export function resolveGoalForMonth(goals, channel, yearMonth) {
  const entry = goals?.[channel];
  if (!entry) return null;
  const year = yearMonth.slice(0, 4);
  if (entry.monthly?.[yearMonth] != null) return entry.monthly[yearMonth];
  if (entry.annual?.[year] != null) return entry.annual[year] / 12;
  return null;
}

// ─── Distribution curves ──────────────────────────────────────────────────
// A curve reshapes a period's revenue target across its days. "Even" is the
// straight-line default; "weekend-heavy" and "promo" capture common DTC
// seasonality without requiring per-day inputs.

export const CURVE_OPTIONS = [
  { value: "even", label: "Even" },
  { value: "weekend-heavy", label: "Weekend-heavy" },
  { value: "promo", label: "Promo-loaded" },
];

export function getRevenueCurve(goals, channel) {
  const v = goals?.[channel]?.curve;
  return CURVE_OPTIONS.some((c) => c.value === v) ? v : "even";
}

export function setRevenueCurve(goals, channel, curveName) {
  const next = JSON.parse(JSON.stringify(goals || {}));
  const isValid = CURVE_OPTIONS.some((c) => c.value === curveName);
  if (!isValid || curveName === "even") {
    if (next[channel]) {
      delete next[channel].curve;
      if (Object.keys(next[channel]).length === 0) delete next[channel];
    }
  } else {
    next[channel] = next[channel] || {};
    next[channel].curve = curveName;
  }
  return next;
}

/**
 * Returns an array of `dates.length` weights that sum to 1, distributed
 * according to `curveName`. `dates` is an array of Date instances (or strings
 * parseable by Date) — used to determine weekend-vs-weekday membership.
 */
export function getDailyWeights(curveName, dates) {
  const n = Array.isArray(dates) ? dates.length : 0;
  if (n === 0) return [];
  const raw = new Array(n);
  if (curveName === "weekend-heavy") {
    for (let i = 0; i < n; i++) {
      const d = dates[i] instanceof Date ? dates[i] : new Date(dates[i]);
      const dow = d.getDay(); // 0 = Sun, 6 = Sat
      raw[i] = dow === 0 || dow === 6 ? 1.6 : 0.85;
    }
  } else if (curveName === "promo") {
    // Linear ramp from 0.5 (start) to 1.5 (end). End-of-period heavier.
    for (let i = 0; i < n; i++) {
      raw[i] = 0.5 + (i / Math.max(1, n - 1)) * 1.0;
    }
  } else {
    for (let i = 0; i < n; i++) raw[i] = 1;
  }
  const sum = raw.reduce((s, v) => s + v, 0) || 1;
  return raw.map((v) => v / sum);
}
