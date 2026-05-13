import { subDays, format, getDay, differenceInCalendarDays, subYears, startOfDay } from "date-fns";
import { resolveOverrideForMonth, resolveTypeOverrideForMonth, proratePeriod, getMonthlyCost } from "./channelsBudgets";
import { resolveGoalForMonth, TOTAL_KEY } from "./revenueGoals";

// ---------------------------------------------------------------------------
// Deterministic pseudo-random number generator (sine-based)
// ---------------------------------------------------------------------------
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function randomBetween(seed, min, max) {
  return min + seededRandom(seed) * (max - min);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const TODAY = new Date(2026, 2, 30); // March 30 2026
const DAYS = 460; // ~15 months of data for YOY support

// `mode` declares the pacing semantics ("spend" | "sends" | "credits") for
// channels that pace; defaults are intentionally NOT set so a fresh operator
// sees "None — Set budget" everywhere until they enter their own targets.
const CHANNEL_CONFIG = [
  {
    name: "Paid Search",
    share: 0.28,
    roasMin: 3.2,
    roasMax: 4.5,
    mode: "spend",
    platforms: [
      { name: "Google",    weight: 0.80, types: ["Search", "Shopping", "PMax", "Display", "YouTube"] },
      { name: "Microsoft", weight: 0.20, types: ["Search", "Shopping", "PMax", "Display"] },
    ],
  },
  {
    name: "Paid Social",
    share: 0.22,
    roasMin: 2.1,
    roasMax: 3.2,
    mode: "spend",
    platforms: [
      { name: "Meta",   weight: 0.65 },
      { name: "TikTok", weight: 0.20 },
      { name: "Snap",   weight: 0.10 },
      { name: "Reddit", weight: 0.05 },
    ],
  },
  {
    name: "Other Paid",
    share: 0.04,
    roasMin: 1.6,
    roasMax: 2.6,
    mode: "spend",
    platforms: [
      { name: "CTV (Roku/Hulu)", weight: 0.60 },
      { name: "AppLovin",        weight: 0.40 },
    ],
  },
  {
    name: "Email",
    share: 0.18,
    roasMin: 8,
    roasMax: 12,
    // Email is fixed-cost (Klaviyo-style tier); pacing tracks send utilization
    // against an operator-entered monthly send allotment (no default seeded).
    mode: "sends",
    flows: ["Welcome Flow", "Abandoned Cart", "Promo Broadcast", "Post-Purchase"],
  },
  {
    name: "SMS",
    share: 0.05,
    roasMin: 18,
    roasMax: 32,
    // SMS in Klaviyo (and most modern ESPs) is sold in credits, not dollars.
    // 1 credit = 1 segment to a US number; MMS = 3 credits.
    mode: "credits",
    flows: ["Welcome SMS", "Abandoned Cart SMS", "Promo Broadcast SMS", "Post-Purchase SMS"],
  },
  { name: "Organic", share: 0.13, roas: null },
  { name: "Direct", share: 0.10, roas: null },
];

const FLOW_WEIGHTS = [0.4, 0.3, 0.2, 0.1]; // for Email/SMS sub-flow distribution

const PRODUCT_CATALOG = [
  { id: "SKU-001", name: "Classic White Tee", priceMin: 28, priceMax: 34 },
  { id: "SKU-002", name: "Performance Hoodie", priceMin: 68, priceMax: 82 },
  { id: "SKU-003", name: "Slim Fit Joggers", priceMin: 54, priceMax: 66 },
  { id: "SKU-004", name: "Canvas Sneakers", priceMin: 75, priceMax: 95 },
  { id: "SKU-005", name: "Leather Weekender Bag", priceMin: 145, priceMax: 185 },
  { id: "SKU-006", name: "Polarized Sunglasses", priceMin: 42, priceMax: 58 },
  { id: "SKU-007", name: "Merino Wool Beanie", priceMin: 24, priceMax: 32 },
  { id: "SKU-008", name: "Crossbody Sling Pack", priceMin: 36, priceMax: 48 },
  { id: "SKU-009", name: "Ribbed Tank Top", priceMin: 22, priceMax: 28 },
  { id: "SKU-010", name: "Quarter-Zip Pullover", priceMin: 58, priceMax: 74 },
];

// ---------------------------------------------------------------------------
// Generate daily aggregate data
// ---------------------------------------------------------------------------
function generateDailyData() {
  const data = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const date = subDays(TODAY, i);
    const dayOfWeek = getDay(date);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const seed = i * 13 + 7;

    let revenue = randomBetween(seed, 8000, 18000);
    if (isWeekend) revenue *= 0.7;
    revenue *= 1 + (DAYS - i) * 0.0005;
    revenue = Math.round(revenue * 100) / 100;

    const orders = Math.round(revenue / randomBetween(seed + 1, 100, 140));
    const sessionsPerOrder = randomBetween(seed + 2, 15, 25);
    const sessions = Math.round(orders * sessionsPerOrder);
    const newCustomerRate = randomBetween(seed + 3, 0.4, 0.6);
    const newCustomers = Math.round(orders * newCustomerRate);
    const returningCustomers = orders - newCustomers;
    const conversionRate = Math.round((orders / sessions) * 10000) / 100;

    // Shopify revenue definitions:
    // grossRevenue = product sales (before discounts/returns)
    // netRevenue = gross - discounts - returns
    // totalRevenue = gross + tax + shipping
    const grossRevenue = revenue; // base product sales
    const discountRate = randomBetween(seed + 10, 0.08, 0.15);
    const returnRate = randomBetween(seed + 11, 0.04, 0.08);
    const discounts = Math.round(grossRevenue * discountRate * 100) / 100;
    const returns = Math.round(grossRevenue * returnRate * 100) / 100;
    const returnItems = Math.round(orders * returnRate * randomBetween(seed + 12, 0.8, 1.4));
    const netRevenue = Math.round((grossRevenue - discounts - returns) * 100) / 100;
    const shippingCollected = Math.round(orders * randomBetween(seed + 13, 5.5, 9.5) * 100) / 100;
    const tax = Math.round(grossRevenue * randomBetween(seed + 15, 0.06, 0.1) * 100) / 100;
    const totalRevenue = Math.round((grossRevenue + tax + shippingCollected) * 100) / 100;
    const cogs = Math.round(grossRevenue * randomBetween(seed + 14, 0.28, 0.36) * 100) / 100;

    // Funnel: ATC ~ 8-14% of sessions, checkout starts ~ 45-65% of ATC, abandon = checkout - orders
    const addToCarts = Math.round(sessions * randomBetween(seed + 16, 0.08, 0.14));
    const checkoutStarts = Math.max(orders, Math.round(addToCarts * randomBetween(seed + 17, 0.45, 0.65)));
    const abandonedCarts = Math.max(0, checkoutStarts - orders);

    data.push({
      date: startOfDay(date),
      dateStr: format(date, "yyyy-MM-dd"),
      revenue: netRevenue,
      grossRevenue,
      netRevenue,
      totalRevenue,
      tax,
      discounts,
      returns,
      returnItems,
      shippingCollected,
      cogs,
      orders,
      sessions,
      newCustomers,
      returningCustomers,
      conversionRate,
      aov: Math.round((revenue / orders) * 100) / 100,
      addToCarts,
      checkoutStarts,
      abandonedCarts,
    });
  }
  return data;
}

// ---------------------------------------------------------------------------
// Generate daily channel breakdown
// ---------------------------------------------------------------------------
function generateChannelData(dailyData) {
  const channelData = [];
  dailyData.forEach((day, idx) => {
    CHANNEL_CONFIG.forEach((ch, chIdx) => {
      const seed = idx * 53 + chIdx * 17 + 31;
      const shareNoise = randomBetween(seed, 0.85, 1.15);
      const channelRevenue = Math.round(day.revenue * ch.share * shareNoise * 100) / 100;
      const channelOrders = Math.max(1, Math.round(day.orders * ch.share * shareNoise));
      const channelSessions = Math.max(1, Math.round(day.sessions * ch.share * randomBetween(seed + 5, 0.8, 1.2)));

      let roas = null;
      let spend = null;
      if (ch.roasMin != null) {
        roas = Math.round(randomBetween(seed + 9, ch.roasMin, ch.roasMax) * 100) / 100;
        spend = Math.round((channelRevenue / roas) * 100) / 100;
      }

      channelData.push({
        date: day.date,
        dateStr: day.dateStr,
        channel: ch.name,
        sessions: channelSessions,
        orders: channelOrders,
        revenue: channelRevenue,
        roas,
        spend,
      });
    });
  });
  return channelData;
}

function generateProducts() {
  return PRODUCT_CATALOG.map((p, idx) => {
    const seed = idx * 37 + 11;
    const unitsSold = Math.round(randomBetween(seed, 320, 2800));
    const aov = Math.round(randomBetween(seed + 1, p.priceMin, p.priceMax) * 100) / 100;
    const revenue = Math.round(unitsSold * aov * 100) / 100;
    const refundRate = Math.round(randomBetween(seed + 2, 1, 8) * 100) / 100;
    return { id: p.id, name: p.name, unitsSold, revenue, refundRate, aov };
  });
}

function generateCohortData() {
  const cohorts = [];
  for (let i = 5; i >= 0; i--) {
    const cohortDate = new Date(2026, 2 - i, 1);
    const label = format(cohortDate, "MMM yyyy");
    const seed = i * 41 + 3;
    const newCustomers = Math.round(randomBetween(seed, 800, 2200));
    const avgLTV = Math.round(randomBetween(seed + 1, 85, 210) * 100) / 100;
    const repeatRate = Math.round(randomBetween(seed + 2, 25, 45) * 100) / 100;
    cohorts.push({ month: label, newCustomers, avgLTV, repeatRate });
  }
  return cohorts;
}

// ---------------------------------------------------------------------------
// Raw generated data
// ---------------------------------------------------------------------------
export const dailyData = generateDailyData();
export const channelData = generateChannelData(dailyData);
export const products = generateProducts();
export const cohortData = generateCohortData();

// ---------------------------------------------------------------------------
// Range-based helpers — accept { start: Date, end: Date }
// ---------------------------------------------------------------------------

function filterByRange(arr, start, end) {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  return arr.filter((d) => {
    const t = d.date.getTime();
    return t >= s && t <= e;
  });
}

/**
 * Get daily data for an arbitrary date range.
 */
export function getDataForRange(start, end) {
  return filterByRange(dailyData, start, end);
}

/**
 * Compute the comparison date range based on mode.
 */
export function getCompareRange(start, end, mode) {
  const days = differenceInCalendarDays(end, start);
  if (mode === "previous") {
    return {
      start: subDays(start, days + 1),
      end: subDays(start, 1),
    };
  }
  if (mode === "yoy") {
    return {
      start: subYears(start, 1),
      end: subYears(end, 1),
    };
  }
  return null;
}

/**
 * Returns KPIs for a date range, with optional comparison range.
 */
export function getKPIsForRange(start, end, compareStart, compareEnd) {
  const current = filterByRange(dailyData, start, end);
  const prior = compareStart && compareEnd ? filterByRange(dailyData, compareStart, compareEnd) : [];

  const sum = (arr, key) => arr.reduce((s, d) => s + d[key], 0);
  const avg = (arr, key) => (arr.length ? sum(arr, key) / arr.length : 0);

  const totalRevenue = Math.round(sum(current, "revenue") * 100) / 100;
  const totalOrders = sum(current, "orders");
  const aov = totalOrders ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;
  const conversionRate = Math.round(avg(current, "conversionRate") * 100) / 100;
  const newCustomers = sum(current, "newCustomers");
  const totalSessions = sum(current, "sessions");

  const currentDateStrs = new Set(current.map((d) => d.dateStr));
  const currentChannels = channelData.filter((c) => currentDateStrs.has(c.dateStr) && c.spend != null);
  const totalSpend = currentChannels.reduce((s, c) => s + (c.spend || 0), 0);
  const blendedROAS = totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : null;

  let priorKpis = { totalRevenue: 0, totalOrders: 0, aov: 0, conversionRate: 0, blendedROAS: null, newCustomers: 0 };
  if (prior.length) {
    const pRevenue = Math.round(sum(prior, "revenue") * 100) / 100;
    const pOrders = sum(prior, "orders");
    const pDateStrs = new Set(prior.map((d) => d.dateStr));
    const pChannels = channelData.filter((c) => pDateStrs.has(c.dateStr) && c.spend != null);
    const pSpend = pChannels.reduce((s, c) => s + (c.spend || 0), 0);
    priorKpis = {
      totalRevenue: pRevenue,
      totalOrders: pOrders,
      aov: pOrders ? Math.round((pRevenue / pOrders) * 100) / 100 : 0,
      conversionRate: Math.round(avg(prior, "conversionRate") * 100) / 100,
      blendedROAS: pSpend > 0 ? Math.round((pRevenue / pSpend) * 100) / 100 : null,
      newCustomers: sum(prior, "newCustomers"),
    };
  }

  const pctChange = (curr, prev) => prev ? Math.round(((curr - prev) / prev) * 10000) / 100 : null;

  return {
    totalRevenue, totalOrders, aov, conversionRate, blendedROAS, newCustomers, totalSessions,
    prior: priorKpis,
    changes: {
      revenue: pctChange(totalRevenue, priorKpis.totalRevenue),
      orders: pctChange(totalOrders, priorKpis.totalOrders),
      aov: pctChange(aov, priorKpis.aov),
      conversionRate: pctChange(conversionRate, priorKpis.conversionRate),
      blendedROAS: pctChange(blendedROAS, priorKpis.blendedROAS),
      newCustomers: pctChange(newCustomers, priorKpis.newCustomers),
    },
  };
}

/**
 * Aggregates channel data for a date range.
 */
/**
 * Overview KPIs — all 11 metrics for the Shopify-style overview.
 */
