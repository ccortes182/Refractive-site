import { Fragment, useEffect, useMemo, useState } from "react";
import {
  getChannelSummaryWithBudgets,
  getDailyChannelDataForRange,
  getChannelExpansionRowsForRange,
  getPlatformTypeRowsForRange,
  getChannelPacing,
  ALL_CHANNEL_NAMES,
  CHANNELS_WITH_EXPANSION,
} from "../data/mockData";
import {
  addLibraryPlatform,
  addCustomPlatform,
  removePlatform,
} from "../data/channelsBudgets";
import { NETWORK_LIBRARY, NETWORK_PARENT_CHANNELS, librarySuggestionsFor, isLibraryNetwork } from "../data/networkLibrary";
import {
  loadChannelsViewsState,
  saveChannelsViewsState,
  findChannelsView,
  newChannelsViewId,
  PRESET_VIEWS as CHANNELS_PRESETS,
  PAID_CHANNELS,
  ORGANIC_CHANNELS,
} from "../data/channelsViews";
import {
  loadChannelsBudgets,
  saveChannelsBudgets,
  setChannelTarget,
  setPlatformTarget,
  setTypeTarget,
  clearChannelTargets,
  clearPlatformTargets,
  clearTypeTargets,
  BUDGETS_CHANGED_EVENT,
} from "../data/channelsBudgets";
import KPICard from "../components/KPICard";
import ExportCSV from "../components/ExportCSV";
import ChannelChart from "../components/Charts/ChannelChart";
import SpendRoasScatter from "../components/Charts/SpendRoasScatter";
import ChannelDrillDrawer from "../components/ChannelDrillDrawer";
import ViewSwitcher from "../components/ViewSwitcher";
import { useTheme } from "../context/ThemeContext";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHANNEL_COLORS = {
  "Paid Search": "#43a9df",
  "Paid Social": "#8e68ad",
  Email: "#c2dcd4",
  SMS: "#f472b6",
  Organic: "#34d399",
  Direct: "#fbbf24",
};

const fmtCompact = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return Math.round(n).toString();
};

const fmtN = (n) => n.toLocaleString("en-US");
const fmtD = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtDC = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function SortArrow({ active, direction }) {
  return (
    <span className="ml-1 inline-flex flex-col leading-none text-[10px]">
      <span className={active && direction === "asc" ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)] opacity-30"}>▲</span>
      <span className={active && direction === "desc" ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)] opacity-30"}>▼</span>
    </span>
  );
}

function Pill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20">
      {label}
      <button onClick={onRemove} className="hover:text-white ml-0.5">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 1l6 6M7 1l-6 6" />
        </svg>
      </button>
    </span>
  );
}

const METRIC_MODES = [
  { key: "ROAS", label: "ROAS" },
  { key: "Efficiency", label: "Efficiency" },
  { key: "NewCustomer", label: "New-Customer" },
];

const COLUMNS_BY_MODE = {
  ROAS: [
    { key: "channel", label: "Channel", align: "text-left" },
    { key: "spend", label: "Spend", align: "text-right" },
    { key: "revenue", label: "Revenue", align: "text-right" },
    { key: "roas", label: "ROAS", align: "text-right" },
    { key: "platformRoas", label: "Platform ROAS", align: "text-right" },
    { key: "revenuePercent", label: "% Rev", align: "text-right" },
    { key: "pacing", label: "Pacing", align: "text-left", noSort: true },
  ],
  Efficiency: [
    { key: "channel", label: "Channel", align: "text-left" },
    { key: "spend", label: "Spend", align: "text-right" },
    { key: "sessions", label: "Sessions", align: "text-right" },
    { key: "cpm", label: "CPM", align: "text-right" },
    { key: "ctr", label: "CTR", align: "text-right" },
    { key: "cpa", label: "CPA", align: "text-right" },
    { key: "pacing", label: "Pacing", align: "text-left", noSort: true },
  ],
  NewCustomer: [
    { key: "channel", label: "Channel", align: "text-left" },
    { key: "spend", label: "Spend", align: "text-right" },
    { key: "ncRevenue", label: "NC Revenue", align: "text-right" },
    { key: "ncRoas", label: "NC-ROAS", align: "text-right" },
    { key: "orders", label: "Orders", align: "text-right" },
    { key: "ncPercent", label: "% NC", align: "text-right" },
    { key: "pacing", label: "Pacing", align: "text-left", noSort: true },
  ],
};

