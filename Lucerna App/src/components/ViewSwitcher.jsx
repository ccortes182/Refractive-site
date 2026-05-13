import { useEffect, useRef, useState } from "react";
import { PRESET_VIEWS as OVERVIEW_PRESET_VIEWS } from "../data/overviewViews";

export default function ViewSwitcher({
  activeView,
  customViews,
  onSwitch,
  onCreateNew,
  onRename,
  onDelete,
  presets = OVERVIEW_PRESET_VIEWS,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleSelect = (id) => {
    onSwitch(id);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
          open
            ? "bg-[var(--toggle-active-bg)] border-[var(--toggle-active-border)] text-[var(--accent-blue)]"
            : "bg-[var(--toggle-bg)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--border-hover)]"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Switch view"
      >
        {activeView.isPreset && <StarIcon className="text-[var(--accent-violet)]" />}
        <span className="max-w-[180px] truncate">{activeView.name}</span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-72 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl shadow-2xl overflow-hidden"
          style={{ animation: "viewMenuIn 160ms ease-out" }}
        >
          <div className="px-3 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-primary)] tracking-wide uppercase">
              Switch View
            </span>
          </div>

          {/* Presets */}
          <div className="py-1">
            <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Presets
            </div>
            {presets.map((preset) => {
              const isActive = activeView.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelect(preset.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--bg-card-hover)] ${
                    isActive ? "text-[var(--accent-blue)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <StarIcon className="text-[var(--accent-violet)]" />
                    {preset.name}
                  </span>
                  {isActive && <CheckIcon />}
                </button>
              );
            })}
          </div>

          {/* Custom views */}
          {customViews.length > 0 && (
            <div className="py-1 border-t border-[var(--border-color)]">
              <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                My Views
              </div>
              {customViews.map((view) => {
                const isActive = activeView.id === view.id;
                return (
                  <div
                    key={view.id}
                    className={`group/row flex items-center transition-colors hover:bg-[var(--bg-card-hover)] ${
                      isActive ? "text-[var(--accent-blue)]" : "text-[var(--text-primary)]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(view.id)}
                      className="flex-1 flex items-center justify-between gap-2 px-3 py-2 text-sm text-left min-w-0"
                    >
                      <span className="truncate">{view.name}</span>
                      {isActive && <CheckIcon />}
                    </button>
                    <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRename(view.id);
                        }}
                        title="Rename"
                        aria-label={`Rename ${view.name}`}
                        className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(view.id);
                        }}
                        title="Delete"
                        aria-label={`Delete ${view.name}`}
                        className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--bg-surface)]"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save current as new view */}
          <div className="border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCreateNew();
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--accent-blue)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <span className="text-base leading-none">+</span>
              <span>Save current as new view</span>
            </button>
          </div>

          <div className="px-3 py-2 border-t border-[var(--border-color)] text-[10px] text-[var(--text-muted)]">
            Editing a preset auto-creates a copy
          </div>
        </div>
      )}

      <style>{`
        @keyframes viewMenuIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function StarIcon({ className = "" }) {
  return (
    <svg className={`w-3 h-3 ${className}`} viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 1l1.7 3.4 3.8.5-2.7 2.6.6 3.7L6 9.5 2.6 11.2l.6-3.7L.5 4.9l3.8-.5z" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2l3 3-7 7H2v-3z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4h9M5 4V2.5h4V4M3.5 4v8h7V4" />
    </svg>
  );
}