export function getOverviewKPIs(start, end, compareStart, compareEnd) {
  const cur = filterByRange(dailyData, start, end);
  const pri = compareStart && compareEnd ? filterByRange(dailyData, compareStart, compareEnd) : [];
  const sum = (arr, k) => arr.reduce((s, d) => s + (d[k] || 0), 0);
  const avg = (arr, k) => arr.length ? sum(arr, k) / arr.length : 0;
  const pct = (c, p) => p ? Math.round(((c - p) / p) * 10000) / 100 : null;

  const merData = getMERDataForRange(start, end);
  const totalSpend = merData.reduce((s, d) => s + d.spend, 0);
  const totalNC = sum(cur, "newCustomers");
  const cac = totalNC > 0 ? Math.round((totalSpend / totalNC) * 100) / 100 : 0;

  const c = {
    totalRevenue: Math.round(sum(cur, "totalRevenue")),
    grossRevenue: Math.round(sum(cur, "grossRevenue")),
    revenue: Math.round(sum(cur, "revenue")),
    netRevenue: Math.round(sum(cur, "netRevenue")),
    orders: sum(cur, "orders"),
    returns: Math.round(sum(cur, "returns")),
    returnItems: sum(cur, "returnItems"),
    shippingCollected: Math.round(sum(cur, "shippingCollected")),
    tax: Math.round(sum(cur, "tax")),
    discounts: Math.round(sum(cur, "discounts")),
    cogs: Math.round(sum(cur, "cogs")),
    conversionRate: Math.round(avg(cur, "conversionRate") * 100) / 100,
    aov: sum(cur, "orders") > 0 ? Math.round((sum(cur, "revenue") / sum(cur, "orders")) * 100) / 100 : 0,
    cac,
    adSpend: Math.round(totalSpend),
    mer: totalSpend > 0 ? Math.round((sum(cur, "revenue") / totalSpend) * 100) / 100 : null,
    sessions: sum(cur, "sessions"),
    newCustomers: totalNC,
    returningCustomers: sum(cur, "returningCustomers"),
    addToCarts: sum(cur, "addToCarts"),
    checkoutStarts: sum(cur, "checkoutStarts"),
    abandonedCarts: sum(cur, "abandonedCarts"),
  };
  c.contributionMargin = Math.round(c.revenue - c.cogs - totalSpend - Math.round(c.orders * 7.5));
  c.cmPct = c.revenue > 0 ? Math.round((c.contributionMargin / c.revenue) * 10000) / 100 : 0;

  let p = {};
  if (pri.length) {
    const pMer = compareStart && compareEnd ? getMERDataForRange(compareStart, compareEnd) : [];
    const pSpend = pMer.reduce((s, d) => s + d.spend, 0);
    const pNC = sum(pri, "newCustomers");
    p = {
      totalRevenue: Math.round(sum(pri, "totalRevenue")),
      grossRevenue: Math.round(sum(pri, "grossRevenue")),
      revenue: Math.round(sum(pri, "revenue")),
      netRevenue: Math.round(sum(pri, "netRevenue")),
      orders: sum(pri, "orders"),
      returns: Math.round(sum(pri, "returns")),
      returnItems: sum(pri, "returnItems"),
      shippingCollected: Math.round(sum(pri, "shippingCollected")),
      tax: Math.round(sum(pri, "tax")),
      discounts: Math.round(sum(pri, "discounts")),
      cogs: Math.round(sum(pri, "cogs")),
      conversionRate: Math.round(avg(pri, "conversionRate") * 100) / 100,
      aov: sum(pri, "orders") > 0 ? Math.round((sum(pri, "revenue") / sum(pri, "orders")) * 100) / 100 : 0,
      cac: pNC > 0 ? Math.round((pSpend / pNC) * 100) / 100 : 0,
      adSpend: Math.round(pSpend),
      mer: pSpend > 0 ? Math.round((sum(pri, "revenue") / pSpend) * 100) / 100 : null,
      sessions: sum(pri, "sessions"),
      newCustomers: pNC,
      returningCustomers: sum(pri, "returningCustomers"),
      addToCarts: sum(pri, "addToCarts"),
      checkoutStarts: sum(pri, "checkoutStarts"),
      abandonedCarts: sum(pri, "abandonedCarts"),
    };
    p.contributionMargin = Math.round(p.revenue - p.cogs - pSpend - Math.round(p.orders * 7.5));
    p.cmPct = p.revenue > 0 ? Math.round((p.contributionMargin / p.revenue) * 10000) / 100 : 0;
  }

  const ch = {};
  for (const k of Object.keys(c)) ch[k] = pct(c[k], p[k]);

  return { current: c, prior: p, changes: ch };
}

export function getChannelSummaryForRange(start, end) {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  const filtered = channelData.filter((c) => c.date.getTime() >= s && c.date.getTime() <= e);
  const daily = filterByRange(dailyData, start, end);

  const totals = {};
  let grandRevenue = 0;
  filtered.forEach((row) => {
    if (!totals[row.channel]) {
      totals[row.channel] = { channel: row.channel, sessions: 0, orders: 0, revenue: 0, spend: 0, hasPaid: row.spend != null, ncRevenue: 0 };
    }
    const t = totals[row.channel];
    t.sessions += row.sessions;
    t.orders += row.orders;
    t.revenue += row.revenue;
    t.spend += row.spend || 0;
    grandRevenue += row.revenue;
    const dayData = daily.find((d) => d.dateStr === row.dateStr);
    const ncRate = dayData ? dayData.newCustomers / (dayData.orders || 1) : 0.5;
    t.ncRevenue += row.revenue * ncRate;
  });

  return Object.values(totals).map((t) => {
    const seed = t.channel.length * 7 + 3;
    const impressions = Math.round(t.sessions * randomBetween(seed, 8, 18));
    const clicks = Math.round(impressions * randomBetween(seed + 1, 0.01, 0.035));
    return {
      channel: t.channel,
      sessions: t.sessions,
      orders: t.orders,
      revenue: Math.round(t.revenue),
      spend: Math.round(t.spend),
      roas: t.hasPaid && t.spend > 0 ? Math.round((t.revenue / t.spend) * 100) / 100 : null,
      cpa: t.orders > 0 && t.spend > 0 ? Math.round((t.spend / t.orders) * 100) / 100 : null,
      ncRevenue: Math.round(t.ncRevenue),
      ncRoas: t.hasPaid && t.spend > 0 ? Math.round((t.ncRevenue / t.spend) * 100) / 100 : null,
      impressions,
      clicks,
      cpm: impressions > 0 && t.spend > 0 ? Math.round((t.spend / impressions) * 1000 * 100) / 100 : null,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : null,
      revenuePercent: grandRevenue > 0 ? Math.round((t.revenue / grandRevenue) * 10000) / 100 : 0,
      platformRoas: t.hasPaid && t.spend > 0 ? Math.round(((t.revenue / t.spend) * randomBetween(seed + 2, 1.12, 1.42)) * 100) / 100 : null,
    };
  });
}

/**
 * Same shape as getChannelSummaryForRange, but applies operator-entered
 * monthly costs (Email tier, SMS credit pack) to recompute spend/ROAS/CPA/CPM
 * for owned channels. Falls back to the synthetic mock spend when the
 * operator hasn't entered a cost.
 */
export function getChannelSummaryWithBudgets(start, end, budgets = {}) {
  const summary = getChannelSummaryForRange(start, end);
  const days = differenceInCalendarDays(end, start) + 1;
  return summary.map((row) => {
    const monthly = getMonthlyCost(budgets, row.channel);
    if (monthly == null) return row;
    const periodCost = Math.round((monthly / 30) * days);
    return {
      ...row,
      spend: periodCost,
      roas: periodCost > 0 ? Math.round((row.revenue / periodCost) * 100) / 100 : null,
      ncRoas: periodCost > 0 ? Math.round((row.ncRevenue / periodCost) * 100) / 100 : null,
      cpa: row.orders > 0 && periodCost > 0 ? Math.round((periodCost / row.orders) * 100) / 100 : null,
      cpm: row.impressions > 0 && periodCost > 0 ? Math.round((periodCost / row.impressions) * 1000 * 100) / 100 : null,
      platformRoas: null, // not meaningful for owned channels
    };
  });
}

/**
 * Returns daily channel breakdown for a date range (for stacked charts).
 */
