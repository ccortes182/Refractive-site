import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

const CARD = "bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)] p-6";
const INPUT = "w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors";
const LABEL = "block text-xs font-medium text-[var(--text-secondary)] mb-1.5";
const BTN_PRIMARY = "px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-[#43a9df] to-[#8e68ad] hover:opacity-90 transition-opacity";
const BTN_OUTLINE = "px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors";
const BTN_DANGER = "px-4 py-2 text-sm font-medium rounded-lg bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)] hover:opacity-80 transition-opacity";

const BADGE_ROLE = {
  Admin: "bg-[var(--accent-blue)]/15 text-[var(--accent-blue)]",
  Editor: "bg-[#8e68ad]/15 text-[#8e68ad]",
  Viewer: "bg-[var(--toggle-bg)] text-[var(--text-muted)]",
};

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <button
        onClick={onChange}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? "bg-[var(--accent-blue)]" : "bg-[var(--toggle-bg)] border border-[var(--border-color)]"
        }`}
      >
        <span className={`absolute top-[3px] left-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[16px]" : "translate-x-0"
        }`} />
      </button>
    </label>
  );
}

function SectionTitle({ title, description }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && <p className="text-sm text-[var(--text-muted)] mt-0.5">{description}</p>}
    </div>
  );
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme();

  // Profile state
  const [profile, setProfile] = useState({
    name: "Christian Cortes",
    email: "christian@refractive.co",
    role: "Admin",
    company: "Refractive",
    timezone: "America/Los_Angeles",
  });

  // Team members
  const [team] = useState([
    { id: 1, name: "Christian Cortes", email: "christian@refractive.co", role: "Admin", lastActive: "Now" },
    { id: 2, name: "Sarah Martinez", email: "sarah@refractive.co", role: "Editor", lastActive: "2h ago" },
    { id: 3, name: "James Kim", email: "james@refractive.co", role: "Viewer", lastActive: "1d ago" },
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");

  // Notification prefs
  const [notifications, setNotifications] = useState({
    weeklyMemo: true,
    alertsCritical: true,
    alertsWarning: true,
    alertsInfo: false,
    budgetPacing: true,
    inventoryAlerts: true,
    anomalyDetection: true,
  });

  const toggleNotif = (key) => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  // Pixel config
  const [pixelId] = useState("ILM-PX-8f3a9d2e1b");
  const [copied, setCopied] = useState(false);
  const copyPixel = () => {
    navigator.clipboard?.writeText(pixelSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const pixelSnippet = `<!-- Illuminate Pixel -->\n<script>\n  (function(i,l,m){i.IlluminateObject=m;i[m]=i[m]||function(){\n  (i[m].q=i[m].q||[]).push(arguments)};var s=l.createElement('script');\n  s.async=1;s.src='https://pixel.illuminate.io/v1/${pixelId}.js';\n  l.head.appendChild(s)})(window,document,'ilm');\n  ilm('init','${pixelId}');\n  ilm('track','PageView');\n</script>`;

  // Data preferences
  const [dataPrefs, setDataPrefs] = useState({
    currency: "USD",
    attributionWindow: "7-day click, 1-day view",
    timezone: "America/Los_Angeles",
    fiscalYearStart: "January",
    defaultDateRange: "30d",
  });

  return (
    <div className="max-w-4xl space-y-6">
      {/* ── Profile ── */}
      <div className={CARD}>
        <SectionTitle title="Profile" description="Your personal account details" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Full Name</label>
            <input type="text" className={INPUT} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input type="email" className={INPUT} value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Company</label>
            <input type="text" className={INPUT} value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Timezone</label>
            <select className={INPUT} value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/New_York">Eastern (ET)</option>
              <option value="Europe/London">London (GMT)</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button className={BTN_PRIMARY}>Save Changes</button>
        </div>
      </div>

      {/* ── Team & Users ── */}
      <div className={CARD}>
        <SectionTitle title="Team Members" description="Manage who has access to this workspace" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-2 pr-4 text-xs font-medium text-[var(--text-muted)] uppercase">Name</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-[var(--text-muted)] uppercase">Email</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-[var(--text-muted)] uppercase">Role</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-[var(--text-muted)] uppercase">Last Active</th>
                <th className="py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.id} className="border-b border-[var(--border-color)]/50 last:border-0">
                  <td className="py-3 pr-4 text-[var(--text-primary)] font-medium">{m.name}</td>
                  <td className="py-3 pr-4 text-[var(--text-secondary)]">{m.email}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${BADGE_ROLE[m.role] || ""}`}>{m.role}</span>
                  </td>
                  <td className="py-3 pr-4 text-[var(--text-muted)]">{m.lastActive}</td>
                  <td className="py-3 text-right">
                    <button className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Invite New Member</p>
          <div className="flex gap-2">
            <input type="email" className={`${INPUT} flex-1`} placeholder="email@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <select className={`${INPUT} w-28`} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="Admin">Admin</option>
              <option value="Editor">Editor</option>
              <option value="Viewer">Viewer</option>
            </select>
            <button className={BTN_PRIMARY}>Send Invite</button>
          </div>
        </div>
      </div>

      {/* ── Pixel / Tracking ── */}
      <div className={CARD}>
        <SectionTitle title="Illuminate Pixel" description="Install this snippet on your storefront to enable first-party tracking" />
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <span className="w-2 h-2 rounded-full bg-[var(--badge-positive-text)] animate-pulse" />
            <span className="text-sm font-mono text-[var(--text-primary)]">{pixelId}</span>
          </div>
          <span className="text-xs text-[var(--badge-positive-text)]">Active</span>
        </div>

        <div className="relative">
          <pre className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-secondary)] overflow-x-auto whitespace-pre leading-relaxed">
            {pixelSnippet}
          </pre>
          <button
            onClick={copyPixel}
            className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-medium rounded-md bg-[var(--toggle-bg)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-color)] transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Events Tracked</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">5</p>
            <p className="text-[11px] text-[var(--text-muted)]">PageView, ViewContent, AddToCart, Checkout, Purchase</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Server-Side</p>
            <p className="text-lg font-semibold text-[var(--badge-positive-text)]">Enabled</p>
            <p className="text-[11px] text-[var(--text-muted)]">Conversions API connected</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Cookie Consent</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">GDPR Mode</p>
            <p className="text-[11px] text-[var(--text-muted)]">Consent banner required before firing</p>
          </div>
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className={CARD}>
        <SectionTitle title="Notifications" description="Choose what alerts and reports you receive" />
        <div className="space-y-4">
          <Toggle label="Weekly Insights Memo (every Monday)" checked={notifications.weeklyMemo} onChange={() => toggleNotif("weeklyMemo")} />
          <Toggle label="Critical alerts (MER floor, stockouts, tracking breaks)" checked={notifications.alertsCritical} onChange={() => toggleNotif("alertsCritical")} />
          <Toggle label="Warning alerts (spend pacing, CAC spikes)" checked={notifications.alertsWarning} onChange={() => toggleNotif("alertsWarning")} />
          <Toggle label="Info alerts (creative fatigue, positive trends)" checked={notifications.alertsInfo} onChange={() => toggleNotif("alertsInfo")} />
          <Toggle label="Budget pacing notifications" checked={notifications.budgetPacing} onChange={() => toggleNotif("budgetPacing")} />
          <Toggle label="Inventory reorder alerts" checked={notifications.inventoryAlerts} onChange={() => toggleNotif("inventoryAlerts")} />
          <Toggle label="Anomaly detection alerts" checked={notifications.anomalyDetection} onChange={() => toggleNotif("anomalyDetection")} />
        </div>
      </div>

      {/* ── Data & Attribution Preferences ── */}
      <div className={CARD}>
        <SectionTitle title="Data Preferences" description="Configure how metrics are calculated and displayed" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Currency</label>
            <select className={INPUT} value={dataPrefs.currency} onChange={(e) => setDataPrefs({ ...dataPrefs, currency: e.target.value })}>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="AUD">AUD (A$)</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Attribution Window</label>
            <select className={INPUT} value={dataPrefs.attributionWindow} onChange={(e) => setDataPrefs({ ...dataPrefs, attributionWindow: e.target.value })}>
              <option value="7-day click, 1-day view">7-day click, 1-day view</option>
              <option value="28-day click, 1-day view">28-day click, 1-day view</option>
              <option value="1-day click">1-day click only</option>
              <option value="7-day click">7-day click only</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Fiscal Year Start</label>
            <select className={INPUT} value={dataPrefs.fiscalYearStart} onChange={(e) => setDataPrefs({ ...dataPrefs, fiscalYearStart: e.target.value })}>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Default Date Range</label>
            <select className={INPUT} value={dataPrefs.defaultDateRange} onChange={(e) => setDataPrefs({ ...dataPrefs, defaultDateRange: e.target.value })}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button className={BTN_PRIMARY}>Save Preferences</button>
        </div>
      </div>

      {/* ── Appearance ── */}
      <div className={CARD}>
        <SectionTitle title="Appearance" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Dark Mode</p>
            <p className="text-xs text-[var(--text-muted)]">Toggle between dark and light themes</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
              theme === "dark" ? "bg-[var(--accent-blue)]" : "bg-[var(--toggle-bg)] border border-[var(--border-color)]"
            }`}
          >
            <span className={`absolute top-[3px] left-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
              theme === "dark" ? "translate-x-[16px]" : "translate-x-0"
            }`} />
          </button>
        </div>
      </div>

      {/* ── API Access ── */}
      <div className={CARD}>
        <SectionTitle title="API Access" description="Use the Illuminate API to pull data into your own tools" />
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-sm text-[var(--text-muted)]">
            ilm_live_•••••••••••••••••••k3f9
          </div>
          <button className={BTN_OUTLINE}>Reveal</button>
          <button className={BTN_OUTLINE}>Regenerate</button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Rate limit: 1,000 requests/min. Docs at <span className="text-[var(--accent-blue)]">docs.illuminate.io/api</span></p>
      </div>

      {/* ── Danger Zone ── */}
      <div className={`${CARD} border-[var(--badge-negative-text)]/20`}>
        <SectionTitle title="Danger Zone" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Delete Workspace</p>
            <p className="text-xs text-[var(--text-muted)]">Permanently remove this workspace and all associated data</p>
          </div>
          <button className={BTN_DANGER}>Delete Workspace</button>
        </div>
      </div>
    </div>
  );
}
