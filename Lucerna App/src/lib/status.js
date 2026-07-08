// Semantic status colors. One color language for pills, dots, and text accents
// across every page — always sourced from the theme tokens in index.css.

export const STATUS_STYLES = {
  positive: {
    pill: "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)] border border-[var(--success)]/20",
    dot: "bg-[var(--success)]",
    text: "text-[var(--success)]",
  },
  negative: {
    pill: "bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)] border border-[var(--error)]/20",
    dot: "bg-[var(--error)]",
    text: "text-[var(--error)]",
  },
  warning: {
    pill: "bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/25",
    dot: "bg-[var(--warning)]",
    text: "text-[var(--warning)]",
  },
  info: {
    pill: "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20",
    dot: "bg-[var(--accent-blue)]",
    text: "text-[var(--accent-blue)]",
  },
  neutral: {
    pill: "bg-[var(--toggle-bg)] text-[var(--text-secondary)] border border-[var(--border-color)]",
    dot: "bg-[var(--text-muted)]",
    text: "text-[var(--text-muted)]",
  },
};

// Map common domain statuses to semantic states so pages don't invent their own.
export const STATUS_BY_LABEL = {
  // Alerts / severity
  Critical: "negative",
  Warning: "warning",
  Info: "info",
  // Inventory
  Low: "warning",
  Healthy: "positive",
  Overstock: "info",
  // Tracking / integrations
  Good: "positive",
  Connected: "positive",
  Disconnected: "negative",
  Syncing: "info",
};

export function statusStyle(label) {
  return STATUS_STYLES[STATUS_BY_LABEL[label] || label] || STATUS_STYLES.neutral;
}
