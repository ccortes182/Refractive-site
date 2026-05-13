import { subscriptionData } from "../data/mockData";
import KPICard from "../components/KPICard";
import ExportCSV from "../components/ExportCSV";
import { useTheme } from "../context/ThemeContext";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  Cell,
} from "recharts";

export default function Subscriptions({ dateRange, compare }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  const sub = subscriptionData;

  const kpis = [
    { title: "MRR", value: `$${sub.mrr.toLocaleString()}`, change: 8.2 },
    { title: "Active Subscribers", value: sub.activeSubscribers.toLocaleString(), change: 5.4 },
    { title: "Churn Rate", value: `${sub.churnRate}%`, change: -1.2 },
    { title: "Avg Sub Value", value: `$${sub.avgSubValue}`, change: 3.1 },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <KPICard key={kpi.title} title={kpi.title} value={kpi.value} change={kpi.change} index={i} />
        ))}
      </div>

      {/* MRR Waterfall */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">MRR Waterfall</h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={sub.mrrWaterfall} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-primary)",
              }}
              formatter={(value, name) => [`$${Math.abs(value).toLocaleString()}`, name]}
            />
            <Legend />
            <Bar dataKey="newMrr" name="New" fill="#34d399" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expansion" name="Expansion" fill="#43a9df" radius={[3, 3, 0, 0]} />
            <Bar dataKey="churn" name="Churn" fill="#f87171" radius={[3, 3, 0, 0]} />
            <Bar dataKey="contraction" name="Contraction" fill="#fbbf24" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Subscription vs One-Time Revenue */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Subscription vs One-Time Revenue</h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={sub.subVsOneTime} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-sub" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#43a9df" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#43a9df" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="grad-onetime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8e68ad" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8e68ad" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="dateStr"
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-primary)",
              }}
              formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="subscription"
              name="Subscription"
              stackId="1"
              stroke="#43a9df"
              fill="url(#grad-sub)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="oneTime"
              name="One-Time"
              stackId="1"
              stroke="#8e68ad"
              fill="url(#grad-onetime)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Churn Cohort */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Churn Cohort Retention</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={sub.churnCohort} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
              label={{ value: "Month", position: "insideBottomRight", offset: -4, fill: tickColor, fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-primary)",
              }}
              formatter={(value) => [`${value}%`, "Retained"]}
            />
            <Line
              type="monotone"
              dataKey="retained"
              stroke="#43a9df"
              strokeWidth={2}
              dot={{ r: 3, fill: "#43a9df" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Subscription Product Mix */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Subscription Product Mix</h3>
          <ExportCSV
            data={sub.subProducts}
            filename="subscription-product-mix"
            columns={[
              { key: "name", label: "Product" },
              { key: "subscribers", label: "Subscribers" },
              { key: "churnRate", label: "Churn Rate %" },
              { key: "avgValue", label: "Avg Value ($)" },
            ]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">Product</th>
                <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">Subscribers</th>
                <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">Churn Rate %</th>
                <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">Avg Value ($)</th>
              </tr>
            </thead>
            <tbody>
              {sub.subProducts.map((row) => (
                <tr key={row.name} className="border-b border-[var(--border-color)] last:border-0">
                  <td className="py-2 px-3 text-[var(--text-primary)]">{row.name}</td>
                  <td className="py-2 px-3 text-right text-[var(--text-primary)]">{row.subscribers.toLocaleString()}</td>
                  <td className={`py-2 px-3 text-right font-medium ${row.churnRate > 8 ? "text-red-400" : "text-[var(--text-primary)]"}`}>
                    {row.churnRate}%
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--text-primary)]">${row.avgValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Winback Candidates */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Winback Candidates</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium text-xs">Name</th>
                <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium text-xs">Previous LTV ($)</th>
                <th className="text-right py-2 px-3 text-[var(--text-muted)] font-medium text-xs">Churned</th>
                <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium text-xs">Last Product</th>
              </tr>
            </thead>
            <tbody>
              {sub.winbackCandidates.map((row, i) => (
                <tr key={i} className="border-b border-[var(--border-color)]/50 last:border-0">
                  <td className="py-2 px-3 text-[var(--text-primary)]">{row.name}</td>
                  <td className="py-2 px-3 text-right text-[var(--text-primary)]">${row.ltv.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-[var(--text-secondary)]">{row.churnedDaysAgo} days ago</td>
                  <td className="py-2 px-3 text-[var(--text-secondary)]">{row.lastProduct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
