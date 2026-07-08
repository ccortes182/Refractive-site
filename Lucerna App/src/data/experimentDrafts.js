// Experiment designs saved from the Incrementality page's Experiment Designer.
// Shape: [{ id, channel, testType, metric, duration, budget, testMarkets,
//           controlMarkets, status: "Draft", createdAt }]

const STORAGE_KEY = "lucerna.incrementality.drafts.v1";

export function loadDrafts() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d) =>
        d &&
        typeof d === "object" &&
        typeof d.id === "string" &&
        typeof d.channel === "string" &&
        typeof d.budget === "number" &&
        Number.isFinite(d.budget)
    );
  } catch {
    return [];
  }
}

export function saveDrafts(drafts) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts || []));
  } catch {
    // ignore quota / privacy-mode errors
  }
}
