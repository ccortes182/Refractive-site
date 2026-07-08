import { useNavigate } from "react-router-dom";
import { usePlan, PLANS } from "../context/PlanContext";

const TIER_LABEL = { lumen: "Lumen", pro: "Pro" };
const TIER_PRICE = { lumen: "$799/mo", pro: "$1,999/mo" };

export function TierChip({ tier, className = "" }) {
  if (!tier || tier === "core") return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide bg-[var(--accent-violet)]/15 text-[var(--accent-violet)] border border-[var(--accent-violet)]/25 ${className}`}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}

/**
 * Gates children behind a plan tier. Below the required plan, the real
 * content renders blurred and inert underneath an upgrade card.
 *
 * @param {"lumen"|"pro"} tier - required plan
 * @param {string} title - what's locked, e.g. "Budget Simulator"
 * @param {string} value - one line of operator-voice value copy
 * @param {boolean} page - true when wrapping a whole page body (taller overlay)
 */
export default function LockedFeature({ tier, title, value, page = false, children }) {
  const { hasPlan, setPlan } = usePlan();
  const navigate = useNavigate();

  if (hasPlan(tier)) return children;

  const planMeta = PLANS.find((p) => p.key === tier);

  return (
    <div className="relative">
      <div
        aria-hidden
        className={`pointer-events-none select-none blur-[6px] opacity-40 ${page ? "max-h-[75vh] overflow-hidden" : ""}`}
      >
        {children}
      </div>
      <div className={`absolute inset-0 z-10 flex items-center justify-center ${page ? "" : "p-4"}`}>
        <div className="max-w-sm w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] shadow-2xl p-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="text-[var(--accent-violet)]">
              <path fillRule="evenodd" clipRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4z" />
            </svg>
            <TierChip tier={tier} />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{value}</p>
          <div className="pt-1 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setPlan(tier)}
              className="w-full rounded-lg bg-[var(--accent-blue)] hover:opacity-90 text-white text-sm font-medium px-4 py-2 transition-opacity"
            >
              Upgrade to {TIER_LABEL[tier]} — {TIER_PRICE[tier]}
            </button>
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Compare plans in Settings
            </button>
          </div>
          {planMeta && (
            <p className="text-[10px] text-[var(--text-muted)]">{planMeta.blurb}</p>
          )}
        </div>
      </div>
    </div>
  );
}