export function getDailyChannelDataForRange(start, end) {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  const filtered = channelData.filter((c) => c.date.getTime() >= s && c.date.getTime() <= e);

  const grouped = {};
  filtered.forEach((row) => {
    if (!grouped[row.dateStr]) grouped[row.dateStr] = { dateStr: row.dateStr, date: row.date };
    grouped[row.dateStr][row.channel] = row.revenue;
  });

  return Object.values(grouped).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Returns sparkline values for a date range.
 */
export function getSparklineDataForRange(start, end, metric = "revenue") {
  return filterByRange(dailyData, start, end).map((d) => d[metric]);
}

/**
 * Returns daily metrics for a single channel over a date range.
 * Powers the channel drill drawer's per-channel trend lines and funnel.
 */
export function getDailyChannelMetricsForRange(start, end, channel) {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  const rows = channelData.filter(
    (c) => c.channel === channel && c.date.getTime() >= s && c.date.getTime() <= e
  );
  return rows
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((row, idx) => {
      const seed = idx * 19 + row.channel.length * 7 + 5;
      const sessions = row.sessions;
      const orders = row.orders;
      const impressions = Math.round(sessions * randomBetween(seed, 8, 18));
      const clicks = Math.round(impressions * randomBetween(seed + 1, 0.01, 0.035));
      const spend = row.spend ?? null;
      return {
        dateStr: row.dateStr,
        date: row.date,
        spend: spend != null ? Math.round(spend) : null,
        revenue: Math.round(row.revenue),
        roas: row.roas,
        sessions,
        orders,
        impressions,
        clicks,
        cpm: spend != null && impressions > 0 ? Math.round((spend / impressions) * 1000 * 100) / 100 : null,
        ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : null,
        cpa: spend != null && orders > 0 ? Math.round((spend / orders) * 100) / 100 : null,
      };
    });
}

/**
 * Splits a channel summary row across a list of (label, weight) pairs with
 * deterministic ±15% jitter. Used for platform / platform-type / flow rows.
 */
function splitRowByWeights(row, items, seedBase) {
  return items.map((item, i) => {
    const seed = seedBase + i * 23;
    const j = (offset) => randomBetween(seed + offset, 0.85, 1.15);
    const w = item.weight;
    const spend = row.spend ? Math.round(row.spend * w * j(0)) : 0;
    const revenue = Math.round(row.revenue * w * j(1));
    const sessions = Math.max(1, Math.round(row.sessions * w * j(2)));
    const orders = Math.max(1, Math.round(row.orders * w * j(3)));
    const impressions = Math.max(1, Math.round(row.impressions * w * j(4)));
    const clicks = Math.max(1, Math.round(row.clicks * w * j(5)));
    return {
      ...item.extras,
      label: item.label,
      spend,
      revenue,
      roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : null,
      cpa: spend > 0 && orders > 0 ? Math.round((spend / orders) * 100) / 100 : null,
      sessions,
      orders,
      impressions,
      clicks,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : null,
      cpm: spend > 0 && impressions > 0 ? Math.round((spend / impressions) * 1000 * 100) / 100 : null,
    };
  });
}

/**
 * Returns one row per (channel, platform) for paid channels with a `platforms`
 * config. Splits each channel's totals by platform.weight × jitter.
 */
export function getChannelPlatformsForRange(start, end) {
  const summary = getChannelSummaryForRange(start, end);
  const out = [];
  summary.forEach((row) => {
    const config = CHANNEL_CONFIG.find((c) => c.name === row.channel);
    if (!config?.platforms?.length) return;
    const items = config.platforms.map((p) => ({
      weight: p.weight,
      label: p.name,
      extras: { channel: row.channel, platform: p.name },
    }));
    const seedBase = row.channel.length * 11 + 7;
    out.push(...splitRowByWeights(row, items, seedBase));
  });
  return out;
}

/**
 * Returns one row per **operator-tracked** (channel, platform) for paid
 * channels — i.e., only platforms the operator has added via the "+ Add
 * network" UI (or already had a budget override on). Email/SMS yield one
 * row per flow type (always shown — they're built-in to the channel concept,
 * not platforms).
 *
 * Each row is allocated a slice of the channel's mock spend/revenue using
 * the platform's library weight (or 0.03 for custom names with no weight).
 */
export function getChannelExpansionRowsForRange(start, end, budgets = {}) {
  const summary = getChannelSummaryForRange(start, end);
  const out = [];
  summary.forEach((row) => {
    const config = CHANNEL_CONFIG.find((c) => c.name === row.channel);
    if (!config) return;

    if (config.platforms?.length) {
      // Operator-tracked platforms: only show those the operator has explicitly
      // added (any name present in budgets[channel].platforms).
      const stored = budgets?.[row.channel]?.platforms || {};
      const trackedNames = Object.keys(stored);
      if (trackedNames.length === 0) return; // nothing tracked → no chevron rows

      const seedBase = row.channel.length * 11 + 7;
      const items = trackedNames.map((name) => {
        const builtIn = config.platforms.find((p) => p.name === name);
        const isCustom = !!stored[name]?.isCustom || !builtIn;
        return {
          weight: builtIn?.weight ?? 0.03,
          label: name,
          extras: {
            channel: row.channel,
            platform: name,
            type: null,
            types: builtIn?.types || [],
            isCustom,
          },
        };
      });
      out.push(...splitRowByWeights(row, items, seedBase));
    } else if (config.flows?.length) {
      const flows = config.flows;
      const items = flows.map((f, i) => ({
        weight: FLOW_WEIGHTS[i] ?? 0.05,
        label: f,
        extras: { channel: row.channel, platform: null, flow: f, types: [] },
      }));
      const seedBase = row.channel.length * 11 + 7;
      out.push(...splitRowByWeights(row, items, seedBase));
    }
  });
  return out;
}

/**
 * Returns one row per campaign type for a (channel, platform). Used by the
 * Channels-tab chevron when an operator drills into a paid-search platform
 * (Google → Search/Shopping/PMax/Display/YouTube). Returns [] for platforms
 * with no `types` config (Paid Social, Other Paid, custom networks).
 */
export function getPlatformTypeRowsForRange(channel, platform, start, end) {
  const config = CHANNEL_CONFIG.find((c) => c.name === channel);
  const platformConfig = config?.platforms?.find((p) => p.name === platform);
  const types = platformConfig?.types || [];
  if (types.length === 0) return [];

  const summary = getChannelSummaryForRange(start, end);
  const channelRow = summary.find((r) => r.channel === channel);
  if (!channelRow) return [];

  // Reproduce the platform's slot total from the channel split (mirrors
  // splitRowByWeights so the type rows roll up consistently).
  const seedBase = channel.length * 11 + 7;
  const platformIndex = config.platforms.findIndex((p) => p.name === platform);
  const platformSeed = seedBase + platformIndex * 23;
  const j = (offset) => randomBetween(platformSeed + offset, 0.85, 1.15);
  const w = platformConfig.weight;
  const platformRow = {
    spend: channelRow.spend ? channelRow.spend * w * j(0) : 0,
    revenue: channelRow.revenue * w * j(1),
    sessions: Math.max(1, channelRow.sessions * w * j(2)),
    orders: Math.max(1, channelRow.orders * w * j(3)),
    impressions: Math.max(1, channelRow.impressions * w * j(4)),
    clicks: Math.max(1, channelRow.clicks * w * j(5)),
  };

  // Now split the platform across its types
  const typeWeight = 1 / types.length;
  const items = types.map((t) => ({
    weight: typeWeight,
    label: `${platform} · ${t}`,
    extras: { channel, platform, type: t },
  }));
  return splitRowByWeights(platformRow, items, platformSeed + 100);
}

/**
 * Returns pacing data for a channel over a date range.
 * Dispatches by cost model:
 *   - mode: "spend"   — paid channels, monthlyTarget vs. period spend
 *   - mode: "sends"   — email (fixed-tier ESP), sendAllotment vs. period sends
 *   - mode: "credits" — SMS (Klaviyo-style), creditAllotment vs. period credits
 * Returns { mode, hasTarget, current, target, monthlyTotal, days, unit }.
 * For spend mode the caller provides `current` from the channel summary's spend.
 * For sends/credits modes `current` is computed here from the monthly allotment.
 */
/**
 * Returns pacing for a (channel, platform?) over a date range.
 * Mode is determined by the channel config (spend/sends/credits).
 * Returns { mode, hasTarget, current, target, monthlyTotal, unit, days, isOverridden }.
 * If no override and no CHANNEL_CONFIG default exists → hasTarget:false (UI shows "None").
 *
 * `current` for spend mode is left null (caller fills with row.spend).
 * For sends/credits modes, `current` is computed from the allotment + jitter.
 */
export function getChannelPacing(channel, start, end, budgets = {}, platform = null, type = null) {
  const config = CHANNEL_CONFIG.find((c) => c.name === channel);
  const days = differenceInCalendarDays(end, start) + 1;
  if (!config) return { mode: null, hasTarget: false, current: null, target: null, days };

  const mode = config.mode || null;

  if (!mode) {
    return { mode: null, hasTarget: false, current: null, target: null, days };
  }

  let target = null;
  let isOverridden = false;
  let resolvedAtPlatform = false;

  if (platform && type) {
    const platformConfig = (config.platforms || []).find((p) => p.name === platform);
    const tracked = _getOperatorTrackedPlatforms(config, budgets[channel]);
    const normalized = _normalizedPlatformWeights(tracked);
    const platformWeight = normalized[platform] ?? 0;
    const types = platformConfig?.types || [];
    const typeWeight = types.length ? 1 / types.length : 0;
    const t = _resolveTypePeriodTarget(
      budgets, channel, platform, platformWeight, type, typeWeight, mode, config, start, end
    );
    if (t != null) {
      target = t.value;
      isOverridden = t.fromOverride;
      resolvedAtPlatform = true;
    }
  } else if (platform) {
    // Use normalized weight (across operator-tracked platforms) so a single-
    // tracked platform inherits the full channel target — matches the math
    // used in _resolveChannelPeriodTarget.
    const tracked = _getOperatorTrackedPlatforms(config, budgets[channel]);
    const normalized = _normalizedPlatformWeights(tracked);
    const weight = normalized[platform] ?? 0;
    const target_ = _resolvePlatformPeriodTarget(
      budgets, channel, platform, weight, mode, config, start, end
    );
    if (target_ != null) {
      target = target_.value;
      isOverridden = target_.fromOverride;
      resolvedAtPlatform = true;
    }
  } else {
    target = _resolveChannelPeriodTarget(budgets, channel, mode, config, start, end);
    isOverridden = !!(budgets?.[channel]?.annual || budgets?.[channel]?.monthly ||
      Object.values(budgets?.[channel]?.platforms || {}).some(
        (p) => p?.annual || p?.monthly || p?.types
      ));
  }

  // Compute "current" appropriate to the mode
  let current = null;
  let monthlyTotal = null;
  if (target != null) {
    monthlyTotal = (target / days) * 30;
    if (mode === "sends" || mode === "credits") {
      const seed = (channel?.length || 0) * 13 + (mode === "credits" ? 71 : 41);
      const jitter = randomBetween(seed, 0.85, 1.05);
      current = Math.round(monthlyTotal * (days / 30) * jitter);
    }
  }

  if (target == null) {
    return {
      mode,
      hasTarget: false,
      current: null,
      target: null,
      monthlyTotal: null,
      unit: mode === "spend" ? "$" : mode === "sends" ? "sends" : "credits",
      days,
      isOverridden: false,
    };
  }

  return {
    mode,
    hasTarget: true,
    current,
    target: Math.round(target),
    monthlyTotal: Math.round(monthlyTotal),
    unit: mode === "spend" ? "$" : mode === "sends" ? "sends" : "credits",
    days,
    isOverridden,
    resolvedAtPlatform,
  };
}

/**
 * Channel-level period target. Sums platform-level pro-rated targets when
 * platforms exist; otherwise resolves at the channel level only.
 */
function _resolveChannelPeriodTarget(budgets, channel, mode, config, start, end) {
  // Channels with no platforms (Email/SMS): single resolution
  if (!config.platforms?.length) {
    const fallbackMonthly = null; // operator-set only — no seeded defaults
    return proratePeriod(start, end, (yyyymm) => {
      const overridden = resolveOverrideForMonth(budgets, channel, null, yyyymm);
      if (overridden != null) return overridden;
      return fallbackMonthly ?? null;
    });
  }

  // Channels with platforms: only sum operator-tracked platforms (those the
  // operator has added via "+ Add network"). If none are tracked, fall back
  // to a direct channel-level override.
  const trackedPlatforms = _getOperatorTrackedPlatforms(config, budgets[channel]);
  if (trackedPlatforms.length === 0) {
    return proratePeriod(start, end, (yyyymm) => {
      const overridden = resolveOverrideForMonth(budgets, channel, null, yyyymm);
      return overridden ?? null;
    });
  }

  const normalizedWeights = _normalizedPlatformWeights(trackedPlatforms);

  let anyResolved = false;
  let total = 0;
  for (const p of trackedPlatforms) {
    const tt = _resolvePlatformPeriodTarget(
      budgets, channel, p.name, normalizedWeights[p.name], mode, config, start, end
    );
    if (tt != null) {
      anyResolved = true;
      total += tt.value;
    }
  }
  if (anyResolved) return total;

  // No platform-level overrides → fall back to channel-direct
  return proratePeriod(start, end, (yyyymm) => {
    const overridden = resolveOverrideForMonth(budgets, channel, null, yyyymm);
    return overridden ?? null;
  });
}

/**
 * Returns operator-tracked platforms under a channel (from budgets) annotated
 * with their library weight (or 0 for custom names not in the library).
 */
function _getOperatorTrackedPlatforms(config, channelEntry) {
  const stored = channelEntry?.platforms || {};
  return Object.keys(stored).map((name) => {
    const builtIn = (config.platforms || []).find((p) => p.name === name);
    return { name, weight: builtIn?.weight ?? 0, isCustom: !builtIn };
  });
}

/**
 * Normalizes weights across operator-tracked platforms. Library platforms
 * with weights keep their relative proportions but rescale to sum to 1.0;
 * platforms without weights (customs) get 0 and need explicit overrides.
 * If no library platforms with weights exist, distributes 1/N evenly across
 * all tracked platforms (so a single-custom-platform channel inherits 100%).
 */
function _normalizedPlatformWeights(trackedPlatforms) {
  const out = {};
  const libraryTotal = trackedPlatforms
    .filter((p) => p.weight > 0)
    .reduce((s, p) => s + p.weight, 0);
  if (libraryTotal > 0) {
    for (const p of trackedPlatforms) out[p.name] = p.weight > 0 ? p.weight / libraryTotal : 0;
  } else if (trackedPlatforms.length > 0) {
    const equal = 1 / trackedPlatforms.length;
    for (const p of trackedPlatforms) out[p.name] = equal;
  }
  return out;
}

/**
 * Platform-level period target with default-weight fallback chain.
 * Returns { value, fromOverride } or null.
 */
function _resolvePlatformPeriodTarget(budgets, channel, platform, weight, mode, config, start, end) {
  // If any type under this platform has its own override, the platform total
  // becomes the sum of type-level resolutions (each type either overrides or
  // inherits via the type→platform→channel→default chain).
  const platformConfig = (config.platforms || []).find((p) => p.name === platform);
  const types = platformConfig?.types || [];
  const storedTypes = budgets?.[channel]?.platforms?.[platform]?.types || {};
  const anyTypeOverride = Object.keys(storedTypes).length > 0;

  if (anyTypeOverride && types.length > 0) {
    const typeWeight = 1 / types.length;
    let anyResolved = false;
    let total = 0;
    let fromOverride = false;
    for (const t of types) {
      const tt = _resolveTypePeriodTarget(
        budgets, channel, platform, weight, t, typeWeight, mode, config, start, end
      );
      if (tt != null) {
        anyResolved = true;
        total += tt.value;
        if (tt.fromOverride) fromOverride = true;
      }
    }
    if (anyResolved) return { value: total, fromOverride };
  }

  const fallbackMonthly = null; // operator-set only — no seeded defaults
  let fromOverride = false;
  const v = proratePeriod(start, end, (yyyymm) => {
    const platformOverride = resolveOverrideForMonth(budgets, channel, platform, yyyymm);
    if (platformOverride != null) { fromOverride = true; return platformOverride; }
    const channelOverride = resolveOverrideForMonth(budgets, channel, null, yyyymm);
    if (channelOverride != null) { fromOverride = true; return channelOverride * (weight ?? 0); }
    if (fallbackMonthly != null && weight) return fallbackMonthly * weight;
    return null;
  });
  return v == null ? null : { value: v, fromOverride };
}

/**
 * Type-level period target. Resolution chain:
 *   type override → platform override × type weight → channel override × platform weight × type weight
 *   (No CHANNEL_CONFIG fallback — defaults removed; operator must set targets explicitly.)
 */
function _resolveTypePeriodTarget(budgets, channel, platform, platformWeight, type, typeWeight, mode, config, start, end) {
  void mode; void config;
  const fallbackMonthly = null; // operator-set only
  let fromOverride = false;
  const v = proratePeriod(start, end, (yyyymm) => {
    const typeOverride = resolveTypeOverrideForMonth(budgets, channel, platform, type, yyyymm);
    if (typeOverride != null) { fromOverride = true; return typeOverride; }
    const platformOverride = resolveOverrideForMonth(budgets, channel, platform, yyyymm);
    if (platformOverride != null) { fromOverride = true; return platformOverride * (typeWeight ?? 0); }
    const channelOverride = resolveOverrideForMonth(budgets, channel, null, yyyymm);
    if (channelOverride != null) { fromOverride = true; return channelOverride * (platformWeight ?? 0) * (typeWeight ?? 0); }
    if (fallbackMonthly != null && platformWeight && typeWeight) return fallbackMonthly * platformWeight * typeWeight;
    return null;
  });
  return v == null ? null : { value: v, fromOverride };
}

/**
 * Returns the pacing-mode key for a channel ("monthlyTarget", "sendAllotment",
 * or "creditAllotment"), or null if the channel has no pacing mode.
 * Used by the Settings page to know which override key to write into the
 * budget store.
 */
export function getChannelPacingKey(channel) {
  const config = CHANNEL_CONFIG.find((c) => c.name === channel);
  switch (config?.mode) {
    case "credits": return "creditAllotment";
    case "sends":   return "sendAllotment";
    case "spend":   return "monthlyTarget";
    default:        return null;
  }
}

/**
 * Default (config-level) pacing target. Always null now — operator-entered
 * only. Kept exported for callers that may still want to reference it.
 */
export function getChannelPacingDefault(_channel) {
  return null;
}

// ─── Revenue Goals (period-aware) ────────────────────────────────────────

/**
 * Returns the resolved revenue goal for (channel, [start, end]) pro-rated by
 * each month's overlap with the date range. Pass `TOTAL_KEY` (or null/undefined,
 * which short-circuits to TOTAL_KEY) to resolve the company-total goal.
 * Returns null if no goal is set at any layer for the period.
 */
export function getRevenueGoalForRange(channel, start, end, goals = {}) {
  const key = channel || TOTAL_KEY;
  return proratePeriod(start, end, (yyyymm) => resolveGoalForMonth(goals, key, yyyymm));
}

/**
 * Returns { goal, current, pct, hasGoal, days } for the queried channel
 * (or company total) over the period. `current` should be the actual
 * revenue from the date range — caller passes it in (we don't compute it
 * from mock data here to keep the helper pure).
 */
export function getRevenueGoalPacing(channel, start, end, goals, currentRevenue) {
  const goal = getRevenueGoalForRange(channel, start, end, goals);
  const days = differenceInCalendarDays(end, start) + 1;
  if (goal == null) {
    return { hasGoal: false, goal: null, current: currentRevenue, pct: null, days };
  }
  const pct = goal > 0 ? Math.round((currentRevenue / goal) * 100) : null;
  return { hasGoal: true, goal: Math.round(goal), current: currentRevenue, pct, days };
}

/** @deprecated use getChannelPacing instead — kept for backward compat. */
export function getChannelTarget(channel, start, end) {
  const p = getChannelPacing(channel, start, end);
  return {
    target: p.mode === "spend" ? p.target : null,
    monthlyTarget: p.monthlyTotal,
    days: p.days,
    hasTarget: p.hasTarget && p.mode === "spend",
  };
}

/**
 * Names of all configured channels (for default filter state).
 */
export const ALL_CHANNEL_NAMES = CHANNEL_CONFIG.map((c) => c.name);

/**
 * Channels that expand on the Channels-tab chevron (have platforms or flows).
 */
export const CHANNELS_WITH_EXPANSION = CHANNEL_CONFIG
  .filter((c) => c.platforms?.length || c.flows?.length)
  .map((c) => c.name);

/** @deprecated keep for callers still importing — same set. */
export const CHANNELS_WITH_CAMPAIGNS = CHANNELS_WITH_EXPANSION;

/**
 * Returns the platform list (with default weights) for a channel, or [] if
 * the channel has no platform breakdown.
 */
export function getChannelPlatforms(channel) {
  const config = CHANNEL_CONFIG.find((c) => c.name === channel);
  return config?.platforms || [];
}

/**
 * Returns the platform's default weight on the channel (0 if not found).
 */
export function getPlatformWeight(channel, platform) {
  const platforms = getChannelPlatforms(channel);
  return platforms.find((p) => p.name === platform)?.weight ?? 0;
}

/**
 * Returns the channel config snapshot — useful for components that need to
 * iterate platforms or read mode in one shot.
 */
export function getChannelConfig(channel) {
  return CHANNEL_CONFIG.find((c) => c.name === channel) || null;
}

// ---------------------------------------------------------------------------
// Legacy helpers (backward compat)
// ---------------------------------------------------------------------------
export function getFilteredData(days = 30) { return getDataForRange(subDays(TODAY, days - 1), TODAY); }
export function getKPIs(days = 30) { return getKPIsForRange(subDays(TODAY, days - 1), TODAY, subDays(TODAY, days * 2 - 1), subDays(TODAY, days)); }
export function getChannelSummary(days = 30) { return getChannelSummaryForRange(subDays(TODAY, days - 1), TODAY); }
export function getDailyChannelData(days = 30) { return getDailyChannelDataForRange(subDays(TODAY, days - 1), TODAY); }
export function getSparklineData(days = 30, metric = "revenue") { return getSparklineDataForRange(subDays(TODAY, days - 1), TODAY, metric); }
export function getPriorFilteredData(days = 30) { return getDataForRange(subDays(TODAY, days * 2 - 1), subDays(TODAY, days)); }
export function getPriorDailyChannelData(days = 30) { return getDailyChannelDataForRange(subDays(TODAY, days * 2 - 1), subDays(TODAY, days)); }
export function getProducts() { return products; }
export function getCohortData() { return cohortData; }

// ===========================================================================
// V2 DATA GENERATORS — Efficiency, Incrementality, MMM, Creative, Cohorts, Tracking
// ===========================================================================

// ── MER / Efficiency ──────────────────────────────────────────────────────

/**
 * Daily MER data: merges daily revenue + spend from channels.
 */
function generateDailyMER() {
  const map = {};
  dailyData.forEach((d) => { map[d.dateStr] = { date: d.date, dateStr: d.dateStr, revenue: d.revenue, newCustomerRevenue: d.revenue * (d.newCustomers / (d.newCustomers + d.returningCustomers || 1)), orders: d.orders, newCustomers: d.newCustomers }; });
  channelData.forEach((c) => {
    if (map[c.dateStr] && c.spend) {
      if (!map[c.dateStr].spend) map[c.dateStr].spend = 0;
      map[c.dateStr].spend += c.spend;
    }
  });
  return Object.values(map).sort((a, b) => a.date - b.date).map((d) => ({
    ...d,
    spend: d.spend || 0,
    mer: d.spend > 0 ? Math.round((d.revenue / d.spend) * 100) / 100 : null,
    ncMer: d.spend > 0 ? Math.round((d.newCustomerRevenue / d.spend) * 100) / 100 : null,
    cac: d.newCustomers > 0 ? Math.round((d.spend / d.newCustomers) * 100) / 100 : null,
  }));
}

export const dailyMERData = generateDailyMER();

export function getMERDataForRange(start, end) {
  const s = startOfDay(start).getTime(), e = startOfDay(end).getTime();
  return dailyMERData.filter((d) => d.date.getTime() >= s && d.date.getTime() <= e);
}

export function getMERKPIs(start, end) {
  const data = getMERDataForRange(start, end);
  const totalRev = data.reduce((s, d) => s + d.revenue, 0);
  const totalSpend = data.reduce((s, d) => s + d.spend, 0);
  const totalNCRev = data.reduce((s, d) => s + d.newCustomerRevenue, 0);
  const totalNC = data.reduce((s, d) => s + d.newCustomers, 0);
  return {
    mer: totalSpend > 0 ? Math.round((totalRev / totalSpend) * 100) / 100 : null,
    ncMer: totalSpend > 0 ? Math.round((totalNCRev / totalSpend) * 100) / 100 : null,
    cac: totalNC > 0 ? Math.round((totalSpend / totalNC) * 100) / 100 : null,
    ncRoas: totalSpend > 0 ? Math.round((totalNCRev / totalSpend) * 100) / 100 : null,
    spendPctOfRev: totalRev > 0 ? Math.round((totalSpend / totalRev) * 10000) / 100 : 0,
    totalSpend: Math.round(totalSpend),
    totalRevenue: Math.round(totalRev),
    newCustomerRevenueTotal: Math.round(totalNCRev),
  };
}

export function getEfficiencyByChannel(start, end) {
  const s = startOfDay(start).getTime(), e = startOfDay(end).getTime();
  const filtered = channelData.filter((c) => c.date.getTime() >= s && c.date.getTime() <= e);
  const daily = filterByRange(dailyData, start, end);
  const totals = {};
  filtered.forEach((c) => {
    if (!totals[c.channel]) totals[c.channel] = { channel: c.channel, spend: 0, revenue: 0, orders: 0, ncRevenue: 0 };
    const t = totals[c.channel];
    t.spend += c.spend || 0;
    t.revenue += c.revenue;
    t.orders += c.orders;
    const dayData = daily.find((d) => d.dateStr === c.dateStr);
    const ncRate = dayData ? dayData.newCustomers / (dayData.orders || 1) : 0.5;
    t.ncRevenue += c.revenue * ncRate;
  });
  return Object.values(totals).map((t) => ({
    ...t,
    spend: Math.round(t.spend),
    revenue: Math.round(t.revenue),
    mer: t.spend > 0 ? Math.round((t.revenue / t.spend) * 100) / 100 : null,
    cac: t.orders > 0 && t.spend > 0 ? Math.round((t.spend / (t.orders * 0.5)) * 100) / 100 : null,
    ncRevenue: Math.round(t.ncRevenue),
    ncRoas: t.spend > 0 ? Math.round((t.ncRevenue / t.spend) * 100) / 100 : null,
    platformRoas: t.spend > 0 ? Math.round(((t.revenue / t.spend) * randomBetween(t.channel.length * 7, 1.1, 1.4)) * 100) / 100 : null,
  }));
}

// ── Incrementality Tests ──────────────────────────────────────────────────

function generateIncrementalityTests() {
  const channels = ["Paid Search", "Paid Social", "Email"];
  const statuses = ["Completed", "Running", "Completed"];
  return channels.map((ch, i) => {
    const seed = i * 71 + 13;
    const testRevenue = Math.round(randomBetween(seed, 80000, 200000));
    const controlRevenue = Math.round(randomBetween(seed + 1, 50000, 120000));
    const lift = Math.round(((testRevenue - controlRevenue) / controlRevenue) * 10000) / 100;
    const testOrders = Math.round(testRevenue / randomBetween(seed + 2, 80, 130));
    const controlOrders = Math.round(controlRevenue / randomBetween(seed + 3, 80, 130));
    const incrementalRevenue = testRevenue - controlRevenue;
    const spend = Math.round(randomBetween(seed + 4, 15000, 50000));
    return {
      id: `test-${i + 1}`,
      channel: ch,
      status: statuses[i],
      startDate: format(subDays(TODAY, 60 - i * 15), "MMM d, yyyy"),
      endDate: statuses[i] === "Running" ? "Ongoing" : format(subDays(TODAY, 15 - i * 5), "MMM d, yyyy"),
      testGroup: { revenue: testRevenue, orders: testOrders, conversion: Math.round(randomBetween(seed + 5, 3, 5.5) * 100) / 100 },
      controlGroup: { revenue: controlRevenue, orders: controlOrders, conversion: Math.round(randomBetween(seed + 6, 2, 4) * 100) / 100 },
      lift,
      confidence: Math.round(randomBetween(seed + 7, 88, 99) * 10) / 10,
      pValue: Math.round(randomBetween(seed + 8, 0.001, 0.05) * 1000) / 1000,
      incrementalRevenue,
      spend,
      iRoas: spend > 0 ? Math.round((incrementalRevenue / spend) * 100) / 100 : null,
      incrementalPct: Math.round((incrementalRevenue / testRevenue) * 10000) / 100,
    };
  });
}

export const incrementalityTests = generateIncrementalityTests();

// Calibration factors — how much each platform over-reports
export const calibrationFactors = [
  { channel: "Meta Ads", platformMultiplier: 1.0, actualMultiplier: 0.62, factor: 0.62, confidence: "High", lastCalibrated: "Mar 15, 2026", source: "Geo-Lift Test" },
  { channel: "Google Ads", platformMultiplier: 1.0, actualMultiplier: 0.78, factor: 0.78, confidence: "High", lastCalibrated: "Feb 28, 2026", source: "Geo-Lift Test" },
  { channel: "TikTok Ads", platformMultiplier: 1.0, actualMultiplier: 0.45, factor: 0.45, confidence: "Medium", lastCalibrated: "Jan 20, 2026", source: "Holdout Test" },
  { channel: "Email (Klaviyo)", platformMultiplier: 1.0, actualMultiplier: 0.91, factor: 0.91, confidence: "High", lastCalibrated: "Mar 1, 2026", source: "Holdout Test" },
];

// Experiment recommendations
export const experimentRecommendations = [
  { id: "rec-1", channel: "TikTok Ads", reason: "Calibration is 3 months stale — factor may have shifted after creative refresh", priority: "High", type: "Geo-Lift", estDuration: "4 weeks", estBudget: "$8,000" },
  { id: "rec-2", channel: "Paid Search (Brand)", reason: "No incrementality test run — brand search often has low true incrementality", priority: "High", type: "Holdout", estDuration: "2 weeks", estBudget: "$3,000" },
  { id: "rec-3", channel: "Influencer", reason: "Channel added 6 weeks ago with no measurement — model relies on correlation only", priority: "Medium", type: "Time Test", estDuration: "3 weeks", estBudget: "$5,000" },
  { id: "rec-4", channel: "Meta (Upper Funnel)", reason: "Current test only covers conversion campaigns — awareness campaigns untested", priority: "Medium", type: "Geo-Lift", estDuration: "6 weeks", estBudget: "$12,000" },
  { id: "rec-5", channel: "Direct Mail", reason: "Offline channel with no digital tracking — geo test is the only viable approach", priority: "Low", type: "Fixed Geo", estDuration: "4 weeks", estBudget: "$6,000" },
];

// Saved budget scenarios for MMM
export const savedScenarios = [
  { id: "s-1", name: "Current Plan", allocations: { "Paid Search": 52500, "Paid Social": 45000, "Email": 22500, "Influencer": 15000, "Display": 15000 }, projectedRevenue: 612000, projectedRoas: 4.08, createdAt: "Mar 25, 2026" },
  { id: "s-2", name: "Scale Social +20%", allocations: { "Paid Search": 48000, "Paid Social": 54000, "Email": 22500, "Influencer": 15000, "Display": 10500 }, projectedRevenue: 635000, projectedRoas: 4.23, createdAt: "Mar 26, 2026" },
  { id: "s-3", name: "Cut Display, Boost Email", allocations: { "Paid Search": 52500, "Paid Social": 45000, "Email": 37500, "Influencer": 15000, "Display": 0 }, projectedRevenue: 648000, projectedRoas: 4.32, createdAt: "Mar 27, 2026" },
];

export function getIncrementalWaterfall() {
  const baseline = Math.round(randomBetween(999, 120000, 200000));
  return [
    { name: "Organic Baseline", value: baseline, fill: "#6b7280" },
    ...incrementalityTests.map((t, i) => ({
      name: t.channel,
      value: t.incrementalRevenue,
      fill: ["#43a9df", "#8e68ad", "#c2dcd4"][i],
    })),
  ];
}

export function getChannelIncrementalityScores() {
  return ["Paid Search", "Paid Social", "Email", "Organic", "Direct"].map((ch, i) => {
    const seed = i * 61 + 17;
    return { channel: ch, score: Math.round(randomBetween(seed, i < 3 ? 40 : 10, i < 3 ? 95 : 35)) };
  });
}

// ── Media Mix Model ───────────────────────────────────────────────────────

function generateMMMData() {
  const channels = [
    { name: "Paid Search", currentPct: 0.35, optimalPct: 0.28, saturation: 0.7, color: "#43a9df" },
    { name: "Paid Social", currentPct: 0.30, optimalPct: 0.35, saturation: 0.55, color: "#8e68ad" },
    { name: "Email", currentPct: 0.15, optimalPct: 0.20, saturation: 0.4, color: "#c2dcd4" },
    { name: "Influencer", currentPct: 0.10, optimalPct: 0.12, saturation: 0.3, color: "#34d399" },
    { name: "Display", currentPct: 0.10, optimalPct: 0.05, saturation: 0.85, color: "#fbbf24" },
  ];

  const totalBudget = 150000;

  const responseCurves = channels.map((ch) => {
    const points = [];
    for (let spend = 0; spend <= totalBudget * 0.6; spend += 1000) {
      const k = 1 / (ch.saturation * totalBudget * ch.currentPct * 2);
      const revenue = (ch.currentPct * totalBudget * 4) * (1 - Math.exp(-k * spend));
      points.push({ spend, revenue: Math.round(revenue) });
    }
    return { channel: ch.name, color: ch.color, points };
  });

  const adstockCurves = channels.map((ch, i) => {
    const decayRate = 0.5 + i * 0.1;
    const points = [];
    for (let day = 0; day <= 14; day++) {
      points.push({ day, effect: Math.round(Math.exp(-decayRate * day) * 10000) / 100 });
    }
    return { channel: ch.name, color: ch.color, points };
  });

  return {
    channels: channels.map((ch) => ({
      ...ch,
      currentSpend: Math.round(totalBudget * ch.currentPct),
      optimalSpend: Math.round(totalBudget * ch.optimalPct),
      marginalRoas: Math.round(randomBetween(ch.name.length * 3, 1.5, 5.5) * 100) / 100,
    })),
    totalBudget,
    responseCurves,
    adstockCurves,
  };
}

export const mmmData = generateMMMData();

export function simulateBudget(allocations) {
  let totalRevenue = 0;
  const results = mmmData.channels.map((ch) => {
    const spend = allocations[ch.name] || ch.currentSpend;
    const k = 1 / (ch.saturation * mmmData.totalBudget * ch.currentPct * 2);
    const revenue = Math.round((ch.currentPct * mmmData.totalBudget * 4) * (1 - Math.exp(-k * spend)));
    totalRevenue += revenue;
    return { channel: ch.name, spend, revenue, roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0 };
  });
  const totalSpend = results.reduce((s, r) => s + r.spend, 0);
  return { results, totalRevenue, totalSpend, blendedRoas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0 };
}

// ── Creative Analytics ────────────────────────────────────────────────────

function generateCreativeData() {
  const names = [
    "Summer Vibes UGC", "Product Showcase Reel", "Lifestyle Carousel", "Flash Sale Banner",
    "Testimonial Cut", "Before/After Split", "Unboxing Video", "BOGO Static",
    "Influencer Collab", "Retargeting Dynamic", "New Arrival Story", "Holiday Collection",
    "Founder's Message", "How-To Tutorial", "Limited Drop Teaser", "Bundle Deal Carousel",
  ];
  const platforms = ["Meta", "Meta", "Meta", "Google", "TikTok", "Meta", "TikTok", "Google", "TikTok", "Meta", "Meta", "Google", "Meta", "TikTok", "Meta", "Google"];
  const formats = ["Video", "Video", "Carousel", "Image", "Video", "Image", "Video", "Image", "Video", "Carousel", "Video", "Image", "Video", "Video", "Video", "Carousel"];

  return names.map((name, i) => {
    const seed = i * 47 + 23;
    const spend = Math.round(randomBetween(seed, 500, 12000));
    const impressions = Math.round(randomBetween(seed + 1, spend * 30, spend * 80));
    const clicks = Math.round(impressions * randomBetween(seed + 2, 0.008, 0.04));
    const purchases = Math.round(clicks * randomBetween(seed + 3, 0.02, 0.12));
    const revenue = Math.round(purchases * randomBetween(seed + 4, 45, 160));
    const thumbstopRate = Math.round(randomBetween(seed + 5, 15, 55) * 10) / 10;

    const fatigueData = [];
    for (let d = 0; d < 30; d++) {
      const baseCTR = clicks / impressions * 100;
      const decay = baseCTR * Math.exp(-0.03 * d) * (1 + randomBetween(seed + d, -0.15, 0.15));
      fatigueData.push({ day: d + 1, ctr: Math.round(decay * 1000) / 1000 });
    }

    // Motion-style tags
    const hookStyles = ["UGC", "Product Demo", "Testimonial", "Problem/Solution", "Lifestyle", "Before/After", "Unboxing", "Tutorial"];
    const angles = ["Social Proof", "FOMO/Urgency", "Educational", "Aspirational", "Price/Value", "Feature Highlight", "Emotional", "Authority"];
    const talents = ["Female Creator", "Male Creator", "No Talent", "Founder", "Influencer", "Customer"];
    const funnels = ["TOF", "MOF", "BOF", "TOF", "MOF", "BOF", "TOF", "MOF"];

    const hookStyle = hookStyles[i % hookStyles.length];
    const angle = angles[i % angles.length];
    const talent = talents[i % talents.length];
    const funnel = funnels[i % funnels.length];

    // Creative scorecard: Hook → Watch → Click → Convert
    const hookScore = Math.round(thumbstopRate); // 0-100 based on thumbstop
    const watchScore = Math.round(randomBetween(seed + 20, 20, 65));
    const clickScore = Math.round(randomBetween(seed + 21, 15, 55));
    const convertScore = purchases > 0 ? Math.min(100, Math.round((purchases / clicks) * 500)) : 0;

    // Video retention curve (10 points: 0%, 10%, 20%... 90% of video)
    const retentionCurve = [];
    let retPct = 100;
    for (let r = 0; r <= 9; r++) {
      retentionCurve.push({ pct: r * 10, retained: Math.round(retPct * 10) / 10 });
      retPct *= randomBetween(seed + r + 30, 0.72, 0.92);
    }

    // Launch date (days ago)
    const launchedDaysAgo = Math.round(randomBetween(seed + 40, 1, 45));
    const isRecent = launchedDaysAgo <= 7;

    return {
      id: `cr-${i + 1}`,
      thumbnail: (i % 8) + 1,
      name,
      platform: platforms[i],
      format: formats[i],
      spend,
      impressions,
      clicks,
      ctr: Math.round((clicks / impressions) * 10000) / 100,
      purchases,
      revenue,
      roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
      cpa: purchases > 0 ? Math.round((spend / purchases) * 100) / 100 : 0,
      thumbstopRate,
      fatigueData,
      color: ["#43a9df", "#8e68ad", "#c2dcd4", "#34d399", "#fbbf24", "#f87171"][i % 6],
      hookStyle,
      angle,
      talent,
      funnel,
      scorecard: { hook: hookScore, watch: watchScore, click: clickScore, convert: convertScore },
      retentionCurve,
      launchedDaysAgo,
      isRecent,
    };
  });
}

export const creativeData = generateCreativeData();
export function getCreatives() { return creativeData; }

// ── Creative A/B Tests ────────────────────────────────────────────────────

export const creativeTests = [
  { id: "ct-1", name: "UGC vs Studio", control: { creative: "Testimonial Cut", roas: 3.4, cpa: 28.50, ctr: 2.1, spend: 4200, revenue: 14280, impressions: 210000 }, variant: { creative: "Product Showcase Reel", roas: 2.1, cpa: 42.10, ctr: 1.6, spend: 4200, revenue: 8820, impressions: 195000 }, status: "Winner", winner: "control", daysRunning: 14, significance: 96.2 },
  { id: "ct-2", name: "Hook Test: Question vs Statement", control: { creative: "Flash Sale Banner", roas: 2.8, cpa: 35.20, ctr: 1.9, spend: 3100, revenue: 8680, impressions: 163000 }, variant: { creative: "Limited Drop Teaser", roas: 3.6, cpa: 26.80, ctr: 2.5, spend: 3100, revenue: 11160, impressions: 172000 }, status: "Winner", winner: "variant", daysRunning: 10, significance: 92.8 },
  { id: "ct-3", name: "Founder vs Influencer", control: { creative: "Founder's Message", roas: 2.2, cpa: 44.50, ctr: 1.4, spend: 2800, revenue: 6160, impressions: 142000 }, variant: { creative: "Influencer Collab", roas: 2.5, cpa: 38.90, ctr: 1.8, spend: 2800, revenue: 7000, impressions: 156000 }, status: "Needs Data", winner: null, daysRunning: 5, significance: 68.4 },
  { id: "ct-4", name: "Carousel vs Video", control: { creative: "Lifestyle Carousel", roas: 1.9, cpa: 51.20, ctr: 1.2, spend: 3500, revenue: 6650, impressions: 178000 }, variant: { creative: "Summer Vibes UGC", roas: 3.8, cpa: 24.10, ctr: 2.4, spend: 3500, revenue: 13300, impressions: 204000 }, status: "Winner", winner: "variant", daysRunning: 12, significance: 98.1 },
  { id: "ct-5", name: "Before/After vs How-To", control: { creative: "Before/After Split", roas: 2.6, cpa: 37.80, ctr: 1.7, spend: 1900, revenue: 4940, impressions: 112000 }, variant: { creative: "How-To Tutorial", roas: 2.4, cpa: 40.20, ctr: 1.5, spend: 1900, revenue: 4560, impressions: 105000 }, status: "No Winner", winner: null, daysRunning: 14, significance: 54.2 },
];

// ── Copy / Headline Performance ───────────────────────────────────────────

export const copyVariants = [
  { id: "cp-1", type: "Headline", text: "Your morning routine is missing this", impressions: 245000, ctr: 2.8, roas: 4.1, spend: 8200 },
  { id: "cp-2", type: "Headline", text: "Why 10,000+ customers switched", impressions: 198000, ctr: 2.4, roas: 3.6, spend: 7100 },
  { id: "cp-3", type: "Headline", text: "Limited drop — selling fast", impressions: 167000, ctr: 3.1, roas: 3.2, spend: 5400 },
  { id: "cp-4", type: "Headline", text: "The only [product] you'll ever need", impressions: 142000, ctr: 1.9, roas: 2.8, spend: 6300 },
  { id: "cp-5", type: "Headline", text: "Free shipping ends tonight", impressions: 134000, ctr: 3.4, roas: 2.5, spend: 4800 },
  { id: "cp-6", type: "Primary Text", text: "I was skeptical at first, but after 30 days I'm never going back. Here's what changed...", impressions: 312000, ctr: 2.2, roas: 3.9, spend: 9400 },
  { id: "cp-7", type: "Primary Text", text: "Stop overpaying for [category]. We make the same quality at half the price.", impressions: 278000, ctr: 2.6, roas: 3.4, spend: 8100 },
  { id: "cp-8", type: "Primary Text", text: "Our founder built this because nothing else worked. 50,000 five-star reviews later...", impressions: 245000, ctr: 1.8, roas: 4.2, spend: 7200 },
  { id: "cp-9", type: "Primary Text", text: "Join the waitlist — last drop sold out in 4 hours", impressions: 189000, ctr: 3.5, roas: 2.9, spend: 5600 },
  { id: "cp-10", type: "CTA", text: "Shop Now", impressions: 520000, ctr: 2.1, roas: 3.1, spend: 14200 },
  { id: "cp-11", type: "CTA", text: "Get Yours", impressions: 480000, ctr: 2.4, roas: 3.5, spend: 13800 },
  { id: "cp-12", type: "CTA", text: "Try Risk-Free", impressions: 390000, ctr: 2.8, roas: 3.8, spend: 11200 },
];

// ── Audience × Creative Matrix ────────────────────────────────────────────

export const audienceCreativeMatrix = {
  audiences: ["Prospecting LAL", "Prospecting Interest", "Retargeting 7d", "Retargeting 30d", "Broad"],
  creatives: ["Summer Vibes UGC", "Product Showcase Reel", "Testimonial Cut", "Flash Sale Banner", "Influencer Collab", "How-To Tutorial"],
  data: [
    [3.8, 2.1, 4.2, 2.8, 3.1, 1.9],
    [3.2, 1.8, 3.5, 2.4, 2.7, 2.2],
    [1.4, 3.9, 1.8, 4.5, 1.2, 3.2],
    [1.8, 3.2, 2.1, 3.8, 1.5, 2.8],
    [4.1, 2.4, 3.8, 2.2, 3.5, 2.0],
  ],
};

// ── Retention Cohorts ─────────────────────────────────────────────────────

function generateRetentionCohorts() {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const cohortDate = new Date(2026, 2 - i, 1);
    const label = format(cohortDate, "MMM yyyy");
    const seed = i * 31 + 5;
    const size = Math.round(randomBetween(seed, 800, 2500));
    const monthsAvailable = Math.min(12 - i, 12);

    const retention = [100];
    const revenue = [Math.round(size * randomBetween(seed + 1, 45, 85))];
    const cumulativeLtv = [Math.round(revenue[0] / size * 100) / 100];

    for (let m = 1; m < monthsAvailable; m++) {
      const prevRate = retention[m - 1];
      const dropoff = randomBetween(seed + m * 3, 0.6, 0.85);
      const rate = Math.round(prevRate * dropoff * 10) / 10;
      retention.push(rate);
      const mRev = Math.round(size * (rate / 100) * randomBetween(seed + m * 3 + 1, 30, 70));
      revenue.push(mRev);
      cumulativeLtv.push(Math.round((cumulativeLtv[m - 1] + mRev / size) * 100) / 100);
    }

    months.push({ month: label, size, retention, revenue, cumulativeLtv, monthsAvailable });
  }
  return months;
}

