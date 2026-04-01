/**
 * Converts an array of objects to CSV and triggers a download.
 * @param {Object[]} data - Array of row objects
 * @param {string} filename - Download filename (without extension)
 * @param {Array<{key:string, label:string}>} [columns] - Optional column config.
 *   If omitted, all keys from the first row are used.
 */
function downloadCSV(data, filename, columns) {
  if (!data.length) return;

  const cols = columns || Object.keys(data[0]).map((k) => ({ key: k, label: k }));
  const header = cols.map((c) => c.label).join(",");
  const rows = data.map((row) =>
    cols
      .map((c) => {
        let v = row[c.key];
        if (v instanceof Date) v = v.toISOString().slice(0, 10);
        if (typeof v === "string" && v.includes(",")) v = `"${v}"`;
        return v ?? "";
      })
      .join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
