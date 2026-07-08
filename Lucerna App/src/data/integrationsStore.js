// Local overrides for integration connection state, layered on top of the
// base statuses in mockData's integrationsData.
// Shape: { [integrationName: string]: { status, lastSync, syncFrequency } }

const STORAGE_KEY = "lucerna.integrations.v1";

export function loadIntegrationOverrides() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    for (const [name, v] of Object.entries(parsed)) {
      if (v && typeof v === "object") out[name] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveIntegrationOverrides(overrides) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides || {}));
  } catch {
    // ignore
  }
}
