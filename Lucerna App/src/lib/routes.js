// Single source of truth for the app's routes: path, label, nav section,
// and plan tier. Sidebar, Header breadcrumbs, and App routing all derive
// from this list — add a page here and everything stays in sync.
//
// tier: "core" (always open) | "lumen" | "pro" (gated behind plan upgrades)

export const ROUTES = [
  // Measure
  { path: "/", label: "Overview", section: "Measure", tier: "core" },
  { path: "/channels", label: "Channels", section: "Measure", tier: "core" },
  { path: "/geo", label: "Geo", section: "Measure", tier: "core" },
  { path: "/journeys", label: "Journeys", section: "Measure", tier: "core" },
  { path: "/transactions", label: "Transactions", section: "Measure", tier: "core" },
  // Optimize
  { path: "/efficiency", label: "Efficiency", section: "Optimize", tier: "core" },
  { path: "/incrementality", label: "Incrementality", section: "Optimize", tier: "lumen" },
  { path: "/mmm", label: "Media Mix", section: "Optimize", tier: "lumen" },
  { path: "/forecasting", label: "Forecasting", section: "Optimize", tier: "core" },
  // Analyze
  { path: "/campaigns", label: "Campaigns", section: "Analyze", tier: "core" },
  { path: "/creative", label: "Creative", section: "Analyze", tier: "pro" },
  { path: "/cohorts", label: "Cohorts", section: "Analyze", tier: "core" },
  { path: "/customers", label: "Customers", section: "Analyze", tier: "core" },
  { path: "/products", label: "Products", section: "Analyze", tier: "core" },
  { path: "/profitability", label: "Profitability", section: "Analyze", tier: "core" },
  { path: "/inventory", label: "Inventory", section: "Analyze", tier: "core" },
  { path: "/subscriptions", label: "Subscriptions", section: "Analyze", tier: "core" },
  // Monitor
  { path: "/tracking", label: "Tracking", section: "Monitor", tier: "core" },
  { path: "/alerts", label: "Alerts", section: "Monitor", tier: "core" },
  { path: "/competitive", label: "Competitive", section: "Monitor", tier: "pro" },
  { path: "/ai-insights", label: "AI Insights", section: "Monitor", tier: "pro" },
  // Connect
  { path: "/integrations", label: "Integrations", section: "Connect", tier: "core" },
  // Report
  { path: "/reports", label: "Executive Report", section: "Report", tier: "core" },
  // Pinned (not in a nav section)
  { path: "/settings", label: "Settings", section: null, tier: "core" },
];

export const SECTION_ORDER = ["Measure", "Optimize", "Analyze", "Monitor", "Connect", "Report"];

export const ROUTE_BY_PATH = Object.fromEntries(ROUTES.map((r) => [r.path, r]));

export const PAGE_NAMES = Object.fromEntries(ROUTES.map((r) => [r.path, r.label]));

export function routesBySection() {
  return SECTION_ORDER.map((label) => ({
    label,
    items: ROUTES.filter((r) => r.section === label),
  }));
}

export function routeTier(path) {
  return ROUTE_BY_PATH[path]?.tier || "core";
}
