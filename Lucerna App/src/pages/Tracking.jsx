import { useMemo } from "react";
import { trackingHealth } from "../data/mockData";
import { rangeDays, rangeFactor } from "../lib/rangeScale";
import ExportCSV from "../components/ExportCSV";
import GaugeChart from "../components/Charts/GaugeChart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { STATUS_STYLES } from "../lib/status";
import { CARD } from "../lib/card";
import { useChartTheme } from "../lib/chartTheme";


export default function Tracking({ dateRange, compare }) {
  const { gridColor, tickColor } = useChartTheme();

  /* ── Range-aware data ───────────────────────────────────── */
  // Match rate trend: window the 30-day daily series to the selected range.
  const matchRateSeries = useMemo(() => {
    const days = Math.min(rangeDays({ start: dateRange.start, end: dateRange.end }), 30);
    return trackingHealth.dailyMatchRate.slice(-days);
  }, [dateRange.start, dateRange.end]);

  // Platform revenue figures are period totals: scale by range length.
  // delta is a ratio of the two revenues, so it is unchanged by scaling
  // both sides by the same factor — keep the stored value.
  const platforms = useMemo(() => {
    const factor = rangeFactor({ start: dateRange.start, end: dateRange.end });
    return trackingHealth.platforms.map((p) => ({
      ...p,
      platformRevenue: Math.round(p.platformRevenue * factor),
      lucernaRevenue: Math.round(p.lucernaRevenue * factor),
    }));
  }, [dateRange.start, dateRange.end]);

  /* ── Attribution donut data ─────────────────────────────── */
  const attributedPct = trackingHealth.attributedPct;
  const attributionData = [
    { name: "Attributed", value: attributedPct, fill: "#43a9df" },
    { name: "Unattributed", value: Math.round((100 - attributedPct) * 10) / 10, fill: "var(--border-color)" },
  ];

  /* ── Event Match Rates data ─────────────────────────────── */
  const eventData = trackingHealth.events;

  /* ── Platform table CSV ─────────────────────────────────── */
  const platformHeaders = [
    "Platform",
    "Platform-Reported ($)",
    "Lucerna Calibrated ($)",
    "Delta (%)",
    "Status",
  ];

  const platformRows = platforms.map((p) => [
    p.platform,
    p.platformRevenue,
    p.lucernaRevenue,
    p.delta,
    p.status,
  ]);

  const csvData = [platformHeaders, ...platformRows];

  /* ── Status badge helper ────────────────────────────────── */
  const statusBadge = (status) => {
    const s = status.toLowerCase();
    if (s === "good") {
      return (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]">
          Good
        </span>
      );
    }
    if (s === "warning") {
      return (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES.warning.pill}`}>
          Warning
        </span>
      );
    }
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)]">
        Critical
      </span>
    );
  };

  /* ── UTM bar color helper ───────────────────────────────── */
  const utmBarColor = (coverage) => {
    if (coverage > 80) return "#43a9df";
    if (coverage >= 20) return "var(--warning)";
    return "#f87171";
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tracking Score */}
        <div className={CARD}>
          <div className="flex items-center justify-center">
            <GaugeChart
              score={trackingHealth.overallScore}
              label="Tracking Score"
            />
          </div>
        </div>

        {/* Attribution Coverage */}
        <div className={CARD}>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Attribution Coverage
          </h3>
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={attributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {attributionData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => `${v}%`}
                  contentStyle={{
                    backgroundColor: "var(--bg-card-solid)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-[var(--text-primary)]">
                {attributedPct}%
              </span>
            </div>
          </div>
        </div>

        {/* Overall Stats */}
        <div className={CARD}>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Overall Stats
          </h3>
          <div className="space-y-3">
            {[
              { label: "Overall Score", value: `${trackingHealth.overallScore}/100` },
              { label: "Events Tracked", value: String(trackingHealth.events.length) },
              { label: "Platforms Monitored", value: String(trackingHealth.platforms.length) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-[var(--text-secondary)]">
                  {stat.label}
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event Match Rates */}
      <div className={CARD}>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Event Match Rates
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={eventData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="name"
              stroke={tickColor}
              tick={{ fill: tickColor, fontSize: 12 }}
            />
            <YAxis
              stroke={tickColor}
              tick={{ fill: tickColor, fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(v) => `${v}%`}
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                color: "var(--text-primary)",
              }}
            />
            <Legend />
            <Bar
              dataKey="serverSide"
              name="Server-Side"
              fill="#43a9df"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="browser"
              name="Browser"
              fill="#8e68ad"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Platform Discrepancy Table */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Platform Discrepancy
          </h3>
          <ExportCSV data={csvData} filename="platform-discrepancy" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="py-2 px-3 font-medium text-[var(--text-secondary)]">
                  Platform
                </th>
                <th className="py-2 px-3 font-medium text-[var(--text-secondary)]">
                  Platform-Reported ($)
                </th>
                <th className="py-2 px-3 font-medium text-[var(--text-secondary)]">
                  Lucerna Calibrated ($)
                </th>
                <th className="py-2 px-3 font-medium text-[var(--text-secondary)]">
                  Delta
                </th>
                <th className="py-2 px-3 font-medium text-[var(--text-secondary)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((p) => (
                <tr
                  key={p.platform}
                  className="border-b border-[var(--border-color)] last:border-0"
                >
                  <td className="py-2 px-3 text-[var(--text-primary)]">
                    {p.platform}
                  </td>
                  <td className="py-2 px-3 text-[var(--text-primary)]">
                    ${p.platformRevenue.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-[var(--text-primary)]">
                    ${p.lucernaRevenue.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-[var(--text-primary)]">
                    {p.delta.toFixed(1)}%
                  </td>
                  <td className="py-2 px-3">{statusBadge(p.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Match Rate Trend */}
      <div className={CARD}>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Match Rate Trend ({matchRateSeries.length} Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={matchRateSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => format(new Date(d), "MMM d")}
              stroke={tickColor}
              tick={{ fill: tickColor, fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              stroke={tickColor}
              tick={{ fill: tickColor, fontSize: 12 }}
            />
            <Tooltip
              labelFormatter={(d) => format(new Date(d), "MMM d")}
              formatter={(v) => `${v}%`}
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                color: "var(--text-primary)",
              }}
            />
            <Line
              type="monotone"
              dataKey="matchRate"
              stroke="#43a9df"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* UTM Coverage */}
      <div className={CARD}>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          UTM Parameter Coverage
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={trackingHealth.utmCoverage} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              stroke={tickColor}
              tick={{ fill: tickColor, fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="channel"
              stroke={tickColor}
              tick={{ fill: tickColor, fontSize: 12 }}
              width={100}
            />
            <Tooltip
              formatter={(v) => `${v}%`}
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                color: "var(--text-primary)",
              }}
            />
            <Bar dataKey="coverage" radius={[0, 4, 4, 0]}>
              {trackingHealth.utmCoverage.map((entry, i) => (
                <Cell key={i} fill={utmBarColor(entry.coverage)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
