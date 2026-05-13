import { format, getDaysInMonth, startOfMonth, endOfMonth, max as maxDate, min as minDate, addDays, isAfter } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────
// Per-channel budget store with three optional layers:
//   - annual:   { "YYYY": value }
//   - monthly:  { "YYYY-MM": value }
//   - platforms: { [platformName]: { annual?, monthly?, isCustom?: true } }
//
// Resolution order for any (channel, platform?, year, month) query:
//   1) Platform monthly override
//   2) Platform annual override / 12
//   3) Channel monthly override × platform default weight (when platform-scoped)
//   4) Channel annual override / 12 × platform default weight
//   5) CHANNEL_CONFIG default × platform default weight
//   6) null  → "no budget set" (pacing displays "None — Set budget")
//
// Channel-level period target = sum of resolved platform period targets,
// pro-rated by the date range's day overlap with each calendar month.
// For Email/SMS (no platforms) we resolve at the channel level only.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "lucerna.channels.budgets.v2";
const LEGACY_KEY  = "lucerna.channels.budgets.v1";

export const BUDGETS_CHANGED_EVENT = "lucerna:channels-budgets-changed";

// ─── Storage I/O ──────────────────────────────────────────────────────────

function emptyState() {
  return {};
}

/** Read raw budgets state, applying a one-time migration from v1 (flat shape). */
export function loadChannelsBudgets() {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : emptyState();
    }
    // Migrate from v1 if present
    const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) return emptyState();
    const legacy = JSON.parse(legacyRaw);
    if (!legacy || typeof legacy !== "object") return emptyState();
    const currentYear = String(new Date().getFullYear());
    const migrated = {};
    for (const [channel, override] of Object.entries(legacy)) {
      if (!override || typeof override !== "object") continue;
      const monthlyVal =
        typeof override.monthlyTarget === "number" ? override.monthlyTarget :
        typeof override.sendAllotment === "number" ? override.sendAllotment :
        typeof override.creditAllotment === "number" ? override.creditAllotment :
        null;
      if (monthlyVal == null || monthlyVal <= 0) continue;
      migrated[channel] = { annual: { [currentYear]: monthlyVal * 12 } };
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return emptyState();
  }
}

export function saveChannelsBudgets(budgets) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
    window.dispatchEvent(new CustomEvent(BUDGETS_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

// ─── Setters (pure; caller persists with saveChannelsBudgets) ────────────

function ensurePath(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    cur[k] = cur[k] || {};
    cur = cur[k];
  }
  return cur;
}

/**
 * scope: "annual" | "monthly"
 * key:   "YYYY"   | "YYYY-MM"
 * value: number (>0)  — null/0/empty deletes the entry
 */
export function setChannelTarget(budgets, channel, scope, key, value) {
  const next = JSON.parse(JSON.stringify(budgets || {}));
  ensurePath(next, channel, scope);
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) {
    delete next[channel][scope][key];
    if (Object.keys(next[channel][scope]).length === 0) delete next[channel][scope];
  } else {
    next[channel][scope][key] = v;
  }
  if (Object.keys(next[channel] || {}).length === 0) delete next[channel];
  return next;
}

export function setPlatformTarget(budgets, channel, platform, scope, key, value) {
  const next = JSON.parse(JSON.stringify(budgets || {}));
  ensurePath(next, channel, "platforms", platform, scope);
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) {
    delete next[channel].platforms[platform][scope][key];
    if (Object.keys(next[channel].platforms[platform][scope]).length === 0) {
      delete next[channel].platforms[platform][scope];
    }
    if (
      Object.keys(next[channel].platforms[platform]).length === 0 ||
      // keep entry if it's marked custom so the row persists with no targets
      (Object.keys(next[channel].platforms[platform]).length === 1 &&
        next[channel].platforms[platform].isCustom)
    ) {
      // leave as-is for custom; otherwise delete
      if (!next[channel].platforms[platform].isCustom) {
        delete next[channel].platforms[platform];
      }
    }
  } else {
    next[channel].platforms[platform][scope][key] = v;
  }
  if (next[channel].platforms && Object.keys(next[channel].platforms).length === 0) {
    delete next[channel].platforms;
  }
  if (Object.keys(next[channel] || {}).length === 0) delete next[channel];
  return next;
}

/** Clear all overrides for a channel (or for a specific platform). */
export function clearChannelTargets(budgets, channel) {
  if (!budgets[channel]) return budgets;
  const next = { ...budgets };
  delete next[channel];
  return next;
}

/**
 * Fully removes a platform entry (Remove button).
 */
