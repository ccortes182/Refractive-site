import { differenceInCalendarDays, startOfDay, subDays, format } from "date-fns";
import { TODAY, getChannelSummaryForRange, getChannelConfig } from "./mockData";

// ─────────────────────────────────────────────────────────────────────────
// Mock campaign catalog. Each entry maps to a channel × platform × type.
// Data is generated deterministically so the same campaign produces stable
// metrics across runs and across date-range filters (per-day distribution).
// ─────────────────────────────────────────────────────────────────────────

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
function rand(seed, lo, hi) {
  return lo + seededRandom(seed) * (hi - lo);
}

const STATUSES = ["Active", "Active", "Active", "Active", "Paused", "Paused", "Ended"];

// Each entry: { name, channel, platform, type, weight, statusOverride? }
// `weight` is the share of its parent platform's totals this campaign represents.
const CAMPAIGN_CATALOG = [
  // ── Paid Search · Google ──────────────────────────────────────────
  { name: "Brand Search — Always On",       channel: "Paid Search", platform: "Google",    type: "Search",   weight: 0.35 },
  { name: "Non-Brand Search — Core",        channel: "Paid Search", platform: "Google",    type: "Search",   weight: 0.30 },
  { name: "Non-Brand Search — Long Tail",   channel: "Paid Search", platform: "Google",    type: "Search",   weight: 0.20 },
  { name: "Competitor Conquesting",         channel: "Paid Search", platform: "Google",    type: "Search",   weight: 0.15, statusOverride: "Paused" },
  { name: "Shopping — All Products",        channel: "Paid Search", platform: "Google",    type: "Shopping", weight: 0.55 },
  { name: "Shopping — Bestsellers",         channel: "Paid Search", platform: "Google",    type: "Shopping", weight: 0.45 },
  { name: "PMax — Catalog Sales",           channel: "Paid Search", platform: "Google",    type: "PMax",     weight: 0.60 },
  { name: "PMax — New Customers",           channel: "Paid Search", platform: "Google",    type: "PMax",     weight: 0.40 },
  { name: "Display — Site Retargeting",     channel: "Paid Search", platform: "Google",    type: "Display",  weight: 0.70 },
  { name: "Display — In-Market",            channel: "Paid Search", platform: "Google",    type: "Display",  weight: 0.30 },
  { name: "YouTube — Brand Awareness",      channel: "Paid Search", platform: "Google",    type: "YouTube",  weight: 0.55 },
  { name: "YouTube — Conversion",           channel: "Paid Search", platform: "Google",    type: "YouTube",  weight: 0.45 },
  // ── Paid Search · Microsoft ──────────────────────────────────────
  { name: "Bing Brand Search",              channel: "Paid Search", platform: "Microsoft", type: "Search",   weight: 0.50 },
  { name: "Bing Non-Brand Search",          channel: "Paid Search", platform: "Microsoft", type: "Search",   weight: 0.50 },
  { name: "Bing Shopping",                  channel: "Paid Search", platform: "Microsoft", type: "Shopping", weight: 1.00 },
  { name: "Bing PMax",                      channel: "Paid Search", platform: "Microsoft", type: "PMax",     weight: 1.00 },
  { name: "Audience Network Display",       channel: "Paid Search", platform: "Microsoft", type: "Display",  weight: 1.00, statusOverride: "Paused" },
  // ── Paid Social · Meta ────────────────────────────────────────────
  { name: "Meta Prospecting — LAL 1%",      channel: "Paid Social", platform: "Meta",   weight: 0.30 },
  { name: "Meta Prospecting — Interests",   channel: "Paid Social", platform: "Meta",   weight: 0.20 },
  { name: "Meta Retargeting — Site Visits", channel: "Paid Social", platform: "Meta",   weight: 0.20 },
  { name: "Meta DPA — Catalog",             channel: "Paid Social", platform: "Meta",   weight: 0.20 },
  { name: "Meta — UGC Creator Test",        channel: "Paid Social", platform: "Meta",   weight: 0.10, statusOverride: "Ended" },
  // ── Paid Social · TikTok ─────────────────────────────────────────
  { name: "TikTok Spark Ads — Trending",    channel: "Paid Social", platform: "TikTok", weight: 0.55 },
  { name: "TikTok TopView — Brand",         channel: "Paid Social", platform: "TikTok", weight: 0.30, statusOverride: "Paused" },
  { name: "TikTok Catalog DPA",             channel: "Paid Social", platform: "TikTok", weight: 0.15 },
  // ── Paid Social · Snap ───────────────────────────────────────────
  { name: "Snap Ads — Story Cards",         channel: "Paid Social", platform: "Snap",   weight: 0.70 },
  { name: "Snap AR Lens — Try-On",          channel: "Paid Social", platform: "Snap",   weight: 0.30 },
  // ── Paid Social · Reddit ─────────────────────────────────────────
  { name: "Reddit Promoted — r/streetwear",   channel: "Paid Social", platform: "Reddit", weight: 0.60 },
  { name: "Reddit Subreddit Targeting",       channel: "Paid Social", platform: "Reddit", weight: 0.40 },
  // ── Other Paid · CTV ─────────────────────────────────────────────
  { name: "Roku — Brand Awareness Q1",      channel: "Other Paid", platform: "CTV (Roku/Hulu)", weight: 0.55 },
  { name: "Hulu — Conversion Push",         channel: "Other Paid", platform: "CTV (Roku/Hulu)", weight: 0.45 },
  // ── Other Paid · AppLovin ────────────────────────────────────────
  { name: "AppLovin UA — iOS",              channel: "Other Paid", platform: "AppLovin",        weight: 0.60 },
  { name: "AppLovin UA — Android",          channel: "Other Paid", platform: "AppLovin",        weight: 0.40 },
  // ── Email flows (treated as campaigns for the Campaigns tab too) ─
  { name: "Welcome Series — 3-Email",       channel: "Email", platform: "Email", type: "Welcome Flow",     weight: 0.40 },
  { name: "Abandoned Cart — 24h",           channel: "Email", platform: "Email", type: "Abandoned Cart",   weight: 0.30 },
  { name: "Promo Broadcast — Weekly",       channel: "Email", platform: "Email", type: "Promo Broadcast",  weight: 0.20 },
  { name: "Post-Purchase — Cross-Sell",     channel: "Email", platform: "Email", type: "Post-Purchase",    weight: 0.10 },
  // ── SMS flows ────────────────────────────────────────────────────
  { name: "Welcome SMS — Opt-in",           channel: "SMS", platform: "SMS", type: "Welcome SMS",          weight: 0.40 },
  { name: "Abandoned Cart SMS",             channel: "SMS", platform: "SMS", type: "Abandoned Cart SMS",   weight: 0.30 },
  { name: "Promo Broadcast SMS",            channel: "SMS", platform: "SMS", type: "Promo Broadcast SMS",  weight: 0.20 },
  { name: "Post-Purchase SMS",              channel: "SMS", platform: "SMS", type: "Post-Purchase SMS",    weight: 0.10 },
];

