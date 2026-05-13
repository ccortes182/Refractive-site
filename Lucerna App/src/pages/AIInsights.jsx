import { aiInsights } from "../data/mockData";
import ExportCSV from "../components/ExportCSV";
import { useTheme } from "../context/ThemeContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const CARD = "bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6";
const CLUSTER_PALETTE = ["#43a9df", "#8e68ad", "#34d399", "#fbbf24"];

function Badge({ label, color }) {
  const map = {
    green:  "bg-emerald-500/15 text-emerald-400",
    yellow: "bg-yellow-500/15 text-yellow-400",
    red:    "bg-red-500/15 text-red-400",
    blue:   "bg-sky-500/15 text-sky-400",
    gray:   "bg-gray-500/15 text-gray-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${map[color] || map.gray}`}>
      {label}
    </span>
  );
}

function confidenceColor(c) {
  if (c === "High") return "green";
  if (c === "Medium") return "yellow";
  return "red";
}

function statusColor(s) {
  return s === "Ready to test" ? "blue" : "gray";
}

function priorityColor(p) {
  if (p === "High") return "red";
  if (p === "Medium") return "yellow";
  return "gray";
}

export default function AIInsights({ dateRange, compare }) {
  const { theme } = useTheme();
  const ai = aiInsights;
  const maxRoas = Math.max(...ai.creativeClusters.map((c) => c.avgRoas));

  return (
    <div className="space-y-6">
      {/* ── Weekly Memo ── */}
      <div className={`${CARD} border-l-4 border-l-[#43a9df]`}>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Weekly Insights Memo
        </h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">{ai.weeklyMemo.period}</p>

        <div className="space-y-4">
          {/* Highlights */}
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Highlights</p>
            <ul className="space-y-1">
              {ai.weeklyMemo.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Risks</p>
            <ul className="space-y-1">
              {ai.weeklyMemo.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-400" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Recommendations</p>
            <ul className="space-y-1">
              {ai.weeklyMemo.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-400" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Creative Clusters ── */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Creative Clusters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ai.creativeClusters.map((cl, i) => (
            <div key={cl.cluster} className={CARD}>
              <p className="font-semibold text-[var(--text-primary)] mb-2">{cl.cluster}</p>

              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-2">
                <span>{cl.count} creatives</span>
                <span>ROAS {cl.avgRoas.toFixed(1)}x</span>
                <span>CTR {cl.avgCtr.toFixed(1)}%</span>
              </div>

              <p className="text-sm mb-1">
                <span className="text-[var(--text-muted)]">Top: </span>
                <span className="text-[#43a9df] font-medium">{cl.topCreative}</span>
              </p>

              <p className="text-sm text-[var(--text-secondary)] italic mb-3">{cl.insight}</p>

              {/* Relative ROAS bar */}
              <div className="h-2 w-full rounded-full bg-[var(--toggle-bg)]">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(cl.avgRoas / maxRoas) * 100}%`,
                    backgroundColor: CLUSTER_PALETTE[i % CLUSTER_PALETTE.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Auto-Generated Hypotheses ── */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Test Hypotheses</h2>
          <ExportCSV
            data={ai.hypotheses}
            filename="hypotheses"
            columns={[
              { key: "hypothesis", label: "Hypothesis" },
              { key: "confidence", label: "Confidence" },
              { key: "basis", label: "Basis" },
              { key: "status", label: "Status" },
              { key: "priority", label: "Priority" },
            ]}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs border-b border-[var(--border-color)]">
                <th className="pb-2 pr-4 font-medium">Hypothesis</th>
                <th className="pb-2 pr-4 font-medium">Confidence</th>
                <th className="pb-2 pr-4 font-medium">Basis</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {ai.hypotheses.map((h) => (
                <tr key={h.id} className="border-b border-[var(--border-color)] last:border-0">
                  <td className="py-3 pr-4 text-[var(--text-primary)] max-w-xs">{h.hypothesis}</td>
                  <td className="py-3 pr-4">
                    <Badge label={h.confidence} color={confidenceColor(h.confidence)} />
                  </td>
                  <td className="py-3 pr-4 text-[var(--text-muted)] max-w-[200px] truncate">{h.basis}</td>
                  <td className="py-3 pr-4">
                    <Badge label={h.status} color={statusColor(h.status)} />
                  </td>
                  <td className="py-3">
                    <Badge label={h.priority} color={priorityColor(h.priority)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Cluster Performance Chart ── */}
      <div className={CARD}>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Cluster ROAS Comparison
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={ai.creativeClusters} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="cluster"
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={140}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v) => [`${v.toFixed(1)}x`, "Avg ROAS"]}
            />
            <Bar dataKey="avgRoas" radius={[0, 4, 4, 0]} barSize={24}>
              {ai.creativeClusters.map((_, i) => (
                <Cell key={i} fill={CLUSTER_PALETTE[i % CLUSTER_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
