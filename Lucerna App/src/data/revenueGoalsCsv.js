import { ALL_CHANNEL_NAMES } from "./mockData";
import { setRevenueGoal, resolveGoalForMonth, TOTAL_KEY } from "./revenueGoals";

const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function escapeCsvCell(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function pushRow(rows, goals, channel, displayLabel, year) {
  const cells = [];
  let monthlySum = 0;
  let any = false;
  for (let m = 0; m < 12; m++) {
    const yyyymm = `${year}-${String(m + 1).padStart(2, "0")}`;
    const v = resolveGoalForMonth(goals, channel, yyyymm);
    if (v != null) { any = true; monthlySum += v; cells.push(Math.round(v)); }
    else cells.push("");
  }
  const annual = any ? Math.round(monthlySum) : "";
  rows.push([displayLabel, annual, ...cells]);
}

export function buildRevenueGoalsCsv(goals, year) {
  const rows = [["channel", "annual", ...MONTHS]];
  pushRow(rows, goals, TOTAL_KEY, "__total__", year);
  for (const channel of ALL_CHANNEL_NAMES) {
    pushRow(rows, goals, channel, channel, year);
  }
  return rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n");
}

export function downloadRevenueGoalsCsv(goals, year) {
  const header = `# Lucerna Revenue Goals — Year ${year}`;
  const csv = header + "\n" + buildRevenueGoalsCsv(goals, year);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lucerna-revenue-goals-${year}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === ",") { out.push(cur); cur = ""; }
      else if (ch === '"') { inQ = true; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function parseRevenueGoalsCsv(text) {
  const allLines = text.split(/\r?\n/);
  let detectedYear = null;
  for (const l of allLines) {
    const m = l.match(/Year\s+(\d{4})/);
    if (m) { detectedYear = parseInt(m[1], 10); break; }
  }
  const lines = allLines.filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (lines.length < 2) return { updates: [], year: detectedYear };
  const header = lines[0].split(",").map((s) => s.trim().toLowerCase());
  const channelIdx = header.indexOf("channel");
  const annualIdx = header.indexOf("annual");
  const monthIdxs = MONTHS.map((m) => header.indexOf(m));
  if (channelIdx < 0) return { updates: [], year: detectedYear };

  const updates = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const channel = cells[channelIdx]?.trim();
    if (!channel) continue;
    const annualRaw = annualIdx >= 0 ? cells[annualIdx]?.trim() : "";
    const annual = annualRaw === "" ? null : parseFloat(annualRaw);
    const monthly = {};
    monthIdxs.forEach((idx, mi) => {
      if (idx < 0) return;
      const raw = cells[idx]?.trim();
      if (raw === "" || raw == null) return;
      const v = parseFloat(raw);
      if (Number.isFinite(v)) monthly[MONTHS[mi]] = v;
    });
    updates.push({ channel, annual: Number.isFinite(annual) ? annual : null, monthly });
  }
  return { updates, year: detectedYear };
}

export function applyRevenueGoalsCsvUpdates(goals, updates, year) {
  let next = goals;
  for (const u of updates) {
    const channel = u.channel === "__total__" ? TOTAL_KEY : u.channel;
    if (channel !== TOTAL_KEY && !ALL_CHANNEL_NAMES.includes(channel)) continue;
    const hasMonthly = Object.keys(u.monthly).length > 0;
    if (hasMonthly) {
      for (let m = 0; m < 12; m++) {
        const k = MONTHS[m];
        const yyyymm = `${year}-${String(m + 1).padStart(2, "0")}`;
        const v = u.monthly[k];
        if (v == null || v <= 0) continue;
        next = setRevenueGoal(next, channel, "monthly", yyyymm, v);
      }
    } else if (u.annual != null && u.annual > 0) {
      next = setRevenueGoal(next, channel, "annual", String(year), u.annual);
    }
  }
  return next;
}