export const retentionCohorts = generateRetentionCohorts();

export function getPaybackPeriod() {
  const avgCAC = getMERKPIs(subDays(TODAY, 89), TODAY).cac || 30;
  for (const cohort of retentionCohorts) {
    for (let m = 0; m < cohort.cumulativeLtv.length; m++) {
      if (cohort.cumulativeLtv[m] >= avgCAC) return m + 1;
    }
  }
  return retentionCohorts[0]?.cumulativeLtv.length || 6;
}

// ── Tracking Health ───────────────────────────────────────────────────────

function generateTrackingHealth() {
  const events = [
    { event: "Purchase", matchRate: 94.2, serverSide: 96.1, browser: 88.5 },
    { event: "AddToCart", matchRate: 89.7, serverSide: 92.3, browser: 82.1 },
    { event: "ViewContent", matchRate: 85.3, serverSide: 88.9, browser: 76.4 },
    { event: "InitiateCheckout", matchRate: 91.5, serverSide: 94.0, browser: 84.8 },
  ];

  const platforms = [
    { platform: "Meta Ads", platformRevenue: 245000, lucernaRevenue: 198000 },
    { platform: "Google Ads", platformRevenue: 178000, lucernaRevenue: 162000 },
    { platform: "TikTok Ads", platformRevenue: 95000, lucernaRevenue: 72000 },
    { platform: "Email (Klaviyo)", platformRevenue: 88000, lucernaRevenue: 85000 },
  ].map((p) => ({
    ...p,
    delta: Math.round(((p.platformRevenue - p.lucernaRevenue) / p.lucernaRevenue) * 10000) / 100,
    status: ((p.platformRevenue - p.lucernaRevenue) / p.lucernaRevenue) > 0.15 ? "Critical" : ((p.platformRevenue - p.lucernaRevenue) / p.lucernaRevenue) > 0.05 ? "Warning" : "Good",
  }));

  const overallScore = Math.round(events.reduce((s, e) => s + e.matchRate, 0) / events.length);

  const attributedPct = 78.5;

  const dailyMatchRate = [];
  for (let i = 29; i >= 0; i--) {
    const seed = i * 19 + 7;
    dailyMatchRate.push({
      date: subDays(TODAY, i),
      dateStr: format(subDays(TODAY, i), "yyyy-MM-dd"),
      matchRate: Math.round((overallScore + randomBetween(seed, -3, 3)) * 10) / 10,
    });
  }

  const utmCoverage = [
    { channel: "Paid Search", coverage: 97.2 },
    { channel: "Paid Social", coverage: 94.8 },
    { channel: "Email", coverage: 99.1 },
    { channel: "Organic", coverage: 12.3 },
    { channel: "Direct", coverage: 0 },
  ];

  return { events, platforms, overallScore, attributedPct, dailyMatchRate, utmCoverage };
}

