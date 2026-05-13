import { useEffect, useMemo } from "react";
import { getChannelSummaryForRange } from "../data/mockData";

// Maps a card key to the channel-summary field name (or computation) that
// produces a per-channel value. Only metrics with a clean per-channel mapping
// get a breakdown — others show a graceful "not available" message.
const CHANNEL_FIELD = {
  netRevenue: "revenue",
  revenue: "revenue",
  totalRevenue: "revenue",   // approximation — channel data uses net revenue
  grossRevenue: "revenue",   // approximation
  orders: "orders",
  sessions: "sessions",
  adSpend: "spend",
  roas: "roas",
  cpa: "cpa",
  ncRoas: "ncRoas",
};
const CHANNEL_DERIVATIONS = {
  aov: (c) => (c.orders > 0 ? c.revenue / c.orders : 0),
  conversionRate: (c) => (c.sessions > 0 ? (c.orders / c.sessions) * 100 : 0),
  pctRevFromNew: (c) => (c.revenue > 0 ? (c.ncRevenue / c.revenue) * 100 : 0),
  ncAov: (c) => {
    // Approximation — channel data doesn't split orders by customer type
    const ncOrders = c.orders > 0 && c.revenue > 0 ? c.orders * (c.ncRevenue / c.revenue) : 0;
    return ncOrders > 0 ? c.ncRevenue / ncOrders : 0;
  },
};

