import { integrationsData } from "../data/mockData";
import { useTheme } from "../context/ThemeContext";

const CARD =
  "bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6";

const CATEGORY_COLORS = {
  Store: "#34d399",
  Advertising: "#43a9df",
  "Email / SMS": "#8e68ad",
  Analytics: "#fbbf24",
  Attribution: "#c2dcd4",
  Marketplace: "#f87171",
  Warehouse: "#6b7280",
};

function StatusBadge({ status }) {
  if (status === "Connected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Connected
      </span>
    );
  }
  if (status === "Not Connected") {
    return (
      <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[var(--bg-card-solid)] text-[var(--text-muted)] border border-[var(--border-color)]">
        Not Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
      Available
    </span>
  );
}

export default function Integrations({ dateRange, compare }) {
  const { theme } = useTheme();
  const integrations = integrationsData;

  /* ── Group by category ──────────────────────────────────── */
  const grouped = integrations.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const connectedCount = integrations.filter(
    (i) => i.status === "Connected"
  ).length;
  const availableCount = integrations.filter(
    (i) => i.status === "Available"
  ).length;
  const totalCount = integrations.length;

  /* ── Separate warehouse from the rest ───────────────────── */
  const warehouseIntegrations = grouped["Warehouse"] || [];
  const mainCategories = Object.entries(grouped).filter(
    ([cat]) => cat !== "Warehouse"
  );

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold">Integrations &amp; Connections</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Connect your store, ad platforms, and analytics. Keep your tools. Own
          your data.
        </p>
      </div>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className={CARD}>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Connected
          </p>
          <p className="text-2xl font-bold text-emerald-400">{connectedCount}</p>
        </div>
        <div className={CARD}>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Available
          </p>
          <p className="text-2xl font-bold text-blue-400">{availableCount}</p>
        </div>
        <div className={CARD}>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Total Platforms
          </p>
          <p className="text-2xl font-bold">{totalCount}</p>
        </div>
      </div>

      {/* ── Integration cards by category ───────────────────── */}
      {mainCategories.map(([category, items]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-medium">
            {category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((integration) => (
              <div
                key={integration.name}
                className={`${CARD} flex items-center gap-4 hover:border-[var(--border-hover)] transition-colors`}
              >
                {/* Icon circle */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm"
                  style={{
                    backgroundColor:
                      CATEGORY_COLORS[integration.category] || "#6b7280",
                  }}
                >
                  {integration.name.charAt(0)}
                </div>

                {/* Name + data points */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{integration.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {integration.dataPoints}
                  </p>
                </div>

                {/* Status + sync */}
                <div className="flex flex-col items-end flex-shrink-0 gap-1">
                  <StatusBadge status={integration.status} />
                  {integration.lastSync && (
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {integration.lastSync}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── Warehouse section ───────────────────────────────── */}
      {warehouseIntegrations.length > 0 && (
        <div className={`${CARD} space-y-4`}>
          <div>
            <h2 className="text-lg font-semibold">Data Warehouse</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Export raw data to your warehouse for custom analysis. Compatible
              with BigQuery and Snowflake.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {warehouseIntegrations.map((wh) => (
              <div
                key={wh.name}
                className="flex items-center gap-4 rounded-lg border border-[var(--border-color)] p-4 hover:border-[var(--border-hover)] transition-colors"
              >
                {/* Icon circle */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm"
                  style={{ backgroundColor: CATEGORY_COLORS["Warehouse"] }}
                >
                  {wh.name.charAt(0)}
                </div>

                {/* Name + data points */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{wh.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {wh.dataPoints}
                  </p>
                </div>

                {/* Configure button */}
                <button className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors">
                  Configure
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
