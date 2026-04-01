import React, { useState, useEffect, useCallback } from 'react';

const sliderTrackStyle = `
  input[type="range"].budget-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: var(--toggle-bg);
    outline: none;
  }
  input[type="range"].budget-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--bg-card-solid);
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  input[type="range"].budget-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--bg-card-solid);
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
`;

const formatDollar = (v) =>
  `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function BudgetSlider({
  channels = [],
  totalBudget = 0,
  onAllocationsChange,
}) {
  const [allocations, setAllocations] = useState(() => {
    const init = {};
    channels.forEach((ch) => {
      init[ch.name] = ch.currentSpend || 0;
    });
    return init;
  });

  // Sync when channels prop changes
  useEffect(() => {
    setAllocations((prev) => {
      const next = {};
      channels.forEach((ch) => {
        next[ch.name] = prev[ch.name] ?? ch.currentSpend ?? 0;
      });
      return next;
    });
  }, [channels]);

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + v, 0);
  const remaining = totalBudget - totalAllocated;

  const handleChange = useCallback(
    (channelName, value) => {
      const next = { ...allocations, [channelName]: value };
      setAllocations(next);
      onAllocationsChange?.(next);
    },
    [allocations, onAllocationsChange]
  );

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl p-6 hover:border-[var(--border-hover)] transition-colors">
      <style>{sliderTrackStyle}</style>

      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Budget Simulator</h3>
        <div className="text-sm text-[var(--text-muted)]">
          Total: <span className="font-semibold text-[var(--text-primary)]">{formatDollar(totalBudget)}</span>
        </div>
      </div>

      <div className="space-y-4">
        {channels.map((ch) => {
          const value = allocations[ch.name] || 0;
          return (
            <div key={ch.name}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: ch.color }}
                  />
                  <span className="text-[var(--text-primary)]">{ch.name}</span>
                </div>
                <span className="font-medium text-[var(--text-primary)]">
                  {formatDollar(value)}
                </span>
              </div>
              <input
                type="range"
                className="budget-slider"
                min={0}
                max={totalBudget}
                step={Math.max(1, Math.round(totalBudget / 200))}
                value={value}
                onChange={(e) => handleChange(ch.name, Number(e.target.value))}
                style={{
                  '--thumb-color': ch.color,
                }}
                ref={(el) => {
                  if (el) {
                    // Apply channel color to thumb via inline style
                    el.style.setProperty('--thumb-bg', ch.color);
                    const sheet = el.getRootNode().styleSheets;
                    // Fallback: set accent color
                    el.style.accentColor = ch.color;
                  }
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[var(--border-color)] pt-4 text-sm">
        <span className="text-[var(--text-muted)]">Projected Total Spend</span>
        <span className="font-semibold text-[var(--text-primary)]">
          {formatDollar(totalAllocated)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">Remaining</span>
        <span
          className={`font-semibold ${
            remaining < 0 ? 'text-red-400' : 'text-[var(--text-primary)]'
          }`}
        >
          {formatDollar(remaining)}
        </span>
      </div>
    </div>
  );
}
