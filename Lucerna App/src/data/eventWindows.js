// Event Windows: named promo periods (BFCM, Memorial Day, etc.) with their
// own revenue goals + spend budgets that auto-distribute across the window's
// days. Stored separately from monthly revenue goals because the shape is
// different — windows are bounded periods rather than recurring calendar
// blocks. See plan PR 3 for the full rationale.
//
// localStorage key: lucerna.event.windows.v1
// Schema: { windows: EventWindow[] }
//   EventWindow = {
//     id: string,
//     name: string,
//     startDate: "YYYY-MM-DD",
//     endDate: "YYYY-MM-DD",
//     revenueGoal: number,
//     spendBudget: number,
//     targetMER?: number,
//     channels?: { [channelName]: { revenueGoal?, spendBudget? } },
//   }

const STORAGE_KEY = "lucerna.event.windows.v1";

export const EVENTS_CHANGED_EVENT = "lucerna:event-windows-changed";

function emptyState() {
  return { windows: [] };
}

export function loadEventWindows() {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyState();
    if (!Array.isArray(parsed.windows)) return emptyState();
    return parsed;
  } catch {
    return emptyState();
  }
}

export function saveEventWindows(state) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(EVENTS_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

function genId() {
  return "evt-" + Math.random().toString(36).slice(2, 10);
}

/**
 * Insert or update a single event window. Pure — caller persists.
 */
export function upsertEventWindow(state, window) {
  const next = { windows: [...(state?.windows || [])] };
  const w = { ...window };
  if (!w.id) w.id = genId();
  const idx = next.windows.findIndex((x) => x.id === w.id);
  if (idx >= 0) next.windows[idx] = w;
  else next.windows.push(w);
  return next;
}

export function deleteEventWindow(state, id) {
  const next = { windows: (state?.windows || []).filter((w) => w.id !== id) };
  return next;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function asDate(s) {
  if (s instanceof Date) return startOfDay(s);
  // "YYYY-MM-DD" — construct local date to avoid timezone shift
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return startOfDay(new Date(s));
}

/**
 * Returns the event window currently active on `date` (defaults to today),
 * or null if none. If multiple windows overlap, returns the one with the
 * latest start date (most specific / nested promo).
 */
export function getActiveEventWindow(state, date = new Date()) {
  const target = startOfDay(date).getTime();
  const matches = (state?.windows || []).filter((w) => {
    const s = asDate(w.startDate).getTime();
    const e = asDate(w.endDate).getTime();
    return target >= s && target <= e;
  });
  if (matches.length === 0) return null;
  matches.sort((a, b) => asDate(b.startDate) - asDate(a.startDate));
  return matches[0];
}

/**
 * Returns all event windows that overlap [start, end].
 */
export function getEventWindowsOverlappingRange(state, start, end) {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  return (state?.windows || []).filter((w) => {
    const ws = asDate(w.startDate).getTime();
    const we = asDate(w.endDate).getTime();
    return we >= s && ws <= e;
  });
}

/**
 * Classify a window relative to "today" — used by Settings UI badges.
 */
export function getEventStatus(window, today = new Date()) {
  const t = startOfDay(today).getTime();
  const s = asDate(window.startDate).getTime();
  const e = asDate(window.endDate).getTime();
  if (t < s) return "upcoming";
  if (t > e) return "past";
  return "active";
}

/**
 * Returns the inclusive day count of [startDate, endDate].
 */
export function getEventDayCount(window) {
  const s = asDate(window.startDate).getTime();
  const e = asDate(window.endDate).getTime();
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}
