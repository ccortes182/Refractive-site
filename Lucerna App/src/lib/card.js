// Shared card container classes. Every dashboard card uses this exact
// treatment; import instead of copy-pasting the class string.

export const CARD_BASE =
  "bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)]";

export const CARD = `${CARD_BASE} p-6`;
export const CARD_SM = `${CARD_BASE} p-5`;
