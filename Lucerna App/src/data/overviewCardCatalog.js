// Single source of truth for the Overview KPI cards.
// `defaultShown` cards make up the curated 8-card starter set.
// `goodIfUp` defaults to true; set false for metrics where DOWN is good (CAC, CPA,
// returns, abandon rate). Used by anomaly callouts to color the dot correctly.

const LOWER_IS_BETTER = new Set([
  "cac",
  "cpa",
  "cogs",
  "returns",
  "returnItems",
  "returnRate",
  "discounts",
  "adSpend",
  "marketingPctOfRev",
  "cacPayback",
  "cartAbandonRate",
]);

export const OVERVIEW_CARD_CATALOG = [
  // ── Revenue & Profit ────────────────────────────────────────────────
  { key: "totalRevenue",       title: "Total Revenue",   fmt: "dollar",  defaultShown: false, group: "Revenue & Profit" },
  { key: "grossRevenue",       title: "Gross Revenue",   fmt: "dollar",  defaultShown: false, group: "Revenue & Profit" },
  { key: "netRevenue",         title: "Net Revenue",     fmt: "dollar",  defaultShown: true,  group: "Revenue & Profit" },
  { key: "grossProfit",        title: "Gross Profit",    fmt: "dollar",  defaultShown: false, group: "Revenue & Profit" },
  { key: "grossMargin",        title: "Gross Margin",    fmt: "percent", defaultShown: false, group: "Revenue & Profit" },
  { key: "contributionMargin", title: "CM",              fmt: "dollar",  defaultShown: false, group: "Revenue & Profit" },
  { key: "cmPct",              title: "CM %",            fmt: "percent", defaultShown: true,  group: "Revenue & Profit" },
  { key: "tax",                title: "Tax",             fmt: "dollar",  defaultShown: false, group: "Revenue & Profit" },

  // ── Sales ───────────────────────────────────────────────────────────
  { key: "orders",             title: "Orders",          fmt: "number",  defaultShown: true,  group: "Sales" },
  { key: "aov",                title: "AOV",             fmt: "dollarC", defaultShown: true,  group: "Sales" },
  { key: "conversionRate",     title: "CVR",             fmt: "percent", defaultShown: true,  group: "Sales" },
  { key: "discounts",          title: "Discounts",       fmt: "dollar",  defaultShown: false, group: "Sales" },

  // ── Returns ─────────────────────────────────────────────────────────
  { key: "returns",            title: "Returns",         fmt: "dollar",  defaultShown: false, group: "Returns" },
  { key: "returnItems",        title: "Items Returned",  fmt: "number",  defaultShown: false, group: "Returns" },
  { key: "returnRate",         title: "Return Rate",     fmt: "percent", defaultShown: false, group: "Returns" },

  // ── Costs ───────────────────────────────────────────────────────────
  { key: "cogs",               title: "COGS",            fmt: "dollar",  defaultShown: false, group: "Costs" },
  { key: "shippingCollected",  title: "Shipping",        fmt: "dollar",  defaultShown: false, group: "Costs" },
  { key: "adSpend",            title: "Ad Spend",        fmt: "dollar",  defaultShown: false, group: "Costs" },

  // ── Marketing Efficiency ────────────────────────────────────────────
  { key: "mer",                title: "MER",             fmt: "merX",    defaultShown: true,  group: "Marketing" },
  { key: "roas",               title: "ROAS",            fmt: "merX",    defaultShown: false, group: "Marketing" },
  { key: "cac",                title: "CAC",             fmt: "dollarC", defaultShown: true,  group: "Marketing" },
  { key: "cpa",                title: "CPA",             fmt: "dollarC", defaultShown: false, group: "Marketing" },

  // ── Customers & Traffic ─────────────────────────────────────────────
  { key: "sessions",           title: "Sessions",        fmt: "number",  defaultShown: true,  group: "Customers" },
  { key: "revPerSession",      title: "Rev / Session",   fmt: "dollarC", defaultShown: false, group: "Customers" },
  { key: "newCustomers",       title: "New Cust.",       fmt: "number",  defaultShown: false, group: "Customers" },
  { key: "returningCustomers", title: "Return Cust.",    fmt: "number",  defaultShown: false, group: "Customers" },
  { key: "totalCustomers",     title: "Total Cust.",     fmt: "number",  defaultShown: false, group: "Customers" },
  { key: "repeatRate",         title: "Repeat Rate",     fmt: "percent", defaultShown: false, group: "Customers" },
  { key: "pctRevFromNew",      title: "% Rev from New",  fmt: "percent", defaultShown: false, group: "Customers" },

  // ── New persona-critical KPIs ───────────────────────────────────────
  { key: "ltvCacRatio",        title: "LTV : CAC",       fmt: "merX",    defaultShown: false, group: "Marketing" },
  { key: "cacPayback",         title: "CAC Payback",     fmt: "orders",  defaultShown: false, group: "Marketing" },
  { key: "marketingPctOfRev",  title: "Marketing % Rev", fmt: "percent", defaultShown: false, group: "Marketing" },
  { key: "ncRoas",             title: "NC-ROAS",         fmt: "merX",    defaultShown: false, group: "Marketing" },
  { key: "ncAov",              title: "NC AOV",          fmt: "dollarC", defaultShown: false, group: "Sales" },
  { key: "rcAov",              title: "Returning AOV",   fmt: "dollarC", defaultShown: false, group: "Sales" },

  // ── Funnel ──────────────────────────────────────────────────────────
  { key: "addToCartRate",      title: "Add-to-Cart %",   fmt: "percent", defaultShown: false, group: "Funnel" },
  { key: "checkoutRate",       title: "Checkout %",      fmt: "percent", defaultShown: false, group: "Funnel" },
  { key: "cartAbandonRate",    title: "Cart Abandon %",  fmt: "percent", defaultShown: false, group: "Funnel" },
];