// Assign deterministic IDs once
CAMPAIGN_CATALOG.forEach((c, i) => {
  c.id = `cmp-${(i + 1).toString().padStart(3, "0")}`;
  if (!c.status) c.status = c.statusOverride || STATUSES[i % STATUSES.length];
  // Synthetic flight dates: most campaigns started 60-300 days ago, ended ones
  // wrapped within the last 30 days
  const startSeed = i * 17 + 13;
  c.startDate = subDays(TODAY, Math.round(rand(startSeed, 60, 300)));
  if (c.status === "Ended") {
    c.endDate = subDays(TODAY, Math.round(rand(startSeed + 1, 5, 28)));
  } else {
    c.endDate = null; // ongoing
  }
});

/**
 * Returns campaigns scoped to a date range with metrics computed by
 * cascading each parent (channel → platform → type → campaign) by weight.
 *
 * Ended campaigns whose endDate falls before `start` are excluded.
 */
export function getCampaignsForRange(start, end) {
  const summary = getChannelSummaryForRange(start, end);

  // Group catalog entries by (channel, platform, type) so we can split a
  // platform's totals across the campaigns that share its (channel, platform, type).
  const byKey = new Map();
  CAMPAIGN_CATALOG.forEach((c) => {
    const key = `${c.channel}|${c.platform}|${c.type ?? ""}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(c);
  });

  const out = [];
  const startTime = startOfDay(start).getTime();

  summary.forEach((row) => {
    const config = getChannelConfig(row.channel);
    if (!config) return;

    // Compute (platform, type) → row totals using the same logic as
    // getChannelExpansionRowsForRange so campaigns roll up consistently.
    const channelSeed = row.channel.length * 11 + 7;

    const platformSlots = config.platforms?.length
      ? config.platforms.flatMap((p) => {
          if (p.types?.length) {
            const perType = p.weight / p.types.length;
            return p.types.map((t) => ({ platform: p.name, type: t, weight: perType }));
          }
          return [{ platform: p.name, type: null, weight: p.weight }];
        })
      : (config.flows || []).map((f, i) => ({
          platform: row.channel,
          type: f,
          weight: [0.4, 0.3, 0.2, 0.1][i] ?? 0.05,
        }));

    platformSlots.forEach((slot, slotIdx) => {
      const slotKey = `${row.channel}|${slot.platform}|${slot.type ?? ""}`;
      const campaignsInSlot = byKey.get(slotKey) || [];
      if (campaignsInSlot.length === 0) return;

      // Slot-level totals (mirrors splitRowByWeights output)
      const seed = channelSeed + slotIdx * 23;
      const w = slot.weight;
      const slotSpend = row.spend ? row.spend * w * rand(seed, 0.85, 1.15) : 0;
      const slotRevenue = row.revenue * w * rand(seed + 1, 0.85, 1.15);
      const slotSessions = row.sessions * w * rand(seed + 2, 0.85, 1.15);
      const slotOrders = row.orders * w * rand(seed + 3, 0.85, 1.15);
      const slotImpressions = row.impressions * w * rand(seed + 4, 0.85, 1.15);
      const slotClicks = row.clicks * w * rand(seed + 5, 0.85, 1.15);

      campaignsInSlot.forEach((c, ci) => {
        // Filter Ended campaigns whose end is before the requested start
        if (c.endDate && c.endDate.getTime() < startTime) return;
        // Paused campaigns get reduced weight (they ran for part of period)
        const pausedScale = c.status === "Paused" ? 0.4 : 1;
        const cw = c.weight * pausedScale;
        const cseed = seed + ci * 7 + 3;
        const j = (o) => rand(cseed + o, 0.9, 1.1);
        const spend = Math.round(slotSpend * cw * j(0));
        const revenue = Math.round(slotRevenue * cw * j(1));
        const sessions = Math.max(1, Math.round(slotSessions * cw * j(2)));
        const orders = Math.max(1, Math.round(slotOrders * cw * j(3)));
        const impressions = Math.max(1, Math.round(slotImpressions * cw * j(4)));
        const clicks = Math.max(1, Math.round(slotClicks * cw * j(5)));

        out.push({
          id: c.id,
          name: c.name,
          channel: c.channel,
          platform: c.platform,
          type: c.type || null,
          status: c.status,
          startDate: c.startDate,
          endDate: c.endDate,
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
        });
      });
    });
  });

  return out;
}

/**
 * Returns a 7-day micro-trend (revenue per day) for a campaign within the
 * caller's date range. Used for sparklines on the Campaigns table.
 */
export function getCampaignSparklineForRange(campaignId, start, end) {
  const days = Math.min(differenceInCalendarDays(end, start) + 1, 14);
  const cseed = campaignId.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const out = [];
  for (let i = 0; i < days; i++) {
    const v = rand(cseed + i * 31, 0.6, 1.4);
    out.push(v);
  }
  return out;
}

/**
 * Returns a single campaign's daily metrics across the date range.
 * Used by the campaign drill drawer.
 */
export function getCampaignDailyForRange(campaignId, start, end) {
  const cseed = campaignId.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const days = differenceInCalendarDays(end, start) + 1;
  const out = [];
  for (let i = 0; i < days; i++) {
    const date = subDays(end, days - 1 - i);
    const seed = cseed + i * 13;
    const baseSpend = rand(seed, 50, 600);
    const baseRev = baseSpend * rand(seed + 1, 1.5, 6.5);
    out.push({
      dateStr: format(date, "yyyy-MM-dd"),
      spend: Math.round(baseSpend),
      revenue: Math.round(baseRev),
      roas: Math.round((baseRev / baseSpend) * 100) / 100,
      orders: Math.max(1, Math.round(rand(seed + 2, 1, 12))),
      sessions: Math.max(1, Math.round(rand(seed + 3, 8, 60))),
    });
  }
  return out;
}

export const ALL_CAMPAIGN_NAMES = CAMPAIGN_CATALOG.map((c) => c.name);
