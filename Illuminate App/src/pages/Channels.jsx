import { useMemo, useState } from "react";
import {
  getChannelSummaryForRange,
  getDailyChannelDataForRange,
} from "../data/mockData";
import KPICard from "../components/KPICard";
import ExportCSV from "../components/ExportCSV";
import ChannelChart from "../components/Charts/ChannelChart";
import { useTheme } from "../context/ThemeContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CHANNEL_COLORS = {
  "Paid Search": "#43a9df",
  "Paid Social": "#8e68ad",
  "Email": "#c2dcd4",
  "Organic": "#34d399",
  "Direct": "#fbbf24",
};

function SortArrow({ active, direction }) {
  return (
    <span className="ml-1 inline-flex flex-col leading-none text-[10px]">
      <span className={active && direction === "asc" ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)] opacity-30"}>▲</span>
      <span className={active && direction === "desc" ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)] opacity-30"}>▼</span>
    </span>
  );
}

const fmtN = (n) => n.toLocaleString("en-US");
const fmtD = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtDC = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SpendRevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((e) => (
        <p key={e.dataKey} style={{ color: e.fill }} className="flex justify-between gap-4">
          <span>{e.name}</span>
          <span className="font-medium">{fmtD(e.value)}</span>
        </p>
      ))}
    </div>
  );
};

