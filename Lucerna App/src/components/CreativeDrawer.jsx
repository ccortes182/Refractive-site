import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "../context/ThemeContext";

const FUNNEL_COLORS = { TOF: "#43a9df", MOF: "#8e68ad", BOF: "#34d399" };
const FORMAT_COLORS = { Video: "#43a9df", Image: "#8e68ad", Carousel: "#c2dcd4" };
const fmtD = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtN = (n) => n.toLocaleString("en-US");

function ScoreRow({ label, score, description }) {
  const color = score >= 60 ? "#34d399" : score >= 40 ? "#43a9df" : score >= 20 ? "#fbbf24" : "#f87171";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-secondary)] w-14">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-[var(--toggle-bg)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold text-[var(--text-primary)] w-8 text-right">{score}</span>
      <span className="text-[10px] text-[var(--text-muted)] w-20 hidden md:block">{description}</span>
    </div>
  );
}

export default function CreativeDrawer({ creative, imageIndex, onClose }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  if (!creative) return null;
  const c = creative;

  // Mock copy for display
  const mockCopy = {
    headline: ["Your morning routine is missing this", "Why 10,000+ customers switched", "Limited drop — selling fast"][c.id.charCodeAt(3) % 3],
    primaryText: ["I was skeptical at first, but after 30 days I'm never going back.", "Stop overpaying. We make the same quality at half the price.", "Our founder built this because nothing else worked."][c.id.charCodeAt(3) % 3],
  };

  // Mock audience breakdown
  const audiences = [
    { name: "Prospecting LAL", roas: +(c.roas * (0.8 + Math.random() * 0.4)).toFixed(1) },
    { name: "Retargeting 7d", roas: +(c.roas * (0.5 + Math.random() * 0.6)).toFixed(1) },
    { name: "Broad", roas: +(c.roas * (0.7 + Math.random() * 0.5)).toFixed(1) },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-[var(--bg-card-solid)] border-l border-[var(--border-color)] shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-[var(--bg-card-solid)] border-b border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{c.name}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--border-color)] text-[var(--text-muted)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Creative image */}
          <div className="rounded-lg overflow-hidden bg-[var(--bg-surface)] aspect-square max-h-72">
            <img
              src={`${import.meta.env.BASE_URL}creatives/cr-${imageIndex || 1}.png`}
              alt={c.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[9px] px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">{c.platform}</span>
            <span className="text-[9px] px-2 py-0.5 rounded" style={{ backgroundColor: FORMAT_COLORS[c.format] + "20", color: FORMAT_COLORS[c.format] }}>{c.format}</span>
            <span className="text-[9px] px-2 py-0.5 rounded text-white" style={{ backgroundColor: FUNNEL_COLORS[c.funnel] }}>{c.funnel}</span>
            <span className="text-[9px] px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">{c.hookStyle}</span>
            <span className="text-[9px] px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">{c.angle}</span>
            <span className="text-[9px] px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">{c.talent}</span>
            {c.roas > 3 && <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]">Winner</span>}
            {c.roas < 1.5 && <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)]">Underperformer</span>}
            {c.isRecent && <span className="text-[9px] px-2 py-0.5 rounded bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">NEW</span>}
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Spend", value: fmtD(c.spend) },
              { label: "Revenue", value: fmtD(c.revenue) },
              { label: "ROAS", value: c.roas + "x" },
              { label: "CPA", value: "$" + c.cpa.toFixed(2) },
              { label: "CTR", value: c.ctr.toFixed(2) + "%" },
              { label: "Thumbstop", value: c.thumbstopRate + "%" },
              { label: "Impressions", value: fmtN(c.impressions) },
              { label: "Purchases", value: fmtN(c.purchases) },
            ].map(m => (
              <div key={m.label} className="p-2 rounded-lg bg-[var(--bg-surface)]">
                <p className="text-[9px] text-[var(--text-muted)] uppercase">{m.label}</p>
                <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Scorecard */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Creative Scorecard</p>
            <div className="space-y-2">
              <ScoreRow label="Hook" score={c.scorecard.hook} description="Thumbstop" />
              <ScoreRow label="Watch" score={c.scorecard.watch} description="Play-through" />
              <ScoreRow label="Click" score={c.scorecard.click} description="CTR" />
              <ScoreRow label="Convert" score={c.scorecard.convert} description="Purchase" />
            </div>
          </div>

          {/* Video retention */}
          {c.retentionCurve && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Video Retention</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={c.retentionCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="pct" tickFormatter={v => `${v}%`} tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Line type="monotone" dataKey="retained" stroke="#43a9df" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Fatigue trend */}
          {c.fatigueData && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">CTR Fatigue (30d)</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={c.fatigueData}>
                  <XAxis dataKey="day" tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v % 10 === 0 ? `D${v}` : ""} />
                  <YAxis tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1) + "%"} />
                  <Line type="monotone" dataKey="ctr" stroke="#fbbf24" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Copy */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Ad Copy</p>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] text-xs">
                <span className="text-[9px] text-[var(--accent-blue)] font-medium">Headline</span>
                <p className="text-[var(--text-primary)] mt-0.5">{mockCopy.headline}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] text-xs">
                <span className="text-[9px] text-[#8e68ad] font-medium">Primary Text</span>
                <p className="text-[var(--text-primary)] mt-0.5">{mockCopy.primaryText}</p>
              </div>
            </div>
          </div>

          {/* Audience breakdown */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Audience Performance</p>
            <div className="space-y-1.5">
              {audiences.map(a => (
                <div key={a.name} className="flex items-center justify-between py-1.5 px-2 rounded bg-[var(--bg-surface)]">
                  <span className="text-xs text-[var(--text-secondary)]">{a.name}</span>
                  <span className={`text-xs font-semibold ${a.roas >= 3 ? "text-[var(--badge-positive-text)]" : a.roas >= 2 ? "text-[var(--accent-blue)]" : "text-[#fbbf24]"}`}>{a.roas}x</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button className="flex-1 px-4 py-2 text-xs font-medium rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-colors">
              View in Platform
            </button>
            <button className="flex-1 px-4 py-2 text-xs font-semibold text-white rounded-lg bg-gradient-to-r from-[#43a9df] to-[#8e68ad] hover:opacity-90 transition-opacity">
              Duplicate & Test
            </button>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] text-center">Launched {c.launchedDaysAgo}d ago</p>
        </div>
      </div>
    </>
  );
}
