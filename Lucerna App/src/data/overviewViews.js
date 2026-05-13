import { CARD_BY_KEY } from "./overviewCardCatalog";

// ─────────────────────────────────────────────────────────────────────────
// Hardcoded persona presets. Defined in code (not localStorage) so updates
// to preset content propagate automatically. Editing a preset auto-forks
// it into a custom view, leaving the preset pristine.
// ─────────────────────────────────────────────────────────────────────────
export const PRESET_VIEWS = [
  {
    id: "preset:founder",
    name: "Founder",
    isPreset: true,
    cardOrder: [
      "netRevenue",
      "cmPct",
      "ltvCacRatio",
      "cacPayback",
      "mer",
      "pctRevFromNew",
      "orders",
      "totalCustomers",
    ],
  },
  {
    id: "preset:mediaBuyer",
    name: "Media Buyer",
    isPreset: true,
    cardOrder: [
      "adSpend",
      "mer",
      "roas",
      "ncRoas",
      "cac",
      "ncAov",
      "marketingPctOfRev",
      "cpa",
    ],
  },
  {
    id: "preset:ecomDirector",
    name: "Ecom Director",
    isPreset: true,
    cardOrder: [
      "netRevenue",
      "aov",
      "conversionRate",
      "addToCartRate",
      "checkoutRate",
      "cartAbandonRate",
      "returnRate",
      "sessions",
    ],
  },
];

const STORAGE_KEY = "lucerna.overview.views.v1";

function defaultState() {
  return { activeViewId: PRESET_VIEWS[0].id, customViews: [] };
}

export function loadViewsState() {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultState();

    const customViews = Array.isArray(parsed.customViews)
      ? parsed.customViews
          .filter((v) => v && typeof v === "object" && Array.isArray(v.cardOrder))
          .map((v) => ({
            id: typeof v.id === "string" ? v.id : `view:${Date.now()}-${Math.random()}`,
            name: typeof v.name === "string" && v.name.trim() ? v.name : "Untitled",
            isPreset: false,
            cardOrder: v.cardOrder.filter((k) => CARD_BY_KEY[k]),
          }))
          .filter((v) => v.cardOrder.length > 0)
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

export function saveViewsState({ activeViewId, customViews }) {
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

export function getAllViews(customViews) {
  return [...PRESET_VIEWS, ...customViews];
}

export function findView(viewId, customViews) {
  return getAllViews(customViews).find((v) => v.id === viewId) || PRESET_VIEWS[0];
}

export function newCustomViewId() {
  return `view:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
