import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, startOfWeek } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';

const CustomTooltip = ({ active, payload, label, compareEnabled }) => {
  if (!active || !payload?.length) return null;
  const current = payload.find((p) => p.dataKey === 'revenue');
  const prior = payload.find((p) => p.dataKey === 'priorRevenue');
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-4 py-3 shadow-md min-w-[160px]">
      <p className="mb-2 text-xs text-[var(--text-muted)]">{label}</p>
      {current && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#43a9df]" />
            <span className="text-sm text-[var(--text-secondary)]">Current</span>
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            ${current.value?.toLocaleString()}
          </span>
        </div>
      )}
      {prior && compareEnabled && (
        <div className="flex items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8e68ad]" />
            <span className="text-sm text-[var(--text-secondary)]">Prior</span>
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            ${prior.value?.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
};

export default function RevenueChart({
  data = [],
  priorData = [],
  compareEnabled = false,
  title = 'Revenue Over Time',
}) {
  const [view, setView] = useState('daily');
  const { theme } = useTheme();

  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const tickColor = theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#94a3b8';

  const chartData = useMemo(() => {
    if (!data.length) return [];

    const processData = (arr) => {
      if (view === 'daily') {
        return arr.map((d) => ({
          date: new Date(d.date),
          label: format(new Date(d.date), 'MMM d'),
          revenue: d.revenue,
        }));
      }
      const weeks = {};
      arr.forEach((d) => {
        const weekStart = startOfWeek(new Date(d.date), { weekStartsOn: 1 });
        const key = weekStart.toISOString();
        if (!weeks[key]) weeks[key] = { date: weekStart, revenue: 0 };
        weeks[key].revenue += d.revenue;
      });
      return Object.values(weeks)
        .sort((a, b) => a.date - b.date)
        .map((w) => ({ date: w.date, label: format(w.date, 'MMM d'), revenue: w.revenue }));
    };

    const currentProcessed = processData(data);

    if (!compareEnabled || !priorData.length) {
      return currentProcessed;
    }

    const priorProcessed = processData(priorData);

    return currentProcessed.map((item, i) => ({
      ...item,
      priorRevenue: priorProcessed[i]?.revenue ?? null,
    }));
  }, [data, priorData, view, compareEnabled]);

  const formatYAxis = (value) => `$${Math.round(value / 1000)}K`;

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl p-6 hover:border-[var(--border-hover)] transition-colors">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          {compareEnabled && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#8e68ad]/15 text-[#8e68ad] border border-[#8e68ad]/20">
              <span className="w-1 h-1 rounded-full bg-[#8e68ad]" />
              vs Prior
            </span>
          )}
        </div>
        <div className="flex rounded-lg bg-[var(--toggle-bg)] p-0.5">
          <button
            onClick={() => setView('daily')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              view === 'daily'
                ? 'bg-[var(--toggle-active-bg)] text-[var(--accent-blue)] border border-[var(--toggle-active-border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setView('weekly')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              view === 'weekly'
                ? 'bg-[var(--toggle-active-bg)] text-[var(--accent-blue)] border border-[var(--toggle-active-border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#43a9df" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#43a9df" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="priorRevenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8e68ad" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#8e68ad" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: tickColor }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12, fill: tickColor }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip compareEnabled={compareEnabled} />} />
          {compareEnabled && (
            <Area
              type="monotone"
              dataKey="priorRevenue"
              stroke="#8e68ad"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              fill="url(#priorRevenueGradient)"
              dot={false}
              name="Prior Period"
            />
          )}
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#43a9df"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            name="Current Period"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
