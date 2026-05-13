import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import KPICard from "./KPICard";

export default function SortableKPICard({
  cardKey,
  title,
  value,
  change,
  index,
  active,
  onClick,
  onDrillDown,
  subtitle,
  compareEnabled,
  priorValue,
  editMode,
  onRemove,
  anomaly,
  children,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cardKey, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragProps = editMode ? { ...attributes, ...listeners } : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      className={`group relative h-full ${editMode ? "cursor-grab active:cursor-grabbing" : ""} ${
        isDragging ? "opacity-30" : "opacity-100"
      } transition-opacity`}
    >
      {/* Drag handle hint (top-left) — only in edit mode */}
      {editMode && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-2 left-2 z-10 flex flex-col gap-[2px] opacity-40 group-hover:opacity-90 transition-opacity"
        >
          <div className="flex gap-[2px]">
            <span className="w-[3px] h-[3px] rounded-full bg-[var(--text-muted)]" />
            <span className="w-[3px] h-[3px] rounded-full bg-[var(--text-muted)]" />
          </div>
          <div className="flex gap-[2px]">
            <span className="w-[3px] h-[3px] rounded-full bg-[var(--text-muted)]" />
            <span className="w-[3px] h-[3px] rounded-full bg-[var(--text-muted)]" />
          </div>
          <div className="flex gap-[2px]">
            <span className="w-[3px] h-[3px] rounded-full bg-[var(--text-muted)]" />
            <span className="w-[3px] h-[3px] rounded-full bg-[var(--text-muted)]" />
          </div>
        </div>
      )}

      {/* Remove button (top-right) — only in edit mode */}
      {editMode && onRemove && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(cardKey);
          }}
          className="absolute -top-2 -right-2 z-20 w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border-hover)] text-[var(--text-secondary)] hover:bg-[var(--error)] hover:text-white hover:border-[var(--error)] flex items-center justify-center text-sm leading-none transition-colors shadow-md"
          aria-label={`Remove ${title}`}
          title={`Remove ${title}`}
        >
          ×
        </button>
      )}

      {/* The actual card. Disable click-to-select-metric while in edit mode. */}
      <KPICard
        title={title}
        value={value}
        change={change}
        index={index}
        active={!editMode && active}
        onClick={editMode ? null : onClick}
        subtitle={subtitle}
        compareEnabled={compareEnabled}
        priorValue={priorValue}
        anomaly={editMode ? null : anomaly}
      >
        {children}
        {!editMode && onDrillDown && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDrillDown(cardKey);
            }}
            aria-label={`Drill into ${title}`}
            title="Drill into channels"
            className="ml-1 w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-muted)] opacity-50 hover:opacity-100 hover:text-[var(--accent-blue)] hover:bg-[var(--bg-surface)] transition-all"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 9l5-5M10 4H6.5M10 4v3.5" />
              <rect x="2" y="2" width="10" height="10" rx="2" opacity="0.4" />
            </svg>
          </button>
        )}
      </KPICard>

      {/* Edit-mode dashed overlay so cards read as "movable" */}
      {editMode && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl border border-dashed border-[var(--border-hover)]"
        />
      )}
    </div>
  );
}
