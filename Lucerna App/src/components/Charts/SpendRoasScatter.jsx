import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTheme } from "../../context/ThemeContext";

const CHANNEL_COLORS = {
  "Paid Search": "#43a9df",
  "Paid Social": "#8e68ad",
  Email: "#c2dcd4",
  SMS: "#f472b6",
  Organic: "#34d399",
  Direct: "#fbbf24",
};

const fmtD = (n) => "$" + Math.round(n).toLocaleString("en-US");

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
        {d.channel}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span className="text-[var(--text-muted)]">Spend</span>
        <span className="text-right font-medium text-[var(--text-primary)]">{fmtD(d.spend)}</span>
        <span className="text-[var(--text-muted)]">Revenue</span>
        <span className="text-right font-medium text-[var(--text-primary)]">{fmtD(d.revenue)}</span>
        <span className="text-[var(--text-muted)]">ROAS</span>
        <span className="text-right font-medium text-[var(--text-primary)]">
          {d.roas != null ? d.roas.toFixed(2) + "x" : "—"}
        </span>
      </div>
    </div>
  );
}

export default function SpendRoasScatter({ data = [], onPointClick }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  const points = data
    .filter((d) => d.spend > 0 && d.roas != null)
    .map((d) => ({
      channel: d.channel,
      spend: d.spend,
      revenue: d.revenue,
      roas: d.roas,
      color: CHANNEL_COLORS[d.channel] || "#6b7280",
    }));

  if (points.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-[var(--text-muted)] text-center px-4">
        No paid channels in current selection — Spend×ROAS view requires at least one paid channel.
      </div>
    );
  }

  const maxSpend = Math.max(...points.map((p) => p.spend));
  const maxRoas = Math.max(...points.map((p) => p.roas));
  const maxRevenue = Math.max(...points.map((p) => p.revenue));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ScatterChart margin={{ top: 10, right: 24, bottom: 8, left: 12 }}>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="spend"
          name="Spend"
          domain={[0, Math.ceil(maxSpend * 1.1)]}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
          tick={{ fill: tickColor, fontSize: 11 }}
          axisLine={{ stroke: gridColor }}
          tickLine={false}
          label={{ value: "Spend", position: "insideBottom", offset: -4, fill: tickColor, fontSize: 10 }}
        />
        <YAxis
          type="number"
          dataKey="roas"
          name="ROAS"
          domain={[0, Math.max(Math.ceil(maxRoas * 1.15), 2)]}
          tickFormatter={(v) => `${v}x`}
          tick={{ fill: tickColor, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={42}
          label={{ value: "ROAS", angle: -90, position: "insideLeft", offset: 8, fill: tickColor, fontSize: 10 }}
        />
        <ZAxis type="number" dataKey="revenue" range={[80, 600]} domain={[0, maxRevenue]} />
        <ReferenceLine
          y={1}
          stroke="#f87171"
          strokeDasharray="4 3"
          strokeWidth={1}
          label={{ value: "Break-even", fill: "#f87171", fontSize: 9, position: "insideTopRight" }}
        />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<ScatterTooltip />} />
        <Scatter
          data={points}
          onClick={(p) => onPointClick && p && onPointClick({ channel: p.channel })}
        >
          {points.map((p) => (
            <Cell key={p.channel} fill={p.color} fillOpacity={0.7} stroke={p.color} strokeWidth={1.5} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