export default function MetricDrillDrawer({
  open,
  onClose,
  metric,
  dateRange,
  compareEnabled,
  formatValue,
  dailySeries,
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const channelData = useMemo(() => {
    if (!open || !metric) return null;
    const summary = getChannelSummaryForRange(dateRange.start, dateRange.end);

    if (CHANNEL_FIELD[metric.key]) {
      const f = CHANNEL_FIELD[metric.key];
      return summary
        .map((c) => ({ channel: c.channel, value: c[f] }))
        .filter((r) => r.value != null && !Number.isNaN(r.value))
        .sort((a, b) => b.value - a.value);
    }
    if (CHANNEL_DERIVATIONS[metric.key]) {
      const fn = CHANNEL_DERIVATIONS[metric.key];
      return summary
        .map((c) => ({ channel: c.channel, value: fn(c) }))
        .filter((r) => r.value != null && !Number.isNaN(r.value) && Number.isFinite(r.value))
        .sort((a, b) => b.value - a.value);
    }
    return null;
  }, [open, metric, dateRange.start, dateRange.end]);

  if (!open || !metric) return null;

  const maxVal = channelData && channelData.length
    ? Math.max(...channelData.map((r) => Math.abs(r.value)), 1)
    : 1;

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
        aria-label={`${metric.title} drill-down`}
        className="fixed right-0 top-0 h-screen w-[440px] max-w-full z-50 bg-[var(--bg-card-solid)] border-l border-[var(--border-color)] shadow-2xl flex flex-col"
        style={{ animation: "drillSlide 240ms cubic-bezier(0.18, 0.67, 0.6, 1.0)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--border-color)] flex-shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
              Drill-down
            </p>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate">
              {metric.title}
            </h2>
            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-semibold text-[var(--text-primary)]">
                {metric.value}
              </span>
              {typeof metric.change === "number" && (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    metric.change >= 0
                      ? "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]"
                      : "bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)]"
                  }`}
                >
                  {metric.change >= 0 ? "+" : ""}
                  {metric.change}%
                </span>
              )}
            </div>
            {compareEnabled && metric.priorValue && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8e68ad]" />
                <span className="text-xs text-[#8e68ad] font-medium">
                  Prior: {metric.priorValue}
                </span>
              </div>
            )}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Channel breakdown */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                By Channel
              </h3>
              {channelData && channelData.length > 0 && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {channelData.length} channels
                </span>
              )}
            </div>
            {channelData && channelData.length > 0 ? (
              <div className="space-y-3">
                {channelData.map((row, idx) => (
                  <div key={row.channel}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-[var(--text-secondary)] truncate pr-3">
                        {row.channel}
                      </span>
                      <span className="font-semibold text-[var(--text-primary)] flex-shrink-0">
                        {formatValue(row.value, metric.fmt)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width] duration-700 ease-out"
                        style={{
                          width: `${(Math.abs(row.value) / maxVal) * 100}%`,
                          background: idx === 0
                            ? "linear-gradient(90deg, var(--accent-blue), #6cc4ed)"
                            : "linear-gradient(90deg, rgba(67,169,223,0.65), rgba(108,196,237,0.65))",
                          animationDelay: `${idx * 60}ms`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)]/30 p-4">
                <p className="text-sm text-[var(--text-muted)]">
                  Channel breakdown not available for this metric.
                </p>
              </div>
            )}
          </section>

          {/* Daily trend */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Daily Trend
              </h3>
              <span className="text-[10px] text-[var(--text-muted)]">
                {dailySeries?.length || 0} days
              </span>
            </div>
            {dailySeries && dailySeries.length > 0 ? (
              <DailyTrendChart series={dailySeries} fmt={metric.fmt} formatValue={formatValue} />
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No daily data for the selected range.</p>
            )}
          </section>
        </div>
      </div>

      <style>{`
        @keyframes drillFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes drillSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}

function DailyTrendChart({ series, fmt, formatValue }) {
  const w = 380;
  const h = 130;
  const padX = 6;
  const padY = 14;

  const values = series.map((d) => (typeof d.value === "number" ? d.value : 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = series.map((d, i) => {
    const x = padX + (i / Math.max(series.length - 1, 1)) * (w - padX * 2);
    const v = typeof d.value === "number" ? d.value : 0;
    const y = padY + (1 - (v - min) / range) * (h - padY * 2);
    return [x, y];
  });
  const pathD = points
    .map((pt, i) => `${i === 0 ? "M" : "L"}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`)
    .join(" ");
  const fillD =
    pathD +
    ` L${points[points.length - 1][0].toFixed(1)},${(h - padY).toFixed(1)}` +
    ` L${points[0][0].toFixed(1)},${(h - padY).toFixed(1)} Z`;

  // Determine peak / trough for annotation
  let peakIdx = 0;
  let troughIdx = 0;
  values.forEach((v, i) => {
    if (v > values[peakIdx]) peakIdx = i;
    if (v < values[troughIdx]) troughIdx = i;
  });

  return (
    <div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="drillSparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#43a9df" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#43a9df" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#drillSparkGrad)" />
        <path d={pathD} fill="none" stroke="#43a9df" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Peak dot */}
        <circle cx={points[peakIdx][0]} cy={points[peakIdx][1]} r="3" fill="#43a9df" />
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-md bg-[var(--bg-surface)]/40 px-2 py-1.5">
          <p className="text-[var(--text-muted)]">Peak</p>
          <p className="font-semibold text-[var(--text-primary)] mt-0.5">
            {formatValue(values[peakIdx], fmt)}
          </p>
          <p className="text-[var(--text-muted)] text-[10px]">{series[peakIdx].label}</p>
        </div>
        <div className="rounded-md bg-[var(--bg-surface)]/40 px-2 py-1.5">
          <p className="text-[var(--text-muted)]">Trough</p>
          <p className="font-semibold text-[var(--text-primary)] mt-0.5">
            {formatValue(values[troughIdx], fmt)}
          </p>
          <p className="text-[var(--text-muted)] text-[10px]">{series[troughIdx].label}</p>
        </div>
        <div className="rounded-md bg-[var(--bg-surface)]/40 px-2 py-1.5">
          <p className="text-[var(--text-muted)]">Avg</p>
          <p className="font-semibold text-[var(--text-primary)] mt-0.5">
            {formatValue(values.reduce((s, v) => s + v, 0) / Math.max(values.length, 1), fmt)}
          </p>
          <p className="text-[var(--text-muted)] text-[10px]">over {values.length} days</p>
        </div>
      </div>
    </div>
  );
}
