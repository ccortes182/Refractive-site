import {
  ALL_CHANNEL_NAMES,
  getChannelConfig,
  getChannelPacingDefault,
} from "./mockData";
import {
  resolveOverrideForMonth,
  resolveTypeOverrideForMonth,
  setChannelTarget,
  setPlatformTarget,
  setTypeTarget,
  addCustomPlatform,
} from "./channelsBudgets";

// ─────────────────────────────────────────────────────────────────────────
// CSV download/upload for the Budgets matrix.
// Format (matrix-style, one row per channel/platform/type combo, scoped to
// a single year — the selected year in Settings):
//
//   # Lucerna Channels Budgets — Year 2026
//   channel,platform,type,mode,annual,jan,feb,mar,...,dec
//   Paid Search,,,$,900000,75000,75000,...
//   Paid Search,Google,,$,720000,60000,...
//   Paid Search,Google,Search,$,144000,12000,...
//   ...
//
// On import: cells are interpreted as overrides at the deepest layer
// indicated by the row (type if present, else platform if present, else
// channel). Empty cells are ignored (existing overrides preserved). Custom
// platforms not in CHANNEL_CONFIG are auto-registered.
// ─────────────────────────────────────────────────────────────────────────

const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function pacingMode(config) {
  if (config?.creditAllotment) return "credits";
  if (config?.sendAllotment)   return "sends";
  if (config?.monthlyTarget)   return "spend";
  return null;
}
function modeUnit(mode) {
  return mode === "spend" ? "$" : mode === "sends" ? "sends" : mode === "credits" ? "credits" : "";
}

function resolveMonthlyCell(budgets, channel, platform, platformWeight, type, typeWeight, yyyymm, defaultMonthly) {
  if (type) {
    const t = resolveTypeOverrideForMonth(budgets, channel, platform, type, yyyymm);
    if (t != null) return t;
    const p = resolveOverrideForMonth(budgets, channel, platform, yyyymm);
    if (p != null) return p * (typeWeight || 0);
    const c = resolveOverrideForMonth(budgets, channel, null, yyyymm);
    if (c != null) return c * (platformWeight || 0) * (typeWeight || 0);
    return defaultMonthly && platformWeight && typeWeight
      ? defaultMonthly * platformWeight * typeWeight : null;
  }
  if (platform) {
    const p = resolveOverrideForMonth(budgets, channel, platform, yyyymm);
    if (p != null) return p;
    const c = resolveOverrideForMonth(budgets, channel, null, yyyymm);
    if (c != null) return c * (platformWeight || 0);
    return defaultMonthly && platformWeight ? defaultMonthly * platformWeight : null;
  }
  const c = resolveOverrideForMonth(budgets, channel, null, yyyymm);
  if (c != null) return c;
  return defaultMonthly ?? null;
}

