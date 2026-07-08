import { differenceInCalendarDays } from "date-fns";

// Deterministic range scaling for pages whose mock datasets are fixed snapshots.
// The static data represents a ~28-day baseline window. Additive metrics
// (revenue, orders, spend, counts) scale with the selected range length;
// ratio metrics (ROAS, CVR, rates) get a small deterministic wobble so
// different ranges look alive without ever changing between visits.

const BASELINE_DAYS = 28;

export function rangeDays(dateRange) {
  if (!dateRange?.start || !dateRange?.end) return BASELINE_DAYS;
  return Math.max(1, differenceInCalendarDays(new Date(dateRange.end), new Date(dateRange.start)) + 1);
}

export function rangeFactor(dateRange) {
  return rangeDays(dateRange) / BASELINE_DAYS;
}

// Deterministic pseudo-random in [-1, 1] from a string seed.
function seededNoise(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 2000) / 1000 - 1;
}

// Scale an additive metric (revenue, orders, spend) by range length.
export function scaleAdditive(value, dateRange) {
  return value * rangeFactor(dateRange);
}

// Wobble a ratio metric (ROAS, CVR, churn) by up to ±maxPct, deterministic
// per (metric key, range length). 7d and 90d views differ believably; the
// same range always shows the same number.
export function wobbleRatio(value, key, dateRange, maxPct = 0.06) {
  const days = rangeDays(dateRange);
  if (days === BASELINE_DAYS) return value;
  const noise = seededNoise(`${key}:${days}`);
  return value * (1 + noise * maxPct);
}

// Percent change of the current range vs its compare range, for additive
// metrics under deterministic scaling. Derived from the wobble of the two
// windows so KPI deltas are consistent with displayed values.
export function scaledChange(key, dateRange, compare) {
  if (!compare?.enabled || !compare?.start || !compare?.end) return null;
  const cur = 1 + seededNoise(`${key}:${rangeDays(dateRange)}`) * 0.06;
  const prior = 1 + seededNoise(`${key}:prior:${rangeDays({ start: compare.start, end: compare.end })}`) * 0.06;
  return Math.round(((cur - prior) / prior) * 1000) / 10;
}
