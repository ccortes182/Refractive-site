// Saved MMM budget scenarios persisted to localStorage.
// Shape: [{ id, name, allocations: { [channel]: dollars }, projectedRevenue,
//           projectedRoas, rangeFactor, savedAt: ISO string }]

const STORAGE_KEY = "lucerna.mmm.scenarios.v1";

export function loadScenarios() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) =>
        s &&
        typeof s === "object" &&
        typeof s.id === "string" &&
        typeof s.name === "string" &&
        s.allocations &&
        typeof s.allocations === "object"
    );
  } catch {
    return [];
  }
}

function persist(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function saveScenario({ name, allocations, projectedRevenue, projectedRoas, savedAt, ...rest }) {
  if (typeof window === "undefined") return null;
  const entry = {
    id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    allocations: { ...allocations },
    projectedRevenue,
    projectedRoas,
    savedAt: savedAt || new Date().toISOString(),
    ...rest,
  };
  persist([...loadScenarios(), entry]);
  return entry;
}

export function deleteScenario(id) {
  const list = loadScenarios().filter((s) => s.id !== id);
  persist(list);
  return list;
}