export const trackingHealth = generateTrackingHealth();

// ===========================================================================
// V3 DATA GENERATORS — Forecasting, Geo, Profitability, Inventory,
//                       Subscriptions, Competitive, Alerts, Reports
// ===========================================================================

// ── Forecasting & Pacing ──────────────────────────────────────────────────

export function getForecastingData(start, end, budgets = {}) {
  const data = filterByRange(dailyData, start, end);
  const totalRev = data.reduce((s, d) => s + d.revenue, 0);
  const totalSpend = dailyMERData.filter((d) => d.date >= startOfDay(start) && d.date <= startOfDay(end)).reduce((s, d) => s + d.spend, 0);
  const daysElapsed = data.length;
  const dailyAvgRev = daysElapsed > 0 ? totalRev / daysElapsed : 0;
  const dailyAvgSpend = daysElapsed > 0 ? totalSpend / daysElapsed : 0;

  const monthTarget = 420000;
  // Operator-set spend budget: sum the period spend budgets across spend-mode
  // channels (Paid Search/Social/Other Paid). Falls back to a synthetic default
  // when nothing is configured so the page still renders.
  const operatorSpendBudget = (() => {
    if (!budgets || typeof budgets !== "object") return null;
    const spendChannels = CHANNEL_CONFIG.filter((c) => c.mode === "spend").map((c) => c.name);
    let total = 0;
    let anyResolved = false;
    for (const ch of spendChannels) {
      const p = getChannelPacing(ch, start, end, budgets);
      if (p.hasTarget && p.target != null) {
        total += p.target;
        anyResolved = true;
      }
    }
    return anyResolved ? Math.round(total) : null;
  })();
  const spendBudget = operatorSpendBudget ?? 110000;
  const spendBudgetIsOperatorSet = operatorSpendBudget != null;
  const daysInMonth = 30;
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);
  const projectedRev = totalRev + dailyAvgRev * daysRemaining;
  const projectedSpend = totalSpend + dailyAvgSpend * daysRemaining;
  const requiredDailyRev = daysRemaining > 0 ? (monthTarget - totalRev) / daysRemaining : 0;
  const requiredDailySpend = daysRemaining > 0 ? Math.max(0, (spendBudget - totalSpend) / daysRemaining) : 0;
  const expectedPacePct = daysInMonth > 0 ? Math.round((Math.min(daysElapsed, daysInMonth) / daysInMonth) * 100) : 0;

  const cumulative = [];
  let runningRev = 0, runningSpend = 0;
  data.forEach((d, i) => {
    const merDay = dailyMERData.find((m) => m.dateStr === d.dateStr);
    runningRev += d.revenue;
    runningSpend += merDay?.spend || 0;
    const isLastActual = i === data.length - 1;
    cumulative.push({
      day: i + 1,
      dateStr: d.dateStr,
      revenue: Math.round(runningRev),
      spend: Math.round(runningSpend),
      target: Math.round(monthTarget * ((i + 1) / daysInMonth)),
      spendBudget: Math.round(spendBudget * ((i + 1) / daysInMonth)),
      // Forecast line only draws from today forward; the "today" row is the
      // anchor so the dashed projection visually connects to actual.
      forecastRev: isLastActual ? Math.round(runningRev) : null,
      forecastSpend: isLastActual ? Math.round(runningSpend) : null,
    });
  });
  for (let d = daysElapsed + 1; d <= daysInMonth; d++) {
    const projRev = Math.round(totalRev + dailyAvgRev * (d - daysElapsed));
    const projSpend = Math.round(totalSpend + dailyAvgSpend * (d - daysElapsed));
    cumulative.push({
      day: d,
      dateStr: `proj-${d}`,
      revenue: null,
      spend: null,
      target: Math.round(monthTarget * (d / daysInMonth)),
      spendBudget: Math.round(spendBudget * (d / daysInMonth)),
      forecastRev: projRev,
      forecastSpend: projSpend,
      projected: true,
    });
  }

  // Weekly forecast: keep the existing 4-row structure but add target/pacing
  // columns derived from monthTarget so it actually behaves like a forecast.
  const weekly = [];
  const weekTargetEven = monthTarget / 4;
  const weekBudgetEven = spendBudget / 4;
  for (let w = 0; w < 4; w++) {
    const seed = w * 29 + 11;
    const weekRev = Math.round(dailyAvgRev * 7 * randomBetween(seed, 0.9, 1.15));
    const weekOrders = Math.round(weekRev / randomBetween(seed + 1, 100, 130));
    const weekSpend = Math.round(dailyAvgSpend * 7 * randomBetween(seed + 2, 0.9, 1.1));
    const target = Math.round(weekTargetEven);
    const budget = Math.round(weekBudgetEven);
    weekly.push({
      week: `Week ${w + 1}`,
      revenue: weekRev,
      orders: weekOrders,
      spend: weekSpend,
      mer: weekSpend > 0 ? Math.round((weekRev / weekSpend) * 100) / 100 : null,
      target,
      budget,
      pacingPct: target > 0 ? Math.round((weekRev / target) * 10000) / 100 : 0,
    });
  }

  // Per-channel daily revenue series for sparkline + days-off-pace columns.
  // Targets use each channel's CHANNEL_CONFIG share so they're calibrated to
  // the same revenue distribution that drives the daily channel rows; without
  // that calibration every channel runs slightly behind its target every day
  // and daysOffPace collapses to "all days for everyone."
  const dailyChannelRows = getDailyChannelDataForRange(start, end);
  const channelNames = ["Paid Search", "Paid Social", "Email", "Organic", "Direct"];
  const channelPacing = channelNames.map((ch) => {
    const cfg = CHANNEL_CONFIG.find((c) => c.name === ch);
    const share = cfg?.share ?? 0.1;
    const target = Math.round(monthTarget * share);
    const dailyTargetEven = target / daysInMonth;

    let runningChannelRev = 0;
    let actualPeriod = 0;
    let daysOffPace = 0;
    const dailySeries = dailyChannelRows.map((row, dayIdx) => {
      const dayRev = Number(row[ch] || 0);
      runningChannelRev += dayRev;
      actualPeriod += dayRev;
      const expectedByNow = dailyTargetEven * (dayIdx + 1);
      if (runningChannelRev < expectedByNow) daysOffPace += 1;
      return {
        dateStr: row.dateStr,
        revenue: Math.round(dayRev),
        target: Math.round(dailyTargetEven),
      };
    });

    const actual = Math.round(actualPeriod);
    return {
      channel: ch,
      target,
      actual,
      pct: target > 0 ? Math.round((actual / target) * 10000) / 100 : 0,
      dailySeries,
      daysOffPace,
    };
  });

  // YoY shadow series: cumulative revenue from the same dates one year ago.
  // Used by the Revenue Pacing chart as a faint comparison line. We project
  // forward through projected days using the prior-year actuals (still real).
  const yoyByDay = [];
  let yoyRunning = 0;
  data.forEach((d) => {
    const yoyDate = subYears(d.date, 1);
    const match = dailyData.find((x) => x.dateStr === format(yoyDate, "yyyy-MM-dd"));
    yoyRunning += match?.revenue || 0;
    yoyByDay.push(Math.round(yoyRunning));
  });
  // Continue past today so the YoY line spans the full month.
  for (let i = daysElapsed; i < daysInMonth; i++) {
    const baseDate = data[data.length - 1]?.date || new Date(end);
    const futureDate = new Date(baseDate);
    futureDate.setDate(futureDate.getDate() + (i - daysElapsed + 1));
    const yoyDate = subYears(futureDate, 1);
    const match = dailyData.find((x) => x.dateStr === format(yoyDate, "yyyy-MM-dd"));
    yoyRunning += match?.revenue || 0;
    yoyByDay.push(Math.round(yoyRunning));
  }
  // Stitch YoY into cumulative rows for chart consumption.
  cumulative.forEach((row, i) => {
    row.yoy = yoyByDay[i] ?? null;
  });

  // Daily volatility for forecast confidence band: σ of last min(14, daysElapsed)
  // days' daily revenue. Cumulative band over `k` future days ≈ σ × √k.
  const tailLen = Math.min(14, data.length);
  const tail = data.slice(-tailLen).map((d) => d.revenue);
  const tailMean = tail.length ? tail.reduce((s, v) => s + v, 0) / tail.length : 0;
  const tailVar = tail.length
    ? tail.reduce((s, v) => s + Math.pow(v - tailMean, 2), 0) / tail.length
    : 0;
  const dailyVolatility = Math.round(Math.sqrt(tailVar));

  // Per-day actuals for daily view (revenue + spend bars vs straight-line
  // daily target/budget). Page applies a curve overlay on top when set.
  const dailyTargetEven = monthTarget / daysInMonth;
  const dailyBudgetEven = spendBudget / daysInMonth;
  const daily = data.map((d) => {
    const merDay = dailyMERData.find((m) => m.dateStr === d.dateStr);
    return {
      dateStr: d.dateStr,
      revenue: Math.round(d.revenue),
      spend: Math.round(merDay?.spend || 0),
      orders: Math.round(d.orders || 0),
      dailyRevTarget: Math.round(dailyTargetEven),
      dailyBudget: Math.round(dailyBudgetEven),
    };
  });

  // Contribution margin pacing — DTC margin model from getProfitabilityData,
  // expressed cumulatively so the chart shows whether the period is profitable.
  // breakeven CM% is the floor a CFO wants the line to stay above.
  const cogsPct = 0.32;
  const shippingPerOrder = 7.5;
  const returnRate = 0.08;
  const paymentFeePct = 0.029;
  const breakevenCmPct = 25;
  let cumRev = 0;
  let cumSpend = 0;
  let cumOrders = 0;
  let cumCm = 0;
  const marginSeries = data.map((d) => {
    const merDay = dailyMERData.find((m) => m.dateStr === d.dateStr);
    const dayRev = d.revenue || 0;
    const dayOrders = d.orders || 0;
    const daySpend = merDay?.spend || 0;
    cumRev += dayRev;
    cumSpend += daySpend;
    cumOrders += dayOrders;
    const cogs = cumRev * cogsPct;
    const shipping = cumOrders * shippingPerOrder;
    const returns = cumRev * returnRate;
    const fees = cumRev * paymentFeePct;
    cumCm = cumRev - cogs - shipping - returns - fees - cumSpend;
    return {
      dateStr: d.dateStr,
      cmPct: cumRev > 0 ? Math.round((cumCm / cumRev) * 1000) / 10 : 0,
      breakevenPct: breakevenCmPct,
    };
  });

  return {
    monthTarget,
    spendBudget,
    spendBudgetIsOperatorSet,
    totalRev: Math.round(totalRev),
    totalSpend: Math.round(totalSpend),
    projectedRev: Math.round(projectedRev),
    projectedSpend: Math.round(projectedSpend),
    dailyAvgRev: Math.round(dailyAvgRev),
    dailyAvgSpend: Math.round(dailyAvgSpend),
    requiredDailyRev: Math.round(requiredDailyRev),
    requiredDailySpend: Math.round(requiredDailySpend),
    expectedPacePct,
    daysElapsed,
    daysRemaining,
    dailyVolatility,
    cumulative,
    daily,
    marginSeries,
    weekly,
    channelPacing,
  };
}

