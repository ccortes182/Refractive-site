import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const formatDollarK = (v) => `$${(v / 1000).toFixed(0)}K`;
const formatDollarFull = (v) =>
  `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0]?.payload || {};
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-[var(--text-primary)]">{name}</p>
      <p className="text-[var(--text-muted)]">Value: {formatDollarFull(value)}</p>
    </div>
  );
};

export default function WaterfallChart({ data = [] }) {
  const { theme } = useTheme();
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const tickColor = theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#94a3b8';

  const chartData = useMemo(() => {
    let cumSum = 0;
    return data.map((d) => {
      const start = cumSum;
      const end = cumSum + d.value;
      cumSum = end;
      return {
        name: d.name,
        start,
        end,
        value: d.value,
        barHeight: d.value,
        fill: d.fill || '#43a9df',
      };
    });
  }, [data]);

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl p-6 hover:border-[var(--border-hover)] transition-colors">
      <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
        Incremental Revenue Waterfall
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          {/* Transparent spacer bar */}
          <Bar dataKey="start" stackId="waterfall" fill="transparent" radius={0} />
          {/* Colored value bar stacked on top */}
          <Bar dataKey="barHeight" stackId="waterfall" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
