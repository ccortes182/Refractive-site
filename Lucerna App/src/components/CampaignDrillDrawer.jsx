import { useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "../context/ThemeContext";
import { getCampaignDailyForRange } from "../data/campaignsData";

const CHANNEL_COLORS = {
  "Paid Search": "#43a9df",
  "Paid Social": "#8e68ad",
  "Other Paid": "#fb923c",
  Email: "#c2dcd4",
  SMS: "#f472b6",
};

const fmtD = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtN = (n) => n.toLocaleString("en-US");
const fmtX = (n) => (n != null ? n.toFixed(2) + "x" : "—");

function StatusPill({ status }) {
  const cls = status === "Active"
    ? "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]"
    : status === "Paused"
      ? "bg-[#fbbf24]/15 text-[#fbbf24]"
      : "bg-[var(--toggle-bg)] text-[var(--text-muted)]";
  return <span className={`text-[9px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 ${cls}`}>{status}</span>;
}

function KpiTile({ label, value }) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)]/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">{label}</p>
      <span className="text-base font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

export default function CampaignDrillDrawer({ open, onClose, campaign, dateRange }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const daily = useMemo(() => {
    if (!open || !campaign) return [];
    return getCampaignDailyForRange(campaign.id, dateRange.start, dateRange.end);
  }, [open, campaign, dateRange.start, dateRange.end]);

  if (!open || !campaign) return null;
  const color = CHANNEL_COLORS[campaign.channel] || "#6b7280";

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
        aria-label={`${campaign.name} drill-down`}
        className="fixed right-0 top-0 h-screen w-[480px] max-w-full z-50 bg-[var(--bg-card-solid)] border-l border-[var(--border-color)] shadow-2xl flex flex-col"
        style={{ animation: "drillSlide 240ms cubic-bezier(0.18, 0.67, 0.6, 1.0)" }}
      >
        <div className="flex items-start justify-between p-6 border-b border-[var(--border-color)] flex-shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">Campaign</p>
            <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate">{campaign.name}</span>
            </h2>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--text-muted)]">
                {campaign.channel} · {campaign.platform}{campaign.type ? ` · ${campaign.type}` : ""}
              </span>
              <StatusPill status={campaign.status} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drill-down"
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors text-xl leading-none"
          >×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* KPIs */}
          <section className="grid grid-cols-2 gap-2">
            <KpiTile label="Spend" value={campaign.spend > 0 ? fmtD(campaign.spend) : "—"} />
            <KpiTile label="Revenue" value={fmtD(campaign.revenue)} />
            <KpiTile label="ROAS" value={fmtX(campaign.roas)} />
            <KpiTile label="CPA" value={campaign.cpa != null ? fmtD(campaign.cpa) : "—"} />
            <KpiTile label="CTR" value={campaign.ctr != null ? campaign.ctr.toFixed(2) + "%" : "—"} />
            <KpiTile label="Sessions" value={fmtN(campaign.sessions)} />
          </section>

          {/* Flight info */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-2">Flight</h3>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)]/40 p-3 text-[11px] text-[var(--text-secondary)] space-y-1">
              <p>Started: <span className="font-medium text-[var(--text-primary)]">{campaign.startDate?.toLocaleDateString?.() || "—"}</span></p>
              <p>Ended: <span className="font-medium text-[var(--text-primary)]">{campaign.endDate ? campaign.endDate.toLocaleDateString() : "Ongoing"}</span></p>
            </div>
          </section>

          {/* Daily trend */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-2">Daily Spend × Revenue</h3>
            {daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={daily} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis dataKey="dateStr" tick={{ fill: tickColor, fontSize: 10 }} axisLine={{ stroke: gridColor }} tickLine={false} minTickGap={20} />
                  <YAxis tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", fontSize: 11 }} />
                  <Line type="monotone" dataKey="revenue" stroke="#43a9df" strokeWidth={2} dot={false} name="Revenue" />
                  <Line type="monotone" dataKey="spend" stroke="#8e68ad" strokeWidth={2} dot={false} name="Spend" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No daily data available.</p>
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