/**
 * Returns rolling 14-day average ROAS per paid channel — used by the
 * Forecasting scenario slider to project revenue impact of spend changes.
 * Falls back to CHANNEL_CONFIG midpoint if no recent data is available.
 */
export function getChannelRollingRoas(end = TODAY, days = 14) {
  const endTs = startOfDay(end).getTime();
  const startTs = startOfDay(subDays(end, days - 1)).getTime();
  const out = {};
  CHANNEL_CONFIG.filter((c) => c.mode === "spend").forEach((cfg) => {
    const rows = channelData.filter(
      (r) => r.channel === cfg.name && r.date.getTime() >= startTs && r.date.getTime() <= endTs && r.roas != null
    );
    if (rows.length > 0) {
      const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
      const totalSpend = rows.reduce((s, r) => s + (r.spend || 0), 0);
      out[cfg.name] = totalSpend > 0 ? Math.round((totalRev / totalSpend) * 100) / 100 : null;
    } else {
      out[cfg.name] = Math.round(((cfg.roasMin + cfg.roasMax) / 2) * 100) / 100;
    }
  });
  return out;
}

// ── Geo / Regional ────────────────────────────────────────────────────────

function generateGeoData() {
  const states = ["CA","TX","NY","FL","IL","PA","OH","GA","NC","MI","NJ","VA","WA","AZ","MA","TN","IN","MO","MD","WI","CO","MN","SC","AL","LA","KY","OR","OK","CT","UT","IA","NV","AR","MS","KS","NM","NE","ID","WV","HI","NH","ME","MT","RI","DE","SD","ND","AK","VT","WY","DC"];
  return states.map((st, i) => {
    const seed = i * 37 + 19;
    const revenue = Math.round(randomBetween(seed, 8000, i < 10 ? 280000 : 60000));
    const orders = Math.round(revenue / randomBetween(seed + 1, 80, 140));
    const aov = orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0;
    const cac = Math.round(randomBetween(seed + 2, 18, 55) * 100) / 100;
    const shippingCost = Math.round(randomBetween(seed + 3, 4, 12) * orders);
    const netMargin = Math.round((revenue * randomBetween(seed + 4, 0.08, 0.28)) - shippingCost);
    const roas = Math.round(randomBetween(seed + 5, 1.8, 6.5) * 100) / 100;
    return { state: st, revenue, orders, aov, cac, shippingCost, netMargin, roas };
  });
}

export const geoData = generateGeoData();

export function getGeoTrend() {
  const topStates = [...geoData].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((s) => s.state);
  const trend = [];
  for (let i = 29; i >= 0; i--) {
    const seed = i * 23 + 3;
    const row = { date: subDays(TODAY, i), dateStr: format(subDays(TODAY, i), "yyyy-MM-dd") };
    topStates.forEach((st, si) => {
      const base = geoData.find((g) => g.state === st)?.revenue || 50000;
      row[st] = Math.round((base / 30) * randomBetween(seed + si, 0.7, 1.3));
    });
    trend.push(row);
  }
  return { topStates, trend };
}

// ── Profitability ─────────────────────────────────────────────────────────

