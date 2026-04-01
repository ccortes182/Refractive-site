import { useMemo } from "react";
import { alertsData } from "../data/mockData";
import ExportCSV from "../components/ExportCSV";
import { useTheme } from "../context/ThemeContext";
import { format } from "date-fns";
import {
  ComposedChart,
  Bar,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const card = "bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6";

const severityStyles = {
  Critical: {
    dot: "bg-red-500",
    pill: "bg-red-500/15 text-red-400 border border-red-500/30",
  },
  Warning: {
    dot: "bg-yellow-500",
    pill: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  },
  Info: {
    dot: "bg-blue-500",
    pill: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  },
};

const severityScatterColor = {
  Critical: "#ef4444",
  Warning: "#eab308",
};

export default function Alerts({ dateRange, compare }) {
  const { theme } = useTheme();
  const { alerts, rules, anomalies, thisWeekCount, resolvedCount } = alertsData;

  const sortedAlerts = useMemo(
    () => [...alerts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [alerts]
  );

  const anomalyDots = useMemo(
    () =>
      anomalies
        .filter((d) => d.anomaly)
        .map((d) => ({ ...d, anomalyRevenue: d.revenue })),
    [anomalies]
  );

  const chartData = useMemo(
    () =>
      anomalies.map((d) => {
        const match = anomalyDots.find((a) => a.dateStr === d.dateStr);
        return {
          ...d,
          anomalyRevenue: match ? match.revenue : null,
          anomalySeverity: match ? match.severity : null,
        };
      }),
    [anomalies, anomalyDots]
  );

  const formatYAxis = (v) => `$${(v / 1000).toFixed(0)}K`;

  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className={card}>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Active Alerts
          </p>
          <p className={`text-3xl font-bold ${thisWeekCount > 0 ? "text-red-400" : "text-[var(--text-primary)]"}`}>
            {thisWeekCount}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Resolved This Week
          </p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{resolvedCount}</p>
        </div>
        <div className={card}>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Total Rules
          </p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{rules.length}</p>
        </div>
      </div>

      {/* Active Alerts Feed */}
      <div className={card}>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Recent Alerts</h2>
        <div className="divide-y divide-[var(--border-color)]">
          {sortedAlerts.map((alert, i) => (
            <div
              key={alert.id ?? i}
              className="px-4 py-3 flex items-start gap-3"
            >
              {/* Severity badge */}
              <span
                className={`mt-1 flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                  severityStyles[alert.severity]?.pill ?? ""
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${severityStyles[alert.severity]?.dot ?? ""}`} />
                {alert.severity}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${
                    alert.resolved
                      ? "line-through text-[var(--text-muted)]"
                      : "text-[var(--text-primary)]"
                  }`}
                >
                  {alert.resolved && (
                    <svg
                      className="inline-block w-3.5 h-3.5 mr-1 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {alert.message}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {alert.channel && (
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--toggle-bg)] text-[var(--text-muted)]">
                      {alert.channel}
                    </span>
                  )}
                  {alert.metric && (
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--toggle-bg)] text-[var(--text-muted)]">
                      {alert.metric}
                    </span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <span className="flex-shrink-0 text-xs text-[var(--text-muted)] whitespace-nowrap">
                {format(new Date(alert.timestamp), "MMM d, h:mm a")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly Timeline */}
      <div className={card}>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
          Revenue with Detected Anomalies
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-color)"
                vertical={false}
              />
              <XAxis
                dataKey="dateStr"
                tickFormatter={(v) => {
                  try {
                    return format(new Date(v), "MMM d");
                  } catch {
                    return v;
                  }
                }}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-card-solid)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: 12,
                }}
                formatter={(value, name) => {
                  if (name === "revenue") return [`$${value.toLocaleString()}`, "Revenue"];
                  if (name === "anomalyRevenue") return [`$${value?.toLocaleString()}`, "Anomaly"];
                  return [value, name];
                }}
                labelFormatter={(v) => {
                  try {
                    return format(new Date(v), "MMM d, yyyy");
                  } catch {
                    return v;
                  }
                }}
              />
              <Bar dataKey="revenue" fill="var(--text-muted)" opacity={0.2} radius={[4, 4, 0, 0]} />
              <Scatter
                dataKey="anomalyRevenue"
                fill="#ef4444"
                shape={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.anomalyRevenue == null) return null;
                  const color = severityScatterColor[payload.anomalySeverity] || "#ef4444";
                  return <circle cx={cx} cy={cy} r={6} fill={color} stroke="#fff" strokeWidth={1.5} />;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alert Rules Table */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Alert Configuration</h2>
          <ExportCSV
            data={rules}
            filename="alert-rules"
            columns={[
              { key: "name", label: "Rule Name" },
              { key: "condition", label: "Condition" },
              { key: "metric", label: "Metric" },
              { key: "enabled", label: "Enabled" },
            ]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="pb-3 pr-4 font-medium">Rule Name</th>
                <th className="pb-3 pr-4 font-medium">Condition</th>
                <th className="pb-3 pr-4 font-medium">Metric</th>
                <th className="pb-3 font-medium">Enabled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {rules.map((rule, i) => (
                <tr key={rule.id ?? i} className="text-[var(--text-secondary)]">
                  <td className="py-2.5 pr-4 text-[var(--text-primary)] font-medium">{rule.name}</td>
                  <td className="py-2.5 pr-4">{rule.condition}</td>
                  <td className="py-2.5 pr-4">{rule.metric}</td>
                  <td className="py-2.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        rule.enabled
                          ? "bg-green-500/15 text-green-400 border border-green-500/30"
                          : "bg-[var(--toggle-bg)] text-[var(--text-muted)] border border-[var(--border-color)]"
                      }`}
                    >
                      {rule.enabled ? "On" : "Off"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
