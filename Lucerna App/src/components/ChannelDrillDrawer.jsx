import { useEffect, useMemo, useState } from "react";
import {
  getDailyChannelMetricsForRange,
  getChannelSummaryWithBudgets,
  getChannelPacing,
  getChannelExpansionRowsForRange,
} from "../data/mockData";
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
import { useTheme } from "../context/ThemeContext";

const CHANNEL_COLORS = {
  "Paid Search": "#43a9df",
  "Paid Social": "#8e68ad",
  Email: "#c2dcd4",
  SMS: "#f472b6",
  Organic: "#34d399",
  Direct: "#fbbf24",
};

const SERIES_COLORS = {
  spend: "#8e68ad",
  revenue: "#43a9df",
  roas: "#34d399",
  cpm: "#fbbf24",
};

const fmtD = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtDC = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => n.toLocaleString("en-US");
const fmtX = (n) => (n != null ? n.toFixed(2) + "x" : "—");

function pct(c, p) {
  if (!p || p === 0) return null;
  return Math.round(((c - p) / p) * 10000) / 100;
}

function DeltaBadge({ value }) {
  if (value == null) return null;
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
        positive
          ? "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]"
          : "bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)]"
      }`}
    >
      {positive ? "+" : ""}
      {value}%
    </span>
  );
}

function KpiTile({ label, value, delta }) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)]/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
        {label}
      </p>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-semibold text-[var(--text-primary)]">{value}</span>
        <DeltaBadge value={delta} />
      </div>
    </div>
  );
}

const SERIES_DEF = [
  { key: "revenue", label: "Revenue", fmt: "money", default: true },
  { key: "spend", label: "Spend", fmt: "money", default: true },
  { key: "roas", label: "ROAS", fmt: "x", default: false },
  { key: "cpm", label: "CPM", fmt: "moneyc", default: false },
];

function formatSeriesValue(v, fmt) {
  if (v == null || Number.isNaN(v)) return "—";
  if (fmt === "money") return fmtD(v);
  if (fmt === "moneyc") return fmtDC(v);
  if (fmt === "x") return fmtX(v);
  return v.toLocaleString("en-US");
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((e) => {
        const def = SERIES_DEF.find((s) => s.key === e.dataKey);
        return (
          <p key={e.dataKey} style={{ color: e.color }} className="flex justify-between gap-4">
            <span>{def?.label || e.dataKey}</span>
            <span className="font-medium">{formatSeriesValue(e.value, def?.fmt)}</span>
          </p>
        );
      })}
    </div>
  );
}

function FunnelStep({ label, value, prevValue, isFirst }) {
  const rate = isFirst || !prevValue ? null : (value / prevValue) * 100;
  const widthPct = prevValue ? Math.max(8, (value / prevValue) * 100) : 100;
  return (
    <div>
      {!isFirst && rate != null && (
        <div className="flex justify-end pr-2 -mb-0.5">
          <span className="text-[9px] text-[var(--text-muted)]">{rate.toFixed(2)}%</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--text-muted)] w-20 flex-shrink-0">{label}</span>
        <div className="flex-1 h-6 rounded bg-[var(--bg-surface)] overflow-hidden relative">
          <div
            className="h-full rounded transition-[width] duration-500 ease-out"
            style={{
              width: `${widthPct}%`,
              background: "linear-gradient(90deg, var(--accent-blue), #6cc4ed)",
            }}
          />
          <span className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold text-[var(--text-primary)]">
            {fmtN(value)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ChannelDrillDrawer({
  open,
  onClose,
  channel,
  platform = null,
  type = null,
  dateRange,
  compare,
  budgets = {},
  onBudgetChange,
  onBudgetReset,
  openInEditMode = false,
}) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  const [enabledSeries, setEnabledSeries] = useState(() =>
    SERIES_DEF.filter((s) => s.default).map((s) => s.key)
  );
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const compareEnabled = compare?.enabled && compare?.start && compare?.end;
  const channelName = channel?.channel;

  const summary = useMemo(() => {
    if (!open || !channelName) return null;
    if (platform) {
      // Platform-level: aggregate expansion rows for the channel + platform.
      // When `type` is also set, narrow to that single (platform, type) row.
      const rows = getChannelExpansionRowsForRange(dateRange.start, dateRange.end)
        .filter((r) => r.channel === channelName && r.platform === platform && (type ? r.type === type : true));
      if (!rows.length) return null;
      const sum = rows.reduce((acc, r) => {
        acc.spend += r.spend; acc.revenue += r.revenue; acc.sessions += r.sessions;
        acc.orders += r.orders; acc.impressions += r.impressions; acc.clicks += r.clicks;
        return acc;
      }, { spend: 0, revenue: 0, sessions: 0, orders: 0, impressions: 0, clicks: 0 });
      return {
        channel: channelName,
        platform,
        type,
        ...sum,
        roas: sum.spend > 0 ? Math.round((sum.revenue / sum.spend) * 100) / 100 : null,
        cpa: sum.spend > 0 && sum.orders > 0 ? Math.round((sum.spend / sum.orders) * 100) / 100 : null,
        ncRevenue: 0, ncRoas: null, // not available at platform level
        cpm: sum.spend > 0 && sum.impressions > 0 ? Math.round((sum.spend / sum.impressions) * 1000 * 100) / 100 : null,
        ctr: sum.impressions > 0 ? Math.round((sum.clicks / sum.impressions) * 10000) / 100 : null,
      };
    }
    return getChannelSummaryWithBudgets(dateRange.start, dateRange.end, budgets).find(
      (c) => c.channel === channelName
    );
  }, [open, channelName, platform, type, dateRange.start, dateRange.end, budgets]);

  const priorSummary = useMemo(() => {
    if (!open || !channelName || !compareEnabled) return null;
    return getChannelSummaryWithBudgets(compare.start, compare.end, budgets).find(
      (c) => c.channel === channelName
    );
  }, [open, channelName, compareEnabled, compare?.start, compare?.end, budgets]);

  const dailyMetrics = useMemo(() => {
    if (!open || !channelName) return [];
    return getDailyChannelMetricsForRange(dateRange.start, dateRange.end, channelName);
  }, [open, channelName, dateRange.start, dateRange.end]);

  const pacing = useMemo(() => {
    if (!open || !channelName) return { hasTarget: false };
    return getChannelPacing(channelName, dateRange.start, dateRange.end, budgets, platform, type);
  }, [open, channelName, platform, type, dateRange.start, dateRange.end, budgets]);

  // Reset edit state whenever the drawer opens for a new channel/platform.
  // Auto-open the edit form when the parent flagged openInEditMode (e.g.,
  // user clicked "Set budget" on the None pacing chip).
  useEffect(() => {
    if (!open) return;
    if (openInEditMode) {
      setEditingBudget(true);
      setBudgetDraft(pacing.monthlyTotal ? String(Math.round(pacing.monthlyTotal)) : "");
    } else {
      setEditingBudget(false);
      setBudgetDraft("");
    }
  }, [open, channelName, platform, type, openInEditMode]);  // eslint-disable-line react-hooks/exhaustive-deps

  const pacingKey =
    pacing.mode === "credits" ? "creditAllotment"
    : pacing.mode === "sends" ? "sendAllotment"
    : pacing.mode === "spend" ? "monthlyTarget"
    : null;

  const startEditBudget = () => {
    setBudgetDraft(pacing.monthlyTotal ? String(Math.round(pacing.monthlyTotal)) : "");
    setEditingBudget(true);
  };
  const saveBudget = () => {
    const v = parseFloat(budgetDraft);
    if (!Number.isFinite(v) || v <= 0) {
      setEditingBudget(false);
      return;
    }
    // Drawer edits the annual override (12 × monthly value typed). Writes at
    // the deepest specified layer (type → platform → channel). Settings page
    // remains the source of truth for per-month and per-layer fine control.
    onBudgetChange?.(channelName, pacingKey, v * 12, { platform, type, scope: "annual" });
    setEditingBudget(false);
  };
  const cancelEdit = () => setEditingBudget(false);
  const resetBudget = () => {
    onBudgetReset?.(channelName, platform, type);
    setEditingBudget(false);
  };

  if (!open || !channelName || !summary) return null;

  const color = CHANNEL_COLORS[channelName] || "#6b7280";
  const isPaid = summary.spend > 0;

  // Best/worst day by ROAS for paid; by Revenue otherwise
  const sortField = isPaid ? "roas" : "revenue";
  const valid = dailyMetrics.filter((d) => d[sortField] != null);
  const peak = valid.length
    ? valid.reduce((a, b) => (a[sortField] >= b[sortField] ? a : b))
    : null;
  const trough = valid.length
    ? valid.reduce((a, b) => (a[sortField] <= b[sortField] ? a : b))
    : null;

  const toggleSeries = (key) => {
    setEnabledSeries((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Determine whether ROAS/CPM series are eligible (paid channels only)
  const seriesAvailable = SERIES_DEF.map((s) => ({
    ...s,
    available: isPaid || (s.key !== "roas" && s.key !== "cpm" && s.key !== "spend"),
  }));

  const visibleSeries = seriesAvailable.filter(
    (s) => s.available && enabledSeries.includes(s.key)
  );

  const isVolumePacing = pacing.mode === "sends" || pacing.mode === "credits";
  const pacingCurrent = isVolumePacing ? pacing.current : summary.spend;
  const pacingPct = pacing.hasTarget && pacing.target > 0
    ? Math.round((pacingCurrent / pacing.target) * 100)
    : null;
  const fmtCompact = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
    return Math.round(n).toString();
  };
  const pacingCurrentLabel = isVolumePacing ? fmtCompact(pacingCurrent) : fmtD(pacingCurrent);
  const pacingTargetLabel = isVolumePacing ? `${fmtCompact(pacing.target)} ${pacing.unit}` : fmtD(pacing.target);
  const pacingNote = isVolumePacing
    ? `${pacing.days}d of ${fmtCompact(pacing.monthlyTotal)}/mo allotment`
    : `${pacing.days}d pro-rated`;
  const pacingHeading = pacing.mode === "credits"
    ? "Credit utilization"
    : pacing.mode === "sends"
      ? "Send utilization"
      : "Pacing";

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        style={{ animation: "drillFade 200ms ease-out" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${channelName} drill-down`}
        className="fixed right-0 top-0 h-screen w-[480px] max-w-full z-50 bg-[var(--bg-card-solid)] border-l border-[var(--border-color)] shadow-2xl flex flex-col"
        style={{ animation: "drillSlide 240ms cubic-bezier(0.18, 0.67, 0.6, 1.0)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--border-color)] flex-shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
              {type ? "Campaign type" : platform ? "Platform" : "Channel"}
            </p>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              {type
                ? `${channelName} · ${platform} · ${type}`
                : platform
                  ? `${channelName} · ${platform}`
                  : channelName}
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {dailyMetrics.length} day{dailyMetrics.length === 1 ? "" : "s"} ·{" "}
              {pacing.mode === "sends"
                ? "Owned · ESP (fixed tier)"
                : pacing.mode === "credits"
                  ? "Owned · SMS (credit tier)"
                  : isPaid
                    ? "Paid channel"
                    : "Earned / direct"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drill-down"
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* KPI strip */}
          <section>
            <div className="grid grid-cols-2 gap-2">
              <KpiTile
                label="Spend"
                value={isPaid ? fmtD(summary.spend) : "—"}
                delta={priorSummary ? pct(summary.spend, priorSummary.spend) : null}
              />
              <KpiTile
                label="Revenue"
                value={fmtD(summary.revenue)}
                delta={priorSummary ? pct(summary.revenue, priorSummary.revenue) : null}
              />
              <KpiTile
                label="ROAS"
                value={fmtX(summary.roas)}
                delta={priorSummary ? pct(summary.roas, priorSummary.roas) : null}
              />
              <KpiTile
                label="CPA"
                value={summary.cpa != null ? fmtDC(summary.cpa) : "—"}
                delta={priorSummary ? pct(summary.cpa, priorSummary.cpa) : null}
              />
              <KpiTile
                label="NC-ROAS"
                value={fmtX(summary.ncRoas)}
                delta={priorSummary ? pct(summary.ncRoas, priorSummary.ncRoas) : null}
              />
              <KpiTile
                label="Sessions"
                value={fmtN(summary.sessions)}
                delta={priorSummary ? pct(summary.sessions, priorSummary.sessions) : null}
              />
            </div>
            {!pacing.hasTarget && pacing.mode && (
              <div className="mt-3 rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)]/30 p-3">
                {!editingBudget ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--text-muted)]">
                      No {pacing.mode === "sends" ? "send allotment" : pacing.mode === "credits" ? "credit allotment" : "budget"} set for this {platform ? "platform" : "channel"}.
                    </span>
                    {onBudgetChange && (
                      <button
                        type="button"
                        onClick={startEditBudget}
                        className="text-[10px] font-medium px-2.5 py-1 rounded bg-[var(--accent-blue)] text-white hover:opacity-90 flex-shrink-0"
                      >
                        Set budget
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1.5">
                      Monthly {pacing.mode === "spend" ? "budget ($)" : pacing.mode === "credits" ? "credit allotment" : "send allotment"}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        autoFocus
                        min="0"
                        step="100"
                        value={budgetDraft}
                        onChange={(e) => setBudgetDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveBudget();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="flex-1 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                      />
                      <button type="button" onClick={saveBudget} className="text-[10px] font-medium px-2.5 py-1.5 rounded bg-[var(--accent-blue)] text-white hover:opacity-90">Save</button>
                      <button type="button" onClick={cancelEdit} className="text-[10px] font-medium px-2 py-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {pacing.hasTarget && (
              <div className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)]/40 p-3">
                <div className="flex items-center justify-between text-[11px] mb-1.5 gap-2">
                  <span className="text-[var(--text-muted)] min-w-0 flex-1 truncate">
                    {pacingHeading} · {pacingCurrentLabel} of {pacingTargetLabel} ({pacingNote})
                    {pacing.isOverridden && (
                      <span className="ml-1.5 text-[9px] uppercase tracking-wider text-[var(--accent-blue)]">edited</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-semibold text-[var(--text-primary)]">{pacingPct}%</span>
                    {!editingBudget && onBudgetChange && (
                      <button
                        type="button"
                        onClick={startEditBudget}
                        title={`Edit monthly ${pacing.mode === "spend" ? "budget" : pacing.mode === "credits" ? "credit allotment" : "send allotment"}`}
                        aria-label="Edit target"
                        className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-surface)] transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 2l3 3-7 7H2v-3z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.min(pacingPct, 150)}%`,
                      background:
                        pacingPct >= 90 && pacingPct <= 110
                          ? "#34d399"
                          : "#fbbf24",
                    }}
                  />
                </div>
                {editingBudget && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-color)]/60">
                    <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1.5">
                      Monthly {pacing.mode === "spend" ? "budget ($)" : pacing.mode === "credits" ? "credit allotment" : "send allotment"}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        autoFocus
                        min="0"
                        step={pacing.mode === "spend" ? "100" : "100"}
                        value={budgetDraft}
                        onChange={(e) => setBudgetDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveBudget();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="flex-1 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                      />
                      <button
                        type="button"
                        onClick={saveBudget}
                        className="text-[10px] font-medium px-2.5 py-1.5 rounded bg-[var(--accent-blue)] text-white hover:opacity-90"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-[10px] font-medium px-2 py-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        Cancel
                      </button>
                    </div>
                    {pacing.isOverridden && onBudgetReset && (
                      <button
                        type="button"
                        onClick={resetBudget}
                        className="mt-2 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)] underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Daily trend */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Daily Trend
              </h3>
              <div className="flex flex-wrap gap-1">
                {seriesAvailable.map((s) => {
                  const active = enabledSeries.includes(s.key);
                  if (!s.available) return null;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSeries(s.key)}
                      className={`text-[10px] font-medium rounded-full px-2 py-0.5 border transition-colors ${
                        active
                          ? "bg-[var(--toggle-active-bg)] border-[var(--toggle-active-border)] text-[var(--accent-blue)]"
                          : "bg-[var(--toggle-bg)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                        style={{ backgroundColor: SERIES_COLORS[s.key] }}
                      />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {dailyMetrics.length > 0 && visibleSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyMetrics} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateStr"
                    tick={{ fill: tickColor, fontSize: 10 }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                    minTickGap={20}
                  />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {visibleSeries.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      stroke={SERIES_COLORS[s.key]}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No data available.</p>
            )}
          </section>

          {/* Funnel */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-3">
              Funnel
            </h3>
            <div className="space-y-1.5">
              <FunnelStep label="Impressions" value={summary.impressions} prevValue={null} isFirst />
              <FunnelStep label="Clicks" value={summary.clicks} prevValue={summary.impressions} />
              <FunnelStep label="Sessions" value={summary.sessions} prevValue={summary.clicks} />
              <FunnelStep label="Orders" value={summary.orders} prevValue={summary.sessions} />
            </div>
          </section>

          {/* Best / Worst day */}
          {peak && trough && peak !== trough && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-3">
                {isPaid ? "Best / Worst ROAS Day" : "Best / Worst Revenue Day"}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)]/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#34d399] font-semibold">Peak</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                    {isPaid ? fmtX(peak.roas) : fmtD(peak.revenue)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{peak.dateStr}</p>
                </div>
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)]/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#f87171] font-semibold">Trough</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                    {isPaid ? fmtX(trough.roas) : fmtD(trough.revenue)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{trough.dateStr}</p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <style>{`
        @keyframes drillFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes drillSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}
