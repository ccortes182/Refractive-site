import { ALL_CHANNEL_NAMES } from "./mockData";

// ─────────────────────────────────────────────────────────────────────────
// Channel-tab saved views. Mirrors overviewViews.js: hardcoded presets +
// localStorage-persisted custom views. View shape captures the full filter
// + sort + metric-mode state so switching a view fully re-applies it.
// ─────────────────────────────────────────────────────────────────────────

export const PAID_CHANNELS = ["Paid Search", "Paid Social", "Email", "SMS"];
export const ORGANIC_CHANNELS = ["Organic", "Direct"];

export const PRESET_VIEWS = [
  {
    id: "preset:all",
    name: "All Channels",
    isPreset: true,
    selectedChannels: ALL_CHANNEL_NAMES,
    minRoas: "",
    maxRoas: "",
    metricMode: "ROAS",
    sortField: "revenue",
    sortDirection: "desc",
  },
  {
    id: "preset:paid",
    name: "Paid Only",
    isPreset: true,
    selectedChannels: PAID_CHANNELS,
    minRoas: "",
    maxRoas: "",
    metricMode: "ROAS",
    sortField: "spend",
    sortDirection: "desc",
  },
  {
    id: "preset:topPerformers",
    name: "Top Performers",
    isPreset: true,
    selectedChannels: ALL_CHANNEL_NAMES,
    minRoas: "2",
    maxRoas: "",
    metricMode: "ROAS",
    sortField: "roas",
    sortDirection: "desc",
  },
  {
    id: "preset:underspend",
    name: "Underspend Candidates",
    isPreset: true,
    selectedChannels: PAID_CHANNELS,
    minRoas: "3",
    maxRoas: "",
    metricMode: "Efficiency",
    sortField: "roas",
    sortDirection: "desc",
  },
  {
    id: "preset:newCustomer",
    name: "New-Customer Focus",
    isPreset: true,
    selectedChannels: ALL_CHANNEL_NAMES,
    minRoas: "",
    maxRoas: "",
    metricMode: "NewCustomer",
    sortField: "ncRoas",
    sortDirection: "desc",
  },
];

const STORAGE_KEY = "lucerna.channels.views.v1";

const VALID_MODES = new Set(["ROAS", "Efficiency", "NewCustomer"]);
const VALID_DIRS = new Set(["asc", "desc"]);

function defaultState() {
  return { activeViewId: PRESET_VIEWS[0].id, customViews: [] };
}

function sanitizeView(v) {
  if (!v || typeof v !== "object") return null;
  const id = typeof v.id === "string" ? v.id : null;
  const name = typeof v.name === "string" && v.name.trim() ? v.name.trim() : "Untitled";
  if (!id) return null;
  const selectedChannels = Array.isArray(v.selectedChannels)
    ? v.selectedChannels.filter((c) => ALL_CHANNEL_NAMES.includes(c))
    : ALL_CHANNEL_NAMES;
  return {
    id,
    name,
    isPreset: false,
    selectedChannels: selectedChannels.length ? selectedChannels : ALL_CHANNEL_NAMES,
    minRoas: typeof v.minRoas === "string" ? v.minRoas : "",
    maxRoas: typeof v.maxRoas === "string" ? v.maxRoas : "",
    metricMode: VALID_MODES.has(v.metricMode) ? v.metricMode : "ROAS",
    sortField: typeof v.sortField === "string" ? v.sortField : "revenue",
    sortDirection: VALID_DIRS.has(v.sortDirection) ? v.sortDirection : "desc",
  };
}

export function loadChannelsViewsState() {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultState();

    const customViews = Array.isArray(parsed.customViews)
      ? parsed.customViews.map(sanitizeView).filter(Boolean)
      : [];

    const allIds = new Set([
      ...PRESET_VIEWS.map((p) => p.id),
      ...customViews.map((v) => v.id),
    ]);
    const activeViewId = allIds.has(parsed.activeViewId)
      ? parsed.activeViewId
      : PRESET_VIEWS[0].id;

    return { activeViewId, customViews };
  } catch {
    return defaultState();
  }
}

export function saveChannelsViewsState({ activeViewId, customViews }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeViewId, customViews })
    );
  } catch {
    // localStorage unavailable; fail silently
  }
}

export function getAllChannelsViews(customViews) {
  return [...PRESET_VIEWS, ...customViews];
}

export function findChannelsView(viewId, customViews) {
  return (
    getAllChannelsViews(customViews).find((v) => v.id === viewId) || PRESET_VIEWS[0]
  );
}

export function newChannelsViewId() {
  return `chview:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
