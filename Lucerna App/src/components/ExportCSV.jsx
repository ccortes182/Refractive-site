import { downloadCSV } from "../lib/csv";

/**
 * CSV export button. Columns may include a `format` function so the
 * exported values match what's rendered on screen.
 */
export default function ExportCSV({ data, filename = "export", columns, className = "" }) {
  return (
    <button
      onClick={() => downloadCSV(data, filename, columns)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
        text-[var(--text-muted)] hover:text-[var(--text-secondary)]
        bg-[var(--toggle-bg)] hover:bg-[var(--border-hover)]
        border border-transparent hover:border-[var(--border-color)]
        transition-colors ${className}`}
      title="Export to CSV"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 1v8M4 6l3 3 3-3" />
        <path d="M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2" />
      </svg>
      CSV
    </button>
  );
}
