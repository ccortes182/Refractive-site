import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { journeyData } from "../data/mockData";
import KPICard from "../components/KPICard";
import ExportCSV from "../components/ExportCSV";
import { useTheme } from "../context/ThemeContext";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHANNEL_COLORS = {
  "Paid Social": "#8e68ad",
  "Paid Search": "#43a9df",
  Email: "#c2dcd4",
  Organic: "#34d399",
  Direct: "#6b7280",
};

const MODEL_COLORS = {
  lastClick: "#6b7280",
  linear: "#43a9df",
  positionBased: "#8e68ad",
  dataDriven: "#34d399",
};

const CARD = "bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-5";
const fmtD = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtN = (n) => n.toLocaleString("en-US");

function ChannelPill({ name }) {
  return (
    <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white whitespace-nowrap"
      style={{ backgroundColor: CHANNEL_COLORS[name] || "#6b7280" }}>
      {name}
    </span>
  );
}

function PathFlow({ path }) {
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {path.map((step, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <ChannelPill name={step} />
          {i < path.length - 1 && (
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-[var(--text-muted)]/40 flex-shrink-0">
              <path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </span>
      ))}
    </span>
  );
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--toggle-bg)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-[var(--text-primary)] w-8 text-right font-medium">{value}%</span>
    </div>
  );
}

