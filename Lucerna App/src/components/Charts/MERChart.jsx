import React from 'react';
import {
  ComposedChart,
  Bar,
  Area,
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
      <p className="mb-1 font-medium text-[var(--text-primary)]">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.dataKey === 'spend' ? 'Spend' : 'Revenue'}:{' '}
          {formatDollarK(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function MERChart({ data = [], title = 'MER Overview' }) {
  const { theme } = useTheme();
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const tickColor = theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#94a3b8';

  const formatted = data.map((d) => ({
    ...d,
    label: d.dateStr
      ? d.dateStr
      : new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl p-6 hover:border-[var(--border-hover)] transition-colors">
      <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#43a9df" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#43a9df" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: tickColor, fontSize: 11 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
          />
          <YAxis
            yAxisId="spend"
            orientation="left"
            tickFormatter={formatDollarK}
            tick={{ fill: tickColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="revenue"
            orientation="right"
            tickFormatter={formatDollarK}
            tick={{ fill: tickColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: tickColor }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            yAxisId="spend"
            dataKey="spend"
            name="Spend"
            fill="#8e68ad"
            radius={[3, 3, 0, 0]}
            barSize={18}
          />
          <Area
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#43a9df"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            dot={false}
            activeDot={{ r: 4, stroke: '#43a9df', strokeWidth: 2, fill: 'var(--bg-card-solid)' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
