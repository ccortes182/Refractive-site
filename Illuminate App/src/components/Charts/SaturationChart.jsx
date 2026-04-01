import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const formatDollarK = (v) => `$${(v / 1000).toFixed(0)}K`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-[var(--text-primary)]">
        Spend: {formatDollarK(label)}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatDollarK(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function SaturationChart({ curves = [] }) {
  const { theme } = useTheme();
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const tickColor = theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#94a3b8';

  // Merge all curves into a unified dataset keyed by spend
  const spendMap = new Map();
  curves.forEach(({ channel, points }) => {
    points.forEach(({ spend, revenue }) => {
      if (!spendMap.has(spend)) spendMap.set(spend, { spend });
      spendMap.get(spend)[channel] = revenue;
    });
  });
  const data = Array.from(spendMap.values()).sort((a, b) => a.spend - b.spend);

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl p-6 hover:border-[var(--border-hover)] transition-colors">
      <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
        Saturation Curves
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="spend"
            tickFormatter={formatDollarK}
            tick={{ fill: tickColor, fontSize: 11 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatDollarK}
            tick={{ fill: tickColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: tickColor }}
            iconType="circle"
            iconSize={8}
          />
          {curves.map(({ channel, color }) => (
            <Line
              key={channel}
              type="monotone"
              dataKey={channel}
              name={channel}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: color, strokeWidth: 2, fill: 'var(--bg-card-solid)' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
