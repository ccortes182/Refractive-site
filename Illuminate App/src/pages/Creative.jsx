import { useMemo, useState } from "react";
import { getCreatives, creativeTests, copyVariants, audienceCreativeMatrix } from "../data/mockData";
import ExportCSV from "../components/ExportCSV";
import FatigueChart from "../components/Charts/FatigueChart";
import CreativeDrawer from "../components/CreativeDrawer";
import InfoTooltip from "../components/InfoTooltip";
import { useTheme } from "../context/ThemeContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";

const CARD = "bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-5";
const SEL = "text-[10px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-muted)] focus:outline-none";
const FC = { Video: "#43a9df", Image: "#8e68ad", Carousel: "#c2dcd4" };
const FN = { TOF: "#43a9df", MOF: "#8e68ad", BOF: "#34d399" };
const fmtD = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtN = (n) => n.toLocaleString("en-US");

function ScoreBar({ label, score }) {
  const c = score >= 60 ? "#34d399" : score >= 40 ? "#43a9df" : score >= 20 ? "#fbbf24" : "#f87171";
  return (<div className="flex items-center gap-2"><span className="text-[9px] text-[var(--text-muted)] w-10">{label}</span><div className="flex-1 h-1.5 rounded-full bg-[var(--toggle-bg)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: c }} /></div><span className="text-[10px] font-medium text-[var(--text-primary)] w-6 text-right">{score}</span></div>);
}
function SortArrow({ active, direction }) {
  return (<span className="ml-1 inline-flex flex-col leading-none text-[10px]"><span className={active && direction === "asc" ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)] opacity-30"}>▲</span><span className={active && direction === "desc" ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)] opacity-30"}>▼</span></span>);
}
function Pill({ label, onRemove }) {
  return (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20">{label}<button onClick={onRemove} className="hover:text-white ml-0.5"><svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 1l6 6M7 1l-6 6" /></svg></button></span>);
}

