import { useMemo, useState } from "react";
import { getMERKPIs, getMERDataForRange, getEfficiencyByChannel, calibrationFactors } from "../data/mockData";
import KPICard from "../components/KPICard";
import ExportCSV from "../components/ExportCSV";
import MERChart from "../components/Charts/MERChart";
import { useTheme } from "../context/ThemeContext";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

const CARD = "bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-5";
const CHANNEL_COLORS = { "Paid Search": "#43a9df", "Paid Social": "#8e68ad", Email: "#c2dcd4", Organic: "#34d399", Direct: "#fbbf24" };

const fmtD = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtDC = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctChange = (c, p) => p ? Math.round(((c - p) / p) * 10000) / 100 : 0;

const ChartTooltip = ({ active, payload, label, keys }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-3 py-2 text-xs shadow-md min-w-[140px]">
      <p className="mb-1 text-[var(--text-muted)]">{label}</p>
      {payload.map((e) => (
        <div key={e.dataKey} className="flex justify-between gap-3">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.stroke || e.color }} />{e.name || e.dataKey}</span>
          <span className="font-medium text-[var(--text-primary)]">{typeof e.value === "number" ? (e.dataKey.includes("mer") || e.dataKey.includes("roas") ? e.value.toFixed(2) + "x" : fmtD(e.value)) : e.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Efficiency({ dateRange, compare }) {
  const { start, end } = dateRange;
  const compareEnabled = compare.enabled && compare.start && compare.end;
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  const [activeChart, setActiveChart] = useState("mer"); // mer | cac | spend

  // Current period
  const kpis = useMemo(() => getMERKPIs(start, end), [start, end]);
  const merData = useMemo(() => getMERDataForRange(start, end), [start, end]);
  const channelEff = useMemo(() => getEfficiencyByChannel(start, end), [start, end]);

  // Prior period
  const priorKpis = useMemo(() => compareEnabled ? getMERKPIs(compare.start, compare.end) : null, [compareEnabled, compare.start, compare.end]);
  const priorMerData = useMemo(() => compareEnabled ? getMERDataForRange(compare.start, compare.end) : [], [compareEnabled, compare.start, compare.end]);

  // Chart data with prior overlay
  const chartData = useMemo(() => {
    const keyMap = { mer: "mer", cac: "cac", spend: "spend" };
    const key = keyMap[activeChart];
    return merData.map((d, i) => ({
      label: format(d.date, "MMM d"),
      value: d[key],
      priorValue: priorMerData[i]?.[key] ?? null,
    }));
  }, [merData, priorMerData, activeChart]);

  const chartTitle = { mer: "MER Over Time", cac: "CAC Over Time", spend: "Ad Spend Over Time" }[activeChart];
  const chartFormat = activeChart === "mer" ? (v) => v.toFixed(1) + "x" : (v) => "$" + Math.round(v / 1000) + "K";

  // Paid channels for platform comparison
  const paidChannels = useMemo(() => channelEff.filter((c) => c.platformRoas != null), [channelEff]);

  // Totals for efficiency table
  const effTotals = useMemo(() => {
    const t = { spend: 0, revenue: 0, orders: 0, ncRevenue: 0 };
    channelEff.forEach((c) => { t.spend += c.spend; t.revenue += c.revenue; t.orders += c.orders; t.ncRevenue += c.ncRevenue; });
    return t;
  }, [channelEff]);

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KPICard title="MER" value={kpis.mer != null ? kpis.mer.toFixed(2) + "x" : "—"}
          change={priorKpis ? pctChange(kpis.mer, priorKpis.mer) : 0} index={0}
          compareEnabled={compareEnabled} priorValue={compareEnabled && priorKpis?.mer ? priorKpis.mer.toFixed(2) + "x" : null}
          active={activeChart === "mer"} onClick={() => setActiveChart("mer")} />
        <KPICard title="NC-MER" value={kpis.ncMer != null ? kpis.ncMer.toFixed(2) + "x" : "—"}
          change={priorKpis ? pctChange(kpis.ncMer, priorKpis.ncMer) : 0} index={1}
          compareEnabled={compareEnabled} priorValue={compareEnabled && priorKpis?.ncMer ? priorKpis.ncMer.toFixed(2) + "x" : null} />
        <KPICard title="CAC" value={kpis.cac != null ? fmtDC(kpis.cac) : "—"}
          change={priorKpis ? pctChange(kpis.cac, priorKpis.cac) : 0} index={2}
          compareEnabled={compareEnabled} priorValue={compareEnabled && priorKpis?.cac ? fmtDC(priorKpis.cac) : null}
          active={activeChart === "cac"} onClick={() => setActiveChart("cac")} />
        <KPICard title="Ad Spend" value={fmtD(kpis.totalSpend)}
          change={priorKpis ? pctChange(kpis.totalSpend, priorKpis.totalSpend) : 0} index={3}
          compareEnabled={compareEnabled} priorValue={compareEnabled && priorKpis ? fmtD(priorKpis.totalSpend) : null}
          active={activeChart === "spend"} onClick={() => setActiveChart("spend")} />
        <KPICard title="Spend % of Rev" value={kpis.spendPctOfRev.toFixed(1) + "%"}
          change={priorKpis ? pctChange(kpis.spendPctOfRev, priorKpis.spendPctOfRev) : 0} index={4}
          compareEnabled={compareEnabled} priorValue={compareEnabled && priorKpis ? priorKpis.spendPctOfRev.toFixed(1) + "%" : null} />
      </div>

      {/* Interactive Trend Chart */}
      <div className={CARD}>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{chartTitle}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#43a9df" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#43a9df" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="effPriorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8e68ad" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#8e68ad" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={{ stroke: gridColor }} />
            <YAxis tickFormatter={chartFormat} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            {compareEnabled && (
              <Area type="monotone" dataKey="priorValue" stroke="#8e68ad" strokeWidth={1.5} strokeDasharray="6 3" fill="url(#effPriorGrad)" dot={false} name="Prior" />
            )}
            <Area type="monotone" dataKey="value" stroke="#43a9df" strokeWidth={2} fill="url(#effGrad)" dot={false} name="Current" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Spend vs Revenue dual axis */}
      <MERChart data={merData} />

      {/* Channel Efficiency Table */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Channel Efficiency</h3>
          <ExportCSV
            data={channelEff.map((r) => ({
              Channel: r.channel, Spend: r.spend, Revenue: r.revenue,
              MER: r.mer?.toFixed(2) || "", CAC: r.cac ? Math.round(r.cac) : "",
              "NC-Revenue": r.ncRevenue, "NC-ROAS": r.ncRoas?.toFixed(2) || "",
            }))}
            filename="channel-efficiency"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-left">Channel</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">Spend</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">Revenue</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">MER</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">CAC</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">NC-Rev</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">NC-ROAS</th>
              </tr>
            </thead>
            <tbody>
              {channelEff.map((row, i) => (
                <tr key={row.channel} className={i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-table-stripe)]"}>
                  <td className="px-4 py-2.5 text-left font-medium text-[var(--text-primary)]">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHANNEL_COLORS[row.channel] || "#6b7280" }} />
                      {row.channel}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.spend > 0 ? fmtD(row.spend) : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{fmtD(row.revenue)}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.mer != null ? row.mer.toFixed(2) + "x" : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.cac != null ? fmtDC(row.cac) : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{fmtD(row.ncRevenue)}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.ncRoas != null ? row.ncRoas.toFixed(2) + "x" : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border-color)] bg-[var(--bg-surface)]">
                <td className="px-4 py-2.5 text-left font-semibold text-[var(--text-primary)]">Total</td>
                <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{fmtD(effTotals.spend)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{fmtD(effTotals.revenue)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{effTotals.spend > 0 ? (effTotals.revenue / effTotals.spend).toFixed(2) + "x" : "—"}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{effTotals.orders > 0 && effTotals.spend > 0 ? fmtDC(effTotals.spend / effTotals.orders) : "—"}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{fmtD(effTotals.ncRevenue)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{effTotals.spend > 0 ? (effTotals.ncRevenue / effTotals.spend).toFixed(2) + "x" : "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Incrementality Calibration Factors */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Incrementality Calibration Factors</h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Apply these multipliers to platform-reported conversions for true incremental value</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-left">Channel</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">Platform Reports</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">Actual Incremental</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-center">Confidence</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">Last Calibrated</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-left">Source</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-left" style={{ minWidth: 160 }}>Factor Visual</th>
              </tr>
            </thead>
            <tbody>
              {calibrationFactors.map((row, i) => (
                <tr key={row.channel} className={i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-table-stripe)]"}>
                  <td className="px-4 py-2.5 text-left font-medium text-[var(--text-primary)]">{row.channel}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">1.00x</td>
                  <td className="px-4 py-2.5 text-right font-medium text-[var(--text-primary)]">{row.actualMultiplier.toFixed(2)}x</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      row.confidence === "High"
                        ? "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]"
                        : "bg-[#fbbf24]/15 text-[#fbbf24]"
                    }`}>
                      {row.confidence}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-muted)]">{row.lastCalibrated}</td>
                  <td className="px-4 py-2.5 text-left text-[var(--text-secondary)]">{row.source}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-full h-2.5 rounded-full bg-red-500/20 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#43a9df]"
                          style={{ width: `${row.actualMultiplier * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{Math.round(row.actualMultiplier * 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blended vs Platform ROAS */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Platform Over-Reporting</h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Platform self-reported ROAS vs Illuminate measured ROAS</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-left">Channel</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">Platform ROAS</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">Illuminate ROAS</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">Over-Report</th>
              </tr>
            </thead>
            <tbody>
              {paidChannels.map((row, i) => {
                const delta = row.mer > 0 ? Math.round(((row.platformRoas - row.mer) / row.mer) * 10000) / 100 : 0;
                return (
                  <tr key={row.channel} className={i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-table-stripe)]"}>
                    <td className="px-4 py-2.5 text-left font-medium text-[var(--text-primary)]">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHANNEL_COLORS[row.channel] || "#6b7280" }} />
                        {row.channel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.platformRoas.toFixed(2)}x</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{row.mer?.toFixed(2)}x</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        delta > 15 ? "bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)]"
                        : delta > 5 ? "bg-[#fbbf24]/15 text-[#fbbf24]"
                        : "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]"
                      }`}>
                        +{delta.toFixed(1)}%
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