function escapeCsvCell(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function pushRow(rows, budgets, channel, platform, platformWeight, type, typeWeight, mode, defMonthly, year) {
  const cells = [];
  let monthlySum = 0;
  let anyResolved = false;
  for (let m = 0; m < 12; m++) {
    const yyyymm = `${year}-${String(m + 1).padStart(2, "0")}`;
    const v = resolveMonthlyCell(budgets, channel, platform, platformWeight, type, typeWeight, yyyymm, defMonthly);
    if (v != null) { anyResolved = true; monthlySum += v; cells.push(Math.round(v)); }
    else cells.push("");
  }
  const annual = anyResolved ? Math.round(monthlySum) : "";
  rows.push([channel, platform || "", type || "", modeUnit(mode), annual, ...cells]);
}

export function buildBudgetsCsv(budgets, year) {
  const rows = [["channel", "platform", "type", "mode", "annual", ...MONTHS]];
  for (const channelName of ALL_CHANNEL_NAMES) {
    const config = getChannelConfig(channelName);
    const mode = pacingMode(config);
    if (!mode) continue;
    const defMonthly = getChannelPacingDefault(channelName);
    pushRow(rows, budgets, channelName, null, 0, null, 0, mode, defMonthly, year);
    for (const p of (config.platforms || [])) {
      pushRow(rows, budgets, channelName, p.name, p.weight, null, 0, mode, defMonthly, year);
      const types = p.types || [];
      const tw = types.length ? 1 / types.length : 0;
      for (const t of types) {
        pushRow(rows, budgets, channelName, p.name, p.weight, t, tw, mode, defMonthly, year);
      }
    }
    const stored = budgets?.[channelName]?.platforms || {};
    for (const [platName, platEntry] of Object.entries(stored)) {
      if (!platEntry?.isCustom) continue;
      if ((config.platforms || []).find((b) => b.name === platName)) continue;
      pushRow(rows, budgets, channelName, platName, 0, null, 0, mode, defMonthly, year);
    }
  }
  return rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n");
}

export function downloadBudgetsCsv(budgets, year) {
  const header = `# Lucerna Channels Budgets — Year ${year}`;
  const csv = header + "\n" + buildBudgetsCsv(budgets, year);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lucerna-budgets-${year}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Parsing ──────────────────────────────────────────────────────────────

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

export function parseBudgetsCsv(text) {
  const allLines = text.split(/\r?\n/);
  let detectedYear = null;
  // Look for "# ... Year YYYY" header
  for (const l of allLines) {
    const m = l.match(/Year\s+(\d{4})/);
    if (m) { detectedYear = parseInt(m[1], 10); break; }
  }
  const lines = allLines.filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (lines.length < 2) return { updates: [], errors: ["Empty or header-only file."], year: detectedYear };
  const header = lines[0].split(",").map((s) => s.trim().toLowerCase());
  const colIdx = (name) => header.indexOf(name);
  const channelIdx = colIdx("channel");
  if (channelIdx < 0) return { updates: [], errors: ["Missing 'channel' column."], year: detectedYear };
  const platformIdx = colIdx("platform");
  const typeIdx = colIdx("type");
  const annualIdx = colIdx("annual");
  const monthIdxs = MONTHS.map((m) => colIdx(m));

  const updates = [];
  const errors = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const channel = cells[channelIdx]?.trim();
    if (!channel) continue;
    const platform = platformIdx >= 0 ? (cells[platformIdx]?.trim() || null) : null;
    const type = typeIdx >= 0 ? (cells[typeIdx]?.trim() || null) : null;
    const annualRaw = annualIdx >= 0 ? (cells[annualIdx]?.trim() ?? "") : "";
    const annual = annualRaw === "" ? null : parseFloat(annualRaw);
    if (annual != null && !Number.isFinite(annual)) {
      errors.push(`Row ${i + 1}: invalid annual value`);
    }
    const monthly = {};
    monthIdxs.forEach((idx, mi) => {
      if (idx < 0) return;
      const raw = cells[idx]?.trim();
      if (raw === "" || raw == null) return;
      const v = parseFloat(raw);
      if (!Number.isFinite(v)) {
        errors.push(`Row ${i + 1}: invalid value for ${MONTHS[mi]}`);
        return;
      }
      monthly[MONTHS[mi]] = v;
    });
    updates.push({ channel, platform, type, annual: Number.isFinite(annual) ? annual : null, monthly });
  }
  return { updates, errors, year: detectedYear };
}

export function applyBudgetsCsvUpdates(budgets, updates, year) {
  let next = budgets;
  let appliedRows = 0;
  for (const u of updates) {
    const config = getChannelConfig(u.channel);
    if (!config) continue;
    if (u.platform) {
      const isCustom = !(config.platforms || []).find((p) => p.name === u.platform);
      if (isCustom && !next?.[u.channel]?.platforms?.[u.platform]?.isCustom) {
        next = addCustomPlatform(next, u.channel, u.platform, 0);
      }
    }
    const hasMonthly = Object.keys(u.monthly).length > 0;
    let touched = false;
    if (hasMonthly) {
      for (let m = 0; m < 12; m++) {
        const k = MONTHS[m];
        const yyyymm = `${year}-${String(m + 1).padStart(2, "0")}`;
        const v = u.monthly[k];
        if (v == null || v <= 0) continue;
        if (u.type) next = setTypeTarget(next, u.channel, u.platform, u.type, "monthly", yyyymm, v);
        else if (u.platform) next = setPlatformTarget(next, u.channel, u.platform, "monthly", yyyymm, v);
        else next = setChannelTarget(next, u.channel, "monthly", yyyymm, v);
        touched = true;
      }
    } else if (u.annual != null && u.annual > 0) {
      const yr = String(year);
      if (u.type) next = setTypeTarget(next, u.channel, u.platform, u.type, "annual", yr, u.annual);
      else if (u.platform) next = setPlatformTarget(next, u.channel, u.platform, "annual", yr, u.annual);
      else next = setChannelTarget(next, u.channel, "annual", yr, u.annual);
      touched = true;
    }
    if (touched) appliedRows += 1;
  }
  return { next, appliedRows };
}
