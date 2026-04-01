import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';

const CustomTooltip = ({ active, payload, label, compareEnabled }) => {
  if (!active || !payload?.length) return null;
  const current = payload.find((p) => p.dataKey === 'orders');
  const prior = payload.find((p) => p.dataKey === 'priorOrders');
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
            {current.value?.toLocaleString()} orders
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
            {prior.value?.toLocaleString()} orders
          </span>
        </div>
      )}
    </div>
  );
};

export default function OrdersChart({ data = [], priorData = [], compareEnabled = false }) {
  const { theme } = useTheme();

  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const tickColor = theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#94a3b8';

  const chartData = useMemo(() => {
    const current = data.map((d) => ({
      label: format(new Date(d.date), 'MMM d'),
      orders: d.orders,
    }));

    if (!compareEnabled || !priorData.length) return current;

    return current.map((item, i) => ({
      ...item,
      priorOrders: priorData[i]?.orders ?? null,
    }));
  }, [data, priorData, compareEnabled]);

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl p-6 hover:border-[var(--border-hover)] transition-colors">
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Orders Over Time
        </h3>
        {compareEnabled && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#8e68ad]/15 text-[#8e68ad] border border-[#8e68ad]/20">
            <span className="w-1 h-1 rounded-full bg-[#8e68ad]" />
            vs Prior
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} barGap={compareEnabled ? 2 : 0}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: tickColor }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: tickColor }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip compareEnabled={compareEnabled} />} />
          {compareEnabled && (
            <Bar
              dataKey="priorOrders"
              fill="#8e68ad"
              opacity={0.35}
              radius={[4, 4, 0, 0]}
              name="Prior Period"
            />
          )}
          <Bar
            dataKey="orders"
            fill="#43a9df"
            radius={[4, 4, 0, 0]}
            name="Current Period"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
