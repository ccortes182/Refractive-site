import { useMemo, useState } from "react";
import { geoData, getGeoTrend } from "../data/mockData";
import ExportCSV from "../components/ExportCSV";
import USMap from "../components/Charts/USMap";
import { useTheme } from "../context/ThemeContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const TREND_COLORS = ["#43a9df", "#8e68ad", "#c2dcd4", "#34d399", "#fbbf24"];
const MAP_METRICS = [
  { key: "revenue", label: "Revenue" },
  { key: "orders", label: "Orders" },
  { key: "roas", label: "ROAS" },
  { key: "cac", label: "CAC" },
  { key: "netMargin", label: "Net Margin" },
];

export default function Geo({ dateRange, compare }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  const [mapMetric, setMapMetric] = useState("revenue");

  const geoTrend = useMemo(() => getGeoTrend(), []);

  const [sortField, setSortField] = useState("revenue");
  const [sortDir, setSortDir] = useState("desc");

  const allSorted = useMemo(() => {
    const copy = [...geoData];
    copy.sort((a, b) => sortDir === "asc" ? (a[sortField] ?? 0) - (b[sortField] ?? 0) : (b[sortField] ?? 0) - (a[sortField] ?? 0));
    return copy;
  }, [sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const tableColumns = [
    { key: "state", label: "State" },
    { key: "revenue", label: "Revenue ($)" },
    { key: "orders", label: "Orders" },
    { key: "aov", label: "AOV ($)" },
    { key: "cac", label: "CAC ($)" },
    { key: "roas", label: "ROAS" },
    { key: "shippingCost", label: "Shipping ($)" },
    { key: "netMargin", label: "Net Margin ($)" },
  ];

  return (
    <div className="space-y-6">
      {/* US Map */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Performance by State</h3>
          <div className="flex rounded-lg bg-[var(--toggle-bg)] p-0.5">
            {MAP_METRICS.map((m) => (
              <button key={m.key} onClick={() => setMapMetric(m.key)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  mapMetric === m.key
                    ? "bg-[var(--toggle-active-bg)] text-[var(--accent-blue)] border border-[var(--toggle-active-border)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <USMap data={geoData} valueKey={mapMetric} />
      </div>

      {/* All States Table */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">All States</h3>
          <ExportCSV data={allSorted} filename="geo-all-states" columns={tableColumns} />
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: 440 }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[var(--bg-surface)]">
                {[
                  { key: "state", label: "State", align: "text-left" },
                  { key: "revenue", label: "Revenue", align: "text-right" },
                  { key: "orders", label: "Orders", align: "text-right" },
                  { key: "aov", label: "AOV", align: "text-right" },
                  { key: "roas", label: "ROAS", align: "text-right" },
                  { key: "cac", label: "CAC", align: "text-right" },
                  { key: "shippingCost", label: "Shipping", align: "text-right" },
                  { key: "netMargin", label: "Net Margin", align: "text-right" },
                ].map((col) => (
                  <th key={col.key} onClick={() => handleSort(col.key)}
                    className={`px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] cursor-pointer select-none whitespace-nowrap ${col.align}`}>
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortField === col.key && (
                        <span className="text-[var(--accent-blue)]">{sortDir === "desc" ? "▼" : "▲"}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSorted.map((row, i) => (
                <tr key={row.state} className={i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-table-stripe)]"}>
                  <td className="px-4 py-2 text-left font-medium text-[var(--text-primary)]">{row.state}</td>
                  <td className="px-4 py-2 text-right text-[var(--text-secondary)]">${row.revenue.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-[var(--text-secondary)]">{row.orders.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-[var(--text-secondary)]">${row.aov}</td>
                  <td className="px-4 py-2 text-right text-[var(--text-secondary)]">{row.roas}x</td>
                  <td className="px-4 py-2 text-right text-[var(--text-secondary)]">${row.cac}</td>
                  <td className="px-4 py-2 text-right text-[var(--text-secondary)]">${row.shippingCost.toLocaleString()}</td>
                  <td className={`px-4 py-2 text-right font-medium ${row.netMargin >= 0 ? "text-[var(--badge-positive-text)]" : "text-[var(--badge-negative-text)]"}`}>
                    ${row.netMargin.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regional Trend */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Regional Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={geoTrend.trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="dateStr"
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-primary)",
              }}
              formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
            />
            <Legend />
            {geoTrend.topStates.map((state, i) => (
              <Line
                key={state}
                type="monotone"
                dataKey={state}
                stroke={TREND_COLORS[i % TREND_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
