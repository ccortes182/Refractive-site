import { useMemo } from "react";
import {
  retentionCohorts,
  getPaybackPeriod,
} from "../data/mockData";
import KPICard from "../components/KPICard";
import ExportCSV from "../components/ExportCSV";
import RetentionHeatmap from "../components/Charts/RetentionHeatmap";
import { useTheme } from "../context/ThemeContext";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COHORT_COLORS = [
  "#43a9df",
  "#8e68ad",
  "#c2dcd4",
  "#34d399",
  "#fbbf24",
  "#f87171",
];

export default function Cohorts({ dateRange, compare }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#333" : "#e5e7eb";
  const tickColor = theme === "dark" ? "#9ca3af" : "#6b7280";

  /* ── KPI values ─────────────────────────────────────────── */
  const paybackMonths = getPaybackPeriod();

  const avgM1Retention = useMemo(() => {
    const vals = retentionCohorts
      .filter((c) => c.retention && c.retention.length > 1)
      .map((c) => c.retention[1]);
    return vals.length
      ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)
      : 0;
  }, []);

  const avg6MonthLtv = useMemo(() => {
    const vals = retentionCohorts
      .filter((c) => c.cumulativeLtv && c.cumulativeLtv.length > 0)
      .map((c) => c.cumulativeLtv[Math.min(5, c.cumulativeLtv.length - 1)]);
    return vals.length
      ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
      : 0;
  }, []);

  /* ── LTV Progression data ───────────────────────────────── */
  const ltvCohorts = useMemo(() => {
    return retentionCohorts.filter(
      (c) => c.cumulativeLtv && c.cumulativeLtv.length >= 3
    ).slice(0, 6);
  }, []);

  const ltvProgressionData = useMemo(() => {
    const maxLen = Math.max(...ltvCohorts.map((c) => c.cumulativeLtv.length));
    const points = [];
    for (let i = 0; i < maxLen; i++) {
      const point = { monthIndex: i };
      ltvCohorts.forEach((c) => {
        if (i < c.cumulativeLtv.length) {
          point[c.month] = c.cumulativeLtv[i];
        }
      });
      points.push(point);
    }
    return points;
  }, [ltvCohorts]);

  /* ── Revenue by Cohort (stacked) ────────────────────────── */
  const revenueCohorts = useMemo(() => {
    return retentionCohorts.filter(
      (c) => c.revenue && c.revenue.length > 0
    ).slice(0, 6);
  }, []);

  const revenueStackData = useMemo(() => {
    const maxLen = Math.max(
      ...revenueCohorts.map((c) => c.revenue.length)
    );
    const points = [];
    for (let i = 0; i < maxLen; i++) {
      const point = { monthIndex: i };
      revenueCohorts.forEach((c) => {
        point[c.month] = i < c.revenue.length ? c.revenue[i] : 0;
      });
      points.push(point);
    }
    return points;
  }, [revenueCohorts]);

  /* ── Table helpers ──────────────────────────────────────── */
  const maxRevCols = useMemo(
    () =>
      Math.max(
        ...retentionCohorts.map((c) =>
          c.revenue ? c.revenue.length : 0
        )
      ),
    []
  );

  const tableHeaders = useMemo(() => {
    const cols = ["Month", "Cohort Size"];
    for (let i = 0; i < maxRevCols; i++) cols.push(`M${i} Rev`);
    cols.push("Total LTV");
    return cols;
  }, [maxRevCols]);

  const tableRows = useMemo(() => {
    return retentionCohorts.map((c) => {
      const row = [
        c.month,
        c.size?.toLocaleString() ?? "—",
      ];
      for (let i = 0; i < maxRevCols; i++) {
        row.push(
          c.revenue && c.revenue[i] != null
            ? `$${c.revenue[i].toLocaleString()}`
            : "—"
        );
      }
      const totalLtv =
        c.cumulativeLtv && c.cumulativeLtv.length > 0
          ? c.cumulativeLtv[c.cumulativeLtv.length - 1]
          : 0;
      row.push(`$${totalLtv.toLocaleString()}`);
      return row;
    });
  }, [maxRevCols]);

  const csvData = useMemo(() => {
    return [tableHeaders, ...tableRows];
  }, [tableHeaders, tableRows]);

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Payback Period"
          value={`${paybackMonths} months`}
          change={0}
          index={0}
        />
        <KPICard
          title="Avg M1 Retention"
          value={`${avgM1Retention}%`}
          change={0}
          index={1}
        />
        <KPICard
          title="Avg 6-Month LTV"
          value={`$${avg6MonthLtv}`}
          change={0}
          index={2}
        />
      </div>

      {/* Retention Heatmap */}
      <RetentionHeatmap cohorts={retentionCohorts} />

      {/* LTV Progression Chart */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          LTV Progression by Cohort
        </h3>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={ltvProgressionData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="monthIndex"
              tickFormatter={(v) => `M${v}`}
              stroke={tickColor}
              tick={{ fill: tickColor, fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v) => `$${v}`}
              stroke={tickColor}
              tick={{ fill: tickColor, fontSize: 12 }}
            />
            <Tooltip
              formatter={(v) => `$${v}`}
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                color: "var(--text-primary)",
              }}
            />
            <Legend />
            {ltvCohorts.map((c, i) => (
              <Line
                key={c.month}
                type="monotone"
                dataKey={c.month}
                stroke={COHORT_COLORS[i % COHORT_COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by Cohort (stacked area) */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Revenue Contribution by Cohort
        </h3>
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={revenueStackData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="monthIndex"
              tickFormatter={(v) => `M${v}`}
              stroke={tickColor}
              tick={{ fill: tickColor, fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
              stroke={tickColor}
              tick={{ fill: tickColor, fontSize: 12 }}
            />
            <Tooltip
              formatter={(v) => `$${v.toLocaleString()}`}
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                color: "var(--text-primary)",
              }}
            />
            <Legend />
            {revenueCohorts.map((c, i) => (
              <Area
                key={c.month}
                type="monotone"
                dataKey={c.month}
                stackId="1"
                stroke={COHORT_COLORS[i % COHORT_COLORS.length]}
                fill={COHORT_COLORS[i % COHORT_COLORS.length]}
                fillOpacity={0.45}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cohort Table */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Cohort Detail
          </h3>
          <ExportCSV data={csvData} filename="cohort-detail" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    className="py-2 px-3 font-medium text-[var(--text-secondary)] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-[var(--border-color)] last:border-0"
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="py-2 px-3 text-[var(--text-primary)] whitespace-nowrap"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
