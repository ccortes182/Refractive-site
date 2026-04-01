import { useState, useMemo, useEffect } from "react";
import {
  format,
  subDays,
  subYears,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  differenceInCalendarDays,
  isBefore,
} from "date-fns";

const TODAY = new Date(2026, 2, 30);

const PRESETS = [
  { label: "Last 7 days", days: 7, key: "7d" },
  { label: "Last 30 days", days: 30, key: "30d" },
  { label: "Last 90 days", days: 90, key: "90d" },
];

const COMPARE_MODES = [
  { label: "Previous Period", key: "previous" },
  { label: "Year over Year", key: "yoy" },
  { label: "Custom Range", key: "custom" },
];

function inRange(day, start, end) {
  if (!start || !end) return false;
  const s = isBefore(start, end) ? start : end;
  const e = isBefore(start, end) ? end : start;
  return isWithinInterval(day, { start: s, end: e });
}

// ── Single month calendar ──────────────────────────────────────────────────
function Calendar({ month, primary, compare, onDayClick, editingCompare }) {
  const weeks = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const last = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: first, end: last });
    const rows = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [month]);

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="h-7 flex items-center justify-center text-[10px] font-semibold text-[var(--text-muted)] uppercase">
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day) => {
            const outside = !isSameMonth(day, month);
            const isToday = isSameDay(day, TODAY);

            // Primary range (blue)
            const pStart = primary.start && isSameDay(day, primary.start);
            const pEnd = primary.end && isSameDay(day, primary.end);
            const pIn = inRange(day, primary.start, primary.end) && !pStart && !pEnd;

            // Compare range (purple)
            const cStart = compare?.start && isSameDay(day, compare.start);
            const cEnd = compare?.end && isSameDay(day, compare.end);
            const cIn = compare?.start && compare?.end && inRange(day, compare.start, compare.end) && !cStart && !cEnd;

            const isEndpoint = pStart || pEnd || cStart || cEnd;

            let bg = "";
            let text = outside ? "text-[var(--text-muted)]/30" : "text-[var(--text-secondary)]";
            let font = "";

            if (pStart || pEnd) {
              bg = "bg-[#43a9df]";
              text = "text-white";
              font = "font-semibold";
            } else if (cStart || cEnd) {
              bg = "bg-[#8e68ad]";
              text = "text-white";
              font = "font-semibold";
            } else if (pIn && cIn) {
              bg = "bg-gradient-to-r from-[#43a9df]/15 to-[#8e68ad]/15";
              text = "text-[var(--text-primary)]";
            } else if (pIn) {
              bg = "bg-[#43a9df]/10";
              text = "text-[#43a9df]";
            } else if (cIn) {
              bg = "bg-[#8e68ad]/10";
              text = "text-[#8e68ad]";
            }

            return (
              <button
                key={day.toISOString()}
                onClick={() => !outside && onDayClick(day)}
                disabled={outside}
                className={`h-8 w-8 flex items-center justify-center text-xs relative rounded transition-colors
                  ${outside ? "pointer-events-none opacity-20" : "cursor-pointer hover:bg-[var(--border-hover)]"}
                  ${bg} ${text} ${font}
                  ${isEndpoint ? "rounded-md" : "rounded-sm"}
                `}
              >
                {format(day, "d")}
                {isToday && !isEndpoint && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent-blue)]" />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Toggle switch ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
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
  );
}

