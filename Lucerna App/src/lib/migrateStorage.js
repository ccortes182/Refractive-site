const MIGRATIONS = [
  ['illuminate-theme', 'lucerna-theme'],
  ['illuminate-report-notes', 'lucerna-report-notes'],
  ['illuminate.overview.goals.v1', 'lucerna.overview.goals.v1'],
];

export function migrateStorage() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('lucerna.migrated.v1')) return;
  for (const [oldKey, newKey] of MIGRATIONS) {
    if (localStorage.getItem(newKey) === null) {
      const v = localStorage.getItem(oldKey);
      if (v !== null) localStorage.setItem(newKey, v);
    }
  }
  localStorage.setItem('lucerna.migrated.v1', '1');
}