export default function Channels({ dateRange, compare }) {
  const { start, end } = dateRange;
  const compareEnabled = compare.enabled && compare.start && compare.end;
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  const [sortField, setSortField] = useState("revenue");
  const [sortDirection, setSortDirection] = useState("desc");
  const [chartMode, setChartMode] = useState("stacked"); // 'stacked' | 'line'

  const channelSummary = useMemo(() => getChannelSummaryForRange(start, end), [start, end]);
  const priorChannelSummary = useMemo(
    () => (compareEnabled ? getChannelSummaryForRange(compare.start, compare.end) : []),
    [compareEnabled, compare.start, compare.end]
  );
  const dailyChannel = useMemo(() => getDailyChannelDataForRange(start, end), [start, end]);
  const priorDailyChannel = useMemo(
    () => (compareEnabled ? getDailyChannelDataForRange(compare.start, compare.end) : []),
    [compareEnabled, compare.start, compare.end]
  );

  // Totals for KPI row
  const sumTotals = (summary) => {
    const t = { spend: 0, revenue: 0, orders: 0, ncRevenue: 0 };
    summary.forEach((ch) => { t.spend += ch.spend; t.revenue += ch.revenue; t.orders += ch.orders; t.ncRevenue += ch.ncRevenue; });
    return {
      spend: t.spend,
      revenue: t.revenue,
      blendedRoas: t.spend > 0 ? Math.round((t.revenue / t.spend) * 100) / 100 : null,
      cpa: t.orders > 0 && t.spend > 0 ? Math.round((t.spend / t.orders) * 100) / 100 : null,
      ncRoas: t.spend > 0 ? Math.round((t.ncRevenue / t.spend) * 100) / 100 : null,
    };
  };
  const totals = useMemo(() => sumTotals(channelSummary), [channelSummary]);
  const priorTotals = useMemo(() => (compareEnabled ? sumTotals(priorChannelSummary) : {}), [compareEnabled, priorChannelSummary]);
  const pct = (c, p) => p ? Math.round(((c - p) / p) * 10000) / 100 : 0;

  // Sorting
  const sorted = useMemo(() => {
    const copy = [...channelSummary];
    copy.sort((a, b) => {
      const aVal = a[sortField] ?? -Infinity;
      const bVal = b[sortField] ?? -Infinity;
      if (typeof aVal === "string") return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    return copy;
  }, [channelSummary, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDirection("desc"); }
  };

  // Donut data
  const donutData = channelSummary.map((ch) => ({ name: ch.channel, value: ch.revenue, color: CHANNEL_COLORS[ch.channel] || "#6b7280" }));

  // Spend vs Revenue bar data
  const spendRevData = channelSummary.filter((ch) => ch.spend > 0).map((ch) => ({
    channel: ch.channel,
    Spend: ch.spend,
    Revenue: ch.revenue,
  }));

  const columns = [
    { key: "channel", label: "Channel", align: "text-left" },
    { key: "spend", label: "Spend", align: "text-right" },
    { key: "revenue", label: "Revenue", align: "text-right" },
    { key: "roas", label: "ROAS", align: "text-right" },
    { key: "platformRoas", label: "Platform ROAS", align: "text-right" },
    { key: "cpa", label: "CPA", align: "text-right" },
    { key: "ncRoas", label: "NC-ROAS", align: "text-right" },
    { key: "sessions", label: "Sessions", align: "text-right" },
    { key: "cpm", label: "CPM", align: "text-right" },
    { key: "ctr", label: "CTR", align: "text-right" },
    { key: "revenuePercent", label: "% Rev", align: "text-right" },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KPICard title="Total Spend" value={fmtD(totals.spend)} change={pct(totals.spend, priorTotals.spend)} index={0}
          compareEnabled={compareEnabled} priorValue={compareEnabled ? fmtD(priorTotals.spend) : null} />
        <KPICard title="Total Revenue" value={fmtD(totals.revenue)} change={pct(totals.revenue, priorTotals.revenue)} index={1}
          compareEnabled={compareEnabled} priorValue={compareEnabled ? fmtD(priorTotals.revenue) : null} />
        <KPICard title="Blended ROAS" value={totals.blendedRoas != null ? totals.blendedRoas.toFixed(2) + "x" : "—"} change={pct(totals.blendedRoas, priorTotals.blendedRoas)} index={2}
          compareEnabled={compareEnabled} priorValue={compareEnabled && priorTotals.blendedRoas ? priorTotals.blendedRoas.toFixed(2) + "x" : null} />
        <KPICard title="Blended CPA" value={totals.cpa != null ? fmtDC(totals.cpa) : "—"} change={pct(totals.cpa, priorTotals.cpa)} index={3}
          compareEnabled={compareEnabled} priorValue={compareEnabled && priorTotals.cpa ? fmtDC(priorTotals.cpa) : null} />
        <KPICard title="NC-ROAS" value={totals.ncRoas != null ? totals.ncRoas.toFixed(2) + "x" : "—"} change={pct(totals.ncRoas, priorTotals.ncRoas)} index={4}
          compareEnabled={compareEnabled} priorValue={compareEnabled && priorTotals.ncRoas ? priorTotals.ncRoas.toFixed(2) + "x" : null} />
      </div>

      {/* Middle row: Donut + Spend vs Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue Mix Donut */}
        <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Revenue Mix</h3>
          <div className="relative" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtD(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spend vs Revenue */}
        <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Spend vs Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spendRevData} layout="vertical" margin={{ left: 10, right: 10 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} />
              <YAxis dataKey="channel" type="category" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} width={85} />
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
              <Tooltip content={<SpendRevenueTooltip />} />
              <Bar dataKey="Spend" fill="#8e68ad" radius={[0, 3, 3, 0]} barSize={14} name="Spend" />
              <Bar dataKey="Revenue" fill="#43a9df" radius={[0, 3, 3, 0]} barSize={14} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attribution Table */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Channel Attribution</h2>
          <ExportCSV
            data={sorted.map((r) => ({
              Channel: r.channel, Spend: r.spend, Revenue: r.revenue,
              ROAS: r.roas?.toFixed(2) || "", "Platform ROAS": r.platformRoas?.toFixed(2) || "",
              CPA: r.cpa?.toFixed(2) || "", "NC-ROAS": r.ncRoas?.toFixed(2) || "",
              Sessions: r.sessions, CPM: r.cpm?.toFixed(2) || "", CTR: r.ctr?.toFixed(2) || "",
              "% Revenue": r.revenuePercent.toFixed(1),
            }))}
            filename="channel-attribution"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 950 }}>
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                {columns.map((col) => (
                  <th key={col.key} onClick={() => handleSort(col.key)}
                    className={`px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] cursor-pointer select-none whitespace-nowrap ${col.align}`}>
                    <span className="inline-flex items-center">
                      {col.label}
                      <SortArrow active={sortField === col.key} direction={sortDirection} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => {
                const color = CHANNEL_COLORS[row.channel] || "#6b7280";
                const overcount = row.platformRoas && row.roas ? Math.round(((row.platformRoas - row.roas) / row.roas) * 100) : null;
                return (
                  <tr key={row.channel} className={i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-table-stripe)]"}>
                    <td className="px-4 py-2.5 text-left font-medium text-[var(--text-primary)]">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        {row.channel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.spend > 0 ? fmtD(row.spend) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{fmtD(row.revenue)}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.roas != null ? row.roas.toFixed(2) + "x" : "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      {row.platformRoas != null ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-[var(--text-secondary)]">{row.platformRoas.toFixed(2)}x</span>
                          {overcount != null && overcount > 0 && (
                            <span className="text-[9px] text-[#fbbf24]">+{overcount}%</span>
                          )}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.cpa != null ? fmtDC(row.cpa) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.ncRoas != null ? row.ncRoas.toFixed(2) + "x" : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{fmtN(row.sessions)}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.cpm != null ? fmtDC(row.cpm) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.ctr != null ? row.ctr.toFixed(2) + "%" : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.revenuePercent.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {(() => {
                const tSpend = sorted.reduce((s, r) => s + r.spend, 0);
                const tRev = sorted.reduce((s, r) => s + r.revenue, 0);
                const tOrders = sorted.reduce((s, r) => s + r.orders, 0);
                const tSessions = sorted.reduce((s, r) => s + r.sessions, 0);
                const tNcRev = sorted.reduce((s, r) => s + r.ncRevenue, 0);
                const tImpressions = sorted.reduce((s, r) => s + r.impressions, 0);
                const tClicks = sorted.reduce((s, r) => s + r.clicks, 0);
                return (
                  <tr className="border-t-2 border-[var(--border-color)] bg-[var(--bg-surface)]">
                    <td className="px-4 py-2.5 text-left font-semibold text-[var(--text-primary)]">Total</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{fmtD(tSpend)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{fmtD(tRev)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{tSpend > 0 ? (tRev / tSpend).toFixed(2) + "x" : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-muted)]">—</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{tOrders > 0 && tSpend > 0 ? fmtDC(tSpend / tOrders) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{tSpend > 0 ? (tNcRev / tSpend).toFixed(2) + "x" : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{fmtN(tSessions)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{tImpressions > 0 && tSpend > 0 ? fmtDC((tSpend / tImpressions) * 1000) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{tImpressions > 0 ? ((tClicks / tImpressions) * 100).toFixed(2) + "%" : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">100%</td>
                  </tr>
                );
              })()}
            </tfoot>
          </table>
        </div>
      </div>

      {/* Revenue Over Time Chart */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Revenue by Channel</h3>
          <div className="flex rounded-lg bg-[var(--toggle-bg)] p-0.5">
            <button onClick={() => setChartMode("stacked")}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${chartMode === "stacked" ? "bg-[var(--toggle-active-bg)] text-[var(--accent-blue)] border border-[var(--toggle-active-border)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
              Stacked
            </button>
            <button onClick={() => setChartMode("line")}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${chartMode === "line" ? "bg-[var(--toggle-active-bg)] text-[var(--accent-blue)] border border-[var(--toggle-active-border)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
              Lines
            </button>
          </div>
        </div>
        <ChannelChart data={dailyChannel} priorData={priorDailyChannel} compareEnabled={compareEnabled} chartMode={chartMode} />
      </div>
    </div>
  );
}