export function getProfitabilityData(start, end) {
  const data = filterByRange(dailyData, start, end);
  const totalRev = data.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = data.reduce((s, d) => s + d.orders, 0);
  const merData = getMERDataForRange(start, end);
  const totalSpend = merData.reduce((s, d) => s + d.spend, 0);

  const cogsPct = 0.32;
  const shippingPerOrder = 7.5;
  const returnRate = 0.08;
  const paymentFeePct = 0.029;

  const cogs = Math.round(totalRev * cogsPct);
  const grossProfit = Math.round(totalRev - cogs);
  const shipping = Math.round(totalOrders * shippingPerOrder);
  const returns = Math.round(totalRev * returnRate);
  const paymentFees = Math.round(totalRev * paymentFeePct);
  const cm = Math.round(grossProfit - totalSpend - shipping - returns - paymentFees);
  const cmPct = totalRev > 0 ? Math.round((cm / totalRev) * 10000) / 100 : 0;
  const cmPerOrder = totalOrders > 0 ? Math.round((cm / totalOrders) * 100) / 100 : 0;
  const newCusts = data.reduce((s, d) => s + d.newCustomers, 0);
  const cmPerNC = newCusts > 0 ? Math.round((cm / newCusts) * 100) / 100 : 0;

  const waterfall = [
    { name: "Revenue", value: Math.round(totalRev), fill: "#43a9df" },
    { name: "COGS", value: -cogs, fill: "#f87171" },
    { name: "Gross Profit", value: grossProfit, fill: "#34d399", isSubtotal: true },
    { name: "Ad Spend", value: -Math.round(totalSpend), fill: "#8e68ad" },
    { name: "Shipping", value: -shipping, fill: "#fbbf24" },
    { name: "Returns", value: -returns, fill: "#f87171" },
    { name: "Payment Fees", value: -paymentFees, fill: "#f87171" },
    { name: "Contribution Margin", value: cm, fill: cm >= 0 ? "#34d399" : "#f87171", isSubtotal: true },
  ];

  const dailyMargin = data.map((d) => {
    const dCogs = d.revenue * cogsPct;
    const dShip = d.orders * shippingPerOrder;
    const dRet = d.revenue * returnRate;
    const dFee = d.revenue * paymentFeePct;
    const merDay = merData.find((m) => m.dateStr === d.dateStr);
    const dSpend = merDay?.spend || 0;
    const dCm = d.revenue - dCogs - dSpend - dShip - dRet - dFee;
    return { dateStr: d.dateStr, date: d.date, cmPct: d.revenue > 0 ? Math.round((dCm / d.revenue) * 10000) / 100 : 0, cm: Math.round(dCm) };
  });

  const channelMargin = getEfficiencyByChannel(start, end).map((ch) => {
    const chCogs = ch.revenue * cogsPct;
    const chShip = ch.orders * shippingPerOrder;
    const chCm = ch.revenue - chCogs - ch.spend - chShip;
    return { channel: ch.channel, revenue: ch.revenue, spend: ch.spend, cm: Math.round(chCm), cmPct: ch.revenue > 0 ? Math.round((chCm / ch.revenue) * 10000) / 100 : 0 };
  });

  const productMargin = products.map((p) => {
    const pCogs = p.revenue * (cogsPct + randomBetween(p.id.length * 3, -0.05, 0.08));
    const pShip = p.unitsSold * shippingPerOrder;
    const pRet = p.revenue * (p.refundRate / 100);
    const pCm = p.revenue - pCogs - pShip - pRet;
    return { name: p.name, revenue: Math.round(p.revenue), cm: Math.round(pCm), cmPct: p.revenue > 0 ? Math.round((pCm / p.revenue) * 10000) / 100 : 0 };
  });

  const breakevenRoas = 1 / (1 - cogsPct - (shippingPerOrder * totalOrders / totalRev) - returnRate - paymentFeePct);

  return { totalRev: Math.round(totalRev), cogs, grossProfit, totalSpend: Math.round(totalSpend), shipping, returns, paymentFees, cm, cmPct, cmPerOrder, cmPerNC, waterfall, dailyMargin, channelMargin, productMargin, breakevenRoas: Math.round(breakevenRoas * 100) / 100, cogsPct, returnRate, paymentFeePct, shippingPerOrder };
}

// ── Inventory ─────────────────────────────────────────────────────────────

function generateInventoryData() {
  return products.map((p, i) => {
    const seed = i * 53 + 29;
    const dailySellRate = Math.round(randomBetween(seed, 5, 45));
    const currentStock = Math.round(randomBetween(seed + 1, 50, 2000));
    const daysOfSupply = dailySellRate > 0 ? Math.round(currentStock / dailySellRate) : 999;
    const reorderPoint = dailySellRate * 14;
    const adSpend = Math.round(randomBetween(seed + 2, 200, 5000));
    let status = "Healthy";
    if (daysOfSupply < 7) status = "Critical";
    else if (daysOfSupply < 14) status = "Low";
    else if (daysOfSupply > 90) status = "Overstock";
    return { id: p.id, name: p.name, currentStock, dailySellRate, daysOfSupply, reorderPoint, needsReorder: currentStock <= reorderPoint, status, adSpend, sellThroughRate: Math.round(randomBetween(seed + 3, 15, 85) * 10) / 10 };
  });
}

export const inventoryData = generateInventoryData();

// ── Subscriptions ─────────────────────────────────────────────────────────

function generateSubscriptionData() {
  const activeSubscribers = 14200;
  const avgSubValue = 42.5;
  const mrr = Math.round(activeSubscribers * avgSubValue);
  const arr = mrr * 12;
  const churnRate = 6.8;

  const mrrWaterfall = [];
  for (let i = 5; i >= 0; i--) {
    const seed = i * 41 + 13;
    const newMrr = Math.round(randomBetween(seed, 25000, 55000));
    const expansion = Math.round(randomBetween(seed + 1, 5000, 15000));
    const churn = Math.round(randomBetween(seed + 2, 20000, 40000));
    const contraction = Math.round(randomBetween(seed + 3, 3000, 10000));
    mrrWaterfall.push({ month: format(new Date(2026, 2 - i, 1), "MMM yyyy"), newMrr, expansion, churn, contraction, net: newMrr + expansion - churn - contraction });
  }

  const subVsOneTime = [];
  for (let i = 29; i >= 0; i--) {
    const seed = i * 17 + 5;
    const total = dailyData[dailyData.length - 1 - i]?.revenue || 10000;
    const subPct = randomBetween(seed, 0.3, 0.45);
    subVsOneTime.push({ dateStr: format(subDays(TODAY, i), "yyyy-MM-dd"), date: subDays(TODAY, i), subscription: Math.round(total * subPct), oneTime: Math.round(total * (1 - subPct)) });
  }

  const churnCohort = [100, 82, 71, 64, 59, 55, 52, 49, 47, 45, 43, 42].map((v, i) => ({ month: i, retained: v }));

  const subProducts = products.slice(0, 6).map((p, i) => {
    const seed = i * 31 + 9;
    return { name: p.name, subscribers: Math.round(randomBetween(seed, 400, 3500)), churnRate: Math.round(randomBetween(seed + 1, 3, 12) * 10) / 10, avgValue: Math.round(randomBetween(seed + 2, 28, 65) * 100) / 100 };
  });

  const winbackCandidates = [
    { name: "Sarah M.", ltv: 845, churnedDaysAgo: 12, lastProduct: "Performance Hoodie" },
    { name: "James K.", ltv: 672, churnedDaysAgo: 18, lastProduct: "Quarter-Zip Pullover" },
    { name: "Emily R.", ltv: 534, churnedDaysAgo: 8, lastProduct: "Slim Fit Joggers" },
    { name: "Michael T.", ltv: 498, churnedDaysAgo: 22, lastProduct: "Classic White Tee" },
    { name: "Lisa W.", ltv: 456, churnedDaysAgo: 15, lastProduct: "Crossbody Sling Pack" },
  ];

  return { activeSubscribers, avgSubValue, mrr, arr, churnRate, mrrWaterfall, subVsOneTime, churnCohort, subProducts, winbackCandidates };
}

export const subscriptionData = generateSubscriptionData();

// ── Competitive Intelligence ──────────────────────────────────────────────

function generateCompetitiveData() {
  const shareOfSearch = [];
  for (let i = 29; i >= 0; i--) {
    const seed = i * 19 + 11;
    shareOfSearch.push({ date: subDays(TODAY, i), dateStr: format(subDays(TODAY, i), "yyyy-MM-dd"), branded: Math.round(randomBetween(seed, 70, 95)), nonBranded: Math.round(randomBetween(seed + 1, 15, 35)) });
  }

  const shareOfVoice = [
    { competitor: "Us (Lucerna)", meta: 28, google: 32, tiktok: 18 },
    { competitor: "Competitor A", meta: 22, google: 18, tiktok: 25 },
    { competitor: "Competitor B", meta: 18, google: 22, tiktok: 20 },
    { competitor: "Competitor C", meta: 15, google: 12, tiktok: 22 },
    { competitor: "Others", meta: 17, google: 16, tiktok: 15 },
  ];

  const cpmTrend = [];
  for (let i = 29; i >= 0; i--) {
    const seed = i * 23 + 7;
    cpmTrend.push({ date: subDays(TODAY, i), dateStr: format(subDays(TODAY, i), "yyyy-MM-dd"), meta: Math.round(randomBetween(seed, 12, 22) * 100) / 100, google: Math.round(randomBetween(seed + 1, 8, 16) * 100) / 100, tiktok: Math.round(randomBetween(seed + 2, 6, 14) * 100) / 100 });
  }

  const priceIndex = [
    { category: "Basic Tees", ourPrice: 32, marketAvg: 28, delta: 14.3 },
    { category: "Hoodies", ourPrice: 75, marketAvg: 68, delta: 10.3 },
    { category: "Joggers", ourPrice: 60, marketAvg: 55, delta: 9.1 },
    { category: "Sneakers", ourPrice: 85, marketAvg: 90, delta: -5.6 },
    { category: "Bags", ourPrice: 165, marketAvg: 145, delta: 13.8 },
    { category: "Accessories", ourPrice: 38, marketAvg: 35, delta: 8.6 },
  ];

  const seasonality = [
    { month: "Jan", demand: 65 }, { month: "Feb", demand: 60 }, { month: "Mar", demand: 72 },
    { month: "Apr", demand: 68 }, { month: "May", demand: 75 }, { month: "Jun", demand: 70 },
    { month: "Jul", demand: 62 }, { month: "Aug", demand: 78 }, { month: "Sep", demand: 82 },
    { month: "Oct", demand: 88 }, { month: "Nov", demand: 100 }, { month: "Dec", demand: 95 },
  ];

  return { shareOfSearch, shareOfVoice, cpmTrend, priceIndex, seasonality };
}

export const competitiveData = generateCompetitiveData();

// ── Alerts & Anomalies ────────────────────────────────────────────────────

function generateAlertsData() {
  const alerts = [
    { id: "a1", severity: "Critical", metric: "MER", channel: "Paid Social", message: "MER dropped below 2.5x — down 32% vs 7-day avg", timestamp: subDays(TODAY, 0), resolved: false },
    { id: "a2", severity: "Warning", metric: "Spend", channel: "Paid Search", message: "Daily spend exceeded budget by 18% ($2,400 over)", timestamp: subDays(TODAY, 1), resolved: false },
    { id: "a3", severity: "Critical", metric: "Tracking", channel: "All", message: "Purchase event match rate dropped to 82% (threshold: 90%)", timestamp: subDays(TODAY, 1), resolved: true },
    { id: "a4", severity: "Warning", metric: "Conversion Rate", channel: "Direct", message: "Site conversion rate down 15% vs prior week", timestamp: subDays(TODAY, 2), resolved: false },
    { id: "a5", severity: "Info", metric: "Creative", channel: "Meta", message: "Top creative 'Summer Vibes UGC' showing fatigue — CTR down 25%", timestamp: subDays(TODAY, 3), resolved: true },
    { id: "a6", severity: "Critical", metric: "Inventory", channel: "N/A", message: "Canvas Sneakers at 4 days of supply — stockout imminent", timestamp: subDays(TODAY, 3), resolved: false },
    { id: "a7", severity: "Warning", metric: "CAC", channel: "TikTok", message: "CAC spiked to $58 — 40% above 30-day avg", timestamp: subDays(TODAY, 5), resolved: true },
    { id: "a8", severity: "Info", metric: "Revenue", channel: "Email", message: "Email revenue up 28% — flow optimization working", timestamp: subDays(TODAY, 6), resolved: true },
  ].map((a) => ({ ...a, timestampStr: format(a.timestamp, "MMM d, h:mm a") }));

  const rules = [
    { id: "r1", name: "MER Floor", condition: "MER < 3.0x", metric: "MER", enabled: true },
    { id: "r2", name: "Spend Cap", condition: "Daily spend > $15,000", metric: "Spend", enabled: true },
    { id: "r3", name: "Tracking Health", condition: "Match rate < 90%", metric: "Tracking", enabled: true },
    { id: "r4", name: "Conversion Drop", condition: "CVR drops > 20% vs 7d avg", metric: "Conversion Rate", enabled: true },
    { id: "r5", name: "Creative Fatigue", condition: "CTR drops > 25% over 7 days", metric: "Creative", enabled: true },
    { id: "r6", name: "Stockout Risk", condition: "Days of supply < 7", metric: "Inventory", enabled: true },
    { id: "r7", name: "CAC Spike", condition: "CAC > 30% above 30d avg", metric: "CAC", enabled: false },
  ];

  const anomalies = [];
  for (let i = 29; i >= 0; i--) {
    const seed = i * 31 + 13;
    const hasAnomaly = randomBetween(seed, 0, 1) > 0.8;
    const dayData = dailyData[dailyData.length - 1 - i];
    if (dayData) {
      anomalies.push({ date: dayData.date, dateStr: dayData.dateStr, revenue: dayData.revenue, anomaly: hasAnomaly, severity: hasAnomaly ? (randomBetween(seed + 1, 0, 1) > 0.5 ? "Critical" : "Warning") : null });
    }
  }

  return { alerts, rules, anomalies, thisWeekCount: alerts.filter((a) => !a.resolved).length, resolvedCount: alerts.filter((a) => a.resolved).length };
}

export const alertsData = generateAlertsData();

// ── Report Summary ────────────────────────────────────────────────────────

export function getReportSummary(start, end) {
  const kpis = getKPIsForRange(start, end, null, null);
  const merKpis = getMERKPIs(start, end);
  const channels = getEfficiencyByChannel(start, end);
  const topChannel = [...channels].sort((a, b) => b.revenue - a.revenue)[0];
  const topCreative = [...(creativeData || [])].sort((a, b) => b.revenue - a.revenue)[0];
  const profitability = getProfitabilityData(start, end);
  const pacing = getForecastingData(start, end);

  return {
    period: { start: format(start, "MMM d, yyyy"), end: format(end, "MMM d, yyyy") },
    revenue: kpis.totalRevenue,
    orders: kpis.totalOrders,
    aov: kpis.aov,
    mer: merKpis.mer,
    cac: merKpis.cac,
    ncRoas: merKpis.ncRoas,
    cm: profitability.cm,
    cmPct: profitability.cmPct,
    topChannel: topChannel?.channel || "N/A",
    topChannelRevenue: topChannel?.revenue || 0,
    topCreative: topCreative?.name || "N/A",
    topCreativeRoas: topCreative?.roas || 0,
    pacingPct: pacing.monthTarget > 0 ? Math.round((pacing.totalRev / pacing.monthTarget) * 10000) / 100 : 0,
    activeAlerts: alertsData.thisWeekCount,
    trackingScore: trackingHealth.overallScore,
  };
}

// ===========================================================================
// V3.1 — Journeys, AI Insights, Integrations
// ===========================================================================

// ── Path-to-Purchase / Journeys ───────────────────────────────────────────

