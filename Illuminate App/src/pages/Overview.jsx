import { useState, useMemo } from "react";
import {
  getOverviewKPIs,
  getDataForRange,
  getSparklineDataForRange,
  getMERDataForRange,
} from "../data/mockData";
import KPICard from "../components/KPICard";
import ExportCSV from "../components/ExportCSV";
import { useTheme } from "../context/ThemeContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

const METRIC_CONFIG = {
  totalRevenue:      { label: "Total Revenue",       fmt: "dollar",   dataKey: "totalRevenue" },
  grossRevenue:      { label: "Gross Revenue",       fmt: "dollar",   dataKey: "grossRevenue" },
  netRevenue:        { label: "Net Revenue",         fmt: "dollar",   dataKey: "netRevenue" },
  revenue:           { label: "Net Revenue",         fmt: "dollar",   dataKey: "revenue" },
  cogs:              { label: "COGS",                fmt: "dollar",   dataKey: "cogs" },
  contributionMargin:{ label: "Contribution Margin", fmt: "dollar",   dataKey: null },
  adSpend:           { label: "Ad Spend",            fmt: "dollar",   dataKey: null },
  mer:               { label: "MER",                 fmt: "dollarC",  dataKey: null },
  orders:            { label: "Orders",              fmt: "number",   dataKey: "orders" },
  returns:           { label: "Returns",             fmt: "dollar",   dataKey: "returns" },
  shippingCollected: { label: "Shipping Collected",  fmt: "dollar",   dataKey: "shippingCollected" },
  discounts:         { label: "Discounts",           fmt: "dollar",   dataKey: "discounts" },
  conversionRate:    { label: "Conversion Rate",     fmt: "percent",  dataKey: "conversionRate" },
  aov:               { label: "AOV",                 fmt: "dollarC",  dataKey: "aov" },
  cac:               { label: "CAC",                 fmt: "dollarC",  dataKey: null },
  sessions:          { label: "Sessions",            fmt: "number",   dataKey: "sessions" },
  newCustomers:      { label: "New Customers",       fmt: "number",   dataKey: "newCustomers" },
  returningCustomers:{ label: "Returning Customers", fmt: "number",   dataKey: "returningCustomers" },
};

const fmtN = (n) => n.toLocaleString("en-US");
const fmtD = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtDC = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtP = (n) => n.toFixed(2) + "%";

function formatValue(v, fmt) {
  if (v == null) return "—";
  if (fmt === "dollar") return fmtD(v);
  if (fmt === "dollarC") return fmtDC(v);
  if (fmt === "percent") return fmtP(v);
  return fmtN(v);
}

function formatYAxis(v, fmt) {
  if (fmt === "dollar" || fmt === "dollarC") return `$${Math.round(v / 1000)}K`;
  if (fmt === "percent") return `${v}%`;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v;
}

const ChartTooltip = ({ active, payload, label, fmtType }) => {
  if (!active || !payload?.length) return null;
  const cur = payload.find((p) => p.dataKey === "value");
  const pri = payload.find((p) => p.dataKey === "priorValue");
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-4 py-3 shadow-md min-w-[150px]">
      <p className="text-xs text-[var(--text-muted)] mb-1.5">{label}</p>
      {cur && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#43a9df]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{formatValue(cur.value, fmtType)}</span>
        </div>
      )}
      {pri && pri.value != null && (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-[#8e68ad]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{formatValue(pri.value, fmtType)}</span>
        </div>
      )}
    </div>
  );
};

