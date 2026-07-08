import { createContext, useContext, useEffect, useState } from "react";

// Plan tiers, in order. A plan includes everything below it.
export const PLANS = [
  { key: "core", label: "Core", price: "$149/mo", blurb: "The source-of-truth dashboard" },
  { key: "lumen", label: "Lumen", price: "$799/mo", blurb: "Modeled incrementality, MTA, and the budget simulator" },
  { key: "pro", label: "Pro", price: "$1,999/mo", blurb: "Geo-holdout testing, creative intelligence, iMMM, white-label reporting" },
];

const PLAN_RANK = { core: 0, lumen: 1, pro: 2 };
const STORAGE_KEY = "lucerna.plan.v1";

const PlanContext = createContext(null);

export function PlanProvider({ children }) {
  const [plan, setPlan] = useState(() => {
    if (typeof window === "undefined") return "core";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return PLAN_RANK[saved] != null ? saved : "core";
    } catch {
      return "core";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, plan);
    } catch {
      // storage unavailable; plan stays in memory
    }
  }, [plan]);

  const hasPlan = (required) => PLAN_RANK[plan] >= (PLAN_RANK[required] ?? 0);

  return (
    <PlanContext.Provider value={{ plan, setPlan, hasPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}
