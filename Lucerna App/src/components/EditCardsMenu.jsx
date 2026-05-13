import { useEffect, useRef, useState } from "react";
import { OVERVIEW_CARD_CATALOG } from "../data/overviewCardCatalog";

export default function EditCardsMenu({
  cardOrder,
  onAdd,
  onRemove,
  editMode,
  onToggleEditMode,
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

  const shownSet = new Set(cardOrder);

  // Group catalog entries by their "group" field for nicer presentation
  const grouped = OVERVIEW_CARD_CATALOG.reduce((acc, card) => {
    (acc[card.group] = acc[card.group] || []).push(card);
    return acc;
  }, {});

  const handleToggleCard = (key) => {
    if (shownSet.has(key)) {
      // Don't let user remove the last card
      if (cardOrder.length <= 1) return;
      onRemove(key);
    } else {
      onAdd(key);
    }
  };

  const handleButtonClick = () => {
    if (!editMode) {
      onToggleEditMode(true);
      setOpen(true);
    } else {
      // Already in edit mode → toggle dropdown only
      setOpen((v) => !v);
    }
  };

  const handleDone = () => {
    setOpen(false);
    onToggleEditMode(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        {editMode && (
          <button
            type="button"
            onClick={handleDone}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--toggle-bg)] transition-colors"
          >
            Done
          </button>
        )}
        <button
          type="button"
          onClick={handleButtonClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            editMode || open
              ? "bg-[var(--toggle-active-bg)] border-[var(--toggle-active-border)] text-[var(--accent-blue)]"
              : "bg-[var(--toggle-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
          }`}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-45" : ""}`}
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M7 1.5v11M1.5 7h11" />
          </svg>
          <span>Edit</span>
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl shadow-2xl overflow-hidden animate-[fadeIn_140ms_ease-out]"
          style={{
            animation: "editMenuIn 160ms ease-out",
          }}
        >
          <div className="px-3 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-primary)] tracking-wide uppercase">
              Customize Cards
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {cardOrder.length} / {OVERVIEW_CARD_CATALOG.length}
            </span>
          </div>

          <div className="max-h-[360px] overflow-y-auto py-1">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="py-1">
                <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  {group}
                </div>
                {items.map((card) => {
                  const checked = shownSet.has(card.key);
                  const disabled = checked && cardOrder.length <= 1;
                  return (
                    <button
                      key={card.key}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleToggleCard(card.key)}
                      className={`group/item w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors ${
                        disabled
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-[var(--bg-card-hover)]"
                      }`}
                    >
                      <span
                        className={`${
                          checked
                            ? "text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {card.title}
                      </span>
                      <span
                        className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          checked
                            ? "bg-[var(--accent-blue)] border-[var(--accent-blue)]"
                            : "border-[var(--border-hover)] bg-transparent group-hover/item:border-[var(--text-muted)]"
                        }`}
                      >
                        {checked && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="px-3 py-2 border-t border-[var(--border-color)] text-[10px] text-[var(--text-muted)]">
            Drag cards to reorder
          </div>
        </div>
      )}

      <style>{`
        @keyframes editMenuIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