export default function Overview({ dateRange, compare }) {
  const { start, end } = dateRange;
  const compareEnabled = compare.enabled && compare.start && compare.end;
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  const [activeMetric, setActiveMetric] = useState("revenue");
  const [revenueMode, setRevenueMode] = useState("total");

  const kpis = useMemo(
    () => getOverviewKPIs(start, end, compare.start, compare.end),
    [start, end, compare.start, compare.end]
  );
  const { current: c, prior: p, changes: ch } = kpis;

  const filteredData = useMemo(() => getDataForRange(start, end), [start, end]);
  const priorData = useMemo(
    () => (compareEnabled ? getDataForRange(compare.start, compare.end) : []),
    [compareEnabled, compare.start, compare.end]
  );

  // MER data for current + prior
  const merData = useMemo(() => getMERDataForRange(start, end), [start, end]);
  const priorMerData = useMemo(
    () => (compareEnabled ? getMERDataForRange(compare.start, compare.end) : []),
    [compareEnabled, compare.start, compare.end]
  );

  // Build chart data for selected metric
  // Shopify: total = gross + tax + shipping, gross = product sales, net = gross - discounts - returns
  const activeKey = activeMetric === "revenue"
    ? (revenueMode === "total" ? "totalRevenue" : revenueMode === "gross" ? "grossRevenue" : "netRevenue")
    : activeMetric;
  const metricConf = METRIC_CONFIG[activeKey] || METRIC_CONFIG.revenue;

  const chartData = useMemo(() => {
    // Metrics derived from MER data (spend-based)
    if (activeKey === "cac" || activeKey === "adSpend" || activeKey === "mer") {
      const merKey = activeKey === "cac" ? "cac" : activeKey === "adSpend" ? "spend" : "mer";
      return merData.map((d, i) => ({
        label: format(d.date, "MMM d"),
        value: d[merKey],
        priorValue: priorMerData[i]?.[merKey] ?? null,
      }));
    }
    if (activeKey === "contributionMargin") {
      return filteredData.map((d, i) => {
        const daySpend = merData.find((m) => m.dateStr === d.dateStr)?.spend || 0;
        const cm = d.netRevenue - d.cogs - daySpend - (d.orders * 7.5);
        const priorDay = priorData[i];
        let priorCm = null;
        if (priorDay) {
          const priorSpend = priorMerData.find((m) => m.dateStr === priorDay.dateStr)?.spend || 0;
          priorCm = Math.round(priorDay.netRevenue - priorDay.cogs - priorSpend - (priorDay.orders * 7.5));
        }
        return { label: format(d.date, "MMM d"), value: Math.round(cm), priorValue: priorCm };
      });
    }
    return filteredData.map((d, i) => ({
      label: format(d.date, "MMM d"),
      value: d[metricConf.dataKey],
      priorValue: priorData[i]?.[metricConf.dataKey] ?? null,
    }));
  }, [filteredData, priorData, merData, priorMerData, activeKey, metricConf]);

  // Revenue card value based on Shopify mode
  const revenueValue = revenueMode === "total" ? c.totalRevenue : revenueMode === "gross" ? c.grossRevenue : c.netRevenue;
  const revenueChange = revenueMode === "total" ? ch.totalRevenue : revenueMode === "gross" ? ch.grossRevenue : ch.netRevenue;

  const row1 = [
    { key: "revenue", title: "Revenue", value: fmtD(revenueValue), change: revenueChange, hasDropdown: true },
    { key: "orders", title: "Orders", value: fmtN(c.orders), change: ch.orders },
    { key: "returns", title: "Returns", value: fmtD(c.returns), subtitle: `${fmtN(c.returnItems)} items`, change: ch.returns },
    { key: "cogs", title: "COGS", value: fmtD(c.cogs), change: ch.cogs },
    { key: "shippingCollected", title: "Shipping", value: fmtD(c.shippingCollected), change: ch.shippingCollected },
    { key: "discounts", title: "Discounts", value: fmtD(c.discounts), change: ch.discounts },
    { key: "contributionMargin", title: "CM", value: fmtD(c.contributionMargin), cmPct: c.cmPct, change: ch.contributionMargin },
  ];

  const row2 = [
    { key: "conversionRate", title: "CVR", value: fmtP(c.conversionRate), change: ch.conversionRate },
    { key: "aov", title: "AOV", value: fmtDC(c.aov), change: ch.aov },
    { key: "adSpend", title: "Ad Spend", value: fmtD(c.adSpend), change: ch.adSpend },
    { key: "mer", title: "MER", value: c.mer != null ? c.mer.toFixed(2) + "x" : "—", change: ch.mer },
    { key: "cac", title: "CAC", value: fmtDC(c.cac), change: ch.cac },
    { key: "sessions", title: "Sessions", value: fmtN(c.sessions), change: ch.sessions },
    { key: "newCustomers", title: "New Cust.", value: fmtN(c.newCustomers), change: ch.newCustomers },
    { key: "returningCustomers", title: "Return Cust.", value: fmtN(c.returningCustomers), change: ch.returningCustomers },
  ];

  const chartTitle = activeKey === "revenue" && revenueMode === "gross"
    ? "Gross Revenue Over Time"
    : `${metricConf.label} Over Time`;

  return (
    <div>
      {/* Row 1 — Shopify Sales */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {row1.map((card, i) => (
          <KPICard
            key={card.key}
            title={card.title}
            value={card.value}
            change={card.change}
            index={i}
            active={activeMetric === card.key}
            onClick={() => setActiveMetric(card.key)}
            subtitle={card.subtitle}
            compareEnabled={compareEnabled}
            priorValue={compareEnabled && p[card.key] != null ? formatValue(p[card.key], METRIC_CONFIG[card.key]?.fmt || "dollar") : null}
          >
            {card.hasDropdown ? (
              <select
                value={revenueMode}
                onChange={(e) => { e.stopPropagation(); setRevenueMode(e.target.value); }}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-1.5 py-0.5 text-[var(--text-muted)] focus:outline-none"
              >
                <option value="total">Total</option>
                <option value="gross">Gross</option>
                <option value="net">Net</option>
              </select>
            ) : card.cmPct != null ? (
              <span className="text-[11px] font-semibold text-[var(--accent-blue)]">{card.cmPct}%</span>
            ) : null}
          </KPICard>
        ))}
      </div>

      {/* Row 2 — Performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mt-3">
        {row2.map((card, i) => (
          <KPICard
            key={card.key}
            title={card.title}
            value={card.value}
            change={card.change}
            index={i + 5}
            active={activeMetric === card.key}
            onClick={() => setActiveMetric(card.key)}
            compareEnabled={compareEnabled}
            priorValue={compareEnabled && p[card.key] != null ? formatValue(p[card.key], METRIC_CONFIG[card.key]?.fmt || "number") : null}
          />
        ))}
      </div>

      {/* Export */}
      <div className="flex justify-end mt-4 mb-1">
        <ExportCSV
          data={filteredData.map((d) => ({
            Date: d.dateStr,
            "Gross Revenue": d.grossRevenue,
            "Net Revenue": d.revenue,
            Orders: d.orders,
            Returns: d.returns,
            "Return Items": d.returnItems,
            Shipping: d.shippingCollected,
            Discounts: d.discounts,
            Sessions: d.sessions,
            AOV: d.aov,
            "Conversion Rate": d.conversionRate,
            "New Customers": d.newCustomers,
            "Returning Customers": d.returningCustomers,
          }))}
          filename="overview-daily-data"
        />
      </div>

      {/* Dynamic Chart */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl p-6 hover:border-[var(--border-hover)] transition-colors">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">{chartTitle}</h3>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="overviewGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#43a9df" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#43a9df" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="overviewPriorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8e68ad" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#8e68ad" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: tickColor }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              tickFormatter={(v) => formatYAxis(v, metricConf.fmt)}
              tick={{ fontSize: 12, fill: tickColor }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip fmtType={metricConf.fmt} />} />
            {compareEnabled && (
              <Area
                type="monotone"
                dataKey="priorValue"
                stroke="#8e68ad"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                fill="url(#overviewPriorGrad)"
                dot={false}
                name="Prior"
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke="#43a9df"
              strokeWidth={2}
              fill="url(#overviewGrad)"
              name="Current"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
