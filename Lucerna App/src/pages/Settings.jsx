import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  ALL_CHANNEL_NAMES,
  getChannelPacingKey,
  getChannelPacingDefault,
  getChannelConfig,
} from "../data/mockData";
import { NETWORK_LIBRARY, NETWORK_PARENT_CHANNELS, librarySuggestionsFor, isLibraryNetwork } from "../data/networkLibrary";
import { downloadBudgetsCsv, parseBudgetsCsv, applyBudgetsCsvUpdates } from "../data/budgetsCsv";
import {
  loadRevenueGoals,
  saveRevenueGoals,
  setRevenueGoal,
  clearRevenueGoals,
  resolveGoalForMonth,
  TOTAL_KEY,
  GOALS_CHANGED_EVENT,
} from "../data/revenueGoals";
import { downloadRevenueGoalsCsv, parseRevenueGoalsCsv, applyRevenueGoalsCsvUpdates } from "../data/revenueGoalsCsv";
import {
  loadChannelsBudgets,
  saveChannelsBudgets,
  setChannelTarget,
  setPlatformTarget,
  setTypeTarget,
  clearChannelTargets,
  clearPlatformTargets,
  clearPlatformOverridesKeepTracked,
  clearTypeTargets,
  addCustomPlatform,
  addLibraryPlatform,
  removePlatform,
  getOperatorPlatforms,
  setMonthlyCost,
  getMonthlyCost,
  resolveOverrideForMonth,
  resolveTypeOverrideForMonth,
  BUDGETS_CHANGED_EVENT,
} from "../data/channelsBudgets";
import {
  loadEventWindows,
  saveEventWindows,
  upsertEventWindow,
  deleteEventWindow,
  getEventStatus,
  getEventDayCount,
  EVENTS_CHANGED_EVENT,
} from "../data/eventWindows";

const CHANNEL_COLORS = {
  "Paid Search": "#43a9df",
  "Paid Social": "#8e68ad",
  Email: "#c2dcd4",
  SMS: "#f472b6",
  Organic: "#34d399",
  Direct: "#fbbf24",
};

const PACING_LABELS = {
  monthlyTarget: { type: "Spend", unit: "$/mo", inputPrefix: "$", placeholder: "75000" },
  sendAllotment: { type: "Sends", unit: "sends/mo", inputPrefix: "", placeholder: "500000" },
  creditAllotment: { type: "Credits", unit: "credits/mo", inputPrefix: "", placeholder: "20000" },
};