export default function Creative({ dateRange, compare }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";
  const creatives = useMemo(() => getCreatives(), []);

  // Sort
  const [sortField, setSortField] = useState("revenue");
  const [sortDir, setSortDir] = useState("desc");
  const handleSort = (f) => { if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortField(f); setSortDir("desc"); } };
  const sorted = useMemo(() => [...creatives].sort((a, b) => sortDir === "asc" ? (a[sortField] ?? 0) - (b[sortField] ?? 0) : (b[sortField] ?? 0) - (a[sortField] ?? 0)), [creatives, sortField, sortDir]);

  // Filters
  const [platformFilter, setPlatformFilter] = useState("All");
  const [formatFilter, setFormatFilter] = useState("All");
  const [hookFilter, setHookFilter] = useState("All");
  const [funnelFilter, setFunnelFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [minRoas, setMinRoas] = useState("");
  const [maxRoas, setMaxRoas] = useState("");
  const hasFilters = platformFilter !== "All" || formatFilter !== "All" || hookFilter !== "All" || funnelFilter !== "All" || statusFilter !== "All" || minRoas || maxRoas;
  const clearFilters = () => { setPlatformFilter("All"); setFormatFilter("All"); setHookFilter("All"); setFunnelFilter("All"); setStatusFilter("All"); setMinRoas(""); setMaxRoas(""); };

  const filtered = useMemo(() => {
    let d = sorted;
    if (platformFilter !== "All") d = d.filter(c => c.platform === platformFilter);
    if (formatFilter !== "All") d = d.filter(c => c.format === formatFilter);
    if (hookFilter !== "All") d = d.filter(c => c.hookStyle === hookFilter);
    if (funnelFilter !== "All") d = d.filter(c => c.funnel === funnelFilter);
    if (statusFilter === "Winner") d = d.filter(c => c.roas > 3);
    if (statusFilter === "Underperformer") d = d.filter(c => c.roas < 1.5);
    if (statusFilter === "Active") d = d.filter(c => c.roas >= 1.5 && c.roas <= 3);
    const mn = parseFloat(minRoas); if (!isNaN(mn)) d = d.filter(c => c.roas >= mn);
    const mx = parseFloat(maxRoas); if (!isNaN(mx)) d = d.filter(c => c.roas <= mx);
    return d;
  }, [sorted, platformFilter, formatFilter, hookFilter, funnelFilter, statusFilter, minRoas, maxRoas]);

  // Drawer
  const [drawerCreative, setDrawerCreative] = useState(null);
  const [drawerImg, setDrawerImg] = useState(1);
  const openDrawer = (c, img) => { setDrawerCreative(c); setDrawerImg(img || c.thumbnail || 1); };

  // A/B test state
  const [selectedForTest, setSelectedForTest] = useState([]);
  const [showTestBuilder, setShowTestBuilder] = useState(false);
  const [testName, setTestName] = useState("");
  const [testAudience, setTestAudience] = useState("Prospecting LAL");
  const [testDuration, setTestDuration] = useState("7d");
  const [expandedTest, setExpandedTest] = useState(null);
  const [testSplit, setTestSplit] = useState(50);
  const [localTests, setLocalTests] = useState(creativeTests);
  const toggleSelect = (id) => { setSelectedForTest(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 2 ? [prev[1], id] : [...prev, id]); };

  // Grouping
  const [groupBy, setGroupBy] = useState("none");
  const groupedData = useMemo(() => {
    if (groupBy === "none") return null;
    const map = {};
    creatives.forEach(c => { const k = c[groupBy] || "Unknown"; if (!map[k]) map[k] = { group: k, count: 0, spend: 0, revenue: 0, roasSum: 0, cpaSum: 0, thumbstopSum: 0 }; const g = map[k]; g.count++; g.spend += c.spend; g.revenue += c.revenue; g.roasSum += c.roas; g.cpaSum += c.cpa; g.thumbstopSum += c.thumbstopRate; });
    return Object.values(map).map(g => ({ ...g, avgRoas: Math.round((g.roasSum / g.count) * 100) / 100, avgCpa: Math.round((g.cpaSum / g.count) * 100) / 100, avgThumbstop: Math.round((g.thumbstopSum / g.count) * 10) / 10 })).sort((a, b) => b.avgRoas - a.avgRoas);
  }, [creatives, groupBy]);

  const top8 = useMemo(() => [...creatives].sort((a, b) => b.revenue - a.revenue).slice(0, 8), [creatives]);
  const top5Spend = useMemo(() => [...creatives].sort((a, b) => b.spend - a.spend).slice(0, 5), [creatives]);
  const recentCreatives = useMemo(() => creatives.filter(c => c.isRecent), [creatives]);
  const diversityScore = useMemo(() => { const t = new Set(creatives.map(c => c.format)).size + new Set(creatives.map(c => c.hookStyle)).size + new Set(creatives.map(c => c.funnel)).size + new Set(creatives.map(c => c.platform)).size; return Math.min(100, Math.round((t / 20) * 100)); }, [creatives]);
  const formatBreakdown = useMemo(() => { const m = {}; creatives.forEach(c => { if (!m[c.format]) m[c.format] = { format: c.format, roasSum: 0, count: 0 }; m[c.format].roasSum += c.roas; m[c.format].count++; }); return Object.values(m).map(g => ({ format: g.format, avgRoas: Math.round((g.roasSum / g.count) * 100) / 100 })); }, [creatives]);
  const hookOpts = useMemo(() => ["All", ...new Set(creatives.map(c => c.hookStyle))], [creatives]);

  const columns = [
    { key: "_check", label: "", align: "text-center" },
    { key: "name", label: "Creative", align: "text-left" },
    { key: "platform", label: "Platform", align: "text-left" },
    { key: "format", label: "Format", align: "text-left" },
    { key: "hookStyle", label: "Hook", align: "text-left" },
    { key: "funnel", label: "Funnel", align: "text-center" },
    { key: "spend", label: "Spend", align: "text-right" },
    { key: "roas", label: "ROAS", align: "text-right" },
    { key: "cpa", label: "CPA", align: "text-right" },
    { key: "ctr", label: "CTR", align: "text-right" },
    { key: "thumbstopRate", label: "Thumbstop", align: "text-right" },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className={CARD}><p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Creative Diversity <InfoTooltip text="Measures the variety of your active creative mix across formats, hooks, funnels, and platforms. Higher = less risk of audience fatigue." /></p><div className="flex items-center gap-3"><div className="relative w-14 h-14"><svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" stroke="var(--toggle-bg)" strokeWidth="3" /><circle cx="18" cy="18" r="15" fill="none" stroke={diversityScore >= 70 ? "#34d399" : "#43a9df"} strokeWidth="3" strokeDasharray={`${diversityScore * 0.94} 100`} strokeLinecap="round" /></svg><span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[var(--text-primary)]">{diversityScore}</span></div><div><p className="text-lg font-bold text-[var(--text-primary)]">{diversityScore >= 70 ? "Strong" : "Moderate"}</p><p className="text-[10px] text-[var(--text-muted)]">{creatives.length} active</p></div></div></div>
        <div className={CARD}><p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Launched (7d)</p><p className="text-2xl font-bold text-[var(--text-primary)]">{recentCreatives.length}</p><div className="mt-2 space-y-1">{recentCreatives.slice(0, 3).map(c => <p key={c.id} className="text-[10px] text-[var(--text-secondary)] truncate">{c.name} — {c.roas}x</p>)}</div></div>
        <div className={CARD}><p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Best ROAS</p>{(() => { const b = [...creatives].sort((a, b) => b.roas - a.roas)[0]; return b ? <><p className="text-lg font-bold text-[var(--badge-positive-text)]">{b.roas}x</p><p className="text-xs text-[var(--text-secondary)] truncate">{b.name}</p></> : null; })()}</div>
        <div className={CARD}><p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Worst CPA</p>{(() => { const w = [...creatives].sort((a, b) => b.cpa - a.cpa)[0]; return w ? <><p className="text-lg font-bold text-[var(--badge-negative-text)]">${w.cpa.toFixed(2)}</p><p className="text-xs text-[var(--text-secondary)] truncate">{w.name}</p></> : null; })()}</div>
      </div>

      {/* Top Creatives */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Top Creatives <InfoTooltip text="Four-step funnel scoring: Hook (thumbstop), Watch (play-through), Click (CTR), Convert (purchase rate). Each scored 0-100. Click a card to see full details." /></h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {top8.map((c, idx) => (
            <div key={c.id} className={`${CARD} cursor-pointer transition-all hover:border-[var(--border-hover)]`} onClick={() => openDrawer(c, idx + 1)}>
              <div className="h-28 rounded-lg mb-2 overflow-hidden bg-[var(--bg-surface)]"><img src={`${import.meta.env.BASE_URL}creatives/cr-${idx + 1}.png`} alt={c.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} /></div>
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{c.name}</p>
              <div className="flex items-center gap-1.5 mt-1"><span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">{c.platform}</span><span className="text-[9px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: FN[c.funnel] }}>{c.funnel}</span>{c.roas > 3 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]">Winner</span>}</div>
              <div className="mt-2 space-y-1"><ScoreBar label="Hook" score={c.scorecard.hook} /><ScoreBar label="Watch" score={c.scorecard.watch} /><ScoreBar label="Click" score={c.scorecard.click} /><ScoreBar label="Conv" score={c.scorecard.convert} /></div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--text-muted)]"><span>{fmtD(c.spend)}</span><span>{c.roas}x</span><span>${c.cpa.toFixed(0)}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparative Analysis */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-[var(--text-primary)]">Comparative Analysis</h3><select value={groupBy} onChange={e => setGroupBy(e.target.value)} className={SEL}><option value="none">Select grouping...</option><option value="format">By Format</option><option value="platform">By Platform</option><option value="hookStyle">By Hook Style</option><option value="angle">By Messaging Angle</option><option value="talent">By Talent</option><option value="funnel">By Funnel Stage</option></select></div>
        {groupedData ? <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-[var(--bg-surface)]"><th className="px-4 py-2 text-left text-[10px] font-medium text-[var(--text-muted)] uppercase">{groupBy}</th><th className="px-4 py-2 text-center text-[10px] font-medium text-[var(--text-muted)] uppercase">Count</th><th className="px-4 py-2 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase">Spend</th><th className="px-4 py-2 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase">Rev</th><th className="px-4 py-2 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase">ROAS</th><th className="px-4 py-2 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase">CPA</th><th className="px-4 py-2 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase">Thumbstop</th></tr></thead><tbody>{groupedData.map((g, i) => <tr key={g.group} className={i % 2 ? "bg-[var(--bg-table-stripe)]" : ""}><td className="px-4 py-2 text-left font-medium text-[var(--text-primary)]">{g.group}</td><td className="px-4 py-2 text-center text-[var(--text-secondary)]">{g.count}</td><td className="px-4 py-2 text-right text-[var(--text-secondary)]">{fmtD(g.spend)}</td><td className="px-4 py-2 text-right text-[var(--text-secondary)]">{fmtD(g.revenue)}</td><td className="px-4 py-2 text-right font-medium text-[var(--text-primary)]">{g.avgRoas}x</td><td className="px-4 py-2 text-right text-[var(--text-secondary)]">${g.avgCpa.toFixed(2)}</td><td className="px-4 py-2 text-right text-[var(--text-secondary)]">{g.avgThumbstop}%</td></tr>)}</tbody></table></div> : <p className="text-xs text-[var(--text-muted)] py-4 text-center">Select a grouping to compare</p>}
      </div>

      {/* All Creatives Table */}
      <div className="bg-[var(--bg-card-solid)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">All Creatives ({filtered.length})</h3>
          <ExportCSV data={sorted.map(r => ({ Name: r.name, Platform: r.platform, Format: r.format, Hook: r.hookStyle, Funnel: r.funnel, Spend: r.spend, Revenue: r.revenue, ROAS: r.roas, CPA: r.cpa.toFixed(2), CTR: r.ctr.toFixed(2), Thumbstop: r.thumbstopRate }))} filename="creative-performance" />
        </div>
        {/* Filters */}
        <div className="px-5 py-2 border-b border-[var(--border-color)] flex flex-wrap items-center gap-2">
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} className={SEL}>{["All", "Meta", "Google", "TikTok"].map(o => <option key={o} value={o}>{o === "All" ? "All Platforms" : o}</option>)}</select>
          <select value={formatFilter} onChange={e => setFormatFilter(e.target.value)} className={SEL}>{["All", "Video", "Image", "Carousel"].map(o => <option key={o} value={o}>{o === "All" ? "All Formats" : o}</option>)}</select>
          <select value={hookFilter} onChange={e => setHookFilter(e.target.value)} className={SEL}>{hookOpts.map(o => <option key={o} value={o}>{o === "All" ? "All Hooks" : o}</option>)}</select>
          <select value={funnelFilter} onChange={e => setFunnelFilter(e.target.value)} className={SEL}>{["All", "TOF", "MOF", "BOF"].map(o => <option key={o} value={o}>{o === "All" ? "All Funnels" : o}</option>)}</select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={SEL}><option value="All">All Status</option><option value="Winner">Winners</option><option value="Active">Active</option><option value="Underperformer">Underperformers</option></select>
          <div className="flex items-center gap-1"><input type="number" value={minRoas} onChange={e => setMinRoas(e.target.value)} placeholder="Min ROAS" className={`${SEL} w-[72px]`} /><span className="text-[var(--text-muted)] text-[9px]">–</span><input type="number" value={maxRoas} onChange={e => setMaxRoas(e.target.value)} placeholder="Max" className={`${SEL} w-[72px]`} /></div>
          {hasFilters && <button onClick={clearFilters} className="text-[10px] text-[var(--accent-blue)] hover:underline">Clear all</button>}
        </div>
        {hasFilters && <div className="px-5 py-1.5 border-b border-[var(--border-color)] flex flex-wrap gap-1.5">
          {platformFilter !== "All" && <Pill label={platformFilter} onRemove={() => setPlatformFilter("All")} />}
          {formatFilter !== "All" && <Pill label={formatFilter} onRemove={() => setFormatFilter("All")} />}
          {hookFilter !== "All" && <Pill label={hookFilter} onRemove={() => setHookFilter("All")} />}
          {funnelFilter !== "All" && <Pill label={funnelFilter} onRemove={() => setFunnelFilter("All")} />}
          {statusFilter !== "All" && <Pill label={statusFilter} onRemove={() => setStatusFilter("All")} />}
          {minRoas && <Pill label={`ROAS ≥ ${minRoas}`} onRemove={() => setMinRoas("")} />}
          {maxRoas && <Pill label={`ROAS ≤ ${maxRoas}`} onRemove={() => setMaxRoas("")} />}
        </div>}
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 900 }}>
            <thead><tr className="bg-[var(--bg-surface)]">{columns.map(col => col.key === "_check" ? <th key="_check" className="px-2 py-2.5 w-8" /> : <th key={col.key} onClick={() => handleSort(col.key)} className={`px-3 py-2.5 font-medium text-[var(--text-muted)] uppercase text-[10px] cursor-pointer select-none whitespace-nowrap ${col.align}`}><span className="inline-flex items-center">{col.label}<SortArrow active={sortField === col.key} direction={sortDir} /></span></th>)}</tr></thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`cursor-pointer transition-colors hover:bg-[var(--border-color)] ${i % 2 ? "bg-[var(--bg-table-stripe)]" : ""}`} onClick={() => openDrawer(r, r.thumbnail)}>
                  <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedForTest.includes(r.id)} onChange={() => toggleSelect(r.id)} className="accent-[var(--accent-blue)] cursor-pointer" /></td>
                  <td className="px-3 py-2 text-left font-medium text-[var(--text-primary)]"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} /><span className="truncate max-w-[130px]">{r.name}</span>{r.isRecent && <span className="text-[8px] px-1 py-0.5 rounded bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">NEW</span>}</span></td>
                  <td className="px-3 py-2 text-left text-[var(--text-secondary)]">{r.platform}</td>
                  <td className="px-3 py-2 text-left"><span className="px-1.5 py-0.5 rounded text-[9px] cursor-pointer hover:ring-1 hover:ring-[var(--accent-blue)]" style={{ backgroundColor: FC[r.format] + "20", color: FC[r.format] }} onClick={e => { e.stopPropagation(); setFormatFilter(r.format); }}>{r.format}</span></td>
                  <td className="px-3 py-2 text-left text-[var(--text-secondary)] cursor-pointer hover:text-[var(--accent-blue)] hover:underline" onClick={e => { e.stopPropagation(); setHookFilter(r.hookStyle); }}>{r.hookStyle}</td>
                  <td className="px-3 py-2 text-center"><span className="px-1.5 py-0.5 rounded text-[9px] text-white cursor-pointer hover:ring-1 hover:ring-white/30" style={{ backgroundColor: FN[r.funnel] }} onClick={e => { e.stopPropagation(); setFunnelFilter(r.funnel); }}>{r.funnel}</span></td>
                  <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{fmtD(r.spend)}</td>
                  <td className="px-3 py-2 text-right font-medium text-[var(--text-primary)]">{r.roas}x</td>
                  <td className="px-3 py-2 text-right text-[var(--text-secondary)]">${r.cpa.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{r.ctr.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{r.thumbstopRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fatigue + Format */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FatigueChart creatives={top5Spend} />
        <div className={CARD}><h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Format ROAS</h3><ResponsiveContainer width="100%" height={180}><BarChart data={formatBreakdown} layout="vertical" margin={{ left: 10 }}><CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} /><YAxis dataKey="format" type="category" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} width={60} /><XAxis type="number" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ backgroundColor: "var(--bg-card-solid)", border: "1px solid var(--border-color)", borderRadius: 8 }} formatter={v => v.toFixed(2) + "x"} /><Bar dataKey="avgRoas" radius={[0, 3, 3, 0]} barSize={24}>{formatBreakdown.map(e => <Cell key={e.format} fill={FC[e.format] || "#43a9df"} />)}</Bar></BarChart></ResponsiveContainer></div>
      </div>

      {/* A/B Tests */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active Creative Tests <InfoTooltip text="A/B tests comparing control vs variant creatives. Results are reliable when statistical significance reaches 95%+. Click a test to see full metrics." /></h3>
          <button onClick={() => { setShowTestBuilder(true); setTestName(""); }} className="text-[10px] font-medium px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#43a9df] to-[#8e68ad] text-white">+ New Test</button>
        </div>
        {/* Test Builder */}
        {showTestBuilder && (
          <div className="mb-4 p-4 rounded-lg border border-[var(--accent-blue)]/20 bg-[var(--accent-blue)]/5">
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-3">New A/B Test</p>
            {selectedForTest.length >= 2 && <div className="flex gap-3 mb-3">{selectedForTest.slice(0, 2).map((id, i) => { const cr = creatives.find(c => c.id === id); return cr ? <div key={id} className="flex-1 p-2 rounded bg-[var(--bg-card-solid)] text-[10px]"><p className="text-[var(--text-muted)]">{i === 0 ? "Control" : "Variant"}</p><p className="text-[var(--text-primary)] font-medium truncate">{cr.name}</p></div> : null; })}</div>}
            {selectedForTest.length < 2 && <p className="text-[10px] text-[var(--text-muted)] mb-3">Select 2 creatives from the table below using the checkboxes</p>}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
              <div><label className="block text-[9px] text-[var(--text-muted)] uppercase mb-1">Test Name</label><input value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g. UGC vs Studio" className={`${SEL} w-full`} /></div>
              <div><label className="block text-[9px] text-[var(--text-muted)] uppercase mb-1">Audience</label><select value={testAudience} onChange={e => setTestAudience(e.target.value)} className={`${SEL} w-full`}><option>Prospecting LAL</option><option>Prospecting Interest</option><option>Retargeting</option><option>Broad</option></select></div>
              <div><label className="block text-[9px] text-[var(--text-muted)] uppercase mb-1">Duration</label><select value={testDuration} onChange={e => setTestDuration(e.target.value)} className={`${SEL} w-full`}><option value="3d">3 days</option><option value="7d">7 days</option><option value="14d">14 days</option></select></div>
              <div><label className="block text-[9px] text-[var(--text-muted)] uppercase mb-1">Budget Split</label><input type="range" min="20" max="80" value={testSplit} onChange={e => setTestSplit(+e.target.value)} className="w-full h-1.5 accent-[var(--accent-blue)] cursor-pointer" /><p className="text-[10px] text-[var(--text-primary)] text-center">{testSplit}% / {100 - testSplit}%</p></div>
              <div><label className="block text-[9px] text-[var(--text-muted)] uppercase mb-1">Platform</label><p className="text-[10px] text-[var(--text-primary)]">{(() => { const ps = selectedForTest.map(id => creatives.find(c => c.id === id)?.platform).filter(Boolean); const unique = [...new Set(ps)]; return unique.length ? unique.join(", ") : "Auto-detected"; })()}</p></div>
            </div>
            <div className="flex gap-2"><button disabled={selectedForTest.length < 2} onClick={() => { const c1 = creatives.find(c => c.id === selectedForTest[0]); const c2 = creatives.find(c => c.id === selectedForTest[1]); if (!c1 || !c2) return; const newTest = { id: `ct-${localTests.length + 1}`, name: testName || `${c1.name} vs ${c2.name}`, control: { creative: c1.name, roas: 0, cpa: 0, ctr: 0, spend: 0, revenue: 0, impressions: 0 }, variant: { creative: c2.name, roas: 0, cpa: 0, ctr: 0, spend: 0, revenue: 0, impressions: 0 }, status: "Needs Data", winner: null, daysRunning: 0, significance: 0 }; setLocalTests(prev => [newTest, ...prev]); setShowTestBuilder(false); setSelectedForTest([]); setTestSplit(50); }} className="px-4 py-1.5 text-[10px] font-semibold text-white rounded-lg bg-gradient-to-r from-[#43a9df] to-[#8e68ad] disabled:opacity-40">Launch Test</button><button onClick={() => { setShowTestBuilder(false); setSelectedForTest([]); setTestSplit(50); }} className="px-4 py-1.5 text-[10px] text-[var(--text-muted)]">Cancel</button></div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {localTests.map(t => {
            const sc = t.status === "Winner" ? "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]" : t.status === "No Winner" ? "bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)]" : "bg-[var(--toggle-bg)] text-[var(--text-muted)]";
            const isExp = expandedTest === t.id;
            return (
              <div key={t.id} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] cursor-pointer transition-all hover:border-[var(--border-hover)]" onClick={() => setExpandedTest(isExp ? null : t.id)}>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-[var(--text-primary)]">{t.name}</span><span className="inline-flex items-center gap-1"><span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${sc}`}>{t.status}</span><InfoTooltip text={t.status === "Winner" ? "A statistically significant winner has been identified (95%+ confidence). Safe to scale the winner and pause the loser." : t.status === "No Winner" ? "The test ran its full duration but no statistically significant difference was found. Consider testing a bolder variation." : "Not enough data yet to determine a winner. Keep the test running until significance reaches 95%+."} /></span></div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className={`rounded p-2 ${t.winner === "control" ? "ring-1 ring-[var(--badge-positive-text)]" : ""}`} style={{ backgroundColor: "var(--bg-card-solid)" }}><p className="text-[var(--text-muted)] mb-1">Control</p><p className="text-[var(--text-primary)] font-medium truncate">{t.control.creative}</p><div className="flex gap-2 mt-1 text-[var(--text-secondary)]"><span>{t.control.roas}x</span><span>${t.control.cpa.toFixed(0)}</span></div></div>
                    <div className={`rounded p-2 ${t.winner === "variant" ? "ring-1 ring-[var(--badge-positive-text)]" : ""}`} style={{ backgroundColor: "var(--bg-card-solid)" }}><p className="text-[var(--text-muted)] mb-1">Variant</p><p className="text-[var(--text-primary)] font-medium truncate">{t.variant.creative}</p><div className="flex gap-2 mt-1 text-[var(--text-secondary)]"><span>{t.variant.roas}x</span><span>${t.variant.cpa.toFixed(0)}</span></div></div>
                  </div>
                  {/* Significance bar */}
                  <div className="mt-2 relative"><div className="h-1.5 rounded-full bg-[var(--toggle-bg)] overflow-hidden"><div className="h-full rounded-full bg-[var(--accent-blue)]" style={{ width: `${t.significance}%` }} /></div><div className="absolute top-0 h-1.5 border-r-2 border-dashed border-[var(--badge-positive-text)]" style={{ left: "95%" }} /></div>
                  <div className="flex items-center justify-between mt-1.5 text-[9px] text-[var(--text-muted)]"><span>{t.daysRunning}d running</span><span>Sig: <span className={t.significance >= 95 ? "text-[var(--badge-positive-text)] font-medium" : ""}>{t.significance}%</span> <InfoTooltip text="Statistical significance measures confidence that the performance difference isn't due to chance. 95%+ = safe to declare a winner." /></span></div>
                </div>
                {isExp && (
                  <div className="px-3 pb-3 border-t border-[var(--border-color)] mt-1 pt-2">
                    <table className="w-full text-[10px]"><thead><tr><th className="text-left py-1 text-[var(--text-muted)]">Metric</th><th className="text-right py-1 text-[var(--text-muted)]">Control</th><th className="text-right py-1 text-[var(--text-muted)]">Variant</th><th className="text-right py-1 text-[var(--text-muted)]">Delta</th></tr></thead><tbody>
                      {[{ m: "ROAS", c: t.control.roas + "x", v: t.variant.roas + "x", d: t.control.roas ? ((t.variant.roas - t.control.roas) / t.control.roas * 100).toFixed(1) + "%" : "—" }, { m: "CPA", c: "$" + t.control.cpa.toFixed(2), v: "$" + t.variant.cpa.toFixed(2), d: t.control.cpa ? ((t.variant.cpa - t.control.cpa) / t.control.cpa * 100).toFixed(1) + "%" : "—" }, { m: "CTR", c: t.control.ctr + "%", v: t.variant.ctr + "%", d: t.control.ctr ? ((t.variant.ctr - t.control.ctr) / t.control.ctr * 100).toFixed(1) + "%" : "—" }, { m: "Spend", c: fmtD(t.control.spend), v: fmtD(t.variant.spend), d: "—" }, { m: "Revenue", c: fmtD(t.control.revenue || 0), v: fmtD(t.variant.revenue || 0), d: t.control.revenue ? ((((t.variant.revenue || 0) - t.control.revenue) / t.control.revenue) * 100).toFixed(1) + "%" : "—" }, { m: "Impressions", c: fmtN(t.control.impressions || 0), v: fmtN(t.variant.impressions || 0), d: t.control.impressions ? ((((t.variant.impressions || 0) - t.control.impressions) / t.control.impressions) * 100).toFixed(1) + "%" : "—" }].map(r => <tr key={r.m}><td className="py-1 text-[var(--text-primary)]">{r.m}</td><td className="py-1 text-right text-[var(--text-secondary)]">{r.c}</td><td className="py-1 text-right text-[var(--text-secondary)]">{r.v}</td><td className="py-1 text-right text-[var(--text-secondary)]">{r.d}</td></tr>)}
                    </tbody></table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hook Leaderboard */}
      {(() => { const hb = {}; creatives.forEach(c => { const k = c.hookStyle; if (!hb[k]) hb[k] = { hook: k, spend: 0, revenue: 0, count: 0 }; hb[k].spend += c.spend; hb[k].revenue += c.revenue; hb[k].count++; }); const ranked = Object.values(hb).map(h => ({ ...h, roas: h.spend > 0 ? Math.round((h.revenue / h.spend) * 100) / 100 : 0 })).sort((a, b) => b.roas - a.roas); return (
        <div className={CARD}><h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Hook Leaderboard <InfoTooltip text="Hooks ranked by spend-weighted ROAS. 'Brief more' = ROAS > 3x, 'Stop' = ROAS < 2x. Weighted by spend so high-budget hooks aren't underrepresented." /></h3><div className="space-y-2">{ranked.map((h, i) => <div key={h.hook} className="flex items-center gap-3"><span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]" : "bg-[var(--bg-surface)] text-[var(--text-muted)]"}`}>{i + 1}</span><span className="text-xs font-medium text-[var(--text-primary)] w-28">{h.hook}</span><div className="flex-1 h-2 rounded-full bg-[var(--toggle-bg)] overflow-hidden"><div className="h-full rounded-full bg-[#43a9df]" style={{ width: `${(h.roas / ranked[0].roas) * 100}%` }} /></div><span className="text-xs font-semibold text-[var(--text-primary)] w-12 text-right">{h.roas}x</span><span className="text-[10px] text-[var(--text-muted)] w-16 text-right">{fmtD(h.spend)}</span><span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${h.roas >= 3 ? "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]" : h.roas < 2 ? "bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)]" : "bg-[var(--toggle-bg)] text-[var(--text-muted)]"}`}>{h.roas >= 3 ? "Brief more" : h.roas < 2 ? "Stop" : "Hold"}</span></div>)}</div></div>
      ); })()}

      {/* Spend Allocation */}
      {(() => { const sf = {}, sh = {}; let ts = 0; creatives.forEach(c => { sf[c.format] = (sf[c.format] || 0) + c.spend; sh[c.hookStyle] = (sh[c.hookStyle] || 0) + c.spend; ts += c.spend; }); const tcs = [...creatives].sort((a, b) => b.spend - a.spend); const t3 = ts > 0 ? Math.round(((tcs[0].spend + tcs[1].spend + tcs[2].spend) / ts) * 100) : 0; const fd = Object.entries(sf).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value); const hd = Object.entries(sh).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value); return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className={CARD}><h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Spend by Format <InfoTooltip text="Where your ad budget is distributed across creative types. Alerts when top 3 creatives consume >60% of spend." /></h3>{t3 > 60 && <p className="text-[10px] text-[#fbbf24] mb-3">{t3}% on top 3 — diversify</p>}<div className="space-y-2">{fd.map(f => <div key={f.name} className="flex items-center gap-2"><span className="text-xs text-[var(--text-primary)] w-16">{f.name}</span><div className="flex-1 h-3 rounded-full bg-[var(--toggle-bg)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(f.value / ts) * 100}%`, backgroundColor: FC[f.name] || "#43a9df" }} /></div><span className="text-[10px] text-[var(--text-muted)] w-10 text-right">{Math.round((f.value / ts) * 100)}%</span><span className="text-[10px] text-[var(--text-secondary)] w-14 text-right">{fmtD(f.value)}</span></div>)}</div></div>
          <div className={CARD}><h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Spend by Hook</h3><div className="space-y-2">{hd.map(h => <div key={h.name} className="flex items-center gap-2"><span className="text-xs text-[var(--text-primary)] w-28 truncate">{h.name}</span><div className="flex-1 h-3 rounded-full bg-[var(--toggle-bg)] overflow-hidden"><div className="h-full rounded-full bg-[#8e68ad]" style={{ width: `${(h.value / ts) * 100}%` }} /></div><span className="text-[10px] text-[var(--text-muted)] w-10 text-right">{Math.round((h.value / ts) * 100)}%</span><span className="text-[10px] text-[var(--text-secondary)] w-14 text-right">{fmtD(h.value)}</span></div>)}</div></div>
        </div>
      ); })()}

      {/* Copy Performance */}
      <div className={CARD}><div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-[var(--text-primary)]">Copy & Headline Performance</h3><ExportCSV data={copyVariants.map(c => ({ Type: c.type, Text: c.text, Impressions: c.impressions, CTR: c.ctr, ROAS: c.roas, Spend: c.spend }))} filename="copy-performance" /></div><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-[var(--bg-surface)]"><th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)] uppercase">Type</th><th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)] uppercase">Text</th><th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase">Impressions</th><th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase">CTR</th><th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase">ROAS</th><th className="px-3 py-2 text-right text-[10px] font-medium text-[var(--text-muted)] uppercase">Spend</th></tr></thead><tbody>{copyVariants.map((c, i) => <tr key={c.id} className={i % 2 ? "bg-[var(--bg-table-stripe)]" : ""}><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${c.type === "Headline" ? "bg-[#43a9df]/15 text-[#43a9df]" : c.type === "Primary Text" ? "bg-[#8e68ad]/15 text-[#8e68ad]" : "bg-[#34d399]/15 text-[#34d399]"}`}>{c.type}</span></td><td className="px-3 py-2 text-[var(--text-primary)] max-w-[300px] truncate">{c.text}</td><td className="px-3 py-2 text-right text-[var(--text-secondary)]">{fmtN(c.impressions)}</td><td className="px-3 py-2 text-right text-[var(--text-secondary)]">{c.ctr}%</td><td className="px-3 py-2 text-right font-medium text-[var(--text-primary)]">{c.roas}x</td><td className="px-3 py-2 text-right text-[var(--text-secondary)]">{fmtD(c.spend)}</td></tr>)}</tbody></table></div></div>

      {/* Audience Matrix */}
      <div className={CARD}><h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Audience × Creative ROAS <InfoTooltip text="ROAS heatmap showing how each creative performs across audience segments. Green = strong, Red = weak." /></h3><p className="text-[10px] text-[var(--text-muted)] mb-3">Click to identify which creatives work for which audiences</p><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-[var(--bg-surface)]"><th className="px-3 py-2 text-left text-[10px] font-medium text-[var(--text-muted)] uppercase sticky left-0 bg-[var(--bg-surface)] z-10">Audience</th>{audienceCreativeMatrix.creatives.map(c => <th key={c} className="px-3 py-2 text-center text-[10px] font-medium text-[var(--text-muted)] uppercase whitespace-nowrap">{c.length > 14 ? c.slice(0, 12) + "…" : c}</th>)}</tr></thead><tbody>{audienceCreativeMatrix.audiences.map((aud, ai) => <tr key={aud}><td className="px-3 py-2.5 text-left font-medium text-[var(--text-primary)] whitespace-nowrap sticky left-0 bg-[var(--bg-card-solid)] z-10">{aud}</td>{audienceCreativeMatrix.data[ai].map((roas, ci) => { const bg = roas >= 3.5 ? "rgba(52,211,153,0.25)" : roas >= 2.5 ? "rgba(67,169,223,0.2)" : roas >= 1.5 ? "rgba(251,191,36,0.15)" : "rgba(248,113,113,0.2)"; const tx = roas >= 3.5 ? "text-[var(--badge-positive-text)]" : roas >= 2.5 ? "text-[var(--accent-blue)]" : roas >= 1.5 ? "text-[#fbbf24]" : "text-[var(--badge-negative-text)]"; return <td key={ci} className={`px-3 py-2.5 text-center font-semibold ${tx}`} style={{ backgroundColor: bg }}>{roas.toFixed(1)}x</td>; })}</tr>)}</tbody></table></div></div>

      {/* Competitor placeholder */}
      <div className={`${CARD} border-dashed`}><div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-[var(--text-primary)]">Competitor Ad Library</h3><span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--toggle-bg)] text-[var(--text-muted)]">Coming Soon</span></div><p className="text-xs text-[var(--text-muted)]">Save and organize competitor ads into custom boards.</p><div className="grid grid-cols-4 gap-2 mt-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-lg bg-[var(--bg-surface)] border border-dashed border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] text-[10px]">+ Add</div>)}</div></div>

      {/* Floating compare bar */}
      {selectedForTest.length >= 2 && !showTestBuilder && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[var(--bg-card-solid)] border border-[var(--accent-blue)]/30 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-4">
          <span className="text-sm text-[var(--text-primary)]">{selectedForTest.length} selected</span>
          <button onClick={() => { setShowTestBuilder(true); const c1 = creatives.find(c => c.id === selectedForTest[0]); const c2 = creatives.find(c => c.id === selectedForTest[1]); setTestName(`${c1?.name || ""} vs ${c2?.name || ""}`); }} className="px-4 py-2 text-xs font-semibold text-white rounded-lg bg-gradient-to-r from-[#43a9df] to-[#8e68ad]">Compare & Test</button>
          <button onClick={() => setSelectedForTest([])} className="text-xs text-[var(--text-muted)]">Clear</button>
        </div>
      )}

      {/* Drawer */}
      {drawerCreative && <CreativeDrawer creative={drawerCreative} imageIndex={drawerImg} onClose={() => setDrawerCreative(null)} />}
    </div>
  );
}