function PacingBar({ pacing, spend, onSet }) {
  if (!pacing || !pacing.mode) return <span className="text-[var(--text-muted)]">—</span>;
  if (!pacing.hasTarget) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSet?.(); }}
        className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)]"
      >
        <span className="px-1.5 py-0.5 rounded bg-[var(--toggle-bg)] border border-[var(--border-color)]">None</span>
        <span className="underline">Set budget</span>
      </button>
    );
  }
  const isVolume = pacing.mode === "sends" || pacing.mode === "credits";
  const current = isVolume ? pacing.current : spend;
  const target = pacing.target;
  if (!target || target <= 0) return <span className="text-[var(--text-muted)]">—</span>;
  const pct = Math.round((current / target) * 100);
  const onPace = pct >= 90 && pct <= 110;
  const fill = onPace ? "#34d399" : "#fbbf24";
  const labelCurrent = isVolume ? fmtCompact(current) : fmtD(current);
  const labelTarget = isVolume ? fmtCompact(target) : fmtD(target);
  const suffix = isVolume ? ` ${pacing.unit}` : "";
  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--toggle-bg)] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.min(pct, 150)}%`, backgroundColor: fill }}
        />
      </div>
      <span className="text-[10px] text-[var(--text-secondary)] whitespace-nowrap">
        {labelCurrent} / {labelTarget}{suffix}
      </span>
      <span className="text-[10px] font-medium text-[var(--text-primary)] w-9 text-right">{pct}%</span>
    </div>
  );
}

function valueFor(row, key) {
  if (key === "ncPercent") return row.revenue > 0 ? (row.ncRevenue / row.revenue) * 100 : 0;
  return row[key];
}

function renderCell(row, key, pacing) {
  switch (key) {
    case "channel":
      return null; // handled separately for icon + chevron
    case "spend":
      return row.spend > 0 ? fmtD(row.spend) : "—";
    case "revenue":
      return row.revenue != null ? fmtD(row.revenue) : "—";
    case "ncRevenue":
      return row.ncRevenue != null ? fmtD(row.ncRevenue) : "—";
    case "roas":
      return row.roas != null ? row.roas.toFixed(2) + "x" : "—";
    case "platformRoas": {
      if (row.platformRoas == null) return "—";
      const overcount = row.roas ? Math.round(((row.platformRoas - row.roas) / row.roas) * 100) : null;
      return (
        <span className="inline-flex items-center gap-1 justify-end w-full">
          <span className="text-[var(--text-secondary)]">{row.platformRoas.toFixed(2)}x</span>
          {overcount != null && overcount > 0 && (
            <span className="text-[9px] text-[#fbbf24]">+{overcount}%</span>
          )}
        </span>
      );
    }
    case "cpa":
      return row.cpa != null ? fmtDC(row.cpa) : "—";
    case "ncRoas":
      return row.ncRoas != null ? row.ncRoas.toFixed(2) + "x" : "—";
    case "orders":
      return row.orders != null ? fmtN(row.orders) : "—";
    case "sessions":
      return row.sessions != null ? fmtN(row.sessions) : "—";
    case "cpm":
      return row.cpm != null ? fmtDC(row.cpm) : "—";
    case "ctr":
      return row.ctr != null ? row.ctr.toFixed(2) + "%" : "—";
    case "revenuePercent":
      return row.revenuePercent != null ? row.revenuePercent.toFixed(1) + "%" : "—";
    case "ncPercent":
      return row.ncRevenue != null && row.revenue > 0
        ? ((row.ncRevenue / row.revenue) * 100).toFixed(1) + "%"
        : "—";
    case "pacing":
      return <PacingBar pacing={pacing} spend={row.spend} onSet={pacing?.__onSet} />;
    default:
      return "—";
  }
}

export default function Channels({ dateRange, compare }) {
  const { start, end } = dateRange;
  const compareEnabled = compare.enabled && compare.start && compare.end;
  const { theme } = useTheme();

  // Saved view state
  const [viewsState, setViewsState] = useState(() => loadChannelsViewsState());
  const { activeViewId, customViews } = viewsState;
  const activeView = useMemo(
    () => findChannelsView(activeViewId, customViews),
    [activeViewId, customViews]
  );
  useEffect(() => {
    saveChannelsViewsState(viewsState);
  }, [viewsState]);

  // Budget overrides — synced with Settings page via localStorage events
  const [budgets, setBudgets] = useState(() => loadChannelsBudgets());
  useEffect(() => {
    const refresh = () => setBudgets(loadChannelsBudgets());
    window.addEventListener(BUDGETS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(BUDGETS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  // Drawer-side budget edits write to the current year's annual override.
  // Settings page handles per-month and platform-level granularity.
  const updateBudget = (channel, _key, value, options = {}) => {
    const { platform = null, type = null, scope = "annual", scopeKey } = options;
    const year = String(new Date().getFullYear());
    const k = scopeKey ?? (scope === "annual" ? year : null);
    if (!k) return;
    setBudgets((prev) => {
      const next = type
        ? setTypeTarget(prev, channel, platform, type, scope, k, value)
        : platform
          ? setPlatformTarget(prev, channel, platform, scope, k, value)
          : setChannelTarget(prev, channel, scope, k, value);
      saveChannelsBudgets(next);
      return next;
    });
  };
  const resetBudget = (channel, platform = null, type = null) => {
    setBudgets((prev) => {
      const next = type
        ? clearTypeTargets(prev, channel, platform, type)
        : platform
          ? clearPlatformTargets(prev, channel, platform)
          : clearChannelTargets(prev, channel);
      saveChannelsBudgets(next);
      return next;
    });
  };

  // Filter + sort + mode state — initialized from active view, updated locally
  const [selectedChannels, setSelectedChannels] = useState(activeView.selectedChannels);
  const [minRoas, setMinRoas] = useState(activeView.minRoas);
  const [maxRoas, setMaxRoas] = useState(activeView.maxRoas);
  const [metricMode, setMetricMode] = useState(activeView.metricMode);
  const [sortField, setSortField] = useState(activeView.sortField);
  const [sortDirection, setSortDirection] = useState(activeView.sortDirection);

  const [chartMode, setChartMode] = useState("stacked"); // stacked | line | indexed
  const [showMA, setShowMA] = useState(false);
  const [expandedChannel, setExpandedChannel] = useState(null);
  const [expandedPlatforms, setExpandedPlatforms] = useState(() => new Set()); // "Channel|Platform"
  const [drillChannel, setDrillChannel] = useState(null);

  // "+ Add network" inline form state — keyed by channel name
  const [addingNetwork, setAddingNetwork] = useState(null); // channelName or null
  const [newNetworkName, setNewNetworkName] = useState("");
  const [newNetworkMonthly, setNewNetworkMonthly] = useState("");

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

  const handleAddNetwork = (channelName) => {
    const trimmed = newNetworkName.trim();
    if (!trimmed) return;
    const monthly = parseFloat(newNetworkMonthly);
    const fromLibrary = isLibraryNetwork(channelName, trimmed);
    setBudgets((prev) => {
      const next = fromLibrary
        ? addLibraryPlatform(prev, channelName, trimmed, Number.isFinite(monthly) && monthly > 0 ? monthly : 0)
        : addCustomPlatform(prev, channelName, trimmed, Number.isFinite(monthly) && monthly > 0 ? monthly : 0);
      saveChannelsBudgets(next);
      return next;
    });
    setAddingNetwork(null);
    setNewNetworkName("");
    setNewNetworkMonthly("");
  };

  const handleRemoveNetwork = (channelName, platformName) => {
    setBudgets((prev) => {
      const next = removePlatform(prev, channelName, platformName);
      saveChannelsBudgets(next);
      return next;
    });
  };

  // When user switches view, reapply its full state
  useEffect(() => {
    setSelectedChannels(activeView.selectedChannels);
    setMinRoas(activeView.minRoas);
    setMaxRoas(activeView.maxRoas);
    setMetricMode(activeView.metricMode);
    setSortField(activeView.sortField);
    setSortDirection(activeView.sortDirection);
  }, [activeView.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Channel data
  const channelSummary = useMemo(
    () => getChannelSummaryWithBudgets(start, end, budgets),
    [start, end, budgets]
  );
  const priorChannelSummary = useMemo(
    () => (compareEnabled ? getChannelSummaryWithBudgets(compare.start, compare.end, budgets) : []),
    [compareEnabled, compare.start, compare.end, budgets]
  );
  const dailyChannel = useMemo(() => getDailyChannelDataForRange(start, end), [start, end]);
  const priorDailyChannel = useMemo(
    () => (compareEnabled ? getDailyChannelDataForRange(compare.start, compare.end) : []),
    [compareEnabled, compare.start, compare.end]
  );
  const expansionRows = useMemo(() => getChannelExpansionRowsForRange(start, end, budgets), [start, end, budgets]);

  // Apply filters: selected channels + ROAS range
  const filteredSummary = useMemo(() => {
    let rows = channelSummary.filter((c) => selectedChannels.includes(c.channel));
    const mn = parseFloat(minRoas);
    const mx = parseFloat(maxRoas);
    if (!Number.isNaN(mn)) rows = rows.filter((r) => r.roas != null && r.roas >= mn);
    if (!Number.isNaN(mx)) rows = rows.filter((r) => r.roas != null && r.roas <= mx);
    return rows;
  }, [channelSummary, selectedChannels, minRoas, maxRoas]);

  // Sort
  const sorted = useMemo(() => {
    const copy = [...filteredSummary];
    copy.sort((a, b) => {
      const aVal = valueFor(a, sortField) ?? -Infinity;
      const bVal = valueFor(b, sortField) ?? -Infinity;
      if (typeof aVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    return copy;
  }, [filteredSummary, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDirection("desc"); }
  };

  // Totals computed from filtered set
  const totals = useMemo(() => {
    const t = { spend: 0, revenue: 0, orders: 0, ncRevenue: 0 };
    filteredSummary.forEach((ch) => {
      t.spend += ch.spend;
      t.revenue += ch.revenue;
      t.orders += ch.orders;
      t.ncRevenue += ch.ncRevenue;
    });
    return {
      spend: t.spend,
      revenue: t.revenue,
      blendedRoas: t.spend > 0 ? Math.round((t.revenue / t.spend) * 100) / 100 : null,
      cpa: t.orders > 0 && t.spend > 0 ? Math.round((t.spend / t.orders) * 100) / 100 : null,
      ncRoas: t.spend > 0 ? Math.round((t.ncRevenue / t.spend) * 100) / 100 : null,
    };
  }, [filteredSummary]);

  const priorTotals = useMemo(() => {
    if (!compareEnabled) return {};
    const filteredPrior = priorChannelSummary.filter((c) => selectedChannels.includes(c.channel));
    const t = { spend: 0, revenue: 0, orders: 0, ncRevenue: 0 };
    filteredPrior.forEach((ch) => {
      t.spend += ch.spend;
      t.revenue += ch.revenue;
      t.orders += ch.orders;
      t.ncRevenue += ch.ncRevenue;
    });
    return {
      spend: t.spend,
      revenue: t.revenue,
      blendedRoas: t.spend > 0 ? Math.round((t.revenue / t.spend) * 100) / 100 : null,
      cpa: t.orders > 0 && t.spend > 0 ? Math.round((t.spend / t.orders) * 100) / 100 : null,
      ncRoas: t.spend > 0 ? Math.round((t.ncRevenue / t.spend) * 100) / 100 : null,
    };
  }, [compareEnabled, priorChannelSummary, selectedChannels]);

  const pct = (c, p) => (p ? Math.round(((c - p) / p) * 10000) / 100 : 0);

  // Anomaly callouts (vs-prior pct changes per channel for revenue/ROAS/CPM/CTR)
  const anomalies = useMemo(() => {
    if (!compareEnabled) return [];
    const out = [];
    filteredSummary.forEach((cur) => {
      const pri = priorChannelSummary.find((p) => p.channel === cur.channel);
      if (!pri) return;
      const fields = [
        { key: "revenue", label: "Revenue" },
        { key: "roas", label: "ROAS" },
        { key: "cpm", label: "CPM" },
        { key: "ctr", label: "CTR" },
      ];
      fields.forEach((f) => {
        const a = cur[f.key];
        const b = pri[f.key];
        if (a == null || b == null || b === 0) return;
        const change = ((a - b) / b) * 100;
        if (Math.abs(change) >= 15) {
          out.push({ channel: cur.channel, metric: f.label, change: Math.round(change) });
        }
      });
    });
    out.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    return out.slice(0, 3);
  }, [compareEnabled, filteredSummary, priorChannelSummary]);

  // Donut data
  const donutData = filteredSummary.map((ch) => ({
    name: ch.channel,
    value: ch.revenue,
    color: CHANNEL_COLORS[ch.channel] || "#6b7280",
  }));

  // Filter chip handlers
  const toggleChannel = (name) => {
    setSelectedChannels((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };
  const setQuickFilter = (mode) => {
    if (mode === "all") setSelectedChannels(ALL_CHANNEL_NAMES);
    else if (mode === "paid") setSelectedChannels(PAID_CHANNELS);
    else if (mode === "organic") setSelectedChannels(ORGANIC_CHANNELS);
  };

  const hasActiveFilter =
    selectedChannels.length !== ALL_CHANNEL_NAMES.length ||
    minRoas !== "" ||
    maxRoas !== "";

  const clearFilters = () => {
    setSelectedChannels(ALL_CHANNEL_NAMES);
    setMinRoas("");
    setMaxRoas("");
  };

  // Saved view handlers
  const handleSwitchView = (id) => {
    setViewsState({ activeViewId: id, customViews });
  };
  const handleCreateNewView = () => {
    const name = window.prompt("Name this view:", "My Channel View");
    if (!name || !name.trim()) return;
    const id = newChannelsViewId();
    const newView = {
      id,
      name: name.trim(),
      isPreset: false,
      selectedChannels: [...selectedChannels],
      minRoas,
      maxRoas,
      metricMode,
      sortField,
      sortDirection,
    };
    setViewsState({ activeViewId: id, customViews: [...customViews, newView] });
  };
  const handleRenameView = (id) => {
    const view = customViews.find((v) => v.id === id);
    if (!view) return;
    const name = window.prompt("Rename view:", view.name);
    if (!name || !name.trim()) return;
    setViewsState({
      activeViewId,
      customViews: customViews.map((v) =>
        v.id === id ? { ...v, name: name.trim() } : v
      ),
    });
  };
  const handleDeleteView = (id) => {
    const view = customViews.find((v) => v.id === id);
    if (!view) return;
    if (!window.confirm(`Delete view "${view.name}"?`)) return;
    setViewsState({
      activeViewId: activeViewId === id ? CHANNELS_PRESETS[0].id : activeViewId,
      customViews: customViews.filter((v) => v.id !== id),
    });
  };

  const columns = COLUMNS_BY_MODE[metricMode];
  const expandable = (channelName) => CHANNELS_WITH_EXPANSION.includes(channelName);
  const toggleExpand = (channelName) => {
    setExpandedChannel((prev) => (prev === channelName ? null : channelName));
  };

  const exportData = sorted.map((r) => ({
    Channel: r.channel,
    Spend: r.spend,
    Revenue: r.revenue,
    ROAS: r.roas?.toFixed(2) || "",
    "Platform ROAS": r.platformRoas?.toFixed(2) || "",
    CPA: r.cpa?.toFixed(2) || "",
    "NC-ROAS": r.ncRoas?.toFixed(2) || "",
    Sessions: r.sessions,
    CPM: r.cpm?.toFixed(2) || "",
    CTR: r.ctr?.toFixed(2) || "",
    "% Revenue": r.revenuePercent.toFixed(1),
  }));

  return (
    <div className="space-y-5">
      {/* Anomaly callout banner */}
      {compareEnabled && anomalies.length > 0 && (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            Vs. prior period
          </span>
          {anomalies.map((a, i) => {
            const positive = a.change > 0;
            const isCpm = a.metric === "CPM";
            // For CPM, increase is bad. For everything else, increase is good.
            const goodChange = isCpm ? !positive : positive;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setDrillChannel({ channel: a.channel })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors hover:bg-[var(--bg-card-hover)] ${
                  goodChange
                    ? "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)] border-transparent"
                    : "bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)] border-transparent"
                }`}
                title={`Open ${a.channel} drill-down`}
              >
                <span>{goodChange ? "▲" : "⚠"}</span>
                <span>
                  {a.channel} {a.metric} {a.change > 0 ? "+" : ""}{a.change}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Header: Filter bar + view switcher */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Channels</span>
            {ALL_CHANNEL_NAMES.map((name) => {
              const active = selectedChannels.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleChannel(name)}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1 border transition-colors ${
                    active
                      ? "bg-[var(--toggle-active-bg)] border-[var(--toggle-active-border)] text-[var(--accent-blue)]"
                      : "bg-[var(--toggle-bg)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: active ? CHANNEL_COLORS[name] : "var(--text-muted)", opacity: active ? 1 : 0.4 }}
                  />
                  {name}
                </button>
              );
            })}
            <span className="mx-1 text-[var(--text-muted)] opacity-50">|</span>
            <button onClick={() => setQuickFilter("all")} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)]">All</button>
            <button onClick={() => setQuickFilter("paid")} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)]">Paid only</button>
            <button onClick={() => setQuickFilter("organic")} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)]">Organic only</button>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitcher
              activeView={activeView}
              customViews={customViews}
              onSwitch={handleSwitchView}
              onCreateNew={handleCreateNewView}
              onRename={handleRenameView}
              onDelete={handleDeleteView}
              presets={CHANNELS_PRESETS}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">ROAS</span>
            <input
              type="number"
              step="0.1"
              placeholder="≥ min"
              value={minRoas}
              onChange={(e) => setMinRoas(e.target.value)}
              className="w-20 text-[11px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
            />
            <input
              type="number"
              step="0.1"
              placeholder="≤ max"
              value={maxRoas}
              onChange={(e) => setMaxRoas(e.target.value)}
              className="w-20 text-[11px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
            />
          </div>

          <span className="mx-1 text-[var(--text-muted)] opacity-50">|</span>

          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mr-1">View</span>
            <div className="flex rounded-lg bg-[var(--toggle-bg)] p-0.5">
              {METRIC_MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetricMode(m.key)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    metricMode === m.key
                      ? "bg-[var(--toggle-active-bg)] text-[var(--accent-blue)] border border-[var(--toggle-active-border)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilter && (
            <>
              <span className="mx-1 text-[var(--text-muted)] opacity-50">|</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedChannels.length !== ALL_CHANNEL_NAMES.length && (
                  <Pill
                    label={`${selectedChannels.length} of ${ALL_CHANNEL_NAMES.length} channels`}
                    onRemove={() => setSelectedChannels(ALL_CHANNEL_NAMES)}
                  />
                )}
                {minRoas && <Pill label={`ROAS ≥ ${minRoas}`} onRemove={() => setMinRoas("")} />}
                {maxRoas && <Pill label={`ROAS ≤ ${maxRoas}`} onRemove={() => setMaxRoas("")} />}
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)] underline"
                >
                  Clear all
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KPICard title="Total Spend" value={fmtD(totals.spend)} change={pct(totals.spend, priorTotals.spend)} index={0}
          compareEnabled={compareEnabled} priorValue={compareEnabled ? fmtD(priorTotals.spend) : null} />
        <KPICard title="Total Revenue" value={fmtD(totals.revenue)} change={pct(totals.revenue, priorTotals.revenue)} index={1}
          compareEnabled={compareEnabled} priorValue={compareEnabled ? fmtD(priorTotals.revenue) : null} />
        <KPICard title="Blended ROAS" value={totals.blendedRoas != null ? totals.blendedRoas.toFixed(2) + "x" : "—"} change={pct(totals.blendedRoas, priorTotals.blendedRoas)} index={2}
          compareEnabled={compareEnabled} priorValue={compareEnabled && priorTotals.blendedRoas ? priorTotals.blendedRoas.toFixed(2) + "x" : null} />
        <KPICard title="Blended CPA" value={totals.cpa != null ? fmtDC(totals.cpa) : "—"} change={pct(totals.cpa, priorTotals.cpa)} index={3}
          compareEnabled={compareEnabled} priorValue={compareEnabled && priorTotals.cpa ? fmtDC(priorTotals.cpa) : null} />
        <KPICard title="NC-ROAS" value={totals.ncRoas != null ? totals.ncRoas.toFixed(2) + "x" : "—"} change={pct(totals.ncRoas, priorTotals.ncRoas)} index={4}
          compareEnabled={compareEnabled} priorValue={compareEnabled && priorTotals.ncRoas ? priorTotals.ncRoas.toFixed(2) + "x" : null} />
      </div>

      {/* Middle row: Donut + Spend×ROAS scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue Mix Donut */}
        <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Revenue Mix</h3>
          <div className="relative" style={{ height: 220 }}>
            {donutData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">No channels selected.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    onClick={(slice) => slice && setDrillChannel({ channel: slice.name })}
                    style={{ cursor: "pointer" }}
                  >
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtD(v)} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Spend × ROAS Scatter */}
        <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Spend × ROAS <span className="text-[10px] text-[var(--text-muted)] font-normal ml-1">(bubble = revenue)</span>
          </h3>
          <SpendRoasScatter
            data={filteredSummary}
            onPointClick={(p) => setDrillChannel({ channel: p.channel })}
          />
        </div>
      </div>

      {/* Attribution Table */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Channel Attribution
            <span className="ml-2 text-[10px] text-[var(--text-muted)] font-normal uppercase tracking-wider">
              {metricMode === "ROAS" ? "Revenue view" : metricMode === "Efficiency" ? "Efficiency view" : "New-customer view"}
            </span>
          </h2>
          <ExportCSV data={exportData} filename="channel-attribution" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 950 }}>
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="w-6 px-2 py-2.5"></th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => !col.noSort && handleSort(col.key)}
                    className={`px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] select-none whitespace-nowrap ${col.align} ${col.noSort ? "" : "cursor-pointer"}`}
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      {!col.noSort && <SortArrow active={sortField === col.key} direction={sortDirection} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => {
                const color = CHANNEL_COLORS[row.channel] || "#6b7280";
                const pacingRaw = getChannelPacing(row.channel, start, end, budgets);
                const pacing = {
                  ...pacingRaw,
                  __onSet: () => setDrillChannel({ ...row, openBudgetEdit: true }),
                };
                const canExpand = expandable(row.channel);
                const isExpanded = expandedChannel === row.channel;
                return (
                  <Fragment key={row.channel}>
                    <tr
                      onClick={() => setDrillChannel(row)}
                      className={`group cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors ${i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-table-stripe)]"}`}
                    >
                      <td
                        className="px-2 py-2.5 text-center text-[var(--text-muted)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canExpand) toggleExpand(row.channel);
                        }}
                      >
                        {canExpand && (
                          <span className={`inline-block transition-transform ${isExpanded ? "rotate-90" : ""}`}>▸</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-left font-medium text-[var(--text-primary)]">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          {row.channel}
                        </span>
                      </td>
                      {columns.slice(1).map((col) => (
                        <td key={col.key} className={`px-4 py-2.5 ${col.align} text-[var(--text-secondary)]`}>
                          {renderCell(row, col.key, pacing)}
                        </td>
                      ))}
                    </tr>
                    {isExpanded && (() => {
                      const platformRows = expansionRows
                        .filter((r) => r.channel === row.channel)
                        .sort((a, b) => b.spend - a.spend);
                      const elements = [];
                      platformRows.forEach((sub, ci) => {
                        const subPacing = sub.platform
                          ? getChannelPacing(row.channel, start, end, budgets, sub.platform, null)
                          : null;
                        const hasTypes = (sub.types || []).length > 0;
                        const typesOpen = sub.platform && isPlatformExpanded(row.channel, sub.platform);
                        elements.push(
                          <tr
                            key={`${row.channel}-${sub.label}`}
                            onClick={() => setDrillChannel({ channel: row.channel, platform: sub.platform, type: null, flow: sub.flow, label: sub.label })}
                            className={`group cursor-pointer hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] ${ci % 2 === 0 ? "bg-[var(--bg-surface)]/30" : "bg-[var(--bg-surface)]/50"}`}
                          >
                            <td className="px-2 py-2 text-center text-[var(--text-muted)]" onClick={(e) => { e.stopPropagation(); if (hasTypes) togglePlatformExpand(row.channel, sub.platform); }}>
                              {hasTypes && (
                                <span className={`inline-block transition-transform text-[10px] ${typesOpen ? "rotate-90" : ""}`}>▸</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-left">
                              <span className="inline-flex items-center gap-2 pl-3">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, opacity: 0.6 }} />
                                <span className="text-[11px]">{sub.label}</span>
                                {sub.isCustom && <span className="ml-1 text-[8px] uppercase tracking-wider text-[var(--accent-violet)]">custom</span>}
                                {sub.platform && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveNetwork(row.channel, sub.platform); }}
                                    title={`Remove ${sub.platform} from ${row.channel}`}
                                    aria-label={`Remove ${sub.platform}`}
                                    className="ml-1 w-4 h-4 inline-flex items-center justify-center rounded text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--badge-negative-text)] hover:bg-[var(--bg-surface)] transition-opacity text-[10px] leading-none"
                                  >×</button>
                                )}
                              </span>
                            </td>
                            {columns.slice(1).map((col) => {
                              if (col.key === "pacing") {
                                return (
                                  <td key={col.key} className="px-4 py-2 text-left text-[var(--text-muted)]">
                                    {sub.platform && subPacing
                                      ? <PacingBar pacing={subPacing} spend={sub.spend} onSet={() => setDrillChannel({ channel: row.channel, platform: sub.platform, type: null, openBudgetEdit: true })} />
                                      : <span className="text-[10px]">—</span>}
                                  </td>
                                );
                              }
                              const val = renderCell(sub, col.key, null);
                              return (
                                <td key={col.key} className={`px-4 py-2 ${col.align} text-[11px]`}>
                                  {val}
                                </td>
                              );
                            })}
                          </tr>
                        );
                        // Type rows (Paid Search · Google · Search etc.) when this platform is expanded
                        if (hasTypes && typesOpen) {
                          const typeRows = getPlatformTypeRowsForRange(row.channel, sub.platform, start, end);
                          typeRows.forEach((tr, ti) => {
                            const tPacing = getChannelPacing(row.channel, start, end, budgets, sub.platform, tr.type);
                            elements.push(
                              <tr
                                key={`${row.channel}-${sub.platform}-${tr.type}`}
                                onClick={() => setDrillChannel({ channel: row.channel, platform: sub.platform, type: tr.type, label: tr.label })}
                                className={`group cursor-pointer hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] ${ti % 2 === 0 ? "bg-[var(--bg-surface)]/15" : "bg-[var(--bg-surface)]/25"}`}
                              >
                                <td></td>
                                <td className="px-4 py-1.5 text-left">
                                  <span className="inline-flex items-center gap-2 pl-9">
                                    <span className="w-1 h-1 rounded-full opacity-50" style={{ backgroundColor: color }} />
                                    <span className="text-[11px]">{tr.type}</span>
                                  </span>
                                </td>
                                {columns.slice(1).map((col) => {
                                  if (col.key === "pacing") {
                                    return (
                                      <td key={col.key} className="px-4 py-1.5 text-left text-[var(--text-muted)]">
                                        <PacingBar pacing={tPacing} spend={tr.spend} onSet={() => setDrillChannel({ channel: row.channel, platform: sub.platform, type: tr.type, openBudgetEdit: true })} />
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={col.key} className={`px-4 py-1.5 ${col.align} text-[11px]`}>
                                      {renderCell(tr, col.key, null)}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          });
                        }
                      });
                      // "+ Add network" footer row — only for channels in NETWORK_PARENT_CHANNELS
                      if (NETWORK_PARENT_CHANNELS.includes(row.channel)) {
                        elements.push(
                          <tr key={`${row.channel}-add-network`} className="bg-[var(--bg-surface)]/15">
                            <td></td>
                            <td colSpan={columns.length} className="px-4 py-2 text-left">
                              {addingNetwork !== row.channel ? (
                                <button
                                  type="button"
                                  onClick={() => { setAddingNetwork(row.channel); setNewNetworkName(""); setNewNetworkMonthly(""); }}
                                  className="text-[11px] text-[var(--accent-blue)] hover:underline pl-3"
                                >
                                  + Add network under {row.channel}
                                </button>
                              ) : (
                                <div className="pl-3 inline-flex items-center gap-2 flex-wrap">
                                  <select
                                    value={newNetworkName}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (v === "__custom__") {
                                        setNewNetworkName("");
                                        setNewNetworkMonthly("");
                                      } else {
                                        setNewNetworkName(v);
                                        const lib = NETWORK_LIBRARY.find((n) => n.name === v);
                                        if (lib) setNewNetworkMonthly(String(lib.suggestedMonthly));
                                      }
                                    }}
                                    className="text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                                  >
                                    <option value="">Pick a network…</option>
                                    {librarySuggestionsFor(row.channel).map((n) => (
                                      <option key={n.name} value={n.name}>{n.name}</option>
                                    ))}
                                    <option value="__custom__">Custom…</option>
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="Network name"
                                    value={newNetworkName}
                                    onChange={(e) => setNewNetworkName(e.target.value)}
                                    className="text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] w-44"
                                  />
                                  <input
                                    type="number"
                                    placeholder="$ monthly"
                                    value={newNetworkMonthly}
                                    onChange={(e) => setNewNetworkMonthly(e.target.value)}
                                    className="w-24 text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddNetwork(row.channel)}
                                    className="text-[11px] font-medium px-2 py-1 rounded bg-[var(--accent-blue)] text-white hover:opacity-90"
                                  >Add</button>
                                  <button
                                    type="button"
                                    onClick={() => { setAddingNetwork(null); setNewNetworkName(""); setNewNetworkMonthly(""); }}
                                    className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                  >Cancel</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      }
                      return elements;
                    })()}
                  </Fragment>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                    No channels match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
            {sorted.length > 0 && (
              <tfoot>
                {(() => {
                  const tSpend = sorted.reduce((s, r) => s + r.spend, 0);
                  const tRev = sorted.reduce((s, r) => s + r.revenue, 0);
                  const tOrders = sorted.reduce((s, r) => s + r.orders, 0);
                  const tSessions = sorted.reduce((s, r) => s + r.sessions, 0);
                  const tNcRev = sorted.reduce((s, r) => s + r.ncRevenue, 0);
                  const tImpressions = sorted.reduce((s, r) => s + r.impressions, 0);
                  const tClicks = sorted.reduce((s, r) => s + r.clicks, 0);
                  const tRevPct = sorted.reduce((s, r) => s + r.revenuePercent, 0);
                  const totalsRow = {
                    channel: "Total",
                    spend: tSpend,
                    revenue: tRev,
                    orders: tOrders,
                    sessions: tSessions,
                    ncRevenue: tNcRev,
                    impressions: tImpressions,
                    clicks: tClicks,
                    revenuePercent: tRevPct,
                    roas: tSpend > 0 ? tRev / tSpend : null,
                    ncRoas: tSpend > 0 ? tNcRev / tSpend : null,
                    cpa: tOrders > 0 && tSpend > 0 ? tSpend / tOrders : null,
                    cpm: tImpressions > 0 && tSpend > 0 ? (tSpend / tImpressions) * 1000 : null,
                    ctr: tImpressions > 0 ? (tClicks / tImpressions) * 100 : null,
                    platformRoas: null,
                  };
                  return (
                    <tr className="border-t-2 border-[var(--border-color)] bg-[var(--bg-surface)]">
                      <td></td>
                      <td className="px-4 py-2.5 text-left font-semibold text-[var(--text-primary)]">Total</td>
                      {columns.slice(1).map((col) => {
                        if (col.key === "pacing") {
                          return <td key={col.key} className="px-4 py-2.5 text-left text-[var(--text-muted)]">—</td>;
                        }
                        if (col.key === "platformRoas") {
                          return <td key={col.key} className="px-4 py-2.5 text-right text-[var(--text-muted)]">—</td>;
                        }
                        return (
                          <td key={col.key} className={`px-4 py-2.5 ${col.align} font-semibold text-[var(--text-primary)]`}>
                            {renderCell(totalsRow, col.key, null)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })()}
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Revenue Over Time Chart */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Revenue by Channel</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showMA}
                onChange={(e) => setShowMA(e.target.checked)}
                className="accent-[var(--accent-blue)]"
              />
              7-day MA
            </label>
            <div className="flex rounded-lg bg-[var(--toggle-bg)] p-0.5">
              {[
                { key: "stacked", label: "Stacked" },
                { key: "line", label: "Lines" },
                { key: "indexed", label: "Indexed" },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setChartMode(m.key)}
                  className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
                    chartMode === m.key
                      ? "bg-[var(--toggle-active-bg)] text-[var(--accent-blue)] border border-[var(--toggle-active-border)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ChannelChart
          data={dailyChannel}
          priorData={priorDailyChannel}
          compareEnabled={compareEnabled}
          chartMode={chartMode}
          selectedChannels={selectedChannels}
          showMA={showMA && chartMode !== "stacked"}
        />
        {showMA && chartMode === "stacked" && (
          <p className="text-[10px] text-[var(--text-muted)] mt-2">
            7-day MA overlay only renders in Lines or Indexed mode.
          </p>
        )}
      </div>

      {/* Drill Drawer */}
      <ChannelDrillDrawer
        open={!!drillChannel}
        onClose={() => setDrillChannel(null)}
        channel={drillChannel}
        platform={drillChannel?.platform || null}
        type={drillChannel?.type || null}
        dateRange={dateRange}
        compare={compare}
        budgets={budgets}
        onBudgetChange={updateBudget}
        onBudgetReset={resetBudget}
        openInEditMode={drillChannel?.openBudgetEdit}
      />
    </div>
  );
}
