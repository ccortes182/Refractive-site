import { useMemo, useState } from "react";
import { inventoryData } from "../data/mockData";
import KPICard from "../components/KPICard";
import ExportCSV from "../components/ExportCSV";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { statusStyle } from "../lib/status";
import SortArrow from "../components/SortArrow";
import { useChartTheme } from "../lib/chartTheme";
import { scaleAdditive } from "../lib/rangeScale";

/* ── Status badge helper ── */
const statusConfig = {
  Critical: statusStyle("Critical").pill,
  Low: statusStyle("Low").pill,
  Healthy: statusStyle("Healthy").pill,
  Overstock: statusStyle("Overstock").pill,
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      statusConfig[status] || statusConfig.Healthy
    }`}
  >
    {status}
  </span>
);


/* ── Chart Tooltip ── */
const SpendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-4 py-3 shadow-md min-w-[180px]">
      <p className="mb-2 text-xs text-[var(--text-muted)]">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: p.fill || p.color }}
            />
            <span className="text-sm text-[var(--text-secondary)]">
              {p.name}
            </span>
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {p.name === "Days of Supply"
              ? p.value
              : `$${Number(p.value).toLocaleString()}`}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function Inventory({ dateRange }) {
  const { gridColor, tickColor } = useChartTheme();

  // Ad spend is a period metric, so it scales with the selected range.
  // Stock levels, days of supply, and sell-through are point-in-time
  // snapshots and stay untouched.
  const data = useMemo(
    () =>
      (inventoryData || []).map((d) => ({
        ...d,
        adSpend: Math.round(
          scaleAdditive(d.adSpend || 0, {
            start: dateRange.start,
            end: dateRange.end,
          })
        ),
      })),
    [dateRange.start, dateRange.end]
  );

  // Mismatch threshold is spend-based, so it scales with the range too:
  // the same products flag regardless of window length.
  const mismatchThreshold = scaleAdditive(500, {
    start: dateRange.start,
    end: dateRange.end,
  });

  /* ── KPI computations ── */
  const kpis = useMemo(() => {
    if (!data.length)
      return {
        avgDaysOfSupply: 0,
        criticalCount: 0,
        overstockCount: 0,
        avgSellThrough: 0,
      };
    const avgDaysOfSupply = Math.round(
      data.reduce((s, d) => s + (d.daysOfSupply || 0), 0) / data.length
    );
    const criticalCount = data.filter((d) => d.status === "Critical").length;
    const overstockCount = data.filter((d) => d.status === "Overstock").length;
    const avgSellThrough = (
      data.reduce((s, d) => s + (d.sellThroughPct || 0), 0) / data.length
    ).toFixed(1);
    return { avgDaysOfSupply, criticalCount, overstockCount, avgSellThrough };
  }, [data]);

  /* ── Sorting ── */
  const [sortCol, setSortCol] = useState("daysOfSupply");
  const [sortDir, setSortDir] = useState("asc");

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const aVal = a[sortCol] ?? 0;
      const bVal = b[sortCol] ?? 0;
      if (typeof aVal === "string")
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return copy;
  }, [data, sortCol, sortDir]);

  /* ── Reorder alerts ── */
  const reorderItems = useMemo(
    () => data.filter((d) => d.needsReorder),
    [data]
  );

  /* ── Inventory vs Ad Spend chart data (top 5 by adSpend) ── */
  const topBySpend = useMemo(
    () =>
      [...data]
        .sort((a, b) => (b.adSpend || 0) - (a.adSpend || 0))
        .slice(0, 5),
    [data]
  );

  const columns = [
    { key: "product", label: "Product" },
    { key: "currentStock", label: "Current Stock" },
    { key: "dailySellRate", label: "Daily Sell Rate" },
    { key: "daysOfSupply", label: "Days of Supply" },
    { key: "sellThroughPct", label: "Sell-Through %" },
    { key: "status", label: "Status" },
    { key: "adSpend", label: "Ad Spend ($)" },
  ];

  const thClass =
    "px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] cursor-pointer select-none";

  return (
    <div>
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Avg Days of Supply"
          value={kpis.avgDaysOfSupply}
          change={null}
          index={0}
        />
        <KPICard
          title="Stockout Risk Items"
          value={kpis.criticalCount}
          change={null}
          subtitle={kpis.criticalCount > 0 ? "Needs reorder now" : "All items healthy"}
          index={1}
        />
        <KPICard
          title="Overstock Items"
          value={kpis.overstockCount}
          change={null}
          index={2}
        />
        <KPICard
          title="Avg Sell-Through Rate"
          value={`${kpis.avgSellThrough}%`}
          change={null}
          index={3}
        />
      </div>

      {/* ── Inventory Table ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Inventory Overview
          </h3>
          <ExportCSV data={data} filename="inventory" columns={columns} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th
                  className={`text-left ${thClass}`}
                  onClick={() => toggleSort("product")}
                >
                  Product
                  <SortArrow
                    active={sortCol === "product"}
                    direction={sortCol === "product" ? sortDir : "asc"}
                  />
                </th>
                <th
                  className={`text-right ${thClass}`}
                  onClick={() => toggleSort("currentStock")}
                >
                  Current Stock
                  <SortArrow
                    active={sortCol === "currentStock"}
                    direction={sortCol === "currentStock" ? sortDir : "asc"}
                  />
                </th>
                <th
                  className={`text-right ${thClass}`}
                  onClick={() => toggleSort("dailySellRate")}
                >
                  Daily Sell Rate
                  <SortArrow
                    active={sortCol === "dailySellRate"}
                    direction={sortCol === "dailySellRate" ? sortDir : "asc"}
                  />
                </th>
                <th
                  className={`text-right ${thClass}`}
                  onClick={() => toggleSort("daysOfSupply")}
                >
                  Days of Supply
                  <SortArrow
                    active={sortCol === "daysOfSupply"}
                    direction={sortCol === "daysOfSupply" ? sortDir : "asc"}
                  />
                </th>
                <th
                  className={`text-right ${thClass}`}
                  onClick={() => toggleSort("sellThroughPct")}
                >
                  Sell-Through %
                  <SortArrow
                    active={sortCol === "sellThroughPct"}
                    direction={sortCol === "sellThroughPct" ? sortDir : "asc"}
                  />
                </th>
                <th
                  className={`text-center ${thClass}`}
                  onClick={() => toggleSort("status")}
                >
                  Status
                  <SortArrow
                    active={sortCol === "status"}
                    direction={sortCol === "status" ? sortDir : "asc"}
                  />
                </th>
                <th
                  className={`text-right ${thClass}`}
                  onClick={() => toggleSort("adSpend")}
                >
                  Ad Spend ($)
                  <SortArrow
                    active={sortCol === "adSpend"}
                    direction={sortCol === "adSpend" ? sortDir : "asc"}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
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
                    {Number(row.currentStock).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                    {row.dailySellRate}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                    {row.daysOfSupply}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                    {row.sellThroughPct}%
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                    ${Number(row.adSpend).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Reorder Alerts ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Reorder Alerts
        </h3>
        {reorderItems.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No reorder alerts at this time.
          </p>
        ) : (
          <div className="space-y-2">
            {reorderItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                  i % 2 === 0
                    ? "bg-transparent"
                    : "bg-[var(--bg-table-stripe)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {item.product}
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
                  <span>
                    Stock:{" "}
                    <span className="font-semibold text-[var(--text-primary)]">
                      {item.currentStock}
                    </span>
                  </span>
                  <span>
                    Reorder Point:{" "}
                    <span className="font-semibold text-[var(--text-primary)]">
                      {item.reorderPoint}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Inventory vs Ad Spend ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Inventory vs Ad Spend (Top 5)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            layout="vertical"
            data={topBySpend}
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
            />
            <YAxis
              type="category"
              dataKey="product"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip content={<SpendTooltip />} />
            <Bar
              dataKey="adSpend"
              name="Ad Spend ($)"
              fill="#8b5cf6"
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
            <Bar
              dataKey="daysOfSupply"
              name="Days of Supply"
              fill="#43a9df"
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Supplementary mismatch table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Product
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Ad Spend ($)
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Days of Supply
                </th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {topBySpend.map((row, i) => {
                const mismatch =
                  (row.adSpend || 0) > mismatchThreshold &&
                  (row.status === "Critical" || row.status === "Low");
                return (
                  <tr
                    key={i}
                    className={`${
                      i % 2 === 0
                        ? "bg-transparent"
                        : "bg-[var(--bg-table-stripe)]"
                    } ${mismatch ? "ring-1 ring-red-500/30 rounded" : ""}`}
                  >
                    <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium">
                      {row.product}
                      {mismatch && (
                        <span className="ml-2 text-xs text-red-400 font-semibold">
                          Mismatch
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      ${Number(row.adSpend).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      {row.daysOfSupply}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <StatusBadge status={row.status} />
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