// ── Main dropdown ──────────────────────────────────────────────────────────
export default function DateRangePicker({
  dateRange,
  onDateRangeChange,
  compare,
  onCompareChange,
  isOpen,
  onClose,
}) {
  const [tempStart, setTempStart] = useState(dateRange.start);
  const [tempEnd, setTempEnd] = useState(dateRange.end);
  const [activePreset, setActivePreset] = useState(dateRange.preset || "30d");
  const [picking, setPicking] = useState("start"); // 'start' | 'end'

  const [month, setMonth] = useState(startOfMonth(dateRange.end));

  const [cmpEnabled, setCmpEnabled] = useState(compare.enabled);
  const [cmpMode, setCmpMode] = useState(compare.mode || "previous");
  const [cmpStart, setCmpStart] = useState(compare.start);
  const [cmpEnd, setCmpEnd] = useState(compare.end);
  const [cmpPicking, setCmpPicking] = useState("start");

  // Which range the calendar edits: 'primary' or 'compare'
  const [editTarget, setEditTarget] = useState("primary");

  useEffect(() => {
    if (isOpen) {
      setTempStart(dateRange.start);
      setTempEnd(dateRange.end);
      setActivePreset(dateRange.preset || "custom");
      setMonth(startOfMonth(dateRange.end));
      setCmpEnabled(compare.enabled);
      setCmpMode(compare.mode || "previous");
      setCmpStart(compare.start);
      setCmpEnd(compare.end);
      setPicking("start");
      setCmpPicking("start");
      setEditTarget("primary");
    }
  }, [isOpen]);

  // Auto-compute compare range for non-custom modes
  const autoCompareRange = useMemo(() => {
    if (!cmpEnabled) return null;
    const days = differenceInCalendarDays(tempEnd, tempStart);
    if (cmpMode === "previous") return { start: subDays(tempStart, days + 1), end: subDays(tempStart, 1) };
    if (cmpMode === "yoy") return { start: subYears(tempStart, 1), end: subYears(tempEnd, 1) };
    if (cmpMode === "custom") return cmpStart && cmpEnd ? { start: cmpStart, end: cmpEnd } : null;
    return null;
  }, [cmpEnabled, cmpMode, tempStart, tempEnd, cmpStart, cmpEnd]);

  const handlePreset = (p) => {
    setActivePreset(p.key);
    setTempStart(subDays(TODAY, p.days - 1));
    setTempEnd(TODAY);
    setPicking("start");
    setEditTarget("primary");
    setMonth(startOfMonth(TODAY));
  };

  const handleDayClick = (day) => {
    if (editTarget === "primary") {
      if (picking === "start") {
        setTempStart(day);
        setTempEnd(day);
        setPicking("end");
        setActivePreset("custom");
      } else {
        if (isBefore(day, tempStart)) { setTempEnd(tempStart); setTempStart(day); }
        else setTempEnd(day);
        setPicking("start");
        setActivePreset("custom");
      }
    } else {
      // Editing compare range
      if (cmpPicking === "start") {
        setCmpStart(day);
        setCmpEnd(day);
        setCmpPicking("end");
      } else {
        if (isBefore(day, cmpStart)) { setCmpEnd(cmpStart); setCmpStart(day); }
        else setCmpEnd(day);
        setCmpPicking("start");
      }
    }
  };

  const handleApply = () => {
    onDateRangeChange({ start: tempStart, end: tempEnd, preset: activePreset });
    onCompareChange({
      enabled: cmpEnabled,
      mode: cmpMode,
      start: autoCompareRange?.start || null,
      end: autoCompareRange?.end || null,
    });
    onClose();
  };

  if (!isOpen) return null;

  const dayCount = differenceInCalendarDays(tempEnd, tempStart) + 1;
  const compareForCalendar = cmpEnabled && autoCompareRange ? autoCompareRange : null;

  return (
    <>
      {/* Click-away layer */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 z-50 bg-[var(--bg-card-solid)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden"
        style={{ width: 460 }}
      >
        <div className="flex">
          {/* ── Left panel ── */}
          <div className="w-[172px] border-r border-[var(--border-color)] p-3 flex-shrink-0">
            <div className="space-y-0.5">
              {PRESETS.map((p) => {
                const s = subDays(TODAY, p.days - 1);
                return (
                  <button key={p.key} onClick={() => handlePreset(p)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                      activePreset === p.key
                        ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--border-color)]"
                    }`}>
                    <span className="text-[13px] font-medium block">{p.label}</span>
                    <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                      {format(s, "MMM d")} – {format(TODAY, "MMM d, yyyy")}
                    </span>
                  </button>
                );
              })}
              <button onClick={() => { setActivePreset("custom"); setEditTarget("primary"); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                  activePreset === "custom"
                    ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--border-color)]"
                }`}>
                <span className="text-[13px] font-medium">Custom range</span>
              </button>
            </div>

            {/* Compare */}
            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Compare</span>
                <Toggle checked={cmpEnabled} onChange={() => {
                  setCmpEnabled(!cmpEnabled);
                  if (!cmpEnabled) setEditTarget("primary");
                }} />
              </div>
              {cmpEnabled && (
                <div className="space-y-0.5">
                  {COMPARE_MODES.map((m) => (
                    <button key={m.key}
                      onClick={() => {
                        setCmpMode(m.key);
                        if (m.key === "custom") {
                          setEditTarget("compare");
                          setCmpPicking("start");
                        } else {
                          setEditTarget("primary");
                        }
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors flex items-center gap-2 ${
                        cmpMode === m.key ? "text-[#8e68ad] font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--border-color)]"
                      }`}>
                      <span className={`w-2.5 h-2.5 rounded-full border-[1.5px] flex-shrink-0 ${
                        cmpMode === m.key ? "border-[#8e68ad] bg-[#8e68ad]" : "border-[var(--text-muted)]"
                      }`} />
                      {m.label}
                    </button>
                  ))}
                  {autoCompareRange && (
                    <p className="px-2.5 text-[10px] text-[#8e68ad]/60 mt-1">
                      {format(autoCompareRange.start, "MMM d")} – {format(autoCompareRange.end, "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: calendar ── */}
          <div className="flex-1 p-3">
            {/* Editing indicator */}
            {cmpEnabled && cmpMode === "custom" && (
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => { setEditTarget("primary"); setPicking("start"); }}
                  className={`flex-1 text-center py-1 rounded text-[11px] font-medium transition-colors ${
                    editTarget === "primary"
                      ? "bg-[#43a9df]/15 text-[#43a9df] border border-[#43a9df]/30"
                      : "text-[var(--text-muted)] hover:bg-[var(--border-color)]"
                  }`}>
                  Primary Range
                </button>
                <button
                  onClick={() => { setEditTarget("compare"); setCmpPicking("start"); }}
                  className={`flex-1 text-center py-1 rounded text-[11px] font-medium transition-colors ${
                    editTarget === "compare"
                      ? "bg-[#8e68ad]/15 text-[#8e68ad] border border-[#8e68ad]/30"
                      : "text-[var(--text-muted)] hover:bg-[var(--border-color)]"
                  }`}>
                  Compare Range
                </button>
              </div>
            )}

            {/* Month nav */}
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setMonth(subMonths(month, 1))}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4l-4 4 4 4" /></svg>
              </button>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{format(month, "MMMM yyyy")}</span>
              <button onClick={() => setMonth(addMonths(month, 1))}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l4 4-4 4" /></svg>
              </button>
            </div>

            <Calendar
              month={month}
              primary={{ start: tempStart, end: tempEnd }}
              compare={compareForCalendar}
              onDayClick={handleDayClick}
              editingCompare={editTarget === "compare"}
            />

            {/* Selected range summary */}
            <div className="mt-3 pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
              <div className="text-[11px]">
                <span className="inline-flex items-center gap-1 text-[#43a9df]">
                  <span className="w-2 h-2 rounded-sm bg-[#43a9df]" />
                  {format(tempStart, "MMM d")} – {format(tempEnd, "MMM d")}
                </span>
                <span className="text-[var(--text-muted)] ml-1">({dayCount}d)</span>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded-md transition-colors">
                  Cancel
                </button>
                <button onClick={handleApply}
                  className="px-4 py-1.5 text-xs font-semibold text-white rounded-md bg-gradient-to-r from-[#43a9df] to-[#8e68ad] hover:opacity-90 transition-opacity">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
