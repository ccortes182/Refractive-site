import { useMemo } from "react";
import { competitiveData } from "../data/mockData";
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
  LineChart,
  Line,
  Legend,
} from "recharts";
import { format } from "date-fns";

export default function Competitive({ dateRange, compare }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  const comp = competitiveData;

  // Color bar by value intensity for seasonality
  const getSeasonalityColor = (value) => {
    const ratio = value / 100;
    if (ratio < 0.3) return "#43a9df";
    if (ratio < 0.5) return "#34d399";
    if (ratio < 0.7) return "#fbbf24";
    if (ratio < 0.85) return "#f97316";
    return "#f87171";
  };

  return (
    <div className="space-y-6">
      {/* Share of Search Trend */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Share of Search Trend</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={comp.shareOfSearch} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="dateStr"
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-primary)",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="branded"
              name="Branded"
              stroke="#43a9df"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="nonBranded"
              name="Non-Branded"
              stroke="#8e68ad"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Share of Voice */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Share of Voice by Platform</h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={comp.shareOfVoice} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="competitor"
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-primary)",
              }}
              formatter={(value, name) => [`${value}%`, name]}
            />
            <Legend />
            <Bar dataKey="meta" name="Meta" fill="#43a9df" radius={[3, 3, 0, 0]} />
            <Bar dataKey="google" name="Google" fill="#8e68ad" radius={[3, 3, 0, 0]} />
            <Bar dataKey="tiktok" name="TikTok" fill="#c2dcd4" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Platform CPM Trends */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Platform CPM Trends</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={comp.cpmTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="dateStr"
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-primary)",
              }}
              formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
            />
            <Legend />
            <Line type="monotone" dataKey="meta" name="Meta" stroke="#43a9df" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="google" name="Google" stroke="#8e68ad" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="tiktok" name="TikTok" stroke="#c2dcd4" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Price Index Table */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Price Index</h3>
          <ExportCSV
            data={comp.priceIndex}
            filename="price-index"
            columns={[
              { key: "category", label: "Category" },
              { key: "ourPrice", label: "Our Price ($)" },
              { key: "marketAvg", label: "Market Avg ($)" },
              { key: "delta", label: "Delta (%)" },
            ]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">Category</th>
                <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">Our Price ($)</th>
                <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">Market Avg ($)</th>
                <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">Delta (%)</th>
              </tr>
            </thead>
            <tbody>
              {comp.priceIndex.map((row) => {
                const deltaColor = row.delta > 0 ? "text-yellow-400" : "text-green-400";
                return (
                  <tr key={row.category} className="border-b border-[var(--border-color)] last:border-0">
                    <td className="py-2 px-3 text-[var(--text-primary)]">{row.category}</td>
                    <td className="py-2 px-3 text-right text-[var(--text-primary)]">${row.ourPrice.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-[var(--text-primary)]">${row.marketAvg.toFixed(2)}</td>
                    <td className={`py-2 px-3 text-right font-medium ${deltaColor}`}>
                      {row.delta > 0 ? "+" : ""}{row.delta}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Demand Seasonality */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Market Demand Seasonality</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comp.seasonality} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-card-solid)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-primary)",
              }}
              formatter={(value) => [value, "Demand Index"]}
            />
            <Bar dataKey="demand" radius={[4, 4, 0, 0]}>
              {comp.seasonality.map((entry, i) => (
                <Cell key={i} fill={getSeasonalityColor(entry.demand)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