export const CARD_BY_KEY = OVERVIEW_CARD_CATALOG.reduce((acc, c) => {
  acc[c.key] = c;
  return acc;
}, {});

// Direction-of-good: true if "up" is good for this metric (Net Revenue, CVR, MER...);
// false if "down" is good (CAC, CPA, Returns, Cart Abandon %, etc.). Used by the
// anomaly callout to choose green vs amber for a meaningful change.
export function isGoodIfUp(metricKey) {
  return !LOWER_IS_BETTER.has(metricKey);
}

export const DEFAULT_CARD_ORDER = OVERVIEW_CARD_CATALOG
  .filter((c) => c.defaultShown)
  .map((c) => c.key);

const STORAGE_KEY = "lucerna.overview.cardOrder.v3";

export function loadCardOrder() {
  if (typeof window === "undefined") return DEFAULT_CARD_ORDER;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CARD_ORDER;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_CARD_ORDER;
    const valid = parsed.filter((k) => CARD_BY_KEY[k]);
    return valid.length > 0 ? valid : DEFAULT_CARD_ORDER;
  } catch {
    return DEFAULT_CARD_ORDER;
  }
}

export function saveCardOrder(order) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // localStorage unavailable; fail silently
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Augments the raw KPI object from getOverviewKPIs() with derived metrics
// (gross profit, return rate, LTV:CAC, funnel rates, etc.) so every card key
// resolves to a number on `c`, `p`, and `ch` without bloating mockData.js.
//
// `extras` is an optional object containing values pulled from other helpers:
//   { merKpis, priorMerKpis, cohortLtv }
// ────────────────────────────────────────────────────────────────────────────
const DERIVED_KEYS = [
  "grossProfit",
  "grossMargin",
  "returnRate",
  "totalCustomers",
  "repeatRate",
  "revPerSession",
  "roas",
  "cpa",
  // New persona-critical metrics
  "ltvCacRatio",
  "cacPayback",
  "marketingPctOfRev",
  "ncRoas",
  "ncAov",
  "rcAov",
  "pctRevFromNew",
  "addToCartRate",
  "checkoutRate",
  "cartAbandonRate",
];

