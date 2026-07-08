import { useState } from "react";
import { integrationsData } from "../data/mockData";
import { useTheme } from "../context/ThemeContext";
import { STATUS_STYLES } from "../lib/status";
import Modal, { ConfirmModal } from "../components/Modal";
import {
  loadIntegrationOverrides,
  saveIntegrationOverrides,
} from "../data/integrationsStore";

const CARD =
  "bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6";

const BTN_PRIMARY =
  "rounded-lg bg-[var(--accent-blue)] hover:opacity-90 text-white text-xs font-medium px-3 py-1.5 transition-opacity";
const BTN_GHOST =
  "text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors";

const SYNC_FREQUENCIES = ["Every 15 minutes", "Hourly", "Every 6 hours", "Daily"];

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
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLES.positive.pill}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES.positive.dot}`} />
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

  // Base status from mockData merged with locally persisted overrides.
  const [overrides, setOverrides] = useState(() => loadIntegrationOverrides());
  const integrations = integrationsData.map((i) =>
    overrides[i.name] ? { ...i, ...overrides[i.name] } : i
  );

  // Modal state: { name, mode: "connect" | "config", step: "intro" | "connecting" | "done" }
  const [modal, setModal] = useState(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const active = modal ? integrations.find((i) => i.name === modal.name) : null;

  const persistOverride = (name, patch) => {
    setOverrides((prev) => {
      const next = { ...prev, [name]: { ...(prev[name] || {}), ...patch } };
      saveIntegrationOverrides(next);
      return next;
    });
  };

  const openConnect = (integration) =>
    setModal({ name: integration.name, mode: "connect", step: "intro" });
  const openConfigure = (integration) =>
    setModal({ name: integration.name, mode: "config" });

  const authorize = (name) => {
    setModal((m) => (m && m.name === name ? { ...m, step: "connecting" } : m));
    setTimeout(() => {
      persistOverride(name, {
        status: "Connected",
        lastSync: "Just now",
        syncFrequency: SYNC_FREQUENCIES[0],
      });
      setModal((m) =>
        m && m.name === name && m.step === "connecting" ? { ...m, step: "done" } : m
      );
    }, 800);
  };

  const disconnect = (name) => {
    const base = integrationsData.find((i) => i.name === name);
    if (base && base.status === "Connected") {
      // Base data says connected, so we need an explicit override to flip it.
      persistOverride(name, { status: "Not Connected", lastSync: null });
    } else {
      // Base was "Not Connected" / "Available" — drop the override to restore it.
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[name];
        saveIntegrationOverrides(next);
        return next;
      });
    }
    setModal(null);
  };

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

                {/* Status + sync + action */}
                <div className="flex flex-col items-end flex-shrink-0 gap-1.5">
                  <StatusBadge status={integration.status} />
                  {integration.lastSync && (
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {integration.lastSync}
                    </span>
                  )}
                  {integration.status === "Connected" ? (
                    <button
                      type="button"
                      onClick={() => openConfigure(integration)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Configure
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openConnect(integration)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[var(--accent-blue)] text-white hover:opacity-90 transition-opacity"
                    >
                      Connect
                    </button>
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

                {/* Status + action */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {wh.status === "Connected" && <StatusBadge status={wh.status} />}
                  <button
                    type="button"
                    onClick={() =>
                      wh.status === "Connected" ? openConfigure(wh) : openConnect(wh)
                    }
                    className={wh.status === "Connected" ? BTN_GHOST : BTN_PRIMARY}
                  >
                    {wh.status === "Connected" ? "Configure" : "Connect"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Connect / Configure modal ───────────────────────── */}
      <Modal
        open={!!modal}
        title={
          modal?.mode === "config"
            ? `Configure ${modal.name}`
            : `Connect ${modal?.name || ""}`
        }
        onClose={() => setModal(null)}
      >
        {modal?.mode === "connect" && modal.step === "intro" && (
          <>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Connects your {modal.name} account so Lucerna can pull spend and
              conversions. Read-only access.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className={BTN_PRIMARY}
                onClick={() => authorize(modal.name)}
              >
                Authorize {modal.name}
              </button>
            </div>
          </>
        )}

        {modal?.mode === "connect" && modal.step === "connecting" && (
          <div className="flex items-center gap-2.5 py-2">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--accent-blue)] border-t-transparent animate-spin" />
            <span className="text-xs text-[var(--text-secondary)]">Connecting…</span>
          </div>
        )}

        {modal?.mode === "connect" && modal.step === "done" && (
          <>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Connected. First sync usually lands within 10 minutes.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className={BTN_PRIMARY}
                onClick={() => setModal(null)}
              >
                Done
              </button>
            </div>
          </>
        )}

        {modal?.mode === "config" && active && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Sync frequency
              </label>
              <select
                value={active.syncFrequency || SYNC_FREQUENCIES[0]}
                onChange={(e) =>
                  persistOverride(modal.name, { syncFrequency: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
              >
                {SYNC_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                Data points: {active.dataPoints}
                {active.lastSync ? ` · Last sync ${active.lastSync}` : ""}
              </p>
            </div>
            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={() => setConfirmDisconnect(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--error)]/30 text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
              >
                Disconnect
              </button>
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => setModal(null)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={confirmDisconnect}
        title={`Disconnect ${modal?.name || ""}?`}
        message={`Lucerna will stop syncing data from ${modal?.name || "this platform"}. Historical data stays in your workspace. You can reconnect anytime.`}
        confirmLabel="Disconnect"
        danger
        onConfirm={() => modal && disconnect(modal.name)}
        onClose={() => setConfirmDisconnect(false)}
      />
    </div>
  );
}
