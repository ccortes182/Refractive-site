import { useState } from "react";
import { NavLink } from "react-router-dom";

const I = (d) => <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d={d} /></svg>;
const IF = (d) => <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d={d} /></svg>;

const navSections = [
  {
    label: "Measure",
    items: [
      { label: "Overview", path: "/", icon: I("M2 3a1 1 0 011-1h2a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm6 2a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V5zm6-4a1 1 0 011-1h2a1 1 0 011 1v16a1 1 0 01-1 1h-2a1 1 0 01-1-1V1z") },
      { label: "Channels", path: "/channels", icon: I("M3 3a1 1 0 000 2h14a1 1 0 100-2H3zm2 4a1 1 0 000 2h10a1 1 0 100-2H5zm2 4a1 1 0 000 2h6a1 1 0 100-2H7zm2 4a1 1 0 000 2h2a1 1 0 100-2H9z") },
      { label: "Geo", path: "/geo", icon: IF("M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z") },
      { label: "Journeys", path: "/journeys", icon: I("M13 7H7v6h6V7zm-2 4H9V9h2v2zm8-2V7h-2v2h-2v2h2v2h2v-2h2v-2h-2zM3 11V9H1V7h2V5h2v2h2v2H5v2H3zm2 6v-2H3v-2H1v2h2v2h2v2h2v-2H5z") },
      { label: "Transactions", path: "/transactions", icon: IF("M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 4H2v6a2 2 0 002 2h12a2 2 0 002-2V8zM5 12a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm4-1a1 1 0 100 2h3a1 1 0 100-2H9z") },
    ],
  },
  {
    label: "Optimize",
    items: [
      { label: "Efficiency", path: "/efficiency", icon: IF("M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a.5.5 0 000 1h5a.5.5 0 000-1h-5zm0 3a.5.5 0 000 1h5a.5.5 0 000-1h-5zm0 3a.5.5 0 000 1h3a.5.5 0 000-1h-3z") },
      { label: "Incrementality", path: "/incrementality", icon: I("M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8-6a6 6 0 100 12V4z") },
      { label: "Media Mix", path: "/mmm", icon: I("M3 12v3c0 1.1.9 2 2 2h3v-5H3zm12 0v5h-3v-5h5v-2h-2zm-7 0v5H5c-1.1 0-2-.9-2-2v-3h5zm7-7H5c-1.1 0-2 .9-2 2v3h14V7c0-1.1-.9-2-2-2z") },
      { label: "Forecasting", path: "/forecasting", icon: I("M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z") },
    ],
  },
  {
    label: "Analyze",
    items: [
      { label: "Creative", path: "/creative", icon: IF("M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z") },
      { label: "Cohorts", path: "/cohorts", icon: I("M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm5 2a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1H8a1 1 0 01-1-1V6zm5-1a1 1 0 00-1 1v10a1 1 0 001 1h2a1 1 0 001-1V6a1 1 0 00-1-1h-2z") },
      { label: "Customers", path: "/customers", icon: I("M7 8a3 3 0 100-6 3 3 0 000 6zm7 0a3 3 0 100-6 3 3 0 000 6zm-7 2a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zm7 0a6 6 0 016 6v1h-4v-1a7.96 7.96 0 00-2-5.27A6 6 0 0114 10z") },
      { label: "Products", path: "/products", icon: IF("M5 2a2 2 0 00-2 2v1h14V4a2 2 0 00-2-2H5zm12 5H3v9a2 2 0 002 2h10a2 2 0 002-2V7zm-5 3a1 1 0 10-2 0v2H8a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2v-2z") },
      { label: "Profitability", path: "/profitability", icon: I("M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 4H2v6a2 2 0 002 2h12a2 2 0 002-2V8zm-6 3a1 1 0 10-2 0 1 1 0 002 0z") },
      { label: "Inventory", path: "/inventory", icon: IF("M10 2a4 4 0 00-4 4v1H5a1 1 0 00-1 1v8a2 2 0 002 2h8a2 2 0 002-2V8a1 1 0 00-1-1h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4z") },
      { label: "Subscriptions", path: "/subscriptions", icon: I("M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z") },
    ],
  },
  {
    label: "Monitor",
    items: [
      { label: "Tracking", path: "/tracking", icon: IF("M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z") },
      { label: "Alerts", path: "/alerts", icon: I("M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z") },
      { label: "Competitive", path: "/competitive", icon: I("M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z") },
      { label: "AI Insights", path: "/ai-insights", icon: I("M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.547a1 1 0 01.64 1.893l-1.233.411 1.166 2.916a1 1 0 01-1.855.742L14.1 8.386 11 7.137V11.5a1 1 0 01-2 0V7.137L5.9 8.386l-1.172 2.924a1 1 0 01-1.855-.742l1.166-2.916-1.233-.41a1 1 0 11.64-1.894l1.599.547L9 4.323V3a1 1 0 011-1zm0 12a3 3 0 100 6 3 3 0 000-6z") },
    ],
  },
  {
    label: "Connect",
    items: [
      { label: "Integrations", path: "/integrations", icon: I("M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z") },
    ],
  },
  {
    label: "Report",
    items: [
      { label: "Executive Report", path: "/reports", icon: IF("M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0 1 1 0 002 0zm0-4a1 1 0 10-2 0 1 1 0 002 0zm4 1a1 1 0 100 2h3a1 1 0 100-2h-3zm0 4a1 1 0 100 2h3a1 1 0 100-2h-3z") },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const [openSections, setOpenSections] = useState(() => {
    const init = {};
    navSections.forEach((s) => { init[s.label] = true; });
    return init;
  });

  const toggleSection = (label) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {!collapsed && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={onToggle} />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen bg-[var(--bg-secondary)] border-r border-[var(--border-color)] text-[var(--text-primary)] flex flex-col
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-16 -translate-x-full md:translate-x-0" : "w-60 translate-x-0"}
        `}
      >
        {/* Brand */}
        <div className="flex items-center h-16 px-4 border-b border-[var(--border-color)]">
          <button onClick={onToggle} className="flex-shrink-0 p-1 rounded hover:bg-[var(--border-color)] transition-colors" aria-label="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-[var(--text-muted)]">
              {collapsed ? (
                <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              ) : (
                <path d="M3 5h14a1 1 0 100-2H3a1 1 0 000 2zm0 6h14a1 1 0 100-2H3a1 1 0 000 2zm0 6h14a1 1 0 100-2H3a1 1 0 000 2z" />
              )}
            </svg>
          </button>
          {!collapsed && (
            <span className="ml-3 text-lg font-semibold tracking-tight whitespace-nowrap bg-gradient-to-r from-[#43a9df] to-[#8e68ad] bg-clip-text text-transparent">
              Illuminate
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {navSections.map((section) => {
            const isOpen = openSections[section.label] !== false;
            return (
              <div key={section.label} className="mb-1">
                {!collapsed ? (
                  <button
                    onClick={() => toggleSection(section.label)}
                    className="w-full flex items-center justify-between px-3 py-1.5 group cursor-pointer"
                  >
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]/50 group-hover:text-[var(--text-muted)]">
                      {section.label}
                    </span>
                    <svg
                      width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                      className={`text-[var(--text-muted)]/30 group-hover:text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
                    >
                      <path d="M2.5 4l2.5 2.5L7.5 4" />
                    </svg>
                  </button>
                ) : (
                  <div className="mb-1 mx-2 border-t border-[var(--border-color)]" />
                )}
                <div
                  className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
                    !collapsed && !isOpen ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                  }`}
                >
                  {section.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/"}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200
                        ${isActive
                          ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] shadow-[inset_0_0_0_1px_rgba(67,169,223,0.15)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-color)]"
                        }
                        ${collapsed ? "justify-center" : ""}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--accent-blue)]" />
                          )}
                          <span className={`flex-shrink-0 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
                            {item.icon}
                          </span>
                          {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Settings — pinned at bottom */}
        <div className="px-2 py-2 border-t border-[var(--border-color)]">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200
              ${isActive
                ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] shadow-[inset_0_0_0_1px_rgba(67,169,223,0.15)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-color)]"
              }
              ${collapsed ? "justify-center" : ""}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--accent-blue)]" />
                )}
                <span className="flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </span>
                {!collapsed && <span className="whitespace-nowrap">Settings</span>}
              </>
            )}
          </NavLink>
        </div>
        <div className={`px-4 py-2 text-[10px] text-[var(--text-muted)]/40 ${collapsed ? "text-center" : ""}`}>
          v3.0
        </div>
      </aside>
    </>
  );
}
