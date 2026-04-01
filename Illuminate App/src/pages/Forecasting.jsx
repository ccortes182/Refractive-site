import { useMemo } from "react";
import { getForecastingData } from "../data/mockData";
import KPICard from "../components/KPICard";
import ExportCSV from "../components/ExportCSV";
import { useTheme } from "../context/ThemeContext";
import {
  ComposedChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { format } from "date-fns";

/* ── Tooltips ── */
const PacingTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-4 py-3 shadow-md min-w-[180px]">
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
            ${Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── Sort Arrow ── */
const SortArrow = ({ active, dir }) => (
  <svg
    className={`inline ml-1 h-3 w-3 ${active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {dir === "asc" ? (
      <path d="M6 9V3M6 3L3 6M6 3l3 3" />
    ) : (
      <path d="M6 3v6M6 9l-3-3M6 9l3-3" />
    )}
  </svg>
);

export default function Forecasting({ dateRange, compare }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  const forecast = useMemo(
    () => getForecastingData(dateRange.start, dateRange.end),
    [dateRange.start, dateRange.end]
  );

  const pacingPct = Math.round(
    (forecast.totalRev / forecast.monthTarget) * 100
  );

  /* format cumulative chart data */
  const cumulativeChartData = useMemo(
    () =>
      forecast.cumulative.map((d) => ({
        ...d,
        label: format(new Date(d.dateStr), "MMM d"),
      })),
    [forecast.cumulative]
  );

  const spendChartData = useMemo(
    () =>
      (forecast.spendCumulative || forecast.cumulative).map((d) => ({
        ...d,
        label: format(new Date(d.dateStr), "MMM d"),
      })),
    [forecast.spendCumulative, forecast.cumulative]
  );

  const fmtDollar = (n) => "$" + Math.round(n).toLocaleString("en-US");

  return (
    <div>
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Daily Avg Revenue"
          value={`$${forecast.dailyAvgRev.toLocaleString()}`}
          change={forecast.dailyAvgRevChange ?? 0}
          index={0}
        />
        <KPICard
          title="Required Daily to Hit Target"
          value={fmtDollar(forecast.requiredDaily ?? 0)}
          change={0}
          index={1}
        />
        <KPICard
          title="Days Remaining"
          value={forecast.daysRemaining ?? 0}
          change={0}
          index={2}
        />
        <KPICard
          title="Pacing %"
          value={`${pacingPct}%`}
          change={pacingPct >= 100 ? pacingPct - 100 : -(100 - pacingPct)}
          index={3}
        />
      </div>

      {/* ── Revenue Pacing Chart ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Revenue Pacing
        </h3>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={cumulativeChartData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<PacingTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: tickColor }}
              iconType="plainline"
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#43a9df"
              strokeWidth={2}
              fill="url(#revGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#43a9df" }}
            />
            <Line
              type="monotone"
              dataKey="target"
              name="Target"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Spend Pacing Chart ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Spend Pacing
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={spendChartData}>
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
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
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<PacingTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: tickColor }}
              iconType="plainline"
            />
            <Area
              type="monotone"
              dataKey="spend"
              name="Spend"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#spendGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#8b5cf6" }}
            />
            <Line
              type="monotone"
              dataKey="spendBudget"
              name="Budget"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Weekly Forecast Table ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Weekly Forecast
          </h3>
          <ExportCSV
            data={forecast.weekly}
            filename="weekly-forecast"
            columns={[
              { key: "week", label: "Week" },
              { key: "revenue", label: "Revenue ($)" },
              { key: "orders", label: "Orders" },
              { key: "spend", label: "Spend ($)" },
              { key: "mer", label: "MER" },
            ]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Week
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Revenue ($)
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Orders
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Spend ($)
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  MER
                </th>
              </tr>
            </thead>
            <tbody>
              {(forecast.weekly || []).map((row, i) => (
                <tr
                  key={i}
                  className={
                    i % 2 === 0
                      ? "bg-transparent"
                      : "bg-[var(--bg-table-stripe)]"
                  }
                >
                  <td className="px-4 py-2.5 text-[var(--text-primary)]">
                    {row.week}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                    ${Number(row.revenue).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                    {Number(row.orders).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                    ${Number(row.spend).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                    {row.mer?.toFixed(2)}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Channel Pacing Table ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Channel Pacing
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Channel
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Target ($)
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Actual ($)
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Pacing
                </th>
              </tr>
            </thead>
            <tbody>
              {(forecast.channelPacing || []).map((ch, i) => {
                const pct = Math.round((ch.actual / (ch.target || 1)) * 100);
                let badgeClass =
                  "bg-red-500/15 text-red-400 border border-red-500/20";
                if (pct >= 90)
                  badgeClass =
                    "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
                else if (pct >= 70)
                  badgeClass =
                    "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20";

                return (
                  <tr
                    key={i}
                    className={
                      i % 2 === 0
                        ? "bg-transparent"
                        : "bg-[var(--bg-table-stripe)]"
                    }
                  >
                    <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium">
                      {ch.channel}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      ${Number(ch.target).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      ${Number(ch.actual).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
                      >
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
