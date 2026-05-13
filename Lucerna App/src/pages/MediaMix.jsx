import { useState, useMemo } from "react";
import { mmmData, simulateBudget, savedScenarios } from "../data/mockData";
import ExportCSV from "../components/ExportCSV";
import BudgetSlider from "../components/BudgetSlider";
import SaturationChart from "../components/Charts/SaturationChart";
import { useTheme } from "../context/ThemeContext";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const fmtDollar = (v) =>
  "$" + Math.round(v).toLocaleString("en-US");

const fmtDollarK = (v) =>
  "$" + Math.round(v / 1000).toLocaleString("en-US") + "K";

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-[var(--text-primary)]">{name}</p>
      <p className="text-[var(--text-muted)]">{fmtDollar(value)}</p>
    </div>
  );
};

const AdstockTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-[var(--text-primary)]">Day {label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  );
};

function CenterLabel({ total }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center">
        <span className="block text-xs text-[var(--text-muted)]">Total</span>
        <span className="block text-base font-semibold text-[var(--text-primary)]">{total}</span>
      </div>
    </div>
  );
}

export default function MediaMix({ dateRange, compare }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  // Budget simulator state
  const [allocations, setAllocations] = useState(() => {
    const init = {};
    mmmData.channels.forEach((ch) => {
      init[ch.name] = ch.currentSpend;
    });
    return init;
  });

  const simResults = useMemo(() => simulateBudget(allocations), [allocations]);

  // Donut chart data
  const currentAllocation = mmmData.channels.map((ch) => ({
    name: ch.name,
    value: ch.currentSpend,
    color: ch.color,
  }));

  const optimalAllocation = mmmData.channels.map((ch) => ({
    name: ch.name,
    value: ch.optimalSpend,
    color: ch.color,
  }));

  // Adstock decay merged dataset
  const adstockData = useMemo(() => {
    const dayMap = new Map();
    mmmData.adstockCurves.forEach(({ channel, points }) => {
      points.forEach(({ day, effect }) => {
        if (!dayMap.has(day)) dayMap.set(day, { day });
        dayMap.get(day)[channel] = effect;
      });
    });
    return Array.from(dayMap.values()).sort((a, b) => a.day - b.day);
  }, []);

  // Table export columns
  const tableColumns = [
    { key: "name", label: "Channel" },
    { key: "currentSpend", label: "Current Spend" },
    { key: "optimalSpend", label: "Recommended Spend" },
    { key: "delta", label: "Delta" },
    { key: "marginalRoas", label: "Marginal ROAS" },
  ];

  const tableExportData = mmmData.channels.map((ch) => ({
    name: ch.name,
    currentSpend: ch.currentSpend,
    optimalSpend: ch.optimalSpend,
    delta: ch.optimalSpend - ch.currentSpend,
    marginalRoas: ch.marginalRoas,
  }));

  const totalLabel = fmtDollarK(mmmData.totalBudget);

  return (
    <div className="space-y-6">
      {/* ── 1. Current vs Optimal Allocation ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Allocation */}
        <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
            Current Allocation
          </h3>
          <div className="relative" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentAllocation}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {currentAllocation.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
            <CenterLabel total={totalLabel} />
          </div>
        </div>

        {/* Optimal Allocation */}
        <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
            Optimal Allocation
          </h3>
          <div className="relative" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={optimalAllocation}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {optimalAllocation.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
            <CenterLabel total={totalLabel} />
          </div>
        </div>
      </div>

      {/* ── 2. Marginal ROAS Curves ──────────────────────────────────── */}
      <SaturationChart curves={mmmData.responseCurves} />

      {/* ── 3. Budget Simulator ──────────────────────────────────────── */}
      <BudgetSlider
        channels={mmmData.channels}
        totalBudget={mmmData.totalBudget}
        onAllocationsChange={setAllocations}
      />
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <p className="text-sm text-[var(--text-muted)] mb-1">Projected Revenue</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {fmtDollar(simResults.totalRevenue)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-[var(--text-muted)] mb-1">Projected ROAS</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {simResults.blendedRoas.toFixed(2)}x
            </p>
          </div>
        </div>
      </div>

      {/* ── Scenario Comparison ─────────────────────────────────────── */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Saved Scenarios</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-left">Scenario</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-left">Top Channels</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">Projected Revenue</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">Projected ROAS</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-right">Created</th>
                <th className="px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {/* Current unsaved row */}
              <tr className="border-l-2 border-l-[#43a9df] bg-[#43a9df]/5">
                <td className="px-4 py-2.5 text-left font-medium text-[#43a9df]">Current (unsaved)</td>
                <td className="px-4 py-2.5 text-left text-[var(--text-secondary)]">
                  {Object.entries(allocations)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([ch, amt]) => `${ch}: ${fmtDollar(amt)}`)
                    .join(", ")}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-[var(--text-primary)]">{fmtDollar(simResults.totalRevenue)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-[var(--text-primary)]">{simResults.blendedRoas.toFixed(2)}x</td>
                <td className="px-4 py-2.5 text-right text-[var(--text-muted)]">Now</td>
                <td className="px-4 py-2.5 text-center text-[var(--text-muted)]">--</td>
              </tr>
              {savedScenarios.map((sc, i) => {
                const topChannels = Object.entries(sc.allocations)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([ch, amt]) => `${ch}: ${fmtDollar(amt)}`)
                  .join(", ");
                return (
                  <tr key={sc.id} className={i % 2 === 0 ? "bg-[var(--bg-table-stripe)]" : "bg-transparent"}>
                    <td className="px-4 py-2.5 text-left font-medium text-[var(--text-primary)]">{sc.name}</td>
                    <td className="px-4 py-2.5 text-left text-[var(--text-secondary)]">{topChannels}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{fmtDollar(sc.projectedRevenue)}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{sc.projectedRoas.toFixed(2)}x</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-muted)]">{sc.createdAt}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button className="rounded-md bg-[var(--bg-surface)] border border-[var(--border-color)] px-3 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        Load
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[var(--border-color)]">
          <button className="rounded-lg bg-gradient-to-r from-[#43a9df] to-[#8e68ad] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity">
            Save Current Scenario
          </button>
        </div>
      </div>

      {/* ── 4. Response Curves Table ─────────────────────────────────── */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Channel Recommendations
          </h3>
          <ExportCSV
            data={tableExportData}
            filename="media-mix-recommendations"
            columns={tableColumns}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="px-4 py-2.5 text-left font-medium text-[var(--text-muted)]">
                  Channel
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-[var(--text-muted)]">
                  Current Spend
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-[var(--text-muted)]">
                  Recommended Spend
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-[var(--text-muted)]">
                  Delta
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-[var(--text-muted)]">
                  Marginal ROAS
                </th>
              </tr>
            </thead>
            <tbody>
              {mmmData.channels.map((ch, i) => {
                const delta = ch.optimalSpend - ch.currentSpend;
                const isPositive = delta >= 0;
                return (
                  <tr
                    key={ch.name}
                    className={i % 2 === 1 ? "bg-[var(--bg-surface)]" : ""}
                  >
                    <td className="px-4 py-2.5 text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: ch.color }}
                        />
                        {ch.name}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      {fmtDollar(ch.currentSpend)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      {fmtDollar(ch.optimalSpend)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-medium ${
                        isPositive ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {fmtDollar(delta)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      {ch.marginalRoas.toFixed(2)}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Adstock Decay ─────────────────────────────────────────── */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          Adstock Decay
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={adstockData}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              stroke={gridColor}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
              label={{
                value: "Day",
                position: "insideBottomRight",
                offset: -4,
                style: { fill: tickColor, fontSize: 11 },
              }}
            />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<AdstockTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: tickColor }}
              iconType="circle"
              iconSize={8}
            />
            {mmmData.adstockCurves.map(({ channel, color }) => (
              <Line
                key={channel}
                type="monotone"
                dataKey={channel}
                name={channel}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  stroke: color,
                  strokeWidth: 2,
                  fill: "var(--bg-card-solid)",
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