function fmtCompact(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return Math.round(n).toString();
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function BudgetsSection() {
  const [budgets, setBudgets] = useState(() => loadChannelsBudgets());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [expanded, setExpanded] = useState(() => new Set());
  const [expandedPlatforms, setExpandedPlatforms] = useState(() => new Set()); // keyed "Channel|Platform"
  const [adding, setAdding] = useState(null); // channel name or null
  const [newName, setNewName] = useState("");
  const [newDefault, setNewDefault] = useState("");
  const [importMessage, setImportMessage] = useState(null); // { kind: "ok" | "err", text }
  const [matrixVersion, setMatrixVersion] = useState(0); // bump to remount uncontrolled inputs
  const [draftAnnual, setDraftAnnual] = useState({}); // keyed by `${channel}|${platform}|${type}`
  const fileInputRef = useRef(null);

  const annualKey = (channel, platform, type) => `${channel}|${platform || ""}|${type || ""}`;
  const startAnnualEdit = (key, currentDisplayed) => {
    setDraftAnnual((d) => ({ ...d, [key]: currentDisplayed }));
  };
  const updateAnnualDraft = (key, val) => {
    setDraftAnnual((d) => ({ ...d, [key]: val }));
  };
  const commitAnnualDraft = (key, applyFn) => {
    const draft = draftAnnual[key];
    setDraftAnnual((d) => { const n = { ...d }; delete n[key]; return n; });
    // Only commit if the operator actually edited (otherwise tabbing through
    // a derived/inherited cell would silently save the resolved value as an
    // override at this layer).
    if (draft !== undefined) applyFn(draft);
  };

  const handleDownloadCsv = () => downloadBudgetsCsv(budgets, year);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { updates, errors, year: detectedYear } = parseBudgetsCsv(text);
      const targetYear = detectedYear || year;
      if (errors.length) {
        setImportMessage({ kind: "err", text: `${errors.length} parse warning(s) — ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "…" : ""}` });
      }
      const { next, appliedRows } = applyBudgetsCsvUpdates(budgets, updates, targetYear);
      saveChannelsBudgets(next);
      setBudgets(next);
      setMatrixVersion((v) => v + 1); // remount uncontrolled inputs to show new values
      if (detectedYear && detectedYear !== year) setYear(detectedYear);
      setImportMessage({
        kind: "ok",
        text: `Imported ${appliedRows} rows for ${targetYear}.${errors.length ? ` ${errors.length} warning(s).` : ""}`,
      });
      setTimeout(() => setImportMessage(null), 5000);
    } catch (err) {
      setImportMessage({ kind: "err", text: `Failed to read file: ${err.message || err}` });
    } finally {
      e.target.value = ""; // allow re-uploading the same filename
    }
  };

  useEffect(() => {
    const refresh = () => setBudgets(loadChannelsBudgets());
    window.addEventListener(BUDGETS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(BUDGETS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const persist = (next) => { setBudgets(next); saveChannelsBudgets(next); };
  // Bump the matrix-version key so uncontrolled <input defaultValue> cells re-
  // mount with the new state. Used for Clear / Remove / CSV-upload — i.e.,
  // operations that change values without the user typing into a cell.
  const persistAndRemount = (next) => { persist(next); setMatrixVersion((v) => v + 1); };

  const channelRows = useMemo(
    () => ALL_CHANNEL_NAMES
      .map((channel) => {
        const config = getChannelConfig(channel);
        const key = getChannelPacingKey(channel);
        if (!key) return null;
        // Operator-tracked platforms only — driven by what's in budgets.platforms.
        // Library/built-in metadata (weight, types) is looked up at render time.
        const trackedNames = getOperatorPlatforms(budgets, channel);
        const platforms = trackedNames.map((name) => {
          const builtIn = (config?.platforms || []).find((p) => p.name === name);
          const isCustom = !!budgets[channel]?.platforms?.[name]?.isCustom || !builtIn;
          return {
            name,
            weight: builtIn?.weight ?? 0,
            types: builtIn?.types || [],
            isCustom,
          };
        });
        return {
          channel,
          key,
          mode: PACING_LABELS[key],
          defaultMonthly: getChannelPacingDefault(channel),
          platforms,
        };
      })
      .filter(Boolean),
    [budgets]
  );

  // ── Single-month cell resolution (mirrors mockData period resolver) ──
  // Returns true if any child cell of this row has an override (monthly OR
  // annual) for the given month — used to determine when parent cells become
  // read-only live sums.
  const hasChildOverrideForMonth = (channel, platform, yyyymm) => {
    const yearStr = yyyymm.slice(0, 4);
    if (platform) {
      const cfg = getChannelConfig(channel);
      const platformConfig = cfg?.platforms?.find((p) => p.name === platform);
      const types = platformConfig?.types || [];
      const storedTypes = budgets[channel]?.platforms?.[platform]?.types || {};
      return types.some((t) =>
        storedTypes[t]?.monthly?.[yyyymm] != null ||
        storedTypes[t]?.annual?.[yearStr] != null
      );
    }
    const tracked = getOperatorPlatforms(budgets, channel);
    return tracked.some((name) => {
      const pEntry = budgets[channel]?.platforms?.[name];
      if (pEntry?.monthly?.[yyyymm] != null) return true;
      if (pEntry?.annual?.[yearStr] != null) return true;
      return hasChildOverrideForMonth(channel, name, yyyymm);
    });
  };

  // Platform's "direct or channel-derived" value — NO type rollup. Used when
  // resolving a type with no override (its inheritance basis is the platform's
  // own number, not the rolled-up sum, otherwise we'd cycle through types).
  const resolvePlatformDirect = (channel, platform, yyyymm) => {
    const yearStr = yyyymm.slice(0, 4);
    const cfg = getChannelConfig(channel);
    const pEntry = budgets[channel]?.platforms?.[platform];
    if (pEntry?.monthly?.[yyyymm] != null) return pEntry.monthly[yyyymm];
    if (pEntry?.annual?.[yearStr] != null) return pEntry.annual[yearStr] / 12;
    const channelVal = resolveOverrideForMonth(budgets, channel, null, yyyymm);
    if (channelVal != null) {
      const tracked = getOperatorPlatforms(budgets, channel);
      const libraryWeights = {};
      for (const name of tracked) {
        const builtIn = cfg?.platforms?.find((p) => p.name === name);
        if (builtIn?.weight) libraryWeights[name] = builtIn.weight;
      }
      const total = Object.values(libraryWeights).reduce((s, w) => s + w, 0);
      const normalized = total > 0
        ? (libraryWeights[platform] || 0) / total
        : (tracked.length > 0 ? 1 / tracked.length : 0);
      return channelVal * normalized;
    }
    return null;
  };

  // Resolves a single cell's display value. When a parent cell has child
  // overrides for the queried month, the parent shows the live sum. Otherwise
  // it shows its own override or inherits via the resolver chain.
  const resolveCellValue = (channel, platform, type, yyyymm) => {
    const yearStr = yyyymm.slice(0, 4);
    const cfg = getChannelConfig(channel);

    if (type) {
      const tEntry = budgets[channel]?.platforms?.[platform]?.types?.[type];
      if (tEntry?.monthly?.[yyyymm] != null) return tEntry.monthly[yyyymm];
      if (tEntry?.annual?.[yearStr] != null) return tEntry.annual[yearStr] / 12;
      // Inherit from platform's NON-rollup value × type weight (avoids cycles).
      const platformVal = resolvePlatformDirect(channel, platform, yyyymm);
      if (platformVal != null) {
        const types = cfg?.platforms?.find((p) => p.name === platform)?.types || [];
        const tw = types.length ? 1 / types.length : 0;
        return platformVal * tw;
      }
      return null;
    }

    if (platform) {
      if (hasChildOverrideForMonth(channel, platform, yyyymm)) {
        const types = cfg?.platforms?.find((p) => p.name === platform)?.types || [];
        let sum = 0, any = false;
        for (const t of types) {
          // Safe: type → resolvePlatformDirect, never back to this platform path.
          const v = resolveCellValue(channel, platform, t, yyyymm);
          if (v != null) { sum += v; any = true; }
        }
        if (any) return sum;
      }
      return resolvePlatformDirect(channel, platform, yyyymm);
    }

    if (hasChildOverrideForMonth(channel, null, yyyymm)) {
      const tracked = getOperatorPlatforms(budgets, channel);
      let sum = 0, any = false;
      for (const name of tracked) {
        const v = resolveCellValue(channel, name, null, yyyymm);
        if (v != null) { sum += v; any = true; }
      }
      if (any) return sum;
    }
    return resolveOverrideForMonth(budgets, channel, null, yyyymm);
  };

  // True if this cell can be directly edited (no children below have overrides).
  const isCellEditable = (channel, platform, type, yyyymm) => {
    if (type) return true;
    if (platform) return !hasChildOverrideForMonth(channel, platform, yyyymm);
    return !hasChildOverrideForMonth(channel, null, yyyymm);
  };

  const monthCellResolved = (channel, platform /* weight unused */) => {
    return MONTHS.map((_, i) => {
      const yyyymm = `${year}-${String(i + 1).padStart(2, "0")}`;
      const value = resolveCellValue(channel, platform, null, yyyymm);
      const overrideAtThisLayer = platform
        ? (budgets[channel]?.platforms?.[platform]?.monthly?.[yyyymm] != null
            || budgets[channel]?.platforms?.[platform]?.annual?.[year] != null)
        : (budgets[channel]?.monthly?.[yyyymm] != null
            || budgets[channel]?.annual?.[year] != null);
      return { value, source: overrideAtThisLayer ? "self-override" : "derived" };
    });
  };

  const handleMonthEdit = (channel, platform, type, monthIdx, raw) => {
    const v = parseFloat(raw);
    const yyyymm = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
    const isClear = !Number.isFinite(v) || v <= 0;
    const value = isClear ? null : v;
    const next = type
      ? setTypeTarget(budgets, channel, platform, type, "monthly", yyyymm, value)
      : platform
        ? setPlatformTarget(budgets, channel, platform, "monthly", yyyymm, value)
        : setChannelTarget(budgets, channel, "monthly", yyyymm, value);
    persist(next);
  };

  const handleAnnualEdit = (channel, platform, raw) => {
    const v = parseFloat(raw);
    const isClear = !Number.isFinite(v) || v <= 0;
    const next = platform
      ? setPlatformTarget(budgets, channel, platform, "annual", String(year), isClear ? null : v)
      : setChannelTarget(budgets, channel, "annual", String(year), isClear ? null : v);
    persist(next);
  };

  const handleResetRow = (channel, platform = null) => {
    const next = platform
      ? clearPlatformTargets(budgets, channel, platform)
      : clearChannelTargets(budgets, channel);
    persistAndRemount(next);
  };

  const toggleExpand = (channel) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });
  };

  const handleAddNetwork = (channel) => {
    const name = newName.trim();
    const defaultMonthly = parseFloat(newDefault);
    if (!name || !channel) return;
    const monthly = Number.isFinite(defaultMonthly) && defaultMonthly > 0 ? defaultMonthly : 0;
    const fromLibrary = isLibraryNetwork(channel, name);
    const next = fromLibrary
      ? addLibraryPlatform(budgets, channel, name, monthly)
      : addCustomPlatform(budgets, channel, name, monthly);
    persist(next);
    setExpanded((prev) => new Set([...prev, channel]));
    setNewName(""); setNewDefault(""); setAdding(null);
  };

  // Sum monthly cells to display annual total (overrides only when a monthly value exists; else annual override or default*12)
  const sumAnnual = (channel, platform, weight) => {
    const monthly = monthCellResolved(channel, platform, weight);
    return monthly.reduce((s, m) => s + (m.value ?? 0), 0);
  };
  const annualOverrideValue = (channel, platform) => {
    if (platform) return budgets[channel]?.platforms?.[platform]?.annual?.[year] ?? null;
    return budgets[channel]?.annual?.[year] ?? null;
  };

  // ── Type-level helpers ────────────────────────────────────────────────
  const togglePlatformExpand = (channel, platform) => {
    const k = `${channel}|${platform}`;
    setExpandedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };
  const isPlatformExpanded = (channel, platform) =>
    expandedPlatforms.has(`${channel}|${platform}`);

  const typeMonthCellResolved = (channel, platform, /* platformWeight */ _pw, type /* typeWeight unused */) => {
    return MONTHS.map((_, i) => {
      const yyyymm = `${year}-${String(i + 1).padStart(2, "0")}`;
      const value = resolveCellValue(channel, platform, type, yyyymm);
      const tEntry = budgets[channel]?.platforms?.[platform]?.types?.[type];
      const overrideAtThisLayer = tEntry?.monthly?.[yyyymm] != null
        || tEntry?.annual?.[year] != null;
      return { value, source: overrideAtThisLayer ? "self-override" : "derived" };
    });
  };

  const handleTypeAnnualEdit = (channel, platform, type, raw) => {
    const v = parseFloat(raw);
    const isClear = !Number.isFinite(v) || v <= 0;
    const next = setTypeTarget(budgets, channel, platform, type, "annual", String(year), isClear ? null : v);
    persist(next);
  };
  const typeAnnualOverride = (channel, platform, type) =>
    budgets[channel]?.platforms?.[platform]?.types?.[type]?.annual?.[year] ?? null;

  const sumTypeAnnual = (channel, platform, _pw, type, _tw) => {
    const cells = typeMonthCellResolved(channel, platform, _pw, type, _tw);
    return cells.reduce((s, m) => s + (m.value ?? 0), 0);
  };

  // Draft state for monthly cells (controlled inputs).
  const [draftCell, setDraftCell] = useState({});
  const cellKey = (channel, platform, type, monthIdx) =>
    `${channel}|${platform || ""}|${type || ""}|${monthIdx}`;
  const updateCellDraft = (k, val) => setDraftCell((d) => ({ ...d, [k]: val }));
  const commitCellDraft = (k, applyFn) => {
    const hadDraft = draftCell[k] !== undefined;
    setDraftCell((d) => { const n = { ...d }; delete n[k]; return n; });
    if (hadDraft) applyFn();
  };

  const inputCls = "w-16 px-1.5 py-1 text-[11px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] text-right";

  const handleCostChange = (channel, raw) => {
    const v = parseFloat(raw);
    const next = setMonthlyCost(budgets, channel, Number.isFinite(v) && v > 0 ? v : null);
    persist(next);
  };
  const ownedCostChannels = [
    { channel: "Email", label: "Email tier cost", help: "ESP plan price (e.g., Klaviyo monthly)" },
    { channel: "SMS", label: "SMS credit pack cost", help: "Monthly credit-pack spend incl. carrier fees" },
  ];

  return (
    <div>
      <div className="mb-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)]/30 p-3">
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-2">
          Owned-channel costs · powers ROAS for Email / SMS
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          {ownedCostChannels.map(({ channel, label, help }) => {
            const current = getMonthlyCost(budgets, channel);
            return (
              <div key={channel} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[channel] || "#6b7280" }} />
                <span className="text-[11px] text-[var(--text-secondary)]">{label}</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">$</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    placeholder="0"
                    defaultValue={current ?? ""}
                    onBlur={(e) => handleCostChange(channel, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                    className="w-24 pl-5 pr-2 py-1 text-[11px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                    title={help}
                  />
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">/mo</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-[var(--text-muted)]">
          When set, this overrides the synthetic spend used for {`{Email, SMS}`} ROAS / CPA on the Channels tab.
        </p>
      </div>

      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Year</label>
          <select
            className="text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          >
            {[year - 2, year - 1, year, year + 1, year + 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="mx-1 text-[var(--text-muted)] opacity-50">|</span>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--toggle-bg)] text-[var(--text-primary)] hover:border-[var(--border-hover)]"
            title={`Download ${year} budgets as CSV`}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 1v8M3 6l3 3 3-3M2 11h8" />
            </svg>
            Download CSV
          </button>
          <button
            type="button"
            onClick={handleUploadClick}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--toggle-bg)] text-[var(--text-primary)] hover:border-[var(--border-hover)]"
            title="Upload CSV to apply as overrides"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 11V3M3 6l3-3 3 3M2 1h8" />
            </svg>
            Upload CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
          {importMessage && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                importMessage.kind === "ok"
                  ? "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]"
                  : "bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)]"
              }`}
            >
              {importMessage.text}
            </span>
          )}
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">
          Edit any cell. Annual = sum of monthlies (or set directly when blanks).
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="text-xs" style={{ minWidth: 1100 }}>
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--bg-surface)]/40 sticky top-0">
              <th className="text-left py-2 pl-2 pr-3 text-[10px] font-medium text-[var(--text-muted)] uppercase whitespace-nowrap">Channel / Platform</th>
              <th className="text-left py-2 pr-3 text-[10px] font-medium text-[var(--text-muted)] uppercase">Type</th>
              <th className="text-right py-2 pr-3 text-[10px] font-medium text-[var(--text-muted)] uppercase">Annual</th>
              {MONTHS.map((m) => (
                <th key={m} className="text-right py-2 pr-1 text-[10px] font-medium text-[var(--text-muted)] uppercase">{m}</th>
              ))}
              <th className="py-2 pl-3 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase">Clear</th>
            </tr>
          </thead>
          <tbody key={`matrix-${matrixVersion}`}>
            {channelRows.map(({ channel, key, mode, defaultMonthly, platforms }) => {
              const isExpanded = expanded.has(channel);
              // Show chevron whenever the operator can add platforms (Paid Search /
              // Paid Social / Other Paid), even if nothing is tracked yet — otherwise
              // the "+ Add network" form is unreachable on first use.
              const canAddPlatforms = NETWORK_PARENT_CHANNELS.includes(channel);
              const hasPlatforms = platforms.length > 0 || canAddPlatforms;
              const channelMonths = monthCellResolved(channel, null, null);
              const channelAnnualResolved = sumAnnual(channel, null, null);
              const channelAnnualOverride = annualOverrideValue(channel, null);
              const channelOverridden = !!budgets[channel];
              return (
                <Fragment key={channel}>
                  <tr className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-card-hover)]/50">
                    <td className="py-2 pl-2 pr-3 whitespace-nowrap">
                      {hasPlatforms ? (
                        <button onClick={() => toggleExpand(channel)} className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                          <span className={`text-[10px] inline-block transition-transform ${isExpanded ? "rotate-90" : ""}`}>▸</span>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[channel] || "#6b7280" }} />
                          <span className="text-[var(--text-primary)] font-medium">{channel}</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 pl-3.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[channel] || "#6b7280" }} />
                          <span className="text-[var(--text-primary)] font-medium">{channel}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-[var(--text-muted)]">{mode.type}</td>
                    <td className="py-2 pr-3 text-right">
                      <input
                        type="number"
                        value={(() => {
                          const k = annualKey(channel, null, null);
                          return draftAnnual[k] !== undefined
                            ? draftAnnual[k]
                            : (channelAnnualResolved > 0 ? Math.round(channelAnnualResolved) : (channelAnnualOverride ?? ""));
                        })()}
                        onChange={(e) => updateAnnualDraft(annualKey(channel, null, null), e.target.value)}
                        onBlur={(e) => commitAnnualDraft(annualKey(channel, null, null), (v) => handleAnnualEdit(channel, null, v ?? e.target.value))}
                        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                        className={`${inputCls} w-24 ${channelAnnualOverride != null ? "border-[var(--accent-blue)]/50 font-semibold" : ""}`}
                      />
                    </td>
                    {channelMonths.map((m, i) => {
                      const yyyymm = `${year}-${String(i + 1).padStart(2, "0")}`;
                      const ck = cellKey(channel, null, null, i);
                      const editable = isCellEditable(channel, null, null, yyyymm);
                      const isOverride = editable && m.source === "self-override";
                      const display = draftCell[ck] !== undefined
                        ? draftCell[ck]
                        : (m.value != null ? Math.round(m.value) : "");
                      return (
                        <td key={i} className="py-2 pr-1 text-right">
                          <input
                            type="number"
                            value={display}
                            disabled={!editable}
                            readOnly={!editable}
                            onChange={(e) => updateCellDraft(ck, e.target.value)}
                            onBlur={(e) => commitCellDraft(ck, () => editable && handleMonthEdit(channel, null, null, i, e.target.value))}
                            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                            placeholder="—"
                            title={!editable ? "Edit at the deeper level — children have overrides" : undefined}
                            className={`${inputCls} ${
                              isOverride ? "border-[var(--accent-blue)]/50 font-semibold" : ""
                            } ${!editable ? "opacity-50 cursor-not-allowed bg-transparent" : ""}`}
                          />
                        </td>
                      );
                    })}
                    <td className="py-2 pl-3 text-right">
                      {channelOverridden && (
                        <button onClick={() => handleResetRow(channel)} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)] underline">Clear</button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && platforms.map((p) => {
                    const platMonths = monthCellResolved(channel, p.name, p.weight);
                    const platAnnualResolved = sumAnnual(channel, p.name, p.weight);
                    const platAnnualOverride = annualOverrideValue(channel, p.name);
                    const platEntry = budgets[channel]?.platforms?.[p.name];
                    const platOverridden = !!(platEntry?.annual || platEntry?.monthly || platEntry?.types);
                    const hasTypes = p.types && p.types.length > 0;
                    const typesOpen = isPlatformExpanded(channel, p.name);
                    const typeWeight = hasTypes ? 1 / p.types.length : 0;
                    return (
                      <Fragment key={`${channel}-${p.name}`}>
                        <tr className="border-b border-[var(--border-color)]/30 bg-[var(--bg-surface)]/20">
                          <td className="py-1.5 pl-8 pr-3 whitespace-nowrap text-[var(--text-secondary)]">
                            {hasTypes ? (
                              <button onClick={() => togglePlatformExpand(channel, p.name)} className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <span className={`text-[10px] inline-block transition-transform ${typesOpen ? "rotate-90" : ""}`}>▸</span>
                                <span className="w-1.5 h-1.5 rounded-full opacity-60" style={{ backgroundColor: CHANNEL_COLORS[channel] || "#6b7280" }} />
                                <span className="text-[11px]">{p.name}</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 pl-3.5">
                                <span className="w-1.5 h-1.5 rounded-full opacity-60" style={{ backgroundColor: CHANNEL_COLORS[channel] || "#6b7280" }} />
                                <span className="text-[11px]">{p.name}</span>
                                {p.isCustom && <span className="text-[8px] uppercase tracking-wider text-[var(--accent-violet)]">custom</span>}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 pr-3 text-[var(--text-muted)] text-[10px]">{Math.round((p.weight || 0) * 100)}% def.</td>
                          <td className="py-1.5 pr-3 text-right">
                            <input
                              type="number"
                              value={(() => {
                                const k = annualKey(channel, p.name, null);
                                return draftAnnual[k] !== undefined
                                  ? draftAnnual[k]
                                  : (platAnnualResolved > 0 ? Math.round(platAnnualResolved) : (platAnnualOverride ?? ""));
                              })()}
                              onChange={(e) => updateAnnualDraft(annualKey(channel, p.name, null), e.target.value)}
                              onBlur={(e) => commitAnnualDraft(annualKey(channel, p.name, null), (v) => handleAnnualEdit(channel, p.name, v ?? e.target.value))}
                              onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                              className={`${inputCls} w-24 ${platAnnualOverride != null ? "border-[var(--accent-blue)]/50 font-semibold" : ""}`}
                            />
                          </td>
                          {platMonths.map((m, i) => {
                            const yyyymm = `${year}-${String(i + 1).padStart(2, "0")}`;
                            const ck = cellKey(channel, p.name, null, i);
                            const editable = isCellEditable(channel, p.name, null, yyyymm);
                            const isOverride = editable && m.source === "self-override";
                            const display = draftCell[ck] !== undefined
                              ? draftCell[ck]
                              : (m.value != null ? Math.round(m.value) : "");
                            return (
                              <td key={i} className="py-1.5 pr-1 text-right">
                                <input
                                  type="number"
                                  value={display}
                                  disabled={!editable}
                                  readOnly={!editable}
                                  onChange={(e) => updateCellDraft(ck, e.target.value)}
                                  onBlur={(e) => commitCellDraft(ck, () => editable && handleMonthEdit(channel, p.name, null, i, e.target.value))}
                                  onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                                  placeholder="—"
                                  title={!editable ? "Edit at the deeper level — children have overrides" : undefined}
                                  className={`${inputCls} ${
                                    isOverride ? "border-[var(--accent-blue)]/50 font-semibold" : ""
                                  } ${!editable ? "opacity-50 cursor-not-allowed bg-transparent" : ""}`}
                                />
                              </td>
                            );
                          })}
                          <td className="py-1.5 pl-3 text-right whitespace-nowrap">
                            {platOverridden && (
                              <button onClick={() => persistAndRemount(clearPlatformOverridesKeepTracked(budgets, channel, p.name))} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)] underline">Clear</button>
                            )}
                            {platOverridden && <span className="mx-1 text-[var(--text-muted)] opacity-30">·</span>}
                            <button onClick={() => persistAndRemount(removePlatform(budgets, channel, p.name))} title={`Stop tracking ${p.name}`} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--badge-negative-text)] underline">Remove</button>
                          </td>
                        </tr>
                        {hasTypes && typesOpen && p.types.map((t) => {
                          const tMonths = typeMonthCellResolved(channel, p.name, p.weight, t, typeWeight);
                          const tAnnualResolved = sumTypeAnnual(channel, p.name, p.weight, t, typeWeight);
                          const tAnnualOverride = typeAnnualOverride(channel, p.name, t);
                          const tOverridden = !!budgets[channel]?.platforms?.[p.name]?.types?.[t];
                          return (
                            <tr key={`${channel}-${p.name}-${t}`} className="border-b border-[var(--border-color)]/20 bg-[var(--bg-surface)]/10">
                              <td className="py-1.5 pl-14 pr-3 whitespace-nowrap text-[var(--text-muted)]">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-1 h-1 rounded-full opacity-50" style={{ backgroundColor: CHANNEL_COLORS[channel] || "#6b7280" }} />
                                  <span className="text-[11px]">{t}</span>
                                </span>
                              </td>
                              <td className="py-1.5 pr-3 text-[var(--text-muted)] text-[10px]">{Math.round(typeWeight * 100)}% of {p.name}</td>
                              <td className="py-1.5 pr-3 text-right">
                                <input
                                  type="number"
                                  value={(() => {
                                    const k = annualKey(channel, p.name, t);
                                    return draftAnnual[k] !== undefined
                                      ? draftAnnual[k]
                                      : (tAnnualResolved > 0 ? Math.round(tAnnualResolved) : (tAnnualOverride ?? ""));
                                  })()}
                                  onChange={(e) => updateAnnualDraft(annualKey(channel, p.name, t), e.target.value)}
                                  onBlur={(e) => commitAnnualDraft(annualKey(channel, p.name, t), (v) => handleTypeAnnualEdit(channel, p.name, t, v ?? e.target.value))}
                                  onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                                  className={`${inputCls} w-24 ${tAnnualOverride != null ? "border-[var(--accent-blue)]/50 font-semibold" : ""}`}
                                />
                              </td>
                              {tMonths.map((m, i) => {
                                const ck = cellKey(channel, p.name, t, i);
                                const isOverride = m.source === "self-override";
                                const display = draftCell[ck] !== undefined
                                  ? draftCell[ck]
                                  : (m.value != null ? Math.round(m.value) : "");
                                return (
                                  <td key={i} className="py-1.5 pr-1 text-right">
                                    <input
                                      type="number"
                                      value={display}
                                      onChange={(e) => updateCellDraft(ck, e.target.value)}
                                      onBlur={(e) => commitCellDraft(ck, () => handleMonthEdit(channel, p.name, t, i, e.target.value))}
                                      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                                      placeholder="—"
                                      className={`${inputCls} ${isOverride ? "border-[var(--accent-blue)]/50 font-semibold" : ""}`}
                                    />
                                  </td>
                                );
                              })}
                              <td className="py-1.5 pl-3 text-right">
                                {tOverridden && (
                                  <button onClick={() => persistAndRemount(clearTypeTargets(budgets, channel, p.name, t))} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)] underline">Clear</button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                  {isExpanded && NETWORK_PARENT_CHANNELS.includes(channel) && (
                    <tr className="border-b border-[var(--border-color)]/30 bg-[var(--bg-surface)]/10">
                      <td colSpan={MONTHS.length + 4} className="py-2 pl-8 pr-3">
                        {adding !== channel ? (
                          <button onClick={() => { setAdding(channel); setNewName(""); setNewDefault(""); }} className="text-[11px] text-[var(--accent-blue)] hover:underline">
                            + Add network under {channel}
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-2 flex-wrap">
                            <select
                              value={newName}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === "__custom__") {
                                  setNewName(""); setNewDefault("");
                                } else {
                                  setNewName(v);
                                  const lib = NETWORK_LIBRARY.find((n) => n.name === v);
                                  if (lib) setNewDefault(String(lib.suggestedMonthly));
                                }
                              }}
                              className="text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                            >
                              <option value="">Pick a network…</option>
                              {librarySuggestionsFor(channel).map((n) => (
                                <option key={n.name} value={n.name}>{n.name}</option>
                              ))}
                              <option value="__custom__">Custom…</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Network name"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              className="text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] w-44"
                            />
                            <input
                              type="number"
                              placeholder="$ monthly default"
                              value={newDefault}
                              onChange={(e) => setNewDefault(e.target.value)}
                              className="w-32 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                            />
                            <button onClick={() => handleAddNetwork(channel)} className="text-[11px] font-medium px-2 py-1 rounded bg-[var(--accent-blue)] text-white hover:opacity-90">Add</button>
                            <button onClick={() => { setAdding(null); setNewName(""); setNewDefault(""); }} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] text-[var(--text-muted)]">
        Cells in <span className="text-[var(--accent-blue)] font-medium">blue</span> are operator overrides.
        Empty cells fall back to channel × platform-default-weight × CHANNEL_CONFIG default.
        Pacing on the Channels tab pro-rates these targets across the date range you've selected.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Revenue Goals matrix — same shape as Budgets but flat (no platforms/types).
// First row is the company-wide top-line goal; subsequent rows are per-channel.
// ─────────────────────────────────────────────────────────────────────────

function RevenueGoalsSection() {
  const [goals, setGoals] = useState(() => loadRevenueGoals());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [draftAnnual, setDraftAnnual] = useState({});
  const [draftCell, setDraftCell] = useState({});
  const [matrixVersion, setMatrixVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setGoals(loadRevenueGoals());
    window.addEventListener(GOALS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(GOALS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const persist = (next) => { setGoals(next); saveRevenueGoals(next); };
  const persistAndRemount = (next) => { persist(next); setMatrixVersion((v) => v + 1); };

  const resolveGoalCell = (channel, yyyymm) => resolveGoalForMonth(goals, channel, yyyymm);

  const monthCells = (channel) =>
    MONTHS.map((_, i) => {
      const yyyymm = `${year}-${String(i + 1).padStart(2, "0")}`;
      const value = resolveGoalCell(channel, yyyymm);
      const entry = goals[channel];
      const overrideAtThisLayer = entry?.monthly?.[yyyymm] != null
        || entry?.annual?.[String(year)] != null;
      return { value, source: overrideAtThisLayer ? "self-override" : "derived" };
    });

  const sumAnnual = (channel) =>
    monthCells(channel).reduce((s, m) => s + (m.value ?? 0), 0);

  const annualOverride = (channel) => goals[channel]?.annual?.[String(year)] ?? null;

  const handleMonthEdit = (channel, monthIdx, raw) => {
    const v = parseFloat(raw);
    const yyyymm = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
    const value = !Number.isFinite(v) || v <= 0 ? null : v;
    persist(setRevenueGoal(goals, channel, "monthly", yyyymm, value));
  };
  const handleAnnualEdit = (channel, raw) => {
    const v = parseFloat(raw);
    const value = !Number.isFinite(v) || v <= 0 ? null : v;
    persist(setRevenueGoal(goals, channel, "annual", String(year), value));
  };
  const handleClear = (channel) => persistAndRemount(clearRevenueGoals(goals, channel));

  const cellKey = (channel, monthIdx) => `${channel}|${monthIdx}`;
  const annualKey = (channel) => `${channel}`;

  const inputCls = "w-16 px-1.5 py-1 text-[11px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] text-right";

  // Rows: company total first, then each channel
  const rows = [
    { channel: TOTAL_KEY, label: "Company Total", color: "#43a9df", isTotal: true },
    ...ALL_CHANNEL_NAMES.map((c) => ({
      channel: c,
      label: c,
      color: CHANNEL_COLORS[c] || "#6b7280",
      isTotal: false,
    })),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Year</label>
          <select
            className="text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          >
            {[year - 2, year - 1, year, year + 1, year + 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="mx-1 text-[var(--text-muted)] opacity-50">|</span>
          <button
            type="button"
            onClick={() => downloadRevenueGoalsCsv(goals, year)}
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--toggle-bg)] text-[var(--text-primary)] hover:border-[var(--border-hover)]"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 1v8M3 6l3 3 3-3M2 11h8" />
            </svg>
            Download CSV
          </button>
          <label className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--toggle-bg)] text-[var(--text-primary)] hover:border-[var(--border-hover)] cursor-pointer">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 11V3M3 6l3-3 3 3M2 1h8" />
            </svg>
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const { updates, year: detectedYear } = parseRevenueGoalsCsv(text);
                const targetYear = detectedYear || year;
                const next = applyRevenueGoalsCsvUpdates(goals, updates, targetYear);
                saveRevenueGoals(next);
                setGoals(next);
                setMatrixVersion((v) => v + 1);
                if (detectedYear) setYear(detectedYear);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">
          Operator-set targets. Company Total is independent of channel sum.
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="text-xs" style={{ minWidth: 1100 }}>
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--bg-surface)]/40 sticky top-0">
              <th className="text-left py-2 pl-2 pr-3 text-[10px] font-medium text-[var(--text-muted)] uppercase whitespace-nowrap">Channel</th>
              <th className="text-right py-2 pr-3 text-[10px] font-medium text-[var(--text-muted)] uppercase">Annual</th>
              {MONTHS.map((m) => (
                <th key={m} className="text-right py-2 pr-1 text-[10px] font-medium text-[var(--text-muted)] uppercase">{m}</th>
              ))}
              <th className="py-2 pl-3 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase">Clear</th>
            </tr>
          </thead>
          <tbody key={`goals-${matrixVersion}`}>
            {rows.map(({ channel, label, color, isTotal }) => {
              const cells = monthCells(channel);
              const annualResolved = sumAnnual(channel);
              const annualO = annualOverride(channel);
              const hasAnyOverride = !!goals[channel];
              const ak = annualKey(channel);
              return (
                <tr
                  key={channel}
                  className={`border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-card-hover)]/50 ${isTotal ? "bg-[var(--bg-surface)]/20 font-medium" : ""}`}
                >
                  <td className="py-2 pl-2 pr-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 pl-3.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[var(--text-primary)]">{label}</span>
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <input
                      type="number"
                      value={(() => {
                        if (draftAnnual[ak] !== undefined) return draftAnnual[ak];
                        if (annualResolved > 0) return Math.round(annualResolved);
                        return annualO ?? "";
                      })()}
                      onChange={(e) => setDraftAnnual((d) => ({ ...d, [ak]: e.target.value }))}
                      onBlur={(e) => {
                        if (draftAnnual[ak] !== undefined) {
                          handleAnnualEdit(channel, e.target.value);
                        }
                        setDraftAnnual((d) => { const n = { ...d }; delete n[ak]; return n; });
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                      placeholder="—"
                      className={`${inputCls} w-24 ${annualO != null ? "border-[var(--accent-blue)]/50 font-semibold" : ""}`}
                    />
                  </td>
                  {cells.map((m, i) => {
                    const ck = cellKey(channel, i);
                    const isOverride = m.source === "self-override";
                    const display = draftCell[ck] !== undefined
                      ? draftCell[ck]
                      : (m.value != null ? Math.round(m.value) : "");
                    return (
                      <td key={i} className="py-2 pr-1 text-right">
                        <input
                          type="number"
                          value={display}
                          onChange={(e) => setDraftCell((d) => ({ ...d, [ck]: e.target.value }))}
                          onBlur={(e) => {
                            if (draftCell[ck] !== undefined) {
                              handleMonthEdit(channel, i, e.target.value);
                            }
                            setDraftCell((d) => { const n = { ...d }; delete n[ck]; return n; });
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                          placeholder="—"
                          className={`${inputCls} ${isOverride ? "border-[var(--accent-blue)]/50 font-semibold" : ""}`}
                        />
                      </td>
                    );
                  })}
                  <td className="py-2 pl-3 text-right">
                    {hasAnyOverride && (
                      <button
                        onClick={() => handleClear(channel)}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)] underline"
                      >Clear</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] text-[var(--text-muted)]">
        Cells in <span className="text-[var(--accent-blue)] font-medium">blue</span> are operator-set goals.
        Empty cells mean no goal — Forecasting will show "no goal set" until you enter one.
      </p>
    </div>
  );
}

const CARD = "bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6";
const INPUT = "w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors";
const LABEL = "block text-xs font-medium text-[var(--text-secondary)] mb-1.5";
const BTN_PRIMARY = "px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-[#43a9df] to-[#8e68ad] hover:opacity-90 transition-opacity";
const BTN_OUTLINE = "px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors";
const BTN_DANGER = "px-4 py-2 text-sm font-medium rounded-lg bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)] hover:opacity-80 transition-opacity";

const BADGE_ROLE = {
  Admin: "bg-[var(--accent-blue)]/15 text-[var(--accent-blue)]",
  Editor: "bg-[#8e68ad]/15 text-[#8e68ad]",
  Viewer: "bg-[var(--toggle-bg)] text-[var(--text-muted)]",
};

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <button
        onClick={onChange}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? "bg-[var(--accent-blue)]" : "bg-[var(--toggle-bg)] border border-[var(--border-color)]"
        }`}
      >
        <span className={`absolute top-[3px] left-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[16px]" : "translate-x-0"
        }`} />
      </button>
    </label>
  );
}

