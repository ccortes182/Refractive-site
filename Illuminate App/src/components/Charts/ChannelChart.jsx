import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';

const CHANNELS = [
  { key: 'Paid Search', color: '#43a9df' },
  { key: 'Paid Social', color: '#8e68ad' },
  { key: 'Email', color: '#c2dcd4' },
  { key: 'Organic', color: '#34d399' },
  { key: 'Direct', color: '#fbbf24' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const entries = payload.filter((p) => !p.dataKey.startsWith('prior_'));
  const total = entries.reduce((s, e) => s + (e.value || 0), 0);
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-3 py-2 text-xs shadow-md min-w-[160px]">
      <p className="mb-1.5 font-medium text-[var(--text-primary)]">{label}</p>
      {entries.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
            <span className="text-[var(--text-secondary)]">{entry.name}</span>
          </div>
          <span className="font-medium text-[var(--text-primary)]">${entry.value?.toLocaleString()}</span>
        </div>
      ))}
      <div className="mt-1.5 pt-1.5 border-t border-[var(--border-color)] flex justify-between">
        <span className="text-[var(--text-secondary)]">Total</span>
        <span className="font-semibold text-[var(--text-primary)]">${total.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default function ChannelChart({ data = [], priorData = [], compareEnabled = false, chartMode = "stacked" }) {
  const { theme } = useTheme();
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const tickColor = theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#94a3b8';

  const chartData = useMemo(() => {
    const current = data.map((d) => ({ ...d, label: format(new Date(d.date), 'MMM d') }));
    if (!compareEnabled || !priorData.length) return current;
    return current.map((item, i) => {
      const prior = priorData[i];
      if (!prior) return item;
      const priorFields = {};
      CHANNELS.forEach((ch) => { priorFields[`prior_${ch.key}`] = prior[ch.key] ?? 0; });
      return { ...item, ...priorFields };
    });
  }, [data, priorData, compareEnabled]);

  const formatYAxis = (v) => `$${Math.round(v / 1000)}K`;

  const sharedProps = {
    data: chartData,
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      {chartMode === "line" ? (
        <LineChart {...sharedProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={{ stroke: gridColor }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 12, fontSize: 11 }} />
          {CHANNELS.map((ch) => (
            <Line key={ch.key} type="monotone" dataKey={ch.key} name={ch.key} stroke={ch.color} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
          ))}
        </LineChart>
      ) : (
        <BarChart {...sharedProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={{ stroke: gridColor }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 12, fontSize: 11 }} />
          {compareEnabled && CHANNELS.map((ch) => (
            <Bar key={`prior_${ch.key}`} dataKey={`prior_${ch.key}`} stackId="prior" fill={ch.color} opacity={0.2} legendType="none" />
          ))}
          {CHANNELS.map((ch) => (
            <Bar key={ch.key} dataKey={ch.key} name={ch.key} stackId="channels" fill={ch.color} />
          ))}
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