export function clearPlatformTargets(budgets, channel, platform) {
  if (!budgets[channel]?.platforms?.[platform]) return budgets;
  const next = JSON.parse(JSON.stringify(budgets));
  delete next[channel].platforms[platform];
  if (Object.keys(next[channel].platforms).length === 0) delete next[channel].platforms;
  if (Object.keys(next[channel]).length === 0) delete next[channel];
  return next;
}

/**
 * Clears a platform's targets but keeps the row "tracked" (visible) so the
 * operator can re-enter values without re-adding the network. Removes all
 * annual/monthly/types overrides; keeps an empty entry (with isCustom flag if
 * present) so the platform still appears in the matrix and chevron.
 */
export function clearPlatformOverridesKeepTracked(budgets, channel, platform) {
  if (!budgets[channel]?.platforms?.[platform]) return budgets;
  const next = JSON.parse(JSON.stringify(budgets));
  const wasCustom = !!next[channel].platforms[platform].isCustom;
  next[channel].platforms[platform] = wasCustom ? { isCustom: true } : {};
  return next;
}

/**
 * Set a campaign-type-level target (e.g., Paid Search · Google · Search).
 * `scope` is "annual" or "monthly", `key` is "YYYY" or "YYYY-MM".
 */
export function setTypeTarget(budgets, channel, platform, type, scope, key, value) {
  const next = JSON.parse(JSON.stringify(budgets || {}));
  ensurePath(next, channel, "platforms", platform, "types", type, scope);
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) {
    delete next[channel].platforms[platform].types[type][scope][key];
    if (Object.keys(next[channel].platforms[platform].types[type][scope]).length === 0) {
      delete next[channel].platforms[platform].types[type][scope];
    }
    if (Object.keys(next[channel].platforms[platform].types[type]).length === 0) {
      delete next[channel].platforms[platform].types[type];
    }
    if (Object.keys(next[channel].platforms[platform].types).length === 0) {
      delete next[channel].platforms[platform].types;
    }
    const p = next[channel].platforms[platform];
    if (p && Object.keys(p).length === 0) delete next[channel].platforms[platform];
  } else {
    next[channel].platforms[platform].types[type][scope][key] = v;
  }
  if (next[channel]?.platforms && Object.keys(next[channel].platforms).length === 0) {
    delete next[channel].platforms;
  }
  if (next[channel] && Object.keys(next[channel]).length === 0) delete next[channel];
  return next;
}

export function clearTypeTargets(budgets, channel, platform, type) {
  if (!budgets[channel]?.platforms?.[platform]?.types?.[type]) return budgets;
  const next = JSON.parse(JSON.stringify(budgets));
  delete next[channel].platforms[platform].types[type];
  if (Object.keys(next[channel].platforms[platform].types).length === 0) {
    delete next[channel].platforms[platform].types;
  }
  const p = next[channel].platforms[platform];
  if (p && Object.keys(p).length === 0) delete next[channel].platforms[platform];
  if (next[channel].platforms && Object.keys(next[channel].platforms).length === 0) {
    delete next[channel].platforms;
  }
  if (Object.keys(next[channel]).length === 0) delete next[channel];
  return next;
}

/**
 * Add a platform under a channel. `isCustom` distinguishes free-form
 * operator-named networks (true) from library/built-in picks (false).
 * If a platform with the same name already exists, this is a no-op aside
 * from optionally seeding the default monthly target.
 */
export function addPlatformToChannel(budgets, channel, platformName, defaultMonthly = 0, isCustom = false) {
  const next = JSON.parse(JSON.stringify(budgets || {}));
  ensurePath(next, channel, "platforms", platformName);
  if (isCustom) next[channel].platforms[platformName].isCustom = true;
  if (defaultMonthly && defaultMonthly > 0 && !next[channel].platforms[platformName].annual) {
    const yyyy = String(new Date().getFullYear());
    next[channel].platforms[platformName].annual = { [yyyy]: defaultMonthly * 12 };
  }
  return next;
}

/** Add a free-form operator-named platform (kept for backward compat). */
export function addCustomPlatform(budgets, channel, platformName, defaultMonthly) {
  return addPlatformToChannel(budgets, channel, platformName, defaultMonthly, true);
}

/** Add a library-picked platform (no custom flag). */
export function addLibraryPlatform(budgets, channel, platformName, defaultMonthly) {
  return addPlatformToChannel(budgets, channel, platformName, defaultMonthly, false);
}

/**
 * Remove a platform entirely (works for both library and custom). All of its
 * overrides — annual, monthly, and any nested type targets — are deleted.
 */
export function removePlatform(budgets, channel, platformName) {
  return clearPlatformTargets(budgets, channel, platformName);
}

