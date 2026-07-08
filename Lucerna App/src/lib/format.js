// Shared number formatting. One source of truth — pages, drawers, and charts
// import from here instead of declaring local formatters.

const isNum = (n) => n != null && !Number.isNaN(n);

export const fmtN = (n) => (isNum(n) ? Math.round(n).toLocaleString("en-US") : "—");
export const fmtD = (n) => (isNum(n) ? "$" + Math.round(n).toLocaleString("en-US") : "—");
export const fmtDC = (n) =>
  isNum(n)
    ? "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";
export const fmtP = (n) => (isNum(n) ? n.toFixed(2) + "%" : "—");
export const fmtX = (n) => (isNum(n) ? n.toFixed(2) + "x" : "—");
export const fmtO = (n) => (isNum(n) ? n.toFixed(1) + " orders" : "—");

// Large-number abbreviation without prefix: 1.2M, 845K, 312
export const fmtCompactN = (n) => {
  if (!isNum(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(0) + "K";
  return sign + Math.round(abs).toString();
};

// Dollar abbreviation: $1.2M, $845K, $312
export const fmtCompact = (n) => (isNum(n) ? (n < 0 ? "-$" : "$") + fmtCompactN(Math.abs(n)) : "—");

// Dispatcher keyed on the card catalog fmt types (dollar, dollarC, percent, merX, orders, number)
export function formatValue(v, fmt) {
  if (v == null || Number.isNaN(v)) return "—";
  if (fmt === "dollar") return fmtD(v);
  if (fmt === "dollarC") return fmtDC(v);
  if (fmt === "percent") return fmtP(v);
  if (fmt === "merX") return fmtX(v);
  if (fmt === "orders") return fmtO(v);
  return fmtN(v);
}

// Compact axis-tick formatter for charts, keyed on the same fmt types
export function formatAxis(v, fmt) {
  if (fmt === "dollar" || fmt === "dollarC") {
    if (Math.abs(v) >= 1000) return `$${Math.round(v / 1000)}K`;
    return `$${Math.round(v)}`;
  }
  if (fmt === "percent") return `${v}%`;
  if (fmt === "merX") return `${v}x`;
  if (fmt === "orders") return `${v.toFixed(1)}`;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v;
}
