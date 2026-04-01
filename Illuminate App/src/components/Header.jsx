import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { subDays, format } from "date-fns";
import { useTheme } from "../context/ThemeContext";
import { TODAY, getCompareRange } from "../data/mockData";
import DateRangePicker from "./DateRangePicker";

const PAGE_NAMES = {
  "/": "Overview",
  "/channels": "Channels",
  "/customers": "Customers",
  "/products": "Products",
  "/efficiency": "Efficiency",
  "/incrementality": "Incrementality",
  "/mmm": "Media Mix",
  "/creative": "Creative",
  "/cohorts": "Cohorts",
  "/tracking": "Tracking",
  "/forecasting": "Forecasting",
  "/geo": "Geo",
  "/profitability": "Profitability",
  "/inventory": "Inventory",
  "/subscriptions": "Subscriptions",
  "/competitive": "Competitive",
  "/alerts": "Alerts",
  "/reports": "Executive Report",
  "/journeys": "Journeys",
  "/ai-insights": "AI Insights",
  "/integrations": "Integrations",
  "/transactions": "Transactions",
  "/settings": "Settings",
};

const PRESETS = [
  { days: 7, label: "7D", key: "7d" },
  { days: 30, label: "30D", key: "30d" },
  { days: 90, label: "90D", key: "90d" },
];

const COMPARE_MODES = [
  { key: "previous", label: "Prior" },
  { key: "yoy", label: "YOY" },
  { key: "custom", label: "Custom" },
];

export default function Header({
  dateRange,
  onDateRangeChange,
  compare,
  onCompareChange,
  onToggleSidebar,
}) {
  const { theme, toggleTheme } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const location = useLocation();
  const pageName = PAGE_NAMES[location.pathname] || "Dashboard";

  const handlePreset = (preset) => {
    const newRange = {
      start: subDays(TODAY, preset.days - 1),
      end: TODAY,
      preset: preset.key,
    };
    onDateRangeChange(newRange);
    // Recompute compare dates if compare is on and not custom
    if (compare.enabled && compare.mode !== "custom") {
      const cr = getCompareRange(newRange.start, newRange.end, compare.mode);
      if (cr) onCompareChange({ ...compare, start: cr.start, end: cr.end });
    }
  };

  const handleToggleCompare = () => {
    if (compare.enabled) {
      onCompareChange({ enabled: false, mode: compare.mode, start: null, end: null });
    } else {
      const mode = compare.mode || "previous";
      const cr = getCompareRange(dateRange.start, dateRange.end, mode);
      onCompareChange({ enabled: true, mode, start: cr?.start || null, end: cr?.end || null });
    }
  };

  const handleModeSwitch = (mode) => {
    if (mode === "custom") {
      // Open the picker so user can select custom compare dates
      onCompareChange({ ...compare, mode: "custom" });
      setPickerOpen(true);
    } else {
      const cr = getCompareRange(dateRange.start, dateRange.end, mode);
      onCompareChange({ enabled: true, mode, start: cr?.start || null, end: cr?.end || null });
    }
  };

  const rangeLabel =
    dateRange.preset !== "custom"
      ? null
      : `${format(dateRange.start, "MMM d")} – ${format(dateRange.end, "MMM d")}`;

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-[var(--bg-nav)] backdrop-blur-xl border-b border-[var(--border-color)] sm:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--border-color)] md:hidden"
            aria-label="Open sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 5h14a1 1 0 100-2H3a1 1 0 000 2zm0 6h14a1 1 0 100-2H3a1 1 0 000 2zm0 6h14a1 1 0 100-2H3a1 1 0 000 2z" />
            </svg>
          </button>
          <nav className="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <Link to="/" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors font-medium">
              Illuminate
            </Link>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[var(--text-muted)]/40 flex-shrink-0">
              <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[var(--text-primary)] font-semibold">{pageName}</span>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Compare toggle (standalone) */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={handleToggleCompare}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
                compare.enabled
                  ? "bg-[#8e68ad]"
                  : "bg-[var(--toggle-bg)] border border-[var(--border-color)]"
              }`}
              aria-label="Toggle comparison"
            >
              <span
                className={`absolute top-[3px] left-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  compare.enabled ? "translate-x-[16px]" : "translate-x-0"
                }`}
              />
            </button>

            {/* Compare mode pill (only when enabled) */}
            {compare.enabled && (
              <div className="flex items-center bg-[#8e68ad]/10 rounded-lg p-0.5 border border-[#8e68ad]/15">
                {COMPARE_MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => handleModeSwitch(m.key)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      compare.mode === m.key
                        ? "bg-[#8e68ad] text-white shadow-sm"
                        : "text-[#8e68ad]/70 hover:text-[#8e68ad]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date range presets + calendar */}
          <div className="relative flex items-center bg-[var(--toggle-bg)] rounded-lg p-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePreset(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  dateRange.preset === p.key
                    ? "bg-[var(--toggle-active-bg)] text-[var(--accent-blue)] border border-[var(--toggle-active-border)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {p.label}
              </button>
            ))}

            <button
              onClick={() => setPickerOpen(!pickerOpen)}
              className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                dateRange.preset === "custom" || pickerOpen
                  ? "bg-[var(--toggle-active-bg)] text-[var(--accent-blue)] border border-[var(--toggle-active-border)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="2" width="12" height="11" rx="2" />
                <path d="M1 5.5h12M4 1v2M10 1v2" />
              </svg>
              {rangeLabel && (
                <span className="text-xs font-medium hidden lg:inline">{rangeLabel}</span>
              )}
            </button>

            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={onDateRangeChange}
              compare={compare}
              onCompareChange={onCompareChange}
              isOpen={pickerOpen}
              onClose={() => setPickerOpen(false)}
            />
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 1.78a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM17 10a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm-2.78 4.22a1 1 0 010 1.414l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 011.414-1.414zM10 17a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.22-2.78a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM3 10a1 1 0 01-1 1H1a1 1 0 110-2h1a1 1 0 011 1zm.78-4.22a1 1 0 010-1.414L3.073 3.66a1 1 0 111.414-1.414l.707.707A1 1 0 013.78 5.78zM10 7a3 3 0 100 6 3 3 0 000-6z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* Notification bell */}
          <button
            className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors"
            aria-label="Notifications"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[var(--bg-primary)]" />
          </button>
        </div>
      </header>
    </>
  );
}
