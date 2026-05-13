import { useEffect, useRef, useState } from "react";

// Compact inline goal editor that lives in the chart card header.
// Shows: "Set goal" button → click → inline number input + Save/Clear/Cancel.
// When a goal exists, displays "Goal: <formatted>" with an Edit button.

export default function GoalEditor({
  metricKey,
  metricLabel,
  metricFmt,
  currentGoal,
  formatValue,
  onSave,
  onClear,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Reset draft whenever metric or goal changes from outside
  useEffect(() => {
    setEditing(false);
  }, [metricKey]);

  const startEditing = () => {
    setDraft(currentGoal != null ? String(currentGoal) : "");
    setEditing(true);
  };

  const handleSave = () => {
    const n = Number(draft);
    if (!Number.isFinite(n)) {
      setEditing(false);
      return;
    }
    onSave(n);
    setEditing(false);
  };

  const handleClear = () => {
    onClear();
    setEditing(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
  };

  const inputHint =
    metricFmt === "dollar" ? "raw $, e.g. 400000"
      : metricFmt === "dollarC" ? "raw $, e.g. 105.50"
      : metricFmt === "percent" ? "raw %, e.g. 35"
      : metricFmt === "merX" ? "raw multiple, e.g. 4.5"
      : metricFmt === "orders" ? "raw orders, e.g. 1.5"
      : "raw number";

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="number"
          step="any"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder={inputHint}
          aria-label={`Goal for ${metricLabel}`}
          className="w-32 text-xs px-2 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-hover)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
        />
        <button
          type="button"
          onClick={handleSave}
          className="px-2 py-1 text-xs font-medium rounded-md bg-[var(--accent-blue)] text-white hover:opacity-90 transition-opacity"
        >
          Save
        </button>
        {currentGoal != null && (
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-1 text-xs font-medium rounded-md text-[var(--error)] hover:bg-[var(--bg-surface)] transition-colors"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label="Cancel"
          className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
        >
          ×
        </button>
      </div>
    );
  }

  if (currentGoal != null) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
        title="Edit goal"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-violet)]" />
        <span>Goal: {formatValue(currentGoal, metricFmt)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
      title={`Set a goal for ${metricLabel}`}
    >
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="6" cy="6" r="4.5" />
        <circle cx="6" cy="6" r="2" />
        <circle cx="6" cy="6" r="0.5" fill="currentColor" />
      </svg>
      <span>Set goal</span>
    </button>
  );
}
