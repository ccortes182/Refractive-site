// Curated catalog of ad networks available under each parent channel.
// Operators add networks they actually use; nothing is shown by default.
//
// Library entries that match CHANNEL_CONFIG.platforms (Google, Microsoft, Meta,
// TikTok, Snap, Reddit, CTV, AppLovin) carry their `weight` and `types` schema
// — used by the resolver and the chevron type-row generator at render time.

export const NETWORK_LIBRARY = [
  // ── Paid Search ─────────────────────────────────────────────────────
  { name: "Google",            parent: "Paid Search", weight: 0.80,
    types: ["Search", "Shopping", "PMax", "Display", "YouTube"], suggestedMonthly: 60000 },
  { name: "Microsoft",         parent: "Paid Search", weight: 0.20,
    types: ["Search", "Shopping", "PMax", "Display"], suggestedMonthly: 15000 },
  { name: "Apple Search Ads",  parent: "Paid Search", suggestedMonthly: 4000 },
  { name: "Amazon Ads",        parent: "Paid Search", suggestedMonthly: 8000 },
  { name: "Yahoo Search",      parent: "Paid Search", suggestedMonthly: 1500 },
  { name: "Yandex",            parent: "Paid Search", suggestedMonthly: 1500 },

  // ── Paid Social ─────────────────────────────────────────────────────
  { name: "Meta",              parent: "Paid Social", weight: 0.65, suggestedMonthly: 39000 },
  { name: "TikTok",            parent: "Paid Social", weight: 0.20, suggestedMonthly: 12000 },
  { name: "Snap",              parent: "Paid Social", weight: 0.10, suggestedMonthly: 6000 },
  { name: "Reddit",            parent: "Paid Social", weight: 0.05, suggestedMonthly: 3000 },
  { name: "Pinterest",         parent: "Paid Social", suggestedMonthly: 5000 },
  { name: "X / Twitter Ads",   parent: "Paid Social", suggestedMonthly: 4000 },
  { name: "LinkedIn",          parent: "Paid Social", suggestedMonthly: 6000 },
  { name: "Threads",           parent: "Paid Social", suggestedMonthly: 3000 },
  { name: "Quora",             parent: "Paid Social", suggestedMonthly: 2000 },
  { name: "Bluesky",           parent: "Paid Social", suggestedMonthly: 1500 },

  // ── Other Paid (CTV / Programmatic / Audio / In-app) ────────────────
  { name: "CTV (Roku/Hulu)",   parent: "Other Paid",  weight: 0.60, suggestedMonthly: 9000 },
  { name: "AppLovin",          parent: "Other Paid",  weight: 0.40, suggestedMonthly: 6000 },
  { name: "Pluto TV",          parent: "Other Paid",  suggestedMonthly: 3000 },
  { name: "Samsung Ads",       parent: "Other Paid",  suggestedMonthly: 2500 },
  { name: "Disney+ / Hulu DSP", parent: "Other Paid", suggestedMonthly: 4000 },
  { name: "DV360",             parent: "Other Paid",  suggestedMonthly: 6000 },
  { name: "The Trade Desk",    parent: "Other Paid",  suggestedMonthly: 6000 },
  { name: "ironSource",        parent: "Other Paid",  suggestedMonthly: 4000 },
  { name: "Vungle / Liftoff",  parent: "Other Paid",  suggestedMonthly: 3000 },
  { name: "Unity Ads",         parent: "Other Paid",  suggestedMonthly: 3000 },
  { name: "Spotify",           parent: "Other Paid",  suggestedMonthly: 2000 },
  { name: "Pandora",           parent: "Other Paid",  suggestedMonthly: 1500 },
  { name: "Outbrain",          parent: "Other Paid",  suggestedMonthly: 2000 },
  { name: "Taboola",           parent: "Other Paid",  suggestedMonthly: 2000 },
  { name: "Nextdoor",          parent: "Other Paid",  suggestedMonthly: 1500 },
];

/** Channels that accept user-added networks. */
export const NETWORK_PARENT_CHANNELS = ["Paid Search", "Paid Social", "Other Paid"];

/** Networks suggested for a specific parent channel (filtered library). */
export function librarySuggestionsFor(parent) {
  return NETWORK_LIBRARY.filter((n) => n.parent === parent);
}

/** Look up a library entry by (parent, name). Returns undefined if not found. */
export function findLibraryEntry(parent, name) {
  return NETWORK_LIBRARY.find((n) => n.parent === parent && n.name === name);
}

/** Convenience: is this name a library entry under the parent channel? */
export function isLibraryNetwork(parent, name) {
  return !!findLibraryEntry(parent, name);
}
