import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const { month, avgLTV, newCustomers, repeatRate } = payload[0].payload;

  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-4 py-3 shadow-md">
      <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">{month}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-[var(--text-secondary)]">Avg LTV</span>
          <span className="font-semibold text-[var(--text-primary)]">
            ${avgLTV.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-[var(--text-secondary)]">New Customers</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {newCustomers.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-[var(--text-secondary)]">Repeat Rate</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {(repeatRate * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default function LTVChart({ data = [] }) {
  const { theme } = useTheme();

  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const tickColor = theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#94a3b8';

  const formatYAxis = (value) => `$${value}`;

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl p-6 hover:border-[var(--border-hover)] transition-colors">
      <h3 className="mb-4 text-base font-semibold text-[var(--text-primary)]">
        Customer Lifetime Value by Cohort
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="month"
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
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="avgLTV"
            fill="#43a9df"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
