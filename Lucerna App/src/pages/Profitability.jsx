import { useMemo } from "react";
import { getProfitabilityData } from "../data/mockData";
import KPICard from "../components/KPICard";
import ExportCSV from "../components/ExportCSV";
import { useTheme } from "../context/ThemeContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { format } from "date-fns";

/* ── Tooltips ── */
const DollarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-4 py-3 shadow-md min-w-[160px]">
      <p className="mb-2 text-xs text-[var(--text-muted)]">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: p.color || p.fill }}
            />
            <span className="text-sm text-[var(--text-secondary)]">
              {p.name}
            </span>
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            ${Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

const MarginTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-4 py-3 shadow-md min-w-[140px]">
      <p className="mb-2 text-xs text-[var(--text-muted)]">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: p.color }}
            />
            <span className="text-sm text-[var(--text-secondary)]">
              {p.name}
            </span>
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {Number(p.value).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
};

export default function Profitability({ dateRange, compare }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  const profit = useMemo(
    () => getProfitabilityData(dateRange.start, dateRange.end),
    [dateRange.start, dateRange.end]
  );

  const marginChartData = useMemo(
    () =>
      (profit.dailyMargin || []).map((d) => ({
        ...d,
        label: format(new Date(d.dateStr), "MMM d"),
      })),
    [profit.dailyMargin]
  );

  return (
    <div>
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="CM$"
          value={`$${profit.cm.toLocaleString()}`}
          change={profit.cmChange ?? 0}
          index={0}
        />
        <KPICard
          title="CM%"
          value={`${profit.cmPct}%`}
          change={profit.cmPctChange ?? 0}
          index={1}
        />
        <KPICard
          title="CM / Order"
          value={`$${profit.cmPerOrder}`}
          change={profit.cmPerOrderChange ?? 0}
          index={2}
        />
        <KPICard
          title="Breakeven ROAS"
          value={`${profit.breakevenRoas}x`}
          change={0}
          index={3}
        />
      </div>

      {/* ── P&L Waterfall ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          P&L Waterfall
        </h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={profit.waterfall || []}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<DollarTooltip />} />
            <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
              {(profit.waterfall || []).map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Margin Over Time ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Margin Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={marginChartData}>
            <defs>
              <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#43a9df" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#43a9df" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<MarginTooltip />} />
            <Area
              type="monotone"
              dataKey="cmPct"
              name="CM%"
              stroke="#43a9df"
              strokeWidth={2}
              fill="url(#marginGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#43a9df" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Margin by Channel ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Margin by Channel
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            layout="vertical"
            data={profit.channelMargin || []}
            margin={{ left: 20 }}
          >
            <CartesianGrid
              stroke={gridColor}
              strokeDasharray="3 3"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="channel"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip content={<MarginTooltip />} />
            <Bar dataKey="cmPct" name="CM%" radius={[0, 4, 4, 0]}>
              {(profit.channelMargin || []).map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.cmPct >= 0 ? "#10b981" : "#ef4444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Margin by Product Table ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Margin by Product
          </h3>
          <ExportCSV
            data={profit.productMargin || []}
            filename="product-margin"
            columns={[
              { key: "product", label: "Product" },
              { key: "revenue", label: "Revenue ($)" },
              { key: "cm", label: "CM ($)" },
              { key: "cmPct", label: "CM%" },
            ]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Product
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Revenue ($)
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  CM ($)
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  CM%
                </th>
              </tr>
            </thead>
            <tbody>
              {(profit.productMargin || []).map((row, i) => (
                <tr
                  key={i}
                  className={
                    i % 2 === 0
                      ? "bg-transparent"
                      : "bg-[var(--bg-table-stripe)]"
                  }
                >
                  <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium">
                    {row.product}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                    ${Number(row.revenue).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                    ${Number(row.cm).toLocaleString()}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-semibold ${
                      row.cmPct >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {row.cmPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
