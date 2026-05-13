import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-[var(--text-primary)]">Day {label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(2)}%
        </p>
      ))}
    </div>
  );
};

export default function FatigueChart({ creatives = [] }) {
  const { theme } = useTheme();
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const tickColor = theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#94a3b8';

  const top5 = creatives.slice(0, 5);

  // Merge all creatives into unified dataset keyed by day
  const dayMap = new Map();
  top5.forEach(({ name, fatigueData }) => {
    fatigueData.forEach(({ day, ctr }) => {
      if (!dayMap.has(day)) dayMap.set(day, { day });
      dayMap.get(day)[name] = ctr;
    });
  });
  const data = Array.from(dayMap.values()).sort((a, b) => a.day - b.day);

  // Compute average CTR across all data points
  const avgCtr = useMemo(() => {
    let sum = 0;
    let count = 0;
    top5.forEach(({ fatigueData }) => {
      fatigueData.forEach(({ ctr }) => {
        sum += ctr;
        count++;
      });
    });
    return count > 0 ? sum / count : 0;
  }, [top5]);

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl p-6 hover:border-[var(--border-hover)] transition-colors">
      <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
        Creative Fatigue — CTR Decay
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={(d) => `Day ${d}`}
            tick={{ fill: tickColor, fontSize: 11 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${v.toFixed(1)}%`}
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
          <ReferenceLine
            y={avgCtr}
            stroke={tickColor}
            strokeDasharray="6 4"
            label={{
              value: `Avg ${avgCtr.toFixed(2)}%`,
              position: 'right',
              fill: tickColor,
              fontSize: 11,
            }}
          />
          {top5.map(({ name, color }) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              name={name}
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