function SectionTitle({ title, description }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && <p className="text-sm text-[var(--text-muted)] mt-0.5">{description}</p>}
    </div>
  );
}

const EVENT_DRAFT_BLANK = {
  id: null,
  name: "",
  startDate: "",
  endDate: "",
  revenueGoal: "",
  spendBudget: "",
  targetMER: "",
};

function EventWindowsSection() {
  const [state, setState] = useState(() => loadEventWindows());
  const [draft, setDraft] = useState(EVENT_DRAFT_BLANK);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setState(loadEventWindows());
    window.addEventListener(EVENTS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENTS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const sorted = useMemo(() => {
    const wins = [...(state?.windows || [])];
    wins.sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    return wins;
  }, [state]);

  const openNew = () => {
    setDraft(EVENT_DRAFT_BLANK);
    setEditorOpen(true);
  };

  const openEdit = (w) => {
    setDraft({
      id: w.id,
      name: w.name || "",
      startDate: w.startDate || "",
      endDate: w.endDate || "",
      revenueGoal: w.revenueGoal != null ? String(w.revenueGoal) : "",
      spendBudget: w.spendBudget != null ? String(w.spendBudget) : "",
      targetMER: w.targetMER != null ? String(w.targetMER) : "",
    });
    setEditorOpen(true);
  };

  const cancelEdit = () => {
    setDraft(EVENT_DRAFT_BLANK);
    setEditorOpen(false);
  };

  const saveDraft = () => {
    if (!draft.name || !draft.startDate || !draft.endDate) return;
    if (draft.endDate < draft.startDate) return;
    const w = {
      id: draft.id || undefined,
      name: draft.name.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate,
      revenueGoal: Number(draft.revenueGoal) || 0,
      spendBudget: Number(draft.spendBudget) || 0,
    };
    if (draft.targetMER) w.targetMER = Number(draft.targetMER);
    const next = upsertEventWindow(state, w);
    saveEventWindows(next);
    setState(next);
    cancelEdit();
  };

  const removeOne = (id) => {
    const next = deleteEventWindow(state, id);
    saveEventWindows(next);
    setState(next);
  };

  const statusBadge = (w) => {
    const status = getEventStatus(w);
    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Active
        </span>
      );
    }
    if (status === "upcoming") {
      return (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20">
          Upcoming
        </span>
      );
    }
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[var(--toggle-bg)] text-[var(--text-muted)] border border-[var(--border-color)]">
        Past
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[var(--text-muted)]">
          {sorted.length === 0
            ? "No event windows yet. Add BFCM, holiday sales, or any bounded promo."
            : `${sorted.length} window${sorted.length === 1 ? "" : "s"} configured`}
        </p>
        <button type="button" onClick={openNew} className={BTN_PRIMARY}>
          + Add event
        </button>
      </div>

      {sorted.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Name</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Dates</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Revenue Goal</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Spend Budget</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Target MER</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((w, i) => (
                <tr
                  key={w.id}
                  className={i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-table-stripe)]"}
                >
                  <td className="px-3 py-2.5">{statusBadge(w)}</td>
                  <td className="px-3 py-2.5 text-[var(--text-primary)] font-medium">{w.name}</td>
                  <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                    {w.startDate} → {w.endDate}
                    <span className="ml-1.5 text-[var(--text-muted)]">({getEventDayCount(w)}d)</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[var(--text-secondary)]">
                    ${Number(w.revenueGoal || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[var(--text-secondary)]">
                    ${Number(w.spendBudget || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[var(--text-secondary)]">
                    {w.targetMER ? `${Number(w.targetMER).toFixed(2)}x` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(w)}
                      className="text-xs text-[var(--accent-blue)] hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeOne(w.id)}
                      className="text-xs text-[var(--badge-negative-text)] hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editorOpen && (
        <div className="mt-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]/60 p-5">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            {draft.id ? "Edit event window" : "New event window"}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs text-[var(--text-muted)] mb-1">Name</span>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="BFCM 2026"
                className={INPUT}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs text-[var(--text-muted)] mb-1">Start date</span>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                  className={INPUT}
                />
              </label>
              <label className="block">
                <span className="block text-xs text-[var(--text-muted)] mb-1">End date</span>
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                  className={INPUT}
                />
              </label>
            </div>
            <label className="block">
              <span className="block text-xs text-[var(--text-muted)] mb-1">Revenue goal ($)</span>
              <input
                type="number"
                inputMode="numeric"
                value={draft.revenueGoal}
                onChange={(e) => setDraft({ ...draft, revenueGoal: e.target.value })}
                placeholder="600000"
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className="block text-xs text-[var(--text-muted)] mb-1">Spend budget ($)</span>
              <input
                type="number"
                inputMode="numeric"
                value={draft.spendBudget}
                onChange={(e) => setDraft({ ...draft, spendBudget: e.target.value })}
                placeholder="180000"
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className="block text-xs text-[var(--text-muted)] mb-1">Target MER (optional)</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={draft.targetMER}
                onChange={(e) => setDraft({ ...draft, targetMER: e.target.value })}
                placeholder="3.33"
                className={INPUT}
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 mt-5">
            <button type="button" onClick={cancelEdit} className={BTN_OUTLINE}>
              Cancel
            </button>
            <button
              type="button"
              onClick={saveDraft}
              disabled={!draft.name || !draft.startDate || !draft.endDate || draft.endDate < draft.startDate}
              className={`${BTN_PRIMARY} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {draft.id ? "Save changes" : "Create window"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme();

  // Profile state
  const [profile, setProfile] = useState({
    name: "Christian Cortes",
    email: "christian@refractive.co",
    role: "Admin",
    company: "Refractive",
    timezone: "America/Los_Angeles",
  });

  // Team members
  const [team] = useState([
    { id: 1, name: "Christian Cortes", email: "christian@refractive.co", role: "Admin", lastActive: "Now" },
    { id: 2, name: "Sarah Martinez", email: "sarah@refractive.co", role: "Editor", lastActive: "2h ago" },
    { id: 3, name: "James Kim", email: "james@refractive.co", role: "Viewer", lastActive: "1d ago" },
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");

  // Notification prefs
  const [notifications, setNotifications] = useState({
    weeklyMemo: true,
    alertsCritical: true,
    alertsWarning: true,
    alertsInfo: false,
    budgetPacing: true,
    inventoryAlerts: true,
    anomalyDetection: true,
  });

  const toggleNotif = (key) => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  // Pixel config
  const [pixelId] = useState("ILM-PX-8f3a9d2e1b");
  const [copied, setCopied] = useState(false);
  const copyPixel = () => {
    navigator.clipboard?.writeText(pixelSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const pixelSnippet = `<!-- Lucerna Pixel -->\n<script>\n  (function(i,l,m){i.LucernaObject=m;i[m]=i[m]||function(){\n  (i[m].q=i[m].q||[]).push(arguments)};var s=l.createElement('script');\n  s.async=1;s.src='https://pixel.lucerna.io/v1/${pixelId}.js';\n  l.head.appendChild(s)})(window,document,'lcn');\n  lcn('init','${pixelId}');\n  lcn('track','PageView');\n</script>`;

  // Data preferences
  const [dataPrefs, setDataPrefs] = useState({
    currency: "USD",
    attributionWindow: "7-day click, 1-day view",
    timezone: "America/Los_Angeles",
    fiscalYearStart: "January",
    defaultDateRange: "30d",
  });

  return (
    <div className="max-w-4xl space-y-6">
      {/* ── Profile ── */}
      <div className={CARD}>
        <SectionTitle title="Profile" description="Your personal account details" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Full Name</label>
            <input type="text" className={INPUT} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input type="email" className={INPUT} value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Company</label>
            <input type="text" className={INPUT} value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Timezone</label>
            <select className={INPUT} value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/New_York">Eastern (ET)</option>
              <option value="Europe/London">London (GMT)</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button className={BTN_PRIMARY}>Save Changes</button>
        </div>
      </div>

      {/* ── Team & Users ── */}
      <div className={CARD}>
        <SectionTitle title="Team Members" description="Manage who has access to this workspace" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-2 pr-4 text-xs font-medium text-[var(--text-muted)] uppercase">Name</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-[var(--text-muted)] uppercase">Email</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-[var(--text-muted)] uppercase">Role</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-[var(--text-muted)] uppercase">Last Active</th>
                <th className="py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.id} className="border-b border-[var(--border-color)]/50 last:border-0">
                  <td className="py-3 pr-4 text-[var(--text-primary)] font-medium">{m.name}</td>
                  <td className="py-3 pr-4 text-[var(--text-secondary)]">{m.email}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${BADGE_ROLE[m.role] || ""}`}>{m.role}</span>
                  </td>
                  <td className="py-3 pr-4 text-[var(--text-muted)]">{m.lastActive}</td>
                  <td className="py-3 text-right">
                    <button className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Invite New Member</p>
          <div className="flex gap-2">
            <input type="email" className={`${INPUT} flex-1`} placeholder="email@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <select className={`${INPUT} w-28`} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="Admin">Admin</option>
              <option value="Editor">Editor</option>
              <option value="Viewer">Viewer</option>
            </select>
            <button className={BTN_PRIMARY}>Send Invite</button>
          </div>
        </div>
      </div>

      {/* ── Pixel / Tracking ── */}
      <div className={CARD}>
        <SectionTitle title="Lucerna Pixel" description="Install this snippet on your storefront to enable first-party tracking" />
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <span className="w-2 h-2 rounded-full bg-[var(--badge-positive-text)] animate-pulse" />
            <span className="text-sm font-mono text-[var(--text-primary)]">{pixelId}</span>
          </div>
          <span className="text-xs text-[var(--badge-positive-text)]">Active</span>
        </div>

        <div className="relative">
          <pre className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-secondary)] overflow-x-auto whitespace-pre leading-relaxed">
            {pixelSnippet}
          </pre>
          <button
            onClick={copyPixel}
            className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-medium rounded-md bg-[var(--toggle-bg)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-color)] transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Events Tracked</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">5</p>
            <p className="text-[11px] text-[var(--text-muted)]">PageView, ViewContent, AddToCart, Checkout, Purchase</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Server-Side</p>
            <p className="text-lg font-semibold text-[var(--badge-positive-text)]">Enabled</p>
            <p className="text-[11px] text-[var(--text-muted)]">Conversions API connected</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Cookie Consent</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">GDPR Mode</p>
            <p className="text-[11px] text-[var(--text-muted)]">Consent banner required before firing</p>
          </div>
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className={CARD}>
        <SectionTitle title="Notifications" description="Choose what alerts and reports you receive" />
        <div className="space-y-4">
          <Toggle label="Weekly Insights Memo (every Monday)" checked={notifications.weeklyMemo} onChange={() => toggleNotif("weeklyMemo")} />
          <Toggle label="Critical alerts (MER floor, stockouts, tracking breaks)" checked={notifications.alertsCritical} onChange={() => toggleNotif("alertsCritical")} />
          <Toggle label="Warning alerts (spend pacing, CAC spikes)" checked={notifications.alertsWarning} onChange={() => toggleNotif("alertsWarning")} />
          <Toggle label="Info alerts (creative fatigue, positive trends)" checked={notifications.alertsInfo} onChange={() => toggleNotif("alertsInfo")} />
          <Toggle label="Budget pacing notifications" checked={notifications.budgetPacing} onChange={() => toggleNotif("budgetPacing")} />
          <Toggle label="Inventory reorder alerts" checked={notifications.inventoryAlerts} onChange={() => toggleNotif("inventoryAlerts")} />
          <Toggle label="Anomaly detection alerts" checked={notifications.anomalyDetection} onChange={() => toggleNotif("anomalyDetection")} />
        </div>
      </div>

      {/* ── Data & Attribution Preferences ── */}
      <div className={CARD}>
        <SectionTitle title="Data Preferences" description="Configure how metrics are calculated and displayed" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Currency</label>
            <select className={INPUT} value={dataPrefs.currency} onChange={(e) => setDataPrefs({ ...dataPrefs, currency: e.target.value })}>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="AUD">AUD (A$)</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Attribution Window</label>
            <select className={INPUT} value={dataPrefs.attributionWindow} onChange={(e) => setDataPrefs({ ...dataPrefs, attributionWindow: e.target.value })}>
              <option value="7-day click, 1-day view">7-day click, 1-day view</option>
              <option value="28-day click, 1-day view">28-day click, 1-day view</option>
              <option value="1-day click">1-day click only</option>
              <option value="7-day click">7-day click only</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Fiscal Year Start</label>
            <select className={INPUT} value={dataPrefs.fiscalYearStart} onChange={(e) => setDataPrefs({ ...dataPrefs, fiscalYearStart: e.target.value })}>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Default Date Range</label>
            <select className={INPUT} value={dataPrefs.defaultDateRange} onChange={(e) => setDataPrefs({ ...dataPrefs, defaultDateRange: e.target.value })}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button className={BTN_PRIMARY}>Save Preferences</button>
        </div>
      </div>

      {/* ── Appearance ── */}
      <div className={CARD}>
        <SectionTitle title="Appearance" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Dark Mode</p>
            <p className="text-xs text-[var(--text-muted)]">Toggle between dark and light themes</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
              theme === "dark" ? "bg-[var(--accent-blue)]" : "bg-[var(--toggle-bg)] border border-[var(--border-color)]"
            }`}
          >
            <span className={`absolute top-[3px] left-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
              theme === "dark" ? "translate-x-[16px]" : "translate-x-0"
            }`} />
          </button>
        </div>
      </div>

      {/* ── API Access ── */}
      <div className={CARD}>
        <SectionTitle title="API Access" description="Use the Lucerna API to pull data into your own tools" />
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-sm text-[var(--text-muted)]">
            lcn_live_•••••••••••••••••••k3f9
          </div>
          <button className={BTN_OUTLINE}>Reveal</button>
          <button className={BTN_OUTLINE}>Regenerate</button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Rate limit: 1,000 requests/min. Docs at <span className="text-[var(--accent-blue)]">docs.lucerna.io/api</span></p>
      </div>

      {/* ── Budgets & Pacing ── */}
      <div className={CARD}>
        <SectionTitle
          title="Budgets & Pacing"
          description="Monthly targets that drive the pacing bars on the Channels tab"
        />
        <BudgetsSection />
      </div>

      {/* ── Revenue Goals ── */}
      <div className={CARD}>
        <SectionTitle
          title="Revenue Goals"
          description="Top-line + per-channel revenue targets that drive Forecasting goal pacing"
        />
        <RevenueGoalsSection />
      </div>

      {/* ── Event Windows ── */}
      <div className={CARD}>
        <SectionTitle
          title="Event Windows"
          description="Named promo periods (BFCM, holiday sales) with their own goals + budgets that override the calendar period in Forecasting"
        />
        <EventWindowsSection />
      </div>

      {/* ── Danger Zone ── */}
      <div className={`${CARD} border-[var(--badge-negative-text)]/20`}>
        <SectionTitle title="Danger Zone" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Delete Workspace</p>
            <p className="text-xs text-[var(--text-muted)]">Permanently remove this workspace and all associated data</p>
          </div>
          <button className={BTN_DANGER}>Delete Workspace</button>
        </div>
      </div>
    </div>
  );
}
