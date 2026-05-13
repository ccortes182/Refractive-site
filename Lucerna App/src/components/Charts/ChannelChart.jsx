import { useMemo, useState } from 'react';
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
  Brush,
} from 'recharts';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';

const CHANNELS = [
  { key: 'Paid Search', color: '#43a9df' },
  { key: 'Paid Social', color: '#8e68ad' },
  { key: 'Email', color: '#c2dcd4' },
  { key: 'SMS', color: '#f472b6' },
  { key: 'Organic', color: '#34d399' },
  { key: 'Direct', color: '#fbbf24' },
];

function makeTooltip({ chartMode }) {
  return function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const entries = payload.filter(
      (p) => !p.dataKey.startsWith('prior_') && !p.dataKey.startsWith('ma_')
    );
    const isIndexed = chartMode === 'indexed';
    const total = isIndexed ? null : entries.reduce((s, e) => s + (e.value || 0), 0);
    const fmt = (v) => (isIndexed ? Math.round(v * 10) / 10 : `$${Math.round(v).toLocaleString()}`);
    return (
      <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-3 py-2 text-xs shadow-md min-w-[160px]">
        <p className="mb-1.5 font-medium text-[var(--text-primary)]">{label}</p>
        {entries.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
              <span className="text-[var(--text-secondary)]">{entry.name}</span>
            </div>
            <span className="font-medium text-[var(--text-primary)]">{fmt(entry.value || 0)}</span>
          </div>
        ))}
        {!isIndexed && total != null && (
          <div className="mt-1.5 pt-1.5 border-t border-[var(--border-color)] flex justify-between">
            <span className="text-[var(--text-secondary)]">Total</span>
            <span className="font-semibold text-[var(--text-primary)]">${total.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  };
}

export default function ChannelChart({
  data = [],
  priorData = [],
  compareEnabled = false,
  chartMode = "stacked",
  selectedChannels = null,
  showMA = false,
}) {
  const { theme } = useTheme();
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const tickColor = theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#94a3b8';

  const visibleChannels = useMemo(
    () => (selectedChannels ? CHANNELS.filter((c) => selectedChannels.includes(c.key)) : CHANNELS),
    [selectedChannels]
  );

  // Track in-chart legend toggle (separate from page-level filter)
  const [hidden, setHidden] = useState(() => new Set());
  const handleLegendClick = (entry) => {
    const key = entry?.dataKey || entry?.value;
    if (!key) return;
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isHidden = (key) => hidden.has(key);

  const chartData = useMemo(() => {
    const current = data.map((d) => ({ ...d, label: format(new Date(d.date), 'MMM d') }));

    // Indexed mode: normalize each visible channel's first non-zero value to 100
    let working = current;
    if (chartMode === 'indexed') {
      const baselines = {};
      visibleChannels.forEach((ch) => {
        const firstNonZero = current.find((d) => d[ch.key] > 0);
        baselines[ch.key] = firstNonZero ? firstNonZero[ch.key] : null;
      });
      working = current.map((d) => {
        const next = { ...d };
        visibleChannels.forEach((ch) => {
          const base = baselines[ch.key];
          next[ch.key] = base ? Math.round((d[ch.key] / base) * 1000) / 10 : 0;
        });
        return next;
      });
    }

    // 7-day moving average per visible channel
    if (showMA) {
      working = working.map((row, i) => {
        const next = { ...row };
        visibleChannels.forEach((ch) => {
          const window = working.slice(Math.max(0, i - 6), i + 1);
          const sum = window.reduce((s, r) => s + (r[ch.key] || 0), 0);
          next[`ma_${ch.key}`] = Math.round((sum / window.length) * 100) / 100;
        });
        return next;
      });
    }

    if (!compareEnabled || !priorData.length) return working;
    return working.map((item, i) => {
      const prior = priorData[i];
      if (!prior) return item;
      const priorFields = {};
      visibleChannels.forEach((ch) => { priorFields[`prior_${ch.key}`] = prior[ch.key] ?? 0; });
      return { ...item, ...priorFields };
    });
  }, [data, priorData, compareEnabled, chartMode, showMA, visibleChannels]);

  const formatYAxis = chartMode === 'indexed'
    ? (v) => `${Math.round(v)}`
    : (v) => `$${Math.round(v / 1000)}K`;

  const sharedProps = { data: chartData };
  const Tip = useMemo(() => makeTooltip({ chartMode }), [chartMode]);

  const useLineLayout = chartMode === 'line' || chartMode === 'indexed';

  if (visibleChannels.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center text-sm text-[var(--text-muted)]">
        No channels selected.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      {useLineLayout ? (
        <LineChart {...sharedProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={{ stroke: gridColor }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: 12, fontSize: 11, cursor: 'pointer' }}
            onClick={handleLegendClick}
            formatter={(value, entry) => (
              <span style={{ color: isHidden(entry?.dataKey) ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isHidden(entry?.dataKey) ? 'line-through' : 'none' }}>
                {value}
              </span>
            )}
          />
          {visibleChannels.map((ch) => (
            <Line
              key={ch.key}
              type="monotone"
              dataKey={ch.key}
              name={ch.key}
              stroke={ch.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
              hide={isHidden(ch.key)}
            />
          ))}
          {showMA && visibleChannels.map((ch) => (
            <Line
              key={`ma_${ch.key}`}
              type="monotone"
              dataKey={`ma_${ch.key}`}
              name={`${ch.key} (7d MA)`}
              stroke={ch.color}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              hide={isHidden(ch.key)}
              legendType="none"
            />
          ))}
          {chartData.length > 14 && (
            <Brush dataKey="label" height={22} stroke="var(--accent-blue)" travellerWidth={8} fill="var(--bg-surface)" />
          )}
        </LineChart>
      ) : (
        <BarChart {...sharedProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={{ stroke: gridColor }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: 12, fontSize: 11, cursor: 'pointer' }}
            onClick={handleLegendClick}
            formatter={(value, entry) => (
              <span style={{ color: isHidden(entry?.dataKey) ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isHidden(entry?.dataKey) ? 'line-through' : 'none' }}>
                {value}
              </span>
            )}
          />
          {compareEnabled && visibleChannels.map((ch) => (
            <Bar key={`prior_${ch.key}`} dataKey={`prior_${ch.key}`} stackId="prior" fill={ch.color} opacity={0.2} legendType="none" hide={isHidden(ch.key)} />
          ))}
          {visibleChannels.map((ch) => (
            <Bar key={ch.key} dataKey={ch.key} name={ch.key} stackId="channels" fill={ch.color} hide={isHidden(ch.key)} />
          ))}
          {chartData.length > 14 && (
            <Brush dataKey="label" height={22} stroke="var(--accent-blue)" travellerWidth={8} fill="var(--bg-surface)" />
          )}
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
