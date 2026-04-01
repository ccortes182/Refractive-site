import { useEffect, useRef, useState } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

export default function KPICard({
  title,
  value,
  change,
  sparklineData = [],
  prefix = "",
  suffix = "",
  compareEnabled = false,
  priorValue = null,
  index = 0,
  active = false,
  onClick = null,
  children = null,
  subtitle = null,
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 80);
    return () => clearTimeout(timer);
  }, [index]);
  const isPositive = change >= 0;
  const chartColor = isPositive ? "#43a9df" : "#ef4444";
  const gradientId = `gradient-${title?.replace(/\s+/g, "-").toLowerCase()}`;

  const chartData = (sparklineData || []).map((v) => ({ value: v }));

  return (
    <div
      ref={ref}
      onClick={onClick || undefined}
      className={`rounded-xl border bg-[var(--bg-card-solid)] backdrop-blur-2xl p-5 transition-all duration-500 ease-out
        ${active
          ? "border-[var(--accent-blue)] shadow-[0_0_0_1px_rgba(67,169,223,0.3)]"
          : "border-[var(--border-color)] hover:border-[var(--border-hover)]"
        }
        ${onClick ? "cursor-pointer" : ""}
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)] font-medium">{title}</p>
        {children}
      </div>

      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        <span className="text-xl font-semibold text-[var(--text-primary)] leading-tight">
          {prefix}
          {value}
          {suffix}
        </span>

        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap flex-shrink-0 ${
            isPositive
              ? "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]"
              : "bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)]"
          }`}
        >
          {isPositive ? (
            <svg
              className="h-3 w-3"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9V3M6 3L3 6M6 3l3 3" />
            </svg>
          ) : (
            <svg
              className="h-3 w-3"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3v6M6 9l-3-3M6 9l3-3" />
            </svg>
          )}
          {isPositive ? "+" : ""}
          {change}%
        </span>
      </div>

      {subtitle && (
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{subtitle}</p>
      )}

      {/* Prior period value */}
      {compareEnabled && priorValue != null && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8e68ad]" />
          <span className="text-xs text-[#8e68ad] font-medium">
            Prior: {prefix}{priorValue}{suffix}
          </span>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mt-3 -mx-1">
          <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.15} />
                  <stop
                    offset="100%"
                    stopColor={chartColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
