import { useMemo } from "react";
import { getKPIsForRange, getCohortData } from "../data/mockData";
import LTVChart from "../components/Charts/LTVChart";
import ExportCSV from "../components/ExportCSV";
import KPICard from "../components/KPICard";
import { fmtN, fmtDC } from "../lib/format";
import { metricDefinition } from "../data/metricDefinitions";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#43a9df", "#34d399"];

const pct = (cur, prior) => (prior ? Math.round(((cur - prior) / prior) * 1000) / 10 : null);

export default function Customers({ dateRange, compare }) {
  const { start, end } = dateRange;
  const compareEnabled = compare.enabled && compare.start && compare.end;

  const kpis = useMemo(
    () => getKPIsForRange(start, end, compare.start, compare.end),
    [start, end, compare.start, compare.end]
  );
  const cohorts = useMemo(() => getCohortData(), []);

  const totalNew = kpis.newCustomers;
  const totalOrders = kpis.totalOrders;
  const totalReturning = totalOrders - totalNew;
  const totalCustomers = totalNew + totalReturning;

  const priorTotal = kpis.prior.totalOrders;
  const priorNew = kpis.prior.newCustomers;

  const pieData = [
    { name: "New Customers", value: totalNew },
    { name: "Returning", value: totalReturning },
  ];

  const repeatRate = useMemo(() => {
    const avg = cohorts.reduce((sum, c) => sum + c.repeatRate, 0) / cohorts.length;
    return Math.round(avg * 100) / 100;
  }, [cohorts]);

  const avgLTV = useMemo(() => {
    const avg = cohorts.reduce((sum, c) => sum + c.avgLTV, 0) / cohorts.length;
    return Math.round(avg * 100) / 100;
  }, [cohorts]);

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total Customers" value={fmtN(totalCustomers)}
          change={compareEnabled ? pct(totalCustomers, priorTotal) : null} index={0}
          compareEnabled={compareEnabled} priorValue={compareEnabled ? fmtN(priorTotal) : null} />
        <KPICard title="New Customers" value={fmtN(totalNew)}
          change={compareEnabled ? pct(totalNew, priorNew) : null} index={1}
          compareEnabled={compareEnabled} priorValue={compareEnabled && priorNew ? fmtN(priorNew) : null} />
        <KPICard title="Repeat Purchase Rate" value={`${repeatRate.toFixed(1)}%`}
          change={null} subtitle="Average across 6-month cohorts" index={2}
          description={metricDefinition("repeatRate")} />
        <KPICard title="Average LTV" value={fmtDC(avgLTV)}
          change={null} subtitle="Across all monthly cohorts" index={3}
          description={metricDefinition("ltv")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--bg-card-solid)] rounded-xl shadow-sm border border-[var(--border-color)] p-6 md:col-span-3">
          <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">New vs Returning Customers</h3>
          <div className="relative" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx]} />)}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString("en-US")} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center -mt-4">
                <span className="text-2xl font-bold text-[var(--text-primary)]">{totalCustomers.toLocaleString("en-US")}</span>
                <span className="block text-xs text-[var(--text-muted)]">Total</span>
                {compareEnabled && (
                  <span className="block text-[10px] text-[var(--accent-violet)] mt-0.5">Prior: {priorTotal.toLocaleString("en-US")}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Cohort Data</h3>
          <ExportCSV
            data={cohorts.map((c) => ({
              Month: c.month,
              "New Customers": c.newCustomers,
              "Avg LTV": c.avgLTV.toFixed(2),
              "Repeat Rate": (c.repeatRate).toFixed(1) + "%",
            }))}
            filename="customer-cohorts"
          />
        </div>
        <LTVChart data={cohorts} />
      </div>
    </div>
  );
}
