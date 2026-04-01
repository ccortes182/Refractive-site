import { useMemo, useState } from "react";
import { incrementalityTests, getIncrementalWaterfall, getChannelIncrementalityScores, experimentRecommendations } from "../data/mockData";
import ExportCSV from "../components/ExportCSV";
import WaterfallChart from "../components/Charts/WaterfallChart";
import { useTheme } from "../context/ThemeContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SCORE_COLORS = ["#43a9df", "#8e68ad", "#c2dcd4", "#f59e0b", "#6b7280"];

const ScoreTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-4 py-3 shadow-md min-w-[140px]">
      <p className="mb-1 text-xs text-[var(--text-muted)]">{payload[0].payload.channel}</p>
      <span className="text-sm font-semibold text-[var(--text-primary)]">{payload[0].value}/100</span>
    </div>
  );
};

export default function Incrementality({ dateRange, compare }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  const waterfallData = useMemo(() => getIncrementalWaterfall(), []);
  const scores = useMemo(() => getChannelIncrementalityScores(), []);

  const [expChannel, setExpChannel] = useState("Meta");
  const [expTestType, setExpTestType] = useState("Geo-Lift");
  const [expMetric, setExpMetric] = useState("Revenue");
  const [expDuration, setExpDuration] = useState("4 weeks");
  const [expBudget, setExpBudget] = useState("");
  const [expTestMarkets, setExpTestMarkets] = useState("");
  const [expControlMarkets, setExpControlMarkets] = useState("");

  const getMinDetectableLift = (duration) => {
    if (duration === "2 weeks" || duration === "3 weeks") return "~8-12%";
    if (duration === "4 weeks") return "~5-8%";
    return "~3-5%";
  };

  const estimatedSampleSize = expBudget ? (parseFloat(expBudget.replace(/[^0-9.]/g, "")) * 12).toLocaleString("en-US") : "—";

  const fmtDollar = (n) => "$" + Math.round(n).toLocaleString("en-US");

  const statusClasses = {
    Completed: "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]",
    Running: "bg-blue-500/15 text-blue-400",
    Planned: "bg-[var(--bg-surface)] text-[var(--text-muted)]",
  };

  return (
    <div>
      {/* Active Tests */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {incrementalityTests.map((test) => (
          <div
            key={test.id}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl p-5 hover:border-[var(--border-hover)] transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{test.channel}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClasses[test.status] || statusClasses.Planned}`}
              >
                {test.status}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              {test.startDate} &ndash; {test.endDate}
            </p>
            <p className="text-3xl font-semibold text-[var(--text-primary)]">
              {test.lift >= 0 ? "+" : ""}
              {test.lift.toFixed(1)}%
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Lift</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span>Confidence: <span className="font-medium text-[var(--text-primary)]">{test.confidence}%</span></span>
              <span>p-value: <span className="font-medium text-[var(--text-primary)]">{test.pValue}</span></span>
            </div>
          </div>
        ))}
      </div>

      {/* Incremental Revenue Waterfall */}
      <div className="mt-6">
        <WaterfallChart data={waterfallData} />
      </div>

      {/* iROAS Table */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Incremental ROAS by Channel</h2>
          <ExportCSV
            data={incrementalityTests.map((t) => ({
              Channel: t.channel,
              Spend: t.spend,
              "Total Revenue": t.testGroup.revenue,
              "Incremental Revenue": t.incrementalRevenue,
              iROAS: t.iRoas != null ? t.iRoas.toFixed(2) : "",
              "% Incremental": t.incrementalPct.toFixed(1),
            }))}
            filename="incremental-roas"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="px-6 py-3 font-medium text-[var(--text-muted)] uppercase text-xs text-left">Channel</th>
                <th className="px-6 py-3 font-medium text-[var(--text-muted)] uppercase text-xs text-right">Spend</th>
                <th className="px-6 py-3 font-medium text-[var(--text-muted)] uppercase text-xs text-right">Total Revenue</th>
                <th className="px-6 py-3 font-medium text-[var(--text-muted)] uppercase text-xs text-right">Incremental Revenue</th>
                <th className="px-6 py-3 font-medium text-[var(--text-muted)] uppercase text-xs text-right">iROAS</th>
                <th className="px-6 py-3 font-medium text-[var(--text-muted)] uppercase text-xs text-right">% Incremental</th>
              </tr>
            </thead>
            <tbody>
              {incrementalityTests.map((row, i) => (
                <tr key={row.id} className={i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-table-stripe)]"}>
                  <td className="px-6 py-3 text-left font-medium text-[var(--text-primary)]">{row.channel}</td>
                  <td className="px-6 py-3 text-right text-[var(--text-secondary)]">{fmtDollar(row.spend)}</td>
                  <td className="px-6 py-3 text-right text-[var(--text-secondary)]">{fmtDollar(row.testGroup.revenue)}</td>
                  <td className="px-6 py-3 text-right text-[var(--text-secondary)]">{fmtDollar(row.incrementalRevenue)}</td>
                  <td className="px-6 py-3 text-right text-[var(--text-secondary)]">{row.iRoas != null ? row.iRoas.toFixed(1) + "x" : "\u2014"}</td>
                  <td className="px-6 py-3 text-right text-[var(--text-secondary)]">{row.incrementalPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Channel Incrementality Scores */}
      <div className="mt-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl p-6 hover:border-[var(--border-hover)] transition-colors">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Incrementality Scores</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={scores} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: tickColor }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              type="category"
              dataKey="channel"
              tick={{ fontSize: 12, fill: tickColor }}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip content={<ScoreTooltip />} cursor={{ fill: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }} />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
              {scores.map((_, idx) => (
                <Cell key={idx} fill={SCORE_COLORS[idx % SCORE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Experiment Designer */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-5">Design New Experiment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Channel</label>
            <select value={expChannel} onChange={(e) => setExpChannel(e.target.value)} className="w-full text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]">
              {["Meta", "Google", "TikTok", "Email", "Influencer", "Brand Search", "Direct Mail"].map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Test Type</label>
            <select value={expTestType} onChange={(e) => setExpTestType(e.target.value)} className="w-full text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]">
              {["Geo-Lift", "Holdout", "Time Test", "Fixed Geo"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Success Metric</label>
            <select value={expMetric} onChange={(e) => setExpMetric(e.target.value)} className="w-full text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]">
              {["Revenue", "Orders", "New Customers", "ROAS", "CAC"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Duration</label>
            <select value={expDuration} onChange={(e) => setExpDuration(e.target.value)} className="w-full text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]">
              {["2 weeks", "3 weeks", "4 weeks", "6 weeks", "8 weeks"].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Estimated Budget</label>
            <input type="text" value={expBudget} onChange={(e) => setExpBudget(e.target.value)} placeholder="$" className="w-full text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Test Markets</label>
            <input type="text" value={expTestMarkets} onChange={(e) => setExpTestMarkets(e.target.value)} placeholder="e.g. CA, TX, NY" className="w-full text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Control Markets</label>
            <input type="text" value={expControlMarkets} onChange={(e) => setExpControlMarkets(e.target.value)} placeholder="e.g. FL, IL, OH" className="w-full text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]" />
          </div>
        </div>

        {/* Power Calculator */}
        <div className="mt-5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-3">Power Calculator</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[var(--text-muted)]">Estimated Sample Size</span>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{estimatedSampleSize}</p>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Minimum Detectable Lift</span>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{getMinDetectableLift(expDuration)}</p>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Confidence Level</span>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">95%</p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button className="bg-gradient-to-r from-[#43a9df] to-[#8e68ad] text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
            Launch Experiment
          </button>
        </div>
      </div>

      {/* Experiment Recommendations */}
      <div className="mt-6 bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Recommended Next Experiments</h2>
        <div className="divide-y divide-[var(--border-color)]">
          {experimentRecommendations.map((rec) => {
            const typeBgMap = { "Geo-Lift": "#43a9df", Holdout: "#8e68ad", "Time Test": "#c2dcd4", "Fixed Geo": "#34d399" };
            const priorityClasses = { High: "bg-red-500/15 text-red-400", Medium: "bg-yellow-500/15 text-yellow-400", Low: "bg-[var(--bg-surface)] text-[var(--text-muted)]" };
            return (
              <div key={rec.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 py-3">
                <div className="flex items-center gap-2 min-w-[200px]">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{rec.channel}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: typeBgMap[rec.type] || "#6b7280" }}>{rec.type}</span>
                </div>
                <p className="flex-1 text-xs text-[var(--text-muted)]">{rec.reason}</p>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityClasses[rec.priority] || priorityClasses.Low}`}>{rec.priority}</span>
                  <span className="text-[var(--text-secondary)]">{rec.estDuration}</span>
                  <span className="text-[var(--text-secondary)] font-medium">{rec.estBudget}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
