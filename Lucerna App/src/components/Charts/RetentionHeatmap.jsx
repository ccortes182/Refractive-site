import React from 'react';

function getCellColor(value) {
  if (value > 80) return '#34d399';
  if (value > 60) return '#43a9df';
  if (value > 40) return '#fbbf24';
  return '#f87171';
}

function getCellOpacity(value) {
  return 0.2 + (value / 100) * 0.8;
}

function getTextColor(value) {
  // Use white text on darker cells (higher values get more opaque saturated bg)
  return value > 50 ? '#ffffff' : 'var(--text-primary)';
}

export default function RetentionHeatmap({ cohorts = [] }) {
  const maxMonths = 12; // Month 0 through Month 11
  const headers = Array.from({ length: maxMonths }, (_, i) => `Month ${i}`);

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl p-6 hover:border-[var(--border-hover)] transition-colors">
      <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
        Retention Heatmap
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--bg-card-solid)] px-2 py-1.5 text-left font-medium text-[var(--text-muted)]">
                Cohort
              </th>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-2 py-1.5 text-center font-medium text-[var(--text-muted)] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort) => (
              <tr key={cohort.month}>
                <td className="sticky left-0 z-10 bg-[var(--bg-card-solid)] px-2 py-1.5 font-medium text-[var(--text-primary)] whitespace-nowrap">
                  {cohort.month}
                </td>
                {headers.map((_, colIdx) => {
                  const value = cohort.retention[colIdx];
                  if (value === undefined || value === null) {
                    return (
                      <td key={colIdx} className="px-2 py-1.5" />
                    );
                  }
                  const bg = getCellColor(value);
                  const opacity = getCellOpacity(value);
                  const textColor = getTextColor(value);
                  return (
                    <td
                      key={colIdx}
                      className="px-2 py-1.5 text-center whitespace-nowrap rounded-sm"
                      style={{
                        backgroundColor: bg,
                        opacity,
                        color: textColor,
                        fontWeight: 500,
                      }}
                    >
                      {value.toFixed(0)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
