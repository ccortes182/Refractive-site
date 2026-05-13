import { useEffect, useMemo, useState } from "react";
import { getForecastingData, getRevenueGoalForRange, getChannelRollingRoas } from "../data/mockData";
import {
  loadRevenueGoals,
  saveRevenueGoals,
  setRevenueCurve,
  getRevenueCurve,
  getDailyWeights,
  CURVE_OPTIONS,
  GOALS_CHANGED_EVENT,
  TOTAL_KEY,
} from "../data/revenueGoals";
import { loadChannelsBudgets, BUDGETS_CHANGED_EVENT } from "../data/channelsBudgets";
import {
  loadEventWindows,
  getEventWindowsOverlappingRange,
  getEventDayCount,
  EVENTS_CHANGED_EVENT,
} from "../data/eventWindows";
import KPICard from "../components/KPICard";
import ExportCSV from "../components/ExportCSV";
import { useTheme } from "../context/ThemeContext";
import {
  ComposedChart,
  Area,
  Line,
  LineChart,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";

/* ── Tooltips ── */
const DailyBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-4 py-3 shadow-md min-w-[180px]">
      <p className="mb-2 text-xs text-[var(--text-muted)]">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-sm text-[var(--text-secondary)]">{p.name}</span>
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            ${Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

const PacingTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-4 py-3 shadow-md min-w-[180px]">
      <p className="mb-2 text-xs text-[var(--text-muted)]">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: p.color }}
            />
            <span className="text-sm text-[var(--text-secondary)]">
              {p.name}
            </span>
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            ${Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── Inline channel sparkline ── */
const ChannelSparkline = ({ series, color = "#43a9df" }) => {
  if (!series?.length) return null;
  const data = series.map((d) => ({ value: d.revenue, target: d.target }));
  return (
    <LineChart
      width={80}
      height={24}
      data={data}
      margin={{ top: 2, bottom: 2, left: 0, right: 0 }}
    >
      <Line
        type="monotone"
        dataKey="target"
        stroke="#94a3b8"
        strokeWidth={1}
        strokeDasharray="2 2"
        dot={false}
        isAnimationActive={false}
      />
      <Line
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
};

export default function Forecasting({ dateRange }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  // Operator-set revenue goals (synced via storage event from Settings)
  const [goals, setGoals] = useState(() => loadRevenueGoals());
  useEffect(() => {
    const refresh = () => setGoals(loadRevenueGoals());
    window.addEventListener(GOALS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(GOALS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Operator-set channel budgets (drives the spend budget shown in pacing).
  const [budgets, setBudgets] = useState(() => loadChannelsBudgets());
  useEffect(() => {
    const refresh = () => setBudgets(loadChannelsBudgets());
    window.addEventListener(BUDGETS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(BUDGETS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Event windows. When the calendar range overlaps a configured event,
  // surface a banner and let the operator scope the page into the event.
  const [eventState, setEventState] = useState(() => loadEventWindows());
  useEffect(() => {
    const refresh = () => setEventState(loadEventWindows());
    window.addEventListener(EVENTS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENTS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const overlappingEvents = useMemo(
    () => getEventWindowsOverlappingRange(eventState, dateRange.start, dateRange.end),
    [eventState, dateRange.start, dateRange.end]
  );
  const primaryEvent = overlappingEvents[0] || null;

  // Scope: "period" follows the calendar dateRange; "event" rescopes the
  // entire forecast to the active event window. Auto-defaults to event when
  // an event overlaps; user override sticks.
  const [scopeOverride, setScopeOverride] = useState(null);
  const autoScope = primaryEvent ? "event" : "period";
  const scope = scopeOverride ?? autoScope;
  const pickScope = (s) => setScopeOverride(s === autoScope ? null : s);

  const effectiveRange = useMemo(() => {
    if (scope === "event" && primaryEvent) {
      const [sy, sm, sd] = primaryEvent.startDate.split("-").map(Number);
      const [ey, em, ed] = primaryEvent.endDate.split("-").map(Number);
      return { start: new Date(sy, sm - 1, sd), end: new Date(ey, em - 1, ed) };
    }
    return { start: dateRange.start, end: dateRange.end };
  }, [scope, primaryEvent, dateRange.start, dateRange.end]);

  const forecastRaw = useMemo(
    () => getForecastingData(effectiveRange.start, effectiveRange.end, budgets),
    [effectiveRange.start, effectiveRange.end, budgets]
  );

  // Active distribution curve for the company-total target (drives target line shape).
  const activeCurve = getRevenueCurve(goals, TOTAL_KEY);

  // Apply operator's company-total goal (when set) and the chosen distribution
  // curve on top of the raw forecast. Per-channel goals override channelPacing
  // rows. The curve reshapes both cumulative and per-day target series so the
  // Revenue Pacing target line bends correctly during weekend-heavy / promo
  // periods. Even curve = unchanged straight-line behavior.
  const forecast = useMemo(() => {
    const next = { ...forecastRaw };

    // When scoped to an event, the event's revenueGoal/spendBudget take
    // priority over monthly goals — they describe a bounded promo window,
    // not a calendar period.
    if (scope === "event" && primaryEvent) {
      if (primaryEvent.revenueGoal > 0) {
        next.monthTarget = Math.round(primaryEvent.revenueGoal);
        next.targetIsOperatorSet = true;
      }
      if (primaryEvent.spendBudget > 0) {
        next.spendBudget = Math.round(primaryEvent.spendBudget);
        next.spendBudgetIsOperatorSet = true;
      }
      const remaining = next.daysRemaining ?? 0;
      if (remaining > 0 && next.monthTarget) {
        next.requiredDailyRev = Math.max(0, (next.monthTarget - (next.totalRev ?? 0)) / remaining);
      }
      if (remaining > 0 && next.spendBudget) {
        next.requiredDailySpend = Math.max(0, (next.spendBudget - (next.totalSpend ?? 0)) / remaining);
      }
    } else {
      const totalGoal = getRevenueGoalForRange(TOTAL_KEY, effectiveRange.start, effectiveRange.end, goals);
      if (totalGoal != null && totalGoal > 0) {
        next.monthTarget = Math.round(totalGoal);
        next.targetIsOperatorSet = true;
        const remaining = next.daysRemaining ?? 0;
        if (remaining > 0) {
          next.requiredDailyRev = Math.max(0, (totalGoal - (next.totalRev ?? 0)) / remaining);
        }
      }
    }

    // Reshape cumulative target line. Cumulative array always spans the full
    // 30-day month (actual days + projected). Curves use calendar weekdays
    // for the actual rows; projected rows reuse the same curve weights so
    // the dashed extension stays aligned.
    if (next.cumulative?.length) {
      const dates = next.cumulative.map((d) =>
        d.projected ? new Date(d.dateStr.replace(/^proj-/, "")) : new Date(d.dateStr)
      );
      // For projected rows the dateStr is "proj-N" and not parseable; substitute
      // a weekday position by stepping forward from the last actual date.
      const lastActualIdx = next.cumulative.findIndex((d) => d.projected) - 1;
      const lastActualDate =
        lastActualIdx >= 0 ? new Date(next.cumulative[lastActualIdx].dateStr) : new Date(effectiveRange.start);
      next.cumulative.forEach((d, i) => {
        if (d.projected) {
          const stepFromLast = i - Math.max(0, lastActualIdx);
          const proj = new Date(lastActualDate);
          proj.setDate(proj.getDate() + stepFromLast);
          dates[i] = proj;
        }
      });
      const weights = getDailyWeights(activeCurve, dates);
      let cum = 0;
      next.cumulative = next.cumulative.map((d, i) => {
        cum += weights[i] || 0;
        return { ...d, target: Math.round(cum * next.monthTarget) };
      });
    }

    // Reshape per-day target on the daily[] array (used by daily view bars).
    // Weights sum to 1 across the visible days, so weights[i] * (period share
    // of monthTarget) gives that day's expected target. For a 7-day even view
    // with a $420k monthly goal, this resolves to $14k/day.
    if (next.daily?.length) {
      const dates = next.daily.map((d) => new Date(d.dateStr));
      const weights = getDailyWeights(activeCurve, dates);
      const periodShare = next.daily.length / 30;
      next.daily = next.daily.map((d, i) => ({
        ...d,
        dailyRevTarget: Math.round((weights[i] || 0) * next.monthTarget * periodShare),
      }));
    }

    if (next.channelPacing?.length) {
      next.channelPacing = next.channelPacing.map((row) => {
        const goal = getRevenueGoalForRange(row.channel, effectiveRange.start, effectiveRange.end, goals);
        if (goal != null && goal > 0) {
          return { ...row, target: Math.round(goal), targetIsOperatorSet: true };
        }
        return row;
      });
    }
    return next;
  }, [forecastRaw, goals, effectiveRange.start, effectiveRange.end, activeCurve, scope, primaryEvent]);

  const handleCurveChange = (e) => {
    const next = setRevenueCurve(goals, TOTAL_KEY, e.target.value);
    saveRevenueGoals(next);
    setGoals(next);
  };

  // Daily/Cumulative view toggle. Auto-switch to "daily" when the visible
  // range is short enough that day-by-day bars are more useful than a
  // cumulative line. The user's manual choice (if any) sticks via an
  // override; clearing the override returns to auto behavior.
  const rangeDays = forecast.daily?.length ?? 0;
  const autoMode = rangeDays > 0 && rangeDays <= 14 ? "daily" : "cumulative";
  const [viewOverride, setViewOverride] = useState(null);
  const viewMode = viewOverride ?? autoMode;
  const pickView = (mode) => {
    setViewOverride(mode === autoMode ? null : mode);
  };

  const pacingPct = forecast.monthTarget > 0
    ? Math.round((forecast.totalRev / forecast.monthTarget) * 100)
    : 0;
  // Pacing % vs *expected* pace at this point in the period — what the user
  // actually wants to see. Positive = ahead of pace, negative = behind.
  const paceVsExpected = pacingPct - (forecast.expectedPacePct ?? 0);

  // Forecast landing variance vs goal (positive = projected to exceed goal).
  const landingDeltaPct = forecast.monthTarget > 0
    ? Math.round(((forecast.projectedRev - forecast.monthTarget) / forecast.monthTarget) * 100)
    : 0;

  // Marketing as % of revenue — benchmark ~15% for healthy DTC. Deviation from
  // the benchmark drives the KPI card's change indicator (lower = better).
  const marketingPctOfRev = forecast.totalRev > 0
    ? Math.round((forecast.totalSpend / forecast.totalRev) * 1000) / 10
    : 0;
  const marketingPctBenchmark = 15;
  const marketingPctDelta = Math.round((marketingPctBenchmark - marketingPctOfRev) * 10) / 10;

  // Overspend warning: are we projected to land above the spend budget?
  const projectedOverspend = forecast.projectedSpend - forecast.spendBudget;
  const isOverspending = projectedOverspend > 0 && forecast.spendBudget > 0;
  const dailyPullback = forecast.daysRemaining > 0
    ? Math.max(0, projectedOverspend / forecast.daysRemaining)
    : 0;

  /* format cumulative chart data */
  const cumulativeChartData = useMemo(
    () =>
      forecast.cumulative.map((d) => ({
        ...d,
        label: d.projected
          ? `Day ${d.day}`
          : format(new Date(d.dateStr), "MMM d"),
      })),
    [forecast.cumulative]
  );

  /* format daily chart data — used when viewMode === "daily" */
  const dailyChartData = useMemo(
    () =>
      (forecast.daily || []).map((d) => ({
        ...d,
        label: format(new Date(d.dateStr), "MMM d"),
      })),
    [forecast.daily]
  );

  /* format margin series — cumulative CM% by day */
  const marginChartData = useMemo(
    () =>
      (forecast.marginSeries || []).map((d) => ({
        ...d,
        label: format(new Date(d.dateStr), "MMM d"),
      })),
    [forecast.marginSeries]
  );

  const fmtDollar = (n) => "$" + Math.round(n).toLocaleString("en-US");

  /* color rule for daily revenue bars (above target = green, etc.) */
  const revBarColor = (rev, target) => {
    if (!target) return "#43a9df";
    const pct = rev / target;
    if (pct >= 1) return "#10b981";
    if (pct >= 0.7) return "#eab308";
    return "#ef4444";
  };
  /* spend is "good" when under budget — colors invert */
  const spendBarColor = (spend, budget) => {
    if (!budget) return "#8b5cf6";
    const pct = spend / budget;
    if (pct >= 1.1) return "#ef4444";
    if (pct >= 0.9) return "#eab308";
    return "#10b981";
  };

  const VIEW_OPTIONS = [
    { value: "cumulative", label: "Cumulative" },
    { value: "daily", label: "Daily" },
  ];

  const SCOPE_OPTIONS = [
    { value: "period", label: "Period" },
    { value: "event", label: "Event" },
  ];

  // Scenario modeling — what-if a paid channel's spend changed by ±%?
  // Uses each channel's rolling 14-day ROAS to project revenue impact.
  const channelRoas = useMemo(() => getChannelRollingRoas(effectiveRange.end, 14), [effectiveRange.end]);
  const paidChannels = useMemo(
    () => Object.keys(channelRoas).filter((c) => channelRoas[c] != null && channelRoas[c] > 0),
    [channelRoas]
  );
  // Channel selection is derived: an explicit user pick overrides the
  // first available paid channel; cleared if the picked channel disappears.
  const [scenarioChannelPick, setScenarioChannelPick] = useState(null);
  const scenarioChannel =
    scenarioChannelPick && paidChannels.includes(scenarioChannelPick)
      ? scenarioChannelPick
      : paidChannels[0] ?? null;
  const [scenarioPct, setScenarioPct] = useState(0);
  const scenarioImpact = useMemo(() => {
    if (!scenarioChannel || forecast.daysRemaining <= 0) {
      return { deltaSpend: 0, deltaRev: 0, newProjectedRev: forecast.projectedRev, newProjectedSpend: forecast.projectedSpend };
    }
    const channelDailySpend = (forecast.dailyAvgSpend ?? 0) * 0.4; // rough split — we don't track per-channel spend run-rate here
    const deltaDailySpend = channelDailySpend * (scenarioPct / 100);
    const deltaSpend = deltaDailySpend * forecast.daysRemaining;
    const roas = channelRoas[scenarioChannel] || 0;
    const deltaRev = deltaSpend * roas;
    return {
      deltaSpend: Math.round(deltaSpend),
      deltaRev: Math.round(deltaRev),
      newProjectedRev: Math.round((forecast.projectedRev ?? 0) + deltaRev),
      newProjectedSpend: Math.round((forecast.projectedSpend ?? 0) + deltaSpend),
    };
  }, [scenarioChannel, scenarioPct, channelRoas, forecast.daysRemaining, forecast.dailyAvgSpend, forecast.projectedRev, forecast.projectedSpend]);

  // Forecast confidence band — ±1σ * √(daysOut). Built on top of forecastRev.
  const cumulativeChartDataWithBand = useMemo(() => {
    const sigma = forecast.dailyVolatility || 0;
    const lastActualIdx = (forecast.daysElapsed ?? 0) - 1;
    return cumulativeChartData.map((d, i) => {
      if (!d.projected || d.forecastRev == null) {
        return d;
      }
      const daysOut = i - lastActualIdx;
      const band = sigma * Math.sqrt(Math.max(1, daysOut));
      return {
        ...d,
        forecastLow: Math.max(0, Math.round(d.forecastRev - band)),
        forecastHigh: Math.round(d.forecastRev + band),
      };
    });
  }, [cumulativeChartData, forecast.dailyVolatility, forecast.daysElapsed]);

  return (
    <div>
      {/* ── Event Banner ── */}
      {primaryEvent && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-[var(--accent-blue)]/10 px-5 py-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="flex h-2 w-2 flex-shrink-0">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {primaryEvent.name}
                <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                  {primaryEvent.startDate} → {primaryEvent.endDate} · {getEventDayCount(primaryEvent)} days
                </span>
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {scope === "event" ? (
                  <>
                    Scoped to event · ${Number(forecast.totalRev).toLocaleString()} of ${Number(primaryEvent.revenueGoal || 0).toLocaleString()} earned
                    {forecast.daysRemaining > 0 && (
                      <> · ${Number(forecast.requiredDailyRev || 0).toLocaleString()}/day required</>
                    )}
                  </>
                ) : (
                  <>Visible in selected calendar period — switch to Event scope to focus the page on this window</>
                )}
              </p>
            </div>
          </div>
          <div className="inline-flex items-center rounded-md border border-[var(--border-color)] bg-[var(--bg-card-solid)] p-0.5 text-xs flex-shrink-0">
            {SCOPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => pickScope(opt.value)}
                className={`px-2.5 py-1 rounded-[5px] transition-colors ${
                  scope === opt.value
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Daily Avg Revenue"
          value={`$${forecast.dailyAvgRev.toLocaleString()}`}
          change={forecast.dailyAvgRevChange ?? 0}
          index={0}
        />
        <KPICard
          title="Required Daily Revenue"
          value={fmtDollar(forecast.requiredDailyRev ?? 0)}
          change={0}
          subtitle={`${forecast.daysRemaining ?? 0} days left`}
          index={1}
        />
        <KPICard
          title="Required Daily Spend"
          value={fmtDollar(forecast.requiredDailySpend ?? 0)}
          change={0}
          subtitle={
            forecast.spendBudgetIsOperatorSet
              ? `vs $${forecast.dailyAvgSpend?.toLocaleString() ?? 0}/day actual`
              : "No spend budget set"
          }
          index={2}
        />
        <KPICard
          title="Forecast Landing"
          value={fmtDollar(forecast.projectedRev ?? 0)}
          change={landingDeltaPct}
          subtitle={`Goal $${Number(forecast.monthTarget).toLocaleString()}`}
          index={3}
        />
        <KPICard
          title="Pacing %"
          value={`${pacingPct}%`}
          change={paceVsExpected}
          subtitle={`Expected ${forecast.expectedPacePct ?? 0}% by now`}
          index={4}
        />
        <KPICard
          title="Marketing % of Rev"
          value={`${marketingPctOfRev}%`}
          change={marketingPctDelta}
          subtitle={`Benchmark ${marketingPctBenchmark}%`}
          index={5}
        />
      </div>

      {/* ── Revenue Pacing Chart ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Revenue Pacing
            </h3>
            {forecast.targetIsOperatorSet ? (
              <span className="text-[9px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 bg-[var(--accent-blue)]/15 text-[var(--accent-blue)]">
                Operator goal · ${Number(forecast.monthTarget).toLocaleString()}
              </span>
            ) : (
              <span className="text-[9px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 bg-[var(--toggle-bg)] text-[var(--text-muted)]">
                No goal set · using projection
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>Target shape</span>
              <select
                value={activeCurve}
                onChange={handleCurveChange}
                className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-md px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
              >
                {CURVE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <div className="inline-flex items-center rounded-md border border-[var(--border-color)] bg-[var(--bg-surface)] p-0.5 text-xs">
              {VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => pickView(opt.value)}
                  className={`px-2.5 py-1 rounded-[5px] transition-colors ${
                    viewMode === opt.value
                      ? "bg-[var(--bg-card-solid)] text-[var(--text-primary)] font-semibold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {viewMode === "daily" ? (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={dailyChartData}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: tickColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: tickColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<DailyBarTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: tickColor }} iconType="square" />
              <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                {dailyChartData.map((d, i) => (
                  <Cell key={i} fill={revBarColor(d.revenue, d.dailyRevTarget)} />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="dailyRevTarget"
                name="Daily Target"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={cumulativeChartDataWithBand}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#43a9df" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#43a9df" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={landingDeltaPct >= 0 ? "#10b981" : "#f59e0b"} stopOpacity={0.18} />
                <stop offset="100%" stopColor={landingDeltaPct >= 0 ? "#10b981" : "#f59e0b"} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<PacingTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: tickColor }}
              iconType="plainline"
            />
            {/* Confidence band — drawn as low + (high-low) area stack so the
                visible band sits between the two forecast bounds. */}
            <Area
              type="monotone"
              dataKey="forecastLow"
              name="Likely range"
              stackId="band"
              stroke="none"
              fill="transparent"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey={(d) => (d.forecastHigh != null && d.forecastLow != null ? d.forecastHigh - d.forecastLow : null)}
              name="Likely range"
              stackId="band"
              stroke="none"
              fill="url(#bandGrad)"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="yoy"
              name="Last year"
              stroke={tickColor}
              strokeWidth={1}
              strokeDasharray="2 4"
              dot={false}
              activeDot={false}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#43a9df"
              strokeWidth={2}
              fill="url(#revGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#43a9df" }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="forecastRev"
              name="Forecast"
              stroke={landingDeltaPct >= 0 ? "#10b981" : "#f59e0b"}
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
              activeDot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="target"
              name="Target"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        )}
      </div>

      {/* ── Spend Pacing Chart ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Spend Pacing
          </h3>
          {forecast.spendBudgetIsOperatorSet ? (
            <span className="text-[9px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 bg-[var(--accent-blue)]/15 text-[var(--accent-blue)]">
              Operator budget · ${Number(forecast.spendBudget).toLocaleString()}
            </span>
          ) : (
            <span className="text-[9px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 bg-[var(--toggle-bg)] text-[var(--text-muted)]">
              No budget set · using default
            </span>
          )}
        </div>
        {isOverspending && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <svg
              className="mt-0.5 h-4 w-4 text-red-400 flex-shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 1.5L1 14h14L8 1.5z" />
              <path d="M8 6v4M8 12.5v.01" />
            </svg>
            <div className="text-xs text-red-300 leading-snug">
              <span className="font-semibold text-red-200">
                Projected to overspend by ${Math.round(projectedOverspend).toLocaleString()}.
              </span>{" "}
              Pull back ~${Math.round(dailyPullback).toLocaleString()}/day for the next {forecast.daysRemaining} days to land on budget.
            </div>
          </div>
        )}
        {viewMode === "daily" ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyChartData}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: tickColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: tickColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<DailyBarTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: tickColor }} iconType="square" />
              <Bar dataKey="spend" name="Spend" radius={[4, 4, 0, 0]}>
                {dailyChartData.map((d, i) => (
                  <Cell key={i} fill={spendBarColor(d.spend, d.dailyBudget)} />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="dailyBudget"
                name="Daily Budget"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={cumulativeChartData}>
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<PacingTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: tickColor }}
              iconType="plainline"
            />
            <Area
              type="monotone"
              dataKey="spend"
              name="Spend"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#spendGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#8b5cf6" }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="forecastSpend"
              name="Forecast"
              stroke={isOverspending ? "#ef4444" : "#10b981"}
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
              activeDot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="spendBudget"
              name="Budget"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        )}
      </div>

      {/* ── Contribution Margin Pacing ── */}
      {marginChartData.length > 0 && (
        <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Contribution Margin Pacing
            </h3>
            <span className="text-[9px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 bg-[var(--toggle-bg)] text-[var(--text-muted)]">
              Breakeven · {marginChartData[0]?.breakevenPct ?? 25}%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={marginChartData}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: tickColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: tickColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(v, name) => [`${Number(v).toFixed(1)}%`, name]}
                contentStyle={{
                  background: "var(--tooltip-bg)",
                  border: "1px solid var(--tooltip-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <ReferenceLine
                y={marginChartData[0]?.breakevenPct ?? 25}
                stroke="#94a3b8"
                strokeDasharray="6 4"
                label={{ value: "Breakeven", fill: tickColor, fontSize: 10, position: "right" }}
              />
              <Line
                type="monotone"
                dataKey="cmPct"
                name="CM %"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Weekly Forecast Table ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Weekly Forecast
          </h3>
          <ExportCSV
            data={forecast.weekly}
            filename="weekly-forecast"
            columns={[
              { key: "week", label: "Week" },
              { key: "revenue", label: "Revenue ($)" },
              { key: "target", label: "Target ($)" },
              { key: "pacingPct", label: "Pacing %" },
              { key: "orders", label: "Orders" },
              { key: "spend", label: "Spend ($)" },
              { key: "mer", label: "MER" },
            ]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Week
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Revenue ($)
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Target ($)
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Pacing
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Orders
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Spend ($)
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  MER
                </th>
              </tr>
            </thead>
            <tbody>
              {(forecast.weekly || []).map((row, i) => {
                const pct = row.pacingPct ?? 0;
                let badgeClass =
                  "bg-red-500/15 text-red-400 border border-red-500/20";
                if (pct >= 90)
                  badgeClass =
                    "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
                else if (pct >= 70)
                  badgeClass =
                    "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20";
                return (
                  <tr
                    key={i}
                    className={
                      i % 2 === 0
                        ? "bg-transparent"
                        : "bg-[var(--bg-table-stripe)]"
                    }
                  >
                    <td className="px-4 py-2.5 text-[var(--text-primary)]">
                      {row.week}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      ${Number(row.revenue).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      ${Number(row.target).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
                      >
                        {Math.round(pct)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      {Number(row.orders).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      ${Number(row.spend).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      {row.mer?.toFixed(2)}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Channel Pacing Table ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Channel Pacing
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Channel
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Target ($)
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Actual ($)
                </th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Trend
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Days Off Pace
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Pacing
                </th>
              </tr>
            </thead>
            <tbody>
              {(forecast.channelPacing || []).map((ch, i) => {
                const pct = Math.round((ch.actual / (ch.target || 1)) * 100);
                let badgeClass =
                  "bg-red-500/15 text-red-400 border border-red-500/20";
                let sparkColor = "#ef4444";
                if (pct >= 90) {
                  badgeClass =
                    "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
                  sparkColor = "#10b981";
                } else if (pct >= 70) {
                  badgeClass =
                    "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20";
                  sparkColor = "#eab308";
                }

                return (
                  <tr
                    key={i}
                    className={
                      i % 2 === 0
                        ? "bg-transparent"
                        : "bg-[var(--bg-table-stripe)]"
                    }
                  >
                    <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium">
                      {ch.channel}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      ${Number(ch.target).toLocaleString()}
                      {ch.targetIsOperatorSet && (
                        <span className="ml-1.5 text-[9px] uppercase tracking-wider text-[var(--accent-blue)]">goal</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      ${Number(ch.actual).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <ChannelSparkline series={ch.dailySeries} color={sparkColor} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      {ch.daysOffPace ?? 0}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
                      >
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Scenario Modeling ── */}
      {paidChannels.length > 0 && (
        <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">What-if Scenario</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Adjust spend on a channel and project revenue impact using its rolling 14-day ROAS
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <label className="block">
                <span className="block text-xs text-[var(--text-muted)] mb-2">Channel</span>
                <select
                  value={scenarioChannel ?? ""}
                  onChange={(e) => setScenarioChannelPick(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                >
                  {paidChannels.map((c) => (
                    <option key={c} value={c}>
                      {c} · {channelRoas[c]?.toFixed(2)}x ROAS
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-muted)]">Spend change</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {scenarioPct > 0 ? "+" : ""}
                    {scenarioPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={200}
                  step={5}
                  value={scenarioPct}
                  onChange={(e) => setScenarioPct(Number(e.target.value))}
                  className="w-full accent-[var(--accent-blue)]"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                  <span>-50%</span>
                  <span>0</span>
                  <span>+200%</span>
                </div>
              </label>
            </div>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)]/40 p-4 space-y-2.5">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                Projected impact
              </p>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Δ Spend</span>
                <span className={`text-sm font-semibold ${scenarioImpact.deltaSpend >= 0 ? "text-[var(--text-primary)]" : "text-emerald-400"}`}>
                  {scenarioImpact.deltaSpend >= 0 ? "+" : ""}${Math.abs(scenarioImpact.deltaSpend).toLocaleString()}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Δ Revenue</span>
                <span className={`text-sm font-semibold ${scenarioImpact.deltaRev >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {scenarioImpact.deltaRev >= 0 ? "+" : ""}${Math.abs(scenarioImpact.deltaRev).toLocaleString()}
                </span>
              </div>
              <div className="border-t border-[var(--border-color)] pt-2.5 mt-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">New landing</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    ${scenarioImpact.newProjectedRev.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-[10px] text-[var(--text-muted)]">vs goal</span>
                  <span className={`text-[10px] ${scenarioImpact.newProjectedRev >= forecast.monthTarget ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>
                    {scenarioImpact.newProjectedRev >= forecast.monthTarget ? "+" : ""}
                    ${(scenarioImpact.newProjectedRev - forecast.monthTarget).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan vs Forecast vs Actual ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Plan vs Forecast vs Actual</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Per-channel variance for the active period — board-ready
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Channel</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Plan ($)</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Forecast ($)</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Actual ($)</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Variance ($)</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Variance %</th>
              </tr>
            </thead>
            <tbody>
              {(forecast.channelPacing || []).map((ch, i) => {
                const plan = ch.target;
                const actual = ch.actual;
                const elapsed = forecast.daysElapsed || 1;
                const total = elapsed + (forecast.daysRemaining || 0);
                const projectedChannel = total > 0 ? Math.round((actual / elapsed) * total) : actual;
                const variance = projectedChannel - plan;
                const variancePct = plan > 0 ? Math.round((variance / plan) * 1000) / 10 : 0;
                let varTone = "text-[var(--text-secondary)]";
                if (variance > plan * 0.05) varTone = "text-emerald-400";
                else if (variance < -plan * 0.05) varTone = "text-red-400";
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-table-stripe)]"}>
                    <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium">{ch.channel}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      ${plan.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      ${projectedChannel.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                      ${actual.toLocaleString()}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-medium ${varTone}`}>
                      {variance >= 0 ? "+" : ""}${Math.abs(variance).toLocaleString()}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-medium ${varTone}`}>
                      {variancePct > 0 ? "+" : ""}{variancePct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Channel Daily Pacing (small multiples) ── */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Channel Daily Pacing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(forecast.channelPacing || []).map((ch) => {
            const data = (ch.dailySeries || []).map((d) => ({
              ...d,
              label: format(new Date(d.dateStr), "MMM d"),
            }));
            const pct = Math.round((ch.actual / (ch.target || 1)) * 100);
            const accent = pct >= 90 ? "#10b981" : pct >= 70 ? "#eab308" : "#ef4444";
            return (
              <div
                key={ch.channel}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)]/40 p-3"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {ch.channel}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    ${Number(ch.actual).toLocaleString()} / ${Number(ch.target).toLocaleString()}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={90}>
                  <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <XAxis dataKey="label" hide />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v, name) => [`$${Number(v).toLocaleString()}`, name]}
                      contentStyle={{
                        background: "var(--tooltip-bg)",
                        border: "1px solid var(--tooltip-border)",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      name="Target"
                      stroke="#94a3b8"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke={accent}
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
