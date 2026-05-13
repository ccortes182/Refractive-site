import { useMemo, useState } from "react";
import { getCampaignsForRange, getCampaignSparklineForRange } from "../data/campaignsData";
import { ALL_CHANNEL_NAMES, getChannelPlatforms } from "../data/mockData";
import CampaignDrillDrawer from "../components/CampaignDrillDrawer";
import ExportCSV from "../components/ExportCSV";

const CHANNEL_COLORS = {
  "Paid Search": "#43a9df",
  "Paid Social": "#8e68ad",
  "Other Paid": "#fb923c",
  Email: "#c2dcd4",
  SMS: "#f472b6",
};

const fmtD = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtN = (n) => n.toLocaleString("en-US");

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

function StatusPill({ status }) {
  const cls = status === "Active"
    ? "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]"
    : status === "Paused"
      ? "bg-[#fbbf24]/15 text-[#fbbf24]"
      : "bg-[var(--toggle-bg)] text-[var(--text-muted)]";
  return <span className={`text-[9px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 ${cls}`}>{status}</span>;
}

function Sparkline({ values, color = "#43a9df" }) {
  if (!values?.length) return null;
  const w = 70, h = 18, pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block align-middle">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STATUSES = ["Active", "Paused", "Ended"];

export default function Campaigns({ dateRange }) {
  const { start, end } = dateRange;

  const allCampaigns = useMemo(() => getCampaignsForRange(start, end), [start, end]);

  // Filters
  const [selectedChannels, setSelectedChannels] = useState(ALL_CHANNEL_NAMES);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]); // empty = all
  const [selectedStatuses, setSelectedStatuses] = useState([]);    // empty = all
  const [minRoas, setMinRoas] = useState("");
  const [maxRoas, setMaxRoas] = useState("");
  const [search, setSearch] = useState("");

  const [sortField, setSortField] = useState("revenue");
  const [sortDir, setSortDir] = useState("desc");
  const handleSort = (f) => {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(f); setSortDir("desc"); }
  };

  // Platform options derived from selected channels
  const availablePlatforms = useMemo(() => {
    const set = new Set();
    selectedChannels.forEach((ch) => {
      getChannelPlatforms(ch).forEach((p) => set.add(p.name));
    });
    return Array.from(set);
  }, [selectedChannels]);

  // When channel selection changes, drop platform selections that are no longer relevant
  // (handled implicitly by filter step — no need to mutate state)

  const filtered = useMemo(() => {
    let rows = allCampaigns.filter((c) => selectedChannels.includes(c.channel));
    if (selectedPlatforms.length) rows = rows.filter((c) => selectedPlatforms.includes(c.platform));
    if (selectedStatuses.length) rows = rows.filter((c) => selectedStatuses.includes(c.status));
    const mn = parseFloat(minRoas);
    const mx = parseFloat(maxRoas);
    if (!Number.isNaN(mn)) rows = rows.filter((c) => c.roas != null && c.roas >= mn);
    if (!Number.isNaN(mx)) rows = rows.filter((c) => c.roas != null && c.roas <= mx);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((c) => c.name.toLowerCase().includes(q));
    }
    return rows;
  }, [allCampaigns, selectedChannels, selectedPlatforms, selectedStatuses, minRoas, maxRoas, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortField] ?? -Infinity;
      const bv = b[sortField] ?? -Infinity;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return copy;
  }, [filtered, sortField, sortDir]);

  const totals = useMemo(() => {
    return sorted.reduce(
      (acc, c) => {
        acc.spend += c.spend; acc.revenue += c.revenue; acc.orders += c.orders;
        acc.sessions += c.sessions; acc.impressions += c.impressions; acc.clicks += c.clicks;
        return acc;
      },
      { spend: 0, revenue: 0, orders: 0, sessions: 0, impressions: 0, clicks: 0 }
    );
  }, [sorted]);

  const [drillCampaign, setDrillCampaign] = useState(null);

  const toggleChannel = (ch) =>
    setSelectedChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  const togglePlatform = (p) =>
    setSelectedPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  const toggleStatus = (s) =>
    setSelectedStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const hasActiveFilter =
    selectedChannels.length !== ALL_CHANNEL_NAMES.length ||
    selectedPlatforms.length > 0 ||
    selectedStatuses.length > 0 ||
    minRoas !== "" ||
    maxRoas !== "" ||
    search !== "";

  const clearFilters = () => {
    setSelectedChannels(ALL_CHANNEL_NAMES);
    setSelectedPlatforms([]);
    setSelectedStatuses([]);
    setMinRoas("");
    setMaxRoas("");
    setSearch("");
  };

  const columns = [
    { key: "name", label: "Campaign", align: "text-left" },
    { key: "channel", label: "Channel", align: "text-left" },
    { key: "platform", label: "Platform", align: "text-left" },
    { key: "type", label: "Type", align: "text-left" },
    { key: "status", label: "Status", align: "text-left", noSort: true },
    { key: "spend", label: "Spend", align: "text-right" },
    { key: "revenue", label: "Revenue", align: "text-right" },
    { key: "roas", label: "ROAS", align: "text-right" },
    { key: "cpa", label: "CPA", align: "text-right" },
    { key: "ctr", label: "CTR", align: "text-right" },
    { key: "trend", label: "7d Trend", align: "text-right", noSort: true },
  ];

  const exportData = sorted.map((c) => ({
    Campaign: c.name, Channel: c.channel, Platform: c.platform, Type: c.type || "",
    Status: c.status, Spend: c.spend, Revenue: c.revenue, ROAS: c.roas, CPA: c.cpa, CTR: c.ctr,
    Sessions: c.sessions, Orders: c.orders,
  }));

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-4 space-y-3">
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
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? CHANNEL_COLORS[name] : "var(--text-muted)", opacity: active ? 1 : 0.4 }} />
                {name}
              </button>
            );
          })}
        </div>

        {availablePlatforms.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Platforms</span>
            {availablePlatforms.map((p) => {
              const active = selectedPlatforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`text-[10px] font-medium rounded-full px-2 py-0.5 border transition-colors ${
                    active
                      ? "bg-[var(--toggle-active-bg)] border-[var(--toggle-active-border)] text-[var(--accent-blue)]"
                      : "bg-[var(--toggle-bg)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Status</span>
            {STATUSES.map((s) => {
              const active = selectedStatuses.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={`text-[10px] font-medium rounded-full px-2 py-0.5 border transition-colors ${
                    active
                      ? "bg-[var(--toggle-active-bg)] border-[var(--toggle-active-border)] text-[var(--accent-blue)]"
                      : "bg-[var(--toggle-bg)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          <span className="mx-1 text-[var(--text-muted)] opacity-50">|</span>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">ROAS</span>
            <input type="number" step="0.1" placeholder="≥ min" value={minRoas} onChange={(e) => setMinRoas(e.target.value)} className="w-20 text-[11px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]" />
            <input type="number" step="0.1" placeholder="≤ max" value={maxRoas} onChange={(e) => setMaxRoas(e.target.value)} className="w-20 text-[11px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]" />
          </div>

          <span className="mx-1 text-[var(--text-muted)] opacity-50">|</span>

          <input
            type="text"
            placeholder="Search campaign name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-[11px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2.5 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] w-56"
          />

          {hasActiveFilter && (
            <>
              <span className="mx-1 text-[var(--text-muted)] opacity-50">|</span>
              <button onClick={clearFilters} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-blue)] underline">Clear all</button>
            </>
          )}
        </div>

        {(selectedPlatforms.length > 0 || selectedStatuses.length > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedPlatforms.map((p) => <Pill key={p} label={p} onRemove={() => togglePlatform(p)} />)}
            {selectedStatuses.map((s) => <Pill key={s} label={s} onRemove={() => toggleStatus(s)} />)}
          </div>
        )}
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">Campaigns</p>
          <p className="text-xl font-semibold text-[var(--text-primary)]">{sorted.length}</p>
        </div>
        <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">Total spend</p>
          <p className="text-xl font-semibold text-[var(--text-primary)]">{fmtD(totals.spend)}</p>
        </div>
        <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">Total revenue</p>
          <p className="text-xl font-semibold text-[var(--text-primary)]">{fmtD(totals.revenue)}</p>
        </div>
        <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">Blended ROAS</p>
          <p className="text-xl font-semibold text-[var(--text-primary)]">{totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) + "x" : "—"}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Campaigns <span className="ml-2 text-[10px] text-[var(--text-muted)] font-normal uppercase tracking-wider">{sorted.length} of {allCampaigns.length}</span>
          </h2>
          <ExportCSV data={exportData} filename="campaigns" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 1100 }}>
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                {columns.map((col) => (
                  <th key={col.key} onClick={() => !col.noSort && handleSort(col.key)}
                    className={`px-4 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] select-none whitespace-nowrap ${col.align} ${col.noSort ? "" : "cursor-pointer"}`}>
                    <span className="inline-flex items-center">
                      {col.label}
                      {!col.noSort && <SortArrow active={sortField === col.key} direction={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => {
                const color = CHANNEL_COLORS[c.channel] || "#6b7280";
                const sparkline = getCampaignSparklineForRange(c.id, start, end);
                return (
                  <tr
                    key={c.id}
                    onClick={() => setDrillCampaign(c)}
                    className={`group cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors ${i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-table-stripe)]"}`}
                  >
                    <td className="px-4 py-2.5 text-left text-[var(--text-primary)] font-medium max-w-[260px] truncate">{c.name}</td>
                    <td className="px-4 py-2.5 text-left">
                      <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        {c.channel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-left text-[var(--text-secondary)]">{c.platform}</td>
                    <td className="px-4 py-2.5 text-left text-[var(--text-muted)]">{c.type || "—"}</td>
                    <td className="px-4 py-2.5 text-left"><StatusPill status={c.status} /></td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{c.spend > 0 ? fmtD(c.spend) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{fmtD(c.revenue)}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{c.roas != null ? c.roas.toFixed(2) + "x" : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{c.cpa != null ? fmtD(c.cpa) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{c.ctr != null ? c.ctr.toFixed(2) + "%" : "—"}</td>
                    <td className="px-4 py-2.5 text-right"><Sparkline values={sparkline} color={color} /></td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No campaigns match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CampaignDrillDrawer
        open={!!drillCampaign}
        onClose={() => setDrillCampaign(null)}
        campaign={drillCampaign}
        dateRange={dateRange}
      />
    </div>
  );
}