export default function Journeys({ dateRange, compare }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  const navigate = useNavigate();

  const j = journeyData;
  const k = j.kpis;
  const [channelFilter, setChannelFilter] = useState("All");

  const allChannels = useMemo(() => {
    const set = new Set();
    j.topPaths.forEach((p) => p.path.forEach((s) => { if (s !== "Purchase") set.add(s); }));
    return ["All", ...Array.from(set)];
  }, [j.topPaths]);

  const filteredPaths = useMemo(() => {
    const sorted = [...j.topPaths].sort((a, b) => b.conversions - a.conversions);
    if (channelFilter === "All") return sorted;
    return sorted.filter((p) => p.path.includes(channelFilter));
  }, [j.topPaths, channelFilter]);

  const maxAssisted = useMemo(() =>
    Math.max(...j.assistedConversions.flatMap((r) => [r.firstTouch, r.assisted, r.lastTouch])),
  [j.assistedConversions]);

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard title="Total Conversions" value={fmtN(k.totalConversions)} change={8.3} index={0} />
        <KPICard title="Total Revenue" value={fmtD(k.totalRevenue)} change={12.1} index={1} />
        <KPICard title="Avg Touchpoints" value={k.avgTouchpoints.toString()} change={-2.4} index={2} />
        <KPICard title="Avg Days to Convert" value={k.avgDaysToConvert + "d"} change={-5.1} index={3} />
        <KPICard title="Single-Touch" value={k.singleTouchPct + "%"} change={3.8} index={4} />
        <KPICard title="Multi-Touch" value={k.multiTouchPct + "%"} change={-1.2} index={5} />
      </div>

      {/* Top Conversion Paths + Conversion Lag side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Paths table — 2/3 width */}
        <div className={`${CARD} xl:col-span-2`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Conversion Paths</h3>
            <div className="flex items-center gap-2">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="text-[10px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-muted)] focus:outline-none"
              >
                {allChannels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
              </select>
              <ExportCSV
                data={filteredPaths.map((p) => ({ Path: p.path.join(" → "), Conversions: p.conversions, "Avg Days": p.avgDays, Revenue: p.revenue }))}
                filename="conversion_paths"
              />
            </div>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: 340 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[var(--bg-surface)]">
                  <th className="text-left py-2 px-3 font-medium text-[var(--text-muted)] uppercase text-[10px]">Path</th>
                  <th className="text-right py-2 px-3 font-medium text-[var(--text-muted)] uppercase text-[10px]">Conv.</th>
                  <th className="text-right py-2 px-3 font-medium text-[var(--text-muted)] uppercase text-[10px]">Avg Days</th>
                  <th className="text-right py-2 px-3 font-medium text-[var(--text-muted)] uppercase text-[10px]">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {filteredPaths.map((p, i) => (
                  <tr key={i}
                    onClick={() => {
                      const pathChannels = p.path.filter((s) => s !== "Purchase").join(",");
                      navigate(`/transactions?path=${encodeURIComponent(pathChannels)}`);
                    }}
                    className={`cursor-pointer transition-colors hover:bg-[var(--border-color)] ${i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-table-stripe)]"}`}
                  >
                    <td className="py-2.5 px-3"><PathFlow path={p.path} /></td>
                    <td className="py-2.5 px-3 text-right text-[var(--text-primary)] font-medium">{fmtN(p.conversions)}</td>
                    <td className="py-2.5 px-3 text-right text-[var(--text-secondary)]">{p.avgDays}d</td>
                    <td className="py-2.5 px-3 text-right text-[var(--text-secondary)]">{fmtD(p.revenue)}</td>
                  </tr>
                ))}
                {filteredPaths.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-[var(--text-muted)] text-xs">No paths include {channelFilter}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conversion Lag — 1/3 width */}
        <div className={CARD}>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Conversion Lag</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={j.conversionLag}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="day" tick={{ fill: tickColor, fontSize: 10 }} tickLine={false} axisLine={{ stroke: gridColor }}
                tickFormatter={(v) => v % 5 === 0 ? `D${v}` : ""} />
              <YAxis tick={{ fill: tickColor, fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--bg-card-solid)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-primary)" }}
                formatter={(v) => [`${v}%`, "Cumulative"]}
                labelFormatter={(v) => `Day ${v}`}
              />
              <Line type="monotone" dataKey="cumPct" stroke="#43a9df" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
            {j.conversionLag.find((d) => d.cumPct >= 50)?.day || "?"}d to 50% · {j.conversionLag.find((d) => d.cumPct >= 80)?.day || "?"}d to 80%
          </p>
        </div>
      </div>

      {/* Assisted Conversions + Touchpoint Distribution side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Assisted Conversions with mini bars */}
        <div className={CARD}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Assisted Conversions</h3>
            <ExportCSV
              data={j.assistedConversions.map((r) => ({ Channel: r.channel, "First Touch %": r.firstTouch, "Assisted %": r.assisted, "Last Touch %": r.lastTouch }))}
              filename="assisted_conversions"
            />
          </div>
          <div className="space-y-3">
            {j.assistedConversions.map((r) => (
              <div key={r.channel} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHANNEL_COLORS[r.channel] || "#6b7280" }} />
                  <span className="text-xs font-medium text-[var(--text-primary)]">{r.channel}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pl-4">
                  <div>
                    <p className="text-[9px] text-[var(--text-muted)] mb-0.5">First Touch</p>
                    <MiniBar value={r.firstTouch} max={maxAssisted} color="#43a9df" />
                  </div>
                  <div>
                    <p className="text-[9px] text-[var(--text-muted)] mb-0.5">Assisted</p>
                    <MiniBar value={r.assisted} max={maxAssisted} color="#8e68ad" />
                  </div>
                  <div>
                    <p className="text-[9px] text-[var(--text-muted)] mb-0.5">Last Touch</p>
                    <MiniBar value={r.lastTouch} max={maxAssisted} color="#34d399" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Touchpoints + Time to Convert stacked */}
        <div className="space-y-5">
          <div className={CARD}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Touchpoints per Conversion</h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={j.touchpointDistribution} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="touchpoints" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: "var(--bg-card-solid)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-primary)" }} formatter={(v) => `${v}%`} />
                <Bar dataKey="pct" fill="#8e68ad" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={CARD}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Time to Convert</h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={j.timeToConvert} layout="vertical" barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="bucket" tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ backgroundColor: "var(--bg-card-solid)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-primary)" }} formatter={(v) => `${v}%`} />
                <Bar dataKey="pct" fill="#43a9df" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Attribution Model Comparison */}
      <div className={CARD}>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Attribution Model Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={j.modelComparison} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="channel" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--bg-card-solid)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-primary)" }}
              formatter={(v) => `${v}%`}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="lastClick" name="Last Click" fill={MODEL_COLORS.lastClick} radius={[3, 3, 0, 0]} />
            <Bar dataKey="linear" name="Linear" fill={MODEL_COLORS.linear} radius={[3, 3, 0, 0]} />
            <Bar dataKey="positionBased" name="Position-Based" fill={MODEL_COLORS.positionBased} radius={[3, 3, 0, 0]} />
            <Bar dataKey="dataDriven" name="Data-Driven" fill={MODEL_COLORS.dataDriven} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
