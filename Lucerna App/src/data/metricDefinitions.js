// Plain-language metric definitions, written for an operator, not a data scientist.
// Sourced by KPI cards, table headers, and module tooltips. Keep the voice
// casual and specific. No jargon without a number or an example.

export const METRIC_DEFINITIONS = {
  // Revenue & profit
  netRevenue: "Gross revenue minus returns, discounts, and tax. This is the revenue number the rest of the dashboard is built on.",
  grossRevenue: "Total order value before returns, discounts, and tax.",
  grossProfit: "Net revenue minus cost of goods. Doesn't include ad spend or shipping.",
  grossMargin: "Gross profit as a percent of net revenue.",
  contributionMargin: "What's left after COGS, shipping, and ad spend. The money that actually pays your fixed costs.",
  cmPct: "Contribution margin as a percent of net revenue. Below 20% usually means ad spend is eating the business.",

  // Efficiency
  mer: "Marketing Efficiency Ratio: total revenue divided by total ad spend. Blended, so it can't be gamed by attribution. Most brands run 3-6x.",
  ncMer: "MER counting only new-customer revenue. Strips out revenue you'd likely get anyway from repeat buyers.",
  cac: "Customer Acquisition Cost: total ad spend divided by new customers in the period.",
  cacPayback: "How many orders it takes a new customer to pay back what you spent acquiring them. Lower is better.",
  cpa: "Cost per acquisition: spend divided by orders attributed to the channel.",
  adSpend: "Total paid media spend across all channels in the selected period.",
  marketingPctOfRev: "Ad spend as a percent of net revenue. The inverse view of MER.",

  // ROAS family — the calibration story
  roas: "Return on ad spend based on Lucerna's calibrated attribution, not the platform's own tracking.",
  blendedRoas: "Total attributed revenue divided by total spend across all paid channels, using Lucerna's calibrated numbers.",
  platformRoas: "What the ad platform claims it drove. Platforms over-report because they take credit for sales that would happen anyway. Compare against the calibrated number to see the gap.",
  ncRoas: "ROAS counting only new-customer revenue. The cleanest read on whether a channel actually grows the business.",
  iRoas: "Incremental ROAS: revenue that wouldn't exist without the ad, measured by lift tests instead of click attribution.",
  calibrationFactor: "The multiplier Lucerna applies to platform-reported numbers, learned from incrementality tests. A factor of 0.62 means the platform over-reports by about 60%.",

  // Customers
  ltv: "Average lifetime revenue per customer, based on cohort history.",
  ltvCac: "Lifetime value divided by acquisition cost. Under 3x usually means acquisition is too expensive to compound.",
  aov: "Average order value: net revenue divided by orders.",
  repeatRate: "Percent of customers who have ordered more than once.",
  churnRate: "Percent of subscribers who cancelled during the period.",

  // Forecasting
  confidenceBand: "The shaded range shows where actuals are likely to land. Wider band means the model is less certain, usually because recent data is volatile.",
  pacing: "Where you are against target, adjusted for how much of the period has elapsed. 100% means exactly on pace.",

  // Tracking
  matchRate: "Percent of conversion events successfully tied back to a click or session. Higher means fewer blind spots in attribution.",
  attributedPct: "Share of revenue Lucerna can confidently tie to a marketing touch. The rest is direct, organic-unknown, or lost to tracking gaps.",
};

export function metricDefinition(key) {
  return METRIC_DEFINITIONS[key] || null;
}