const round2 = (n) => Math.round(n * 100) / 100;
const roundPct = (n) => Math.round(n * 10000) / 100;

function deriveOne(o, merKpis, cohortLtv) {
  if (!o || typeof o.revenue !== "number") return;

  // Existing derivations
  o.grossProfit = o.revenue - o.cogs;
  o.grossMargin = o.revenue > 0 ? roundPct(o.grossProfit / o.revenue) : 0;
  o.returnRate = o.revenue > 0 ? roundPct(o.returns / o.revenue) : 0;
  o.totalCustomers = (o.newCustomers || 0) + (o.returningCustomers || 0);
  o.repeatRate = o.totalCustomers > 0 ? roundPct(o.returningCustomers / o.totalCustomers) : 0;
  o.revPerSession = o.sessions > 0 ? round2(o.revenue / o.sessions) : 0;
  o.roas = o.adSpend > 0 ? round2(o.revenue / o.adSpend) : 0;
  o.cpa = o.orders > 0 ? round2(o.adSpend / o.orders) : 0;

  // Marketing efficiency — pulled from getMERKPIs (most accurate source)
  if (merKpis) {
    o.marketingPctOfRev = merKpis.spendPctOfRev ?? 0;
    o.ncRoas = merKpis.ncRoas ?? 0;
    o.pctRevFromNew = o.revenue > 0
      ? roundPct((merKpis.newCustomerRevenueTotal || 0) / o.revenue)
      : 0;
  }

  // LTV:CAC — uses cohort-derived LTV
  if (cohortLtv != null && o.cac > 0) {
    o.ltvCacRatio = round2(cohortLtv / o.cac);
  } else {
    o.ltvCacRatio = 0;
  }

  // CAC Payback — orders to break-even on a CAC at current AOV × gross margin
  // Formula: CAC / (AOV × grossMarginPct/100)
  const gmRatio = o.grossMargin > 0 ? o.grossMargin / 100 : 0;
  o.cacPayback = (o.aov > 0 && gmRatio > 0 && o.cac > 0)
    ? round2(o.cac / (o.aov * gmRatio))
    : 0;

  // New / Returning AOV
  // Need newCustomerRevenue — passed via merKpis.newCustomerRevenueTotal
  const ncRev = merKpis?.newCustomerRevenueTotal ?? 0;
  o.ncAov = o.newCustomers > 0 ? round2(ncRev / o.newCustomers) : 0;
  const rcRev = Math.max(0, o.revenue - ncRev);
  o.rcAov = o.returningCustomers > 0 ? round2(rcRev / o.returningCustomers) : 0;

  // Funnel rates
  o.addToCartRate = o.sessions > 0 ? roundPct((o.addToCarts || 0) / o.sessions) : 0;
  o.checkoutRate = o.sessions > 0 ? roundPct((o.checkoutStarts || 0) / o.sessions) : 0;
  o.cartAbandonRate = (o.checkoutStarts || 0) > 0
    ? roundPct((o.abandonedCarts || 0) / o.checkoutStarts)
    : 0;
}

export function augmentKPIs(kpis, extras = {}) {
  const { current: c, prior: p, changes: ch } = kpis;
  const { merKpis, priorMerKpis, cohortLtv } = extras;

  deriveOne(c, merKpis, cohortLtv);
  if (p && Object.keys(p).length > 0) deriveOne(p, priorMerKpis, cohortLtv);

  const pct = (curr, prev) =>
    prev ? Math.round(((curr - prev) / prev) * 10000) / 100 : null;

  for (const k of DERIVED_KEYS) {
    ch[k] = p && p[k] != null ? pct(c[k], p[k]) : null;
  }
  return { current: c, prior: p, changes: ch };
}