function generateJourneyData() {
  const topPaths = [
    { path: ["Paid Social", "Direct", "Purchase"], conversions: 1842, avgDays: 3.2, revenue: 224500 },
    { path: ["Paid Search", "Purchase"], conversions: 1536, avgDays: 0.8, revenue: 198200 },
    { path: ["Paid Social", "Email", "Direct", "Purchase"], conversions: 1124, avgDays: 6.4, revenue: 156800 },
    { path: ["Organic", "Paid Social", "Purchase"], conversions: 987, avgDays: 4.1, revenue: 118400 },
    { path: ["Email", "Purchase"], conversions: 876, avgDays: 1.2, revenue: 95300 },
    { path: ["Direct", "Purchase"], conversions: 743, avgDays: 0.3, revenue: 82100 },
    { path: ["Paid Social", "Paid Search", "Email", "Purchase"], conversions: 654, avgDays: 8.7, revenue: 94200 },
    { path: ["Organic", "Email", "Purchase"], conversions: 521, avgDays: 5.3, revenue: 62500 },
  ];

  const timeToConvert = [
    { bucket: "Same day", pct: 32 },
    { bucket: "1-2 days", pct: 24 },
    { bucket: "3-7 days", pct: 22 },
    { bucket: "8-14 days", pct: 12 },
    { bucket: "15-30 days", pct: 7 },
    { bucket: "30+ days", pct: 3 },
  ];

  const assistedConversions = [
    { channel: "Paid Social", firstTouch: 38, assisted: 52, lastTouch: 22 },
    { channel: "Paid Search", firstTouch: 28, assisted: 18, lastTouch: 35 },
    { channel: "Email", firstTouch: 5, assisted: 42, lastTouch: 28 },
    { channel: "Organic", firstTouch: 22, assisted: 15, lastTouch: 8 },
    { channel: "Direct", firstTouch: 7, assisted: 5, lastTouch: 32 },
  ];

  const modelComparison = [
    { channel: "Paid Social", lastClick: 18.5, linear: 28.2, positionBased: 26.1, dataDriven: 24.8 },
    { channel: "Paid Search", lastClick: 32.1, linear: 22.4, positionBased: 24.8, dataDriven: 26.2 },
    { channel: "Email", lastClick: 25.3, linear: 22.8, positionBased: 21.5, dataDriven: 23.1 },
    { channel: "Organic", lastClick: 8.2, linear: 14.6, positionBased: 15.2, dataDriven: 14.5 },
    { channel: "Direct", lastClick: 15.9, linear: 12.0, positionBased: 12.4, dataDriven: 11.4 },
  ];

  const touchpointDistribution = [
    { touchpoints: 1, pct: 28 },
    { touchpoints: 2, pct: 32 },
    { touchpoints: 3, pct: 22 },
    { touchpoints: 4, pct: 11 },
    { touchpoints: "5+", pct: 7 },
  ];

  // Cumulative conversion lag (% converted by day N)
  const conversionLag = [];
  let cumPct = 0;
  const dayPcts = [32, 12, 12, 5, 5, 5, 7, 3, 3, 2, 2, 1.5, 1.5, 1, 1, 0.8, 0.7, 0.6, 0.5, 0.5, 0.4, 0.3, 0.3, 0.2, 0.2, 0.2, 0.1, 0.1, 0.1, 0.1];
  for (let d = 0; d < 30; d++) {
    cumPct = Math.min(100, cumPct + (dayPcts[d] || 0.1));
    conversionLag.push({ day: d, cumPct: Math.round(cumPct * 10) / 10 });
  }

  // KPI totals
  const totalConversions = topPaths.reduce((s, p) => s + p.conversions, 0);
  const totalRevenue = topPaths.reduce((s, p) => s + p.revenue, 0);
  const avgTouchpoints = Math.round((touchpointDistribution.reduce((s, t) => s + (typeof t.touchpoints === "number" ? t.touchpoints : 5) * t.pct, 0) / 100) * 10) / 10;
  const avgDaysToConvert = Math.round((topPaths.reduce((s, p) => s + p.avgDays * p.conversions, 0) / totalConversions) * 10) / 10;
  const singleTouchPct = touchpointDistribution.find((t) => t.touchpoints === 1)?.pct || 0;
  const multiTouchPct = 100 - singleTouchPct;

  const kpis = { totalConversions, totalRevenue, avgTouchpoints, avgDaysToConvert, singleTouchPct, multiTouchPct };

  return { topPaths, timeToConvert, assistedConversions, modelComparison, touchpointDistribution, conversionLag, kpis };
}

export const journeyData = generateJourneyData();

// ── AI Insights ───────────────────────────────────────────────────────────

function generateAIInsights() {
  const creativeClusters = [
    { cluster: "UGC Testimonials", count: 5, avgRoas: 3.8, avgCtr: 2.1, topCreative: "Testimonial Cut", insight: "Authentic social proof outperforms polished content by 40% on Meta" },
    { cluster: "Product Demos", count: 4, avgRoas: 2.9, avgCtr: 1.7, topCreative: "How-To Tutorial", insight: "Educational content drives higher AOV but lower volume" },
    { cluster: "Urgency / Scarcity", count: 3, avgRoas: 4.2, avgCtr: 2.8, topCreative: "Flash Sale Banner", insight: "FOMO messaging peaks on Tuesdays and Wednesdays" },
    { cluster: "Lifestyle / Aspirational", count: 4, avgRoas: 2.2, avgCtr: 1.4, topCreative: "Lifestyle Carousel", insight: "Works as top-of-funnel but rarely converts directly — better as an assist" },
  ];

  const hypotheses = [
    { id: "h1", hypothesis: "Shifting 15% of Paid Search budget to Paid Social will increase NC-ROAS by 0.3x", confidence: "High", basis: "MMM marginal curves show Search is past saturation point", status: "Ready to test", priority: "High" },
    { id: "h2", hypothesis: "UGC creatives on TikTok will outperform studio content by 2x on CPA", confidence: "Medium", basis: "Creative cluster analysis shows UGC ROAS 40% higher across platforms", status: "Ready to test", priority: "High" },
    { id: "h3", hypothesis: "Email win-back flow targeting 10-20 day churned subscribers will recover 8% MRR", confidence: "Medium", basis: "Winback candidates show $2,500+ combined LTV in 10-20 day churn window", status: "Needs data", priority: "Medium" },
    { id: "h4", hypothesis: "Reducing spend on Canvas Sneakers ads will not impact revenue (organic demand is high)", confidence: "Low", basis: "Incrementality score for branded search on this SKU is only 22%", status: "Ready to test", priority: "Low" },
    { id: "h5", hypothesis: "Adding a post-purchase upsell carousel will increase AOV by $8-12", confidence: "Medium", basis: "Cross-sell data shows 34% of customers buy 2+ categories within 60 days", status: "Ready to test", priority: "Medium" },
  ];

  const weeklyMemo = {
    period: "Mar 24 – Mar 30, 2026",
    highlights: [
      "Revenue up 8.2% WoW driven by Paid Social creative refresh",
      "MER held steady at 4.1x despite 12% spend increase",
      "Email flow revenue hit all-time high ($18.4K) — welcome series optimization working",
      "TikTok CAC spiked to $58 mid-week but recovered after pausing underperforming creative",
    ],
    risks: [
      "Canvas Sneakers inventory at 4 days — pause ads or risk stockout",
      "Paid Search CPCs up 15% market-wide — monitor closely",
    ],
    recommendations: [
      "Scale UGC testimonial cluster on Meta — increase budget 20%",
      "Launch geo-holdout test for Paid Social to validate incrementality",
      "Reorder Canvas Sneakers immediately — 2-week lead time",
    ],
  };

  return { creativeClusters, hypotheses, weeklyMemo };
}

export const aiInsights = generateAIInsights();

// ── Integrations ──────────────────────────────────────────────────────────

function generateIntegrations() {
  return [
    { name: "Shopify", category: "Store", icon: "shopify", status: "Connected", lastSync: "2 min ago", dataPoints: "Orders, Products, Customers" },
    { name: "Meta Ads", category: "Advertising", icon: "meta", status: "Connected", lastSync: "5 min ago", dataPoints: "Campaigns, Ad Sets, Creatives, Spend" },
    { name: "Google Ads", category: "Advertising", icon: "google", status: "Connected", lastSync: "5 min ago", dataPoints: "Campaigns, Keywords, Spend" },
    { name: "TikTok Ads", category: "Advertising", icon: "tiktok", status: "Connected", lastSync: "8 min ago", dataPoints: "Campaigns, Creatives, Spend" },
    { name: "Klaviyo", category: "Email / SMS", icon: "klaviyo", status: "Connected", lastSync: "10 min ago", dataPoints: "Flows, Campaigns, Revenue" },
    { name: "Google Analytics 4", category: "Analytics", icon: "ga4", status: "Connected", lastSync: "15 min ago", dataPoints: "Sessions, Events, Conversions" },
    { name: "Triple Whale", category: "Attribution", icon: "triplewhale", status: "Not Connected", lastSync: null, dataPoints: "Attribution, Pixel Data" },
    { name: "Northbeam", category: "Attribution", icon: "northbeam", status: "Not Connected", lastSync: null, dataPoints: "MTA, MMM Data" },
    { name: "Amazon", category: "Marketplace", icon: "amazon", status: "Not Connected", lastSync: null, dataPoints: "Sales, Advertising, Inventory" },
    { name: "BigQuery", category: "Warehouse", icon: "bigquery", status: "Available", lastSync: null, dataPoints: "Custom queries, Raw data export" },
    { name: "Snowflake", category: "Warehouse", icon: "snowflake", status: "Available", lastSync: null, dataPoints: "Custom queries, Raw data export" },
  ];
}

export const integrationsData = generateIntegrations();

// ── Transactions (Shopify orders + pixel journey) ─────────────────────────

function generateTransactions() {
  const firstNames = ["Sarah","James","Emily","Michael","Lisa","David","Rachel","Chris","Amanda","Brian","Nicole","Kevin","Megan","Tyler","Jessica","Andrew","Lauren","Ryan","Ashley","Matt"];
  const lastInits = ["M","K","R","T","W","P","S","L","C","J","B","D","G","H","N","F","A","V","Z","Q"];
  const cities = ["Los Angeles, CA","New York, NY","Austin, TX","Chicago, IL","Miami, FL","Seattle, WA","Denver, CO","Atlanta, GA","Portland, OR","Nashville, TN","San Francisco, CA","Boston, MA","Phoenix, AZ","Dallas, TX","Charlotte, NC","Minneapolis, MN","San Diego, CA","Tampa, FL","Raleigh, NC","Columbus, OH"];
  const channels = ["Paid Social","Paid Search","Email","Organic","Direct","TikTok","Influencer"];
  const channelColors = { "Paid Social":"#8e68ad","Paid Search":"#43a9df","Email":"#c2dcd4","Organic":"#34d399","Direct":"#6b7280","TikTok":"#f87171","Influencer":"#fbbf24" };
  const devices = ["Mobile","Desktop","Mobile","Mobile","Desktop","Tablet"];
  const statuses = ["Fulfilled","Fulfilled","Fulfilled","Fulfilled","Fulfilled","Partially Fulfilled","Unfulfilled","Refunded"];
  const productPool = products.map(p => p.name);

  const txns = [];
  for (let i = 0; i < 200; i++) {
    const seed = i * 43 + 17;
    const daysAgo = Math.floor(randomBetween(seed, 0, 89));
    const orderDate = subDays(TODAY, daysAgo);
    const name = firstNames[i % 20] + " " + lastInits[i % 20] + ".";
    const city = cities[i % 20];

    // Build journey touchpoints (2-6 steps)
    const touchCount = Math.floor(randomBetween(seed + 1, 2, 7));
    const journey = [];
    for (let t = 0; t < touchCount; t++) {
      const ch = channels[Math.floor(randomBetween(seed + t * 3, 0, channels.length))];
      const minutesBefore = Math.round(randomBetween(seed + t * 3 + 1, t === touchCount - 1 ? 0 : 10, 10080) * (touchCount - t) / touchCount);
      journey.push({
        channel: ch,
        color: channelColors[ch] || "#6b7280",
        event: t === 0 ? "First Touch" : t === touchCount - 1 ? "Purchase" : ["Page View","Add to Cart","Email Click","Retarget Click","Site Visit"][Math.floor(randomBetween(seed + t, 0, 5))],
        minutesBefore,
        device: devices[Math.floor(randomBetween(seed + t + 10, 0, devices.length))],
      });
    }

    const itemCount = Math.floor(randomBetween(seed + 2, 1, 4));
    const orderItems = [];
    for (let p = 0; p < itemCount; p++) {
      const prod = productPool[Math.floor(randomBetween(seed + p * 7, 0, productPool.length))];
      const qty = Math.floor(randomBetween(seed + p * 7 + 1, 1, 3));
      const price = Math.round(randomBetween(seed + p * 7 + 2, 22, 185) * 100) / 100;
      orderItems.push({ product: prod, quantity: qty, price });
    }

    const subtotal = orderItems.reduce((s, it) => s + it.price * it.quantity, 0);
    const shipping = Math.round(randomBetween(seed + 3, 0, 12) * 100) / 100;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + shipping + tax) * 100) / 100;

    const pixelEvents = [
      { event: "page_view", count: Math.floor(randomBetween(seed + 50, 2, 12)) },
      { event: "view_content", count: Math.floor(randomBetween(seed + 51, 1, 6)) },
      { event: "add_to_cart", count: Math.floor(randomBetween(seed + 52, 1, 3)) },
      { event: "initiate_checkout", count: 1 },
      { event: "purchase", count: 1 },
    ];
    const pixelConfidence = Math.round(randomBetween(seed + 60, 78, 99) * 10) / 10;

    txns.push({
      id: `#${(10001 + i).toString()}`,
      orderNumber: `#${(10001 + i).toString()}`,
      date: orderDate,
      dateStr: format(orderDate, "yyyy-MM-dd"),
      dateDisplay: format(orderDate, "MMM d, yyyy h:mm a"),
      customer: name,
      email: name.toLowerCase().replace(/ /g, "").replace(".", "") + "@example.com",
      city,
      status: statuses[Math.floor(randomBetween(seed + 4, 0, statuses.length))],
      items: orderItems,
      itemCount,
      subtotal: Math.round(subtotal * 100) / 100,
      shipping,
      tax,
      total,
      journey,
      firstTouch: journey[0]?.channel || "Direct",
      lastTouch: journey.length > 1 ? journey[journey.length - 2]?.channel || "Direct" : "Direct",
      touchpoints: touchCount,
      device: devices[Math.floor(randomBetween(seed + 5, 0, devices.length))],
      newCustomer: randomBetween(seed + 6, 0, 1) > 0.45,
      pixelEvents,
      pixelConfidence,
      attributionModel: randomBetween(seed + 7, 0, 1) > 0.5 ? "Data-Driven" : "Position-Based",
    });
  }

  return txns.sort((a, b) => b.date - a.date);
}

export const transactionsData = generateTransactions();

export function searchTransactions(query) {
  if (!query) return transactionsData.slice(0, 50);
  const q = query.toLowerCase();
  return transactionsData.filter(t =>
    t.orderNumber.toLowerCase().includes(q) ||
    t.customer.toLowerCase().includes(q) ||
    t.email.toLowerCase().includes(q) ||
    t.city.toLowerCase().includes(q) ||
    t.firstTouch.toLowerCase().includes(q)
  );
}