/** Backward-compat wrapper. */
export function removeCustomPlatform(budgets, channel, platformName) {
  return removePlatform(budgets, channel, platformName);
}

/** All operator-tracked platform names under a channel (library + custom). */
export function getOperatorPlatforms(budgets, channel) {
  return Object.keys(budgets?.[channel]?.platforms || {});
}

// ─── Owned-channel monthly cost (Email/SMS tier price) ───────────────────
// Stored as a flat number on the channel: budgets[channel].monthlyCost = N.
// Operators pay the same tier monthly; this drives the ROAS calculation
// for owned channels since we have no spend attribution otherwise.

export function setMonthlyCost(budgets, channel, value) {
  const next = JSON.parse(JSON.stringify(budgets || {}));
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) {
    if (next[channel]) {
      delete next[channel].monthlyCost;
      if (Object.keys(next[channel]).length === 0) delete next[channel];
    }
  } else {
    next[channel] = next[channel] || {};
    next[channel].monthlyCost = v;
  }
  return next;
}

export function clearMonthlyCost(budgets, channel) {
  return setMonthlyCost(budgets, channel, null);
}

export function getMonthlyCost(budgets, channel) {
  const v = budgets?.[channel]?.monthlyCost;
  return typeof v === "number" && v > 0 ? v : null;
}

/** Subset that are flagged custom. */
export function getCustomPlatforms(budgets, channel) {
  const ps = budgets[channel]?.platforms || {};
  return Object.entries(ps)
    .filter(([, v]) => v?.isCustom)
    .map(([name]) => name);
}

// ─── Resolution (read-side) ──────────────────────────────────────────────

/**
 * Resolve a single month's type-layer override for (channel, platform, type).
 * Returns null if no type-level override is set. Does NOT walk up to platform/
 * channel/config — caller composes those layers with weights.
 */
export function resolveTypeOverrideForMonth(budgets, channel, platform, type, yearMonth) {
  const tEntry = budgets?.[channel]?.platforms?.[platform]?.types?.[type];
  if (!tEntry) return null;
  const year = yearMonth.slice(0, 4);
  if (tEntry.monthly?.[yearMonth] != null) return tEntry.monthly[yearMonth];
  if (tEntry.annual?.[year] != null) return tEntry.annual[year] / 12;
  return null;
}

/**
 * Resolve a single month's target for (channel, platform?). Returns null if
 * nothing is configured at any layer. NOTE: this does NOT consult
 * CHANNEL_CONFIG defaults — that fallback is the caller's responsibility,
 * because it requires knowing the pacing mode (spend/sends/credits).
 */
export function resolveOverrideForMonth(budgets, channel, platform, yearMonth) {
  const channelEntry = budgets[channel];
  if (!channelEntry) return null;
  const year = yearMonth.slice(0, 4);

  // Platform layer first
  if (platform) {
    const pEntry = channelEntry.platforms?.[platform];
    if (pEntry) {
      if (pEntry.monthly?.[yearMonth] != null) return pEntry.monthly[yearMonth];
      if (pEntry.annual?.[year] != null) return pEntry.annual[year] / 12;
    }
    // Fall through to channel-level (× platform default weight applied by caller)
  }

  // Channel layer
  if (channelEntry.monthly?.[yearMonth] != null) return channelEntry.monthly[yearMonth];
  if (channelEntry.annual?.[year] != null) return channelEntry.annual[year] / 12;

  return null;
}

/**
 * Iterate each (year, month) the [start, end] range overlaps and pro-rate by
 * overlap days. Calls `monthValue(yearMonth, daysInMonth)` to fetch the
 * month's full target (caller resolves the value), and weights it by overlap.
 * Returns the summed pro-rated total, or null if every month resolves to null.
 */
export function proratePeriod(start, end, monthValue) {
  let cursor = startOfDay(start);
  const endTs = startOfDay(end).getTime();
  let total = 0;
  let anyResolved = false;
  while (cursor.getTime() <= endTs) {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const overlapStart = maxDate([monthStart, cursor]);
    const overlapEnd = minDate([monthEnd, new Date(endTs)]);
    const overlapDays = Math.max(
      0,
      Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1
    );
    const yyyymm = format(monthStart, "yyyy-MM");
    const monthTotal = monthValue(yyyymm, getDaysInMonth(monthStart));
    if (monthTotal != null) {
      anyResolved = true;
      total += monthTotal * (overlapDays / getDaysInMonth(monthStart));
    }
    // advance to first of next month
    cursor = addDays(monthEnd, 1);
    if (isAfter(cursor, new Date(endTs))) break;
  }
  return anyResolved ? total : null;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
