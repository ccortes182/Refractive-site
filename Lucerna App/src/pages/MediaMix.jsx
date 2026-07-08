import { useState, useMemo } from "react";
import { mmmData, simulateBudget } from "../data/mockData";
import { loadScenarios, saveScenario, deleteScenario } from "../data/mmmScenarios";
import ExportCSV from "../components/ExportCSV";
import BudgetSlider from "../components/BudgetSlider";
import { PromptModal, ConfirmModal } from "../components/Modal";
import SaturationChart from "../components/Charts/SaturationChart";
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
import { fmtD as fmtDollar, fmtCompact as fmtDollarK } from "../lib/format";
import { rangeFactor, scaleAdditive } from "../lib/rangeScale";
import { useChartTheme } from "../lib/chartTheme";

function fmtSavedAt(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "--"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}


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
  const { gridColor, tickColor } = useChartTheme();

  // Spend/revenue dollars are period metrics and scale with the selected
  // range length; saturation and adstock curves are model shapes defined on
  // the 28-day baseline window and are left untouched.
  const factor = rangeFactor(dateRange);
  const rangeKey = `${dateRange?.start ?? ""}|${dateRange?.end ?? ""}`;

  const scaledChannels = useMemo(
    () =>
      mmmData.channels.map((ch) => ({
        ...ch,
        currentSpend: Math.round(scaleAdditive(ch.currentSpend, dateRange)),
        optimalSpend: Math.round(scaleAdditive(ch.optimalSpend, dateRange)),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateRange.start, dateRange.end]
  );
  const scaledTotalBudget = Math.round(scaleAdditive(mmmData.totalBudget, dateRange));

  // Budget simulator state, kept in baseline (28-day) dollars so the mix
  // survives range changes; scaled to period dollars for display. `version`
  // remounts BudgetSlider (uncontrolled) when a scenario is loaded.
  const [sim, setSim] = useState(() => {
    const baseline = {};
    mmmData.channels.forEach((ch) => {
      baseline[ch.name] = ch.currentSpend;
    });
    return { version: 0, baseline };
  });

  const handleSliderChange = (scaledAlloc) => {
    const baseline = {};
    Object.entries(scaledAlloc).forEach(([name, v]) => {
      baseline[name] = v / factor;
    });
    setSim((s) => ({ ...s, baseline }));
  };

  // Run the model on baseline dollars (where the curves live), then scale the
  // additive outputs to the period. Blended ROAS is a ratio and is invariant.
  const simResults = useMemo(() => {
    const res = simulateBudget(sim.baseline);
    return {
      ...res,
      totalRevenue: Math.round(res.totalRevenue * factor),
      totalSpend: Math.round(res.totalSpend * factor),
    };
  }, [sim.baseline, factor]);

  // Current allocations in period dollars (for the table row and saving).
  const displayAllocations = useMemo(() => {
    const out = {};
    Object.entries(sim.baseline).forEach(([name, v]) => {
      out[name] = Math.round(v * factor);
    });
    return out;
  }, [sim.baseline, factor]);

  const sliderChannels = useMemo(
    () =>
      scaledChannels.map((ch) => ({
        ...ch,
        currentSpend: displayAllocations[ch.name] ?? ch.currentSpend,
      })),
    [scaledChannels, displayAllocations]
  );

  // Saved scenarios (localStorage-backed)
  const [scenarios, setScenarios] = useState(() => loadScenarios());
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleSaveScenario = (name) => {
    const entry = saveScenario({
      name,
      allocations: { ...displayAllocations },
      projectedRevenue: simResults.totalRevenue,
      projectedRoas: simResults.blendedRoas,
      rangeFactor: factor,
      savedAt: new Date().toISOString(),
    });
    if (entry) setScenarios((prev) => [...prev, entry]);
  };

  const handleLoadScenario = (sc) => {
    const savedFactor = typeof sc.rangeFactor === "number" && sc.rangeFactor > 0 ? sc.rangeFactor : 1;
    setSim((s) => {
      const baseline = {};
      mmmData.channels.forEach((ch) => {
        const v = sc.allocations?.[ch.name];
        baseline[ch.name] = typeof v === "number" && Number.isFinite(v) ? v / savedFactor : ch.currentSpend;
      });
      return { version: s.version + 1, baseline };
    });
  };

  const handleDeleteScenario = () => {
    if (!deleteTarget) return;
    setScenarios(deleteScenario(deleteTarget.id));
  };

  // Donut chart data
  const currentAllocation = scaledChannels.map((ch) => ({
    name: ch.name,
    value: ch.currentSpend,
    color: ch.color,
  }));

  const optimalAllocation = scaledChannels.map((ch) => ({
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

  const tableExportData = scaledChannels.map((ch) => ({
    name: ch.name,
    currentSpend: ch.currentSpend,
    optimalSpend: ch.optimalSpend,
    delta: ch.optimalSpend - ch.currentSpend,
    marginalRoas: ch.marginalRoas,
  }));

  const totalLabel = fmtDollarK(scaledTotalBudget);

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
        key={`${rangeKey}:${sim.version}`}
        channels={sliderChannels}
        totalBudget={scaledTotalBudget}
        onAllocationsChange={handleSliderChange}
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
                  {Object.entries(displayAllocations)
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
              {scenarios.length === 0 && (
                <tr className="bg-[var(--bg-table-stripe)]">
                  <td colSpan={6} className="px-4 py-3 text-center text-[var(--text-muted)]">
                    No saved scenarios yet. Adjust the sliders, then save the current scenario.
                  </td>
                </tr>
              )}
              {scenarios.map((sc, i) => {
                const topChannels = Object.entries(sc.allocations)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([ch, amt]) => `${ch}: ${fmtDollar(amt)}`)
                  .join(", ");
                return (
                  <tr key={sc.id} className={i % 2 === 1 ? "bg-[var(--bg-table-stripe)]" : "bg-transparent"}>
                    <td className="px-4 py-2.5 text-left font-medium text-[var(--text-primary)]">{sc.name}</td>
                    <td className="px-4 py-2.5 text-left text-[var(--text-secondary)]">{topChannels}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{fmtDollar(sc.projectedRevenue)}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      {typeof sc.projectedRoas === "number" ? `${sc.projectedRoas.toFixed(2)}x` : "--"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-muted)]">{fmtSavedAt(sc.savedAt)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleLoadScenario(sc)}
                          className="rounded-md bg-[var(--bg-surface)] border border-[var(--border-color)] px-3 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => setDeleteTarget(sc)}
                          aria-label={`Delete scenario ${sc.name}`}
                          className="rounded-md bg-[var(--bg-surface)] border border-[var(--border-color)] px-2 py-1 text-[10px] font-medium text-[var(--text-muted)] hover:text-red-400 hover:border-red-400/50 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[var(--border-color)]">
          <button
            onClick={() => setSavePromptOpen(true)}
            className="rounded-lg bg-gradient-to-r from-[#43a9df] to-[#8e68ad] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
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
              {scaledChannels.map((ch, i) => {
                const delta = ch.optimalSpend - ch.currentSpend;
                const isPositive = delta >= 0;
                return (
                  <tr
                    key={ch.name}
                    className={i % 2 === 1 ? "bg-[var(--bg-table-stripe)]" : ""}
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

      {/* ── Scenario modals ──────────────────────────────────────────── */}
      <PromptModal
        open={savePromptOpen}
        title="Save Scenario"
        label="Give this budget scenario a name."
        initialValue=""
        confirmLabel="Save"
        onConfirm={handleSaveScenario}
        onClose={() => setSavePromptOpen(false)}
      />
      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Scenario"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteScenario}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
