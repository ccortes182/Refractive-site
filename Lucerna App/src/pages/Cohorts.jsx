import { useMemo } from "react";
import {
  retentionCohorts,
  getPaybackPeriod,
} from "../data/mockData";
import KPICard from "../components/KPICard";
import ExportCSV from "../components/ExportCSV";
import RetentionHeatmap from "../components/Charts/RetentionHeatmap";
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
import { useChartTheme } from "../lib/chartTheme";
import { rangeDays, scaledChange } from "../lib/rangeScale";

const COHORT_COLORS = [
  "#43a9df",
  "#8e68ad",
  "#c2dcd4",
  "#34d399",
  "#fbbf24",
  "#f87171",
];

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Cohort month labels are "MMM yyyy" (e.g. "Apr 2025").
function cohortMonthStart(label) {
  const [mon, yr] = label.split(" ");
  return new Date(Number(yr), MONTH_ABBR.indexOf(mon), 1);
}

export default function Cohorts({ dateRange, compare }) {
  const { gridColor, tickColor } = useChartTheme();

  /* ── Range-filtered cohort set ──────────────────────────── */
  // Cohorts whose start month overlaps the selected range. Sub-month
  // ranges show the most recent cohort only; if no cohort month overlaps
  // the range at all, fall back to the most recent cohort.
  const filteredCohorts = useMemo(() => {
    const start = dateRange?.start ? new Date(dateRange.start) : null;
    const end = dateRange?.end ? new Date(dateRange.end) : null;
    if (!start || !end) return retentionCohorts;
    const overlapping = retentionCohorts.filter((c) => {
      const mStart = cohortMonthStart(c.month);
      const mEnd = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 0, 23, 59, 59);
      return mStart <= end && mEnd >= start;
    });
    const pool = overlapping.length ? overlapping : retentionCohorts.slice(-1);
    if (rangeDays(dateRange) < 28) return pool.slice(-1);
    return pool;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start, dateRange.end]);

  /* ── KPI values ─────────────────────────────────────────── */
  const paybackMonths = getPaybackPeriod();

  const avgM1Retention = useMemo(() => {
    // Young cohorts may have no M1 yet; fall back to the full set so the
    // card never reads 0% for a short recent range.
    let vals = filteredCohorts
      .filter((c) => c.retention && c.retention.length > 1)
      .map((c) => c.retention[1]);
    if (!vals.length) {
      vals = retentionCohorts
        .filter((c) => c.retention && c.retention.length > 1)
        .map((c) => c.retention[1]);
    }
    return vals.length
      ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)
      : 0;
  }, [filteredCohorts]);

  const avg6MonthLtv = useMemo(() => {
    const vals = filteredCohorts
      .filter((c) => c.cumulativeLtv && c.cumulativeLtv.length > 0)
      .map((c) => c.cumulativeLtv[Math.min(5, c.cumulativeLtv.length - 1)]);
    return vals.length
      ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
      : 0;
  }, [filteredCohorts]);

  /* ── LTV Progression data ───────────────────────────────── */
  const ltvCohorts = useMemo(() => {
    const withLtv = filteredCohorts.filter(
      (c) => c.cumulativeLtv && c.cumulativeLtv.length > 0
    );
    const mature = withLtv.filter((c) => c.cumulativeLtv.length >= 3);
    return (mature.length ? mature : withLtv).slice(0, 6);
  }, [filteredCohorts]);

  const ltvProgressionData = useMemo(() => {
    if (!ltvCohorts.length) return [];
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
    return filteredCohorts.filter(
      (c) => c.revenue && c.revenue.length > 0
    ).slice(0, 6);
  }, [filteredCohorts]);

  const revenueStackData = useMemo(() => {
    if (!revenueCohorts.length) return [];
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
        0,
        ...filteredCohorts.map((c) =>
          c.revenue ? c.revenue.length : 0
        )
      ),
    [filteredCohorts]
  );

  const tableHeaders = useMemo(() => {
    const cols = ["Month", "Cohort Size"];
    for (let i = 0; i < maxRevCols; i++) cols.push(`M${i} Rev`);
    cols.push("Total LTV");
    return cols;
  }, [maxRevCols]);

  const tableRows = useMemo(() => {
    return filteredCohorts.map((c) => {
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
  }, [filteredCohorts, maxRevCols]);

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
          change={scaledChange("cohorts:paybackPeriod", dateRange, compare)}
          goodIfUp={false}
          index={0}
        />
        <KPICard
          title="Avg M1 Retention"
          value={`${avgM1Retention}%`}
          change={scaledChange("cohorts:avgM1Retention", dateRange, compare)}
          index={1}
        />
        <KPICard
          title="Avg 6-Month LTV"
          value={`$${avg6MonthLtv}`}
          change={scaledChange("cohorts:avg6MonthLtv", dateRange, compare)}
          index={2}
        />
      </div>

      {/* Retention Heatmap — intentionally unfiltered: the triangle layout
          needs the full cohort history to read correctly. */}
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
