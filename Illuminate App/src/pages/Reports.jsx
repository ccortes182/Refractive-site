import { useMemo, useState, useCallback } from "react";
import { getReportSummary } from "../data/mockData";
import { useTheme } from "../context/ThemeContext";
import { format } from "date-fns";
import ExportCSV from "../components/ExportCSV";

const card = "bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6";

const SECTIONS = ["Revenue", "Efficiency", "Creative", "Margin", "Pacing"];

const sectionMetrics = {
  Revenue: ["revenue", "orders"],
  Efficiency: ["mer", "cac"],
  Creative: [],
  Margin: ["cm", "cmPct"],
  Pacing: ["pacingPct", "trackingScore"],
};

export default function Reports({ dateRange, compare }) {
  const { theme } = useTheme();

  const report = useMemo(
    () => getReportSummary(dateRange.start, dateRange.end),
    [dateRange.start, dateRange.end]
  );

  const [visibleSections, setVisibleSections] = useState(
    () => new Set(SECTIONS)
  );
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("illuminate-report-notes") || "" : "")
  );

  const toggleSection = (section) => {
    setVisibleSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNotesBlur = useCallback((e) => {
    localStorage.setItem("illuminate-report-notes", e.target.value);
  }, []);

  const allMetrics = [
    { key: "revenue", label: "Revenue", value: `$${report.revenue.toLocaleString()}`, section: "Revenue" },
    { key: "orders", label: "Orders", value: report.orders.toLocaleString(), section: "Revenue" },
    { key: "mer", label: "MER", value: `${report.mer}x`, section: "Efficiency" },
    { key: "cac", label: "CAC", value: `$${report.cac}`, section: "Efficiency" },
    { key: "cm", label: "CM", value: `$${report.cm.toLocaleString()}`, section: "Margin" },
    { key: "cmPct", label: "CM%", value: `${report.cmPct}%`, section: "Margin" },
    { key: "pacingPct", label: "Pacing", value: `${report.pacingPct}%`, section: "Pacing" },
    { key: "trackingScore", label: "Tracking Score", value: `${report.trackingScore}/100`, section: "Pacing" },
  ];

  const visibleMetrics = allMetrics.filter((m) => visibleSections.has(m.section));

  const periodText =
    dateRange.start && dateRange.end
      ? `${format(new Date(dateRange.start), "MMM d, yyyy")} — ${format(new Date(dateRange.end), "MMM d, yyyy")}`
      : "";

  return (
    <div className="space-y-6">
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
          nav, header, aside, [data-sidebar] { display: none !important; }
          main { width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Executive Report</h1>
          {periodText && (
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{periodText}</p>
          )}
        </div>
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
              text-[var(--text-muted)] hover:text-[var(--text-secondary)]
              bg-[var(--toggle-bg)] hover:bg-[var(--border-hover)]
              border border-transparent hover:border-[var(--border-color)]
              transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Export PDF
          </button>
          <div className="relative">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                bg-[var(--toggle-bg)] hover:bg-[var(--border-hover)]
                border border-transparent hover:border-[var(--border-color)]
                transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
              Copy Link
            </button>
            {copied && (
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 text-[10px] font-medium rounded bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">
                Link copied!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metric Selector */}
      <div className="no-print flex flex-wrap items-center gap-4">
        {SECTIONS.map((section) => (
          <label key={section} className="inline-flex items-center gap-1.5 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={visibleSections.has(section)}
              onChange={() => toggleSection(section)}
              className="rounded border-[var(--border-color)] accent-[var(--accent)]"
            />
            <span className="text-[var(--text-secondary)]">{section}</span>
          </label>
        ))}
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {visibleMetrics.map((m) => (
          <div key={m.key} className={card}>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
              {m.label}
            </p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Key Highlights */}
      <div className={card}>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Key Highlights</h2>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            Top performing channel: <strong className="text-[var(--text-primary)]">{report.topChannel}</strong> — ${report.topChannelRevenue.toLocaleString()}
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
            Top creative: <strong className="text-[var(--text-primary)]">{report.topCreative}</strong> — {report.topCreativeRoas}x ROAS
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
            Active alerts: <strong className="text-[var(--text-primary)]">{report.activeAlerts}</strong>
          </li>
        </ul>
      </div>

      {/* Commentary */}
      <div className={`${card} no-print`}>
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
          Analyst Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          rows={5}
          placeholder="Add commentary or notes for the report..."
          className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-3 w-full text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-y focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
      </div>
    </div>
  );
}
