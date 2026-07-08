// Shared CSV building blocks. One escaper for every export in the app.

export function escapeCsvCell(v) {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Build a CSV string from row objects.
 * @param {Object[]} data
 * @param {Array<{key:string, label:string, format?:(v:any, row:Object)=>any}>} [columns]
 *   Optional column config. `format` lets exports match on-screen formatting.
 */
export function buildCsv(data, columns) {
  if (!data.length) return "";
  const cols = columns || Object.keys(data[0]).map((k) => ({ key: k, label: k }));
  const header = cols.map((c) => escapeCsvCell(c.label)).join(",");
  const rows = data.map((row) =>
    cols
      .map((c) => {
        const raw = row[c.key];
        const v = c.format ? c.format(raw, row) : raw;
        return escapeCsvCell(v);
      })
      .join(",")
  );
  return [header, ...rows].join("\n");
}

export function downloadCsvString(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(data, filename, columns) {
  if (!data.length) return;
  downloadCsvString(buildCsv(data, columns), filename);
}
