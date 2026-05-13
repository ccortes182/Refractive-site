import { useEffect, useMemo, useState } from "react";
import {
  getOverviewKPIs,
  getDataForRange,
  getMERDataForRange,
  getMERKPIs,
  getCohortData,
} from "../data/mockData";
import KPICard from "../components/KPICard";
import SortableKPICard from "../components/SortableKPICard";
import EditCardsMenu from "../components/EditCardsMenu";
import ViewSwitcher from "../components/ViewSwitcher";
import GoalEditor from "../components/GoalEditor";
import MetricDrillDrawer from "../components/MetricDrillDrawer";
import ExportCSV from "../components/ExportCSV";
import {
  CARD_BY_KEY,
  augmentKPIs,
  isGoodIfUp,
} from "../data/overviewCardCatalog";
import {
  PRESET_VIEWS,
  loadViewsState,
  saveViewsState,
  findView,
  newCustomViewId,
} from "../data/overviewViews";
import { loadGoals, saveGoals } from "../data/overviewGoals";
import { useTheme } from "../context/ThemeContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { format } from "date-fns";

// ───── Formatters ──────────────────────────────────────────────────────────
const fmtN = (n) => Math.round(n).toLocaleString("en-US");
const fmtD = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtDC = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtP = (n) => n.toFixed(2) + "%";
const fmtX = (n) => n.toFixed(2) + "x";
const fmtO = (n) => n.toFixed(1) + " orders";

function formatValue(v, fmt) {
  if (v == null || Number.isNaN(v)) return "—";
  if (fmt === "dollar") return fmtD(v);
  if (fmt === "dollarC") return fmtDC(v);
  if (fmt === "percent") return fmtP(v);
  if (fmt === "merX") return fmtX(v);
  if (fmt === "orders") return fmtO(v);
  return fmtN(v);
}

function formatYAxis(v, fmt) {
  if (fmt === "dollar" || fmt === "dollarC") {
    if (Math.abs(v) >= 1000) return `$${Math.round(v / 1000)}K`;
    return `$${Math.round(v)}`;
  }
  if (fmt === "percent") return `${v}%`;
  if (fmt === "merX") return `${v}x`;
  if (fmt === "orders") return `${v.toFixed(1)}`;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v;
}

// Subtitles for cards that surface a secondary stat
const SUBTITLE_BUILDERS = {
  returns: (c) => `${fmtN(c.returnItems)} items`,
};

// ───── Per-day series builder for the line chart ───────────────────────────
function buildChartSeries(metricKey, daily, mer, cohortLtv) {
  // Direct field lookups — return [{ value }] mapped from each day
  const directFields = {
    totalRevenue: "totalRevenue",
    grossRevenue: "grossRevenue",
    netRevenue: "revenue", // daily.revenue == netRevenue
    revenue: "revenue",
    orders: "orders",
    returns: "returns",
    returnItems: "returnItems",
    shippingCollected: "shippingCollected",
    discounts: "discounts",
    cogs: "cogs",
    tax: "tax",
    conversionRate: "conversionRate",
    aov: "aov",
    sessions: "sessions",
    newCustomers: "newCustomers",
    returningCustomers: "returningCustomers",
  };
  if (directFields[metricKey]) {
    const f = directFields[metricKey];
    return daily.map((d) => d[f] ?? 0);
  }

  // Derived series — need same-day MER spend / NC revenue in some cases
  const spendByDate = {};
  const ncRevByDate = {};
  const cacByDate = {};
  mer.forEach((m) => {
    spendByDate[m.dateStr] = m.spend;
    ncRevByDate[m.dateStr] = m.newCustomerRevenue;
    cacByDate[m.dateStr] = m.cac;
  });

  const cmRow = (d) => {
    const spend = spendByDate[d.dateStr] || 0;
    return d.revenue - d.cogs - spend - d.orders * 7.5;
  };

  switch (metricKey) {
    case "grossProfit":
      return daily.map((d) => d.revenue - d.cogs);
    case "grossMargin":
      return daily.map((d) => (d.revenue > 0 ? ((d.revenue - d.cogs) / d.revenue) * 100 : 0));
    case "contributionMargin":
      return daily.map(cmRow);
    case "cmPct":
      return daily.map((d) => {
        const cm = cmRow(d);
        return d.revenue > 0 ? (cm / d.revenue) * 100 : 0;
      });
    case "returnRate":
      return daily.map((d) => (d.revenue > 0 ? (d.returns / d.revenue) * 100 : 0));
    case "totalCustomers":
      return daily.map((d) => (d.newCustomers || 0) + (d.returningCustomers || 0));
    case "repeatRate":
      return daily.map((d) => {
        const tot = (d.newCustomers || 0) + (d.returningCustomers || 0);
        return tot > 0 ? (d.returningCustomers / tot) * 100 : 0;
      });
    case "revPerSession":
      return daily.map((d) => (d.sessions > 0 ? d.revenue / d.sessions : 0));
    case "adSpend":
      return mer.map((m) => m.spend);
    case "mer":
      return mer.map((m) => m.mer);
    case "roas":
      return daily.map((d) => {
        const spend = spendByDate[d.dateStr] || 0;
        return spend > 0 ? d.revenue / spend : 0;
      });
    case "cac":
      return mer.map((m) => m.cac);
    case "cpa":
      return daily.map((d) => {
        const spend = spendByDate[d.dateStr] || 0;
        return d.orders > 0 ? spend / d.orders : 0;
      });

    // ── New persona-critical metrics ────────────────────────────────
    case "ltvCacRatio":
      return daily.map((d) => {
        const cac = cacByDate[d.dateStr];
        return cohortLtv != null && cac > 0 ? cohortLtv / cac : 0;
      });
    case "cacPayback":
      return daily.map((d) => {
        const cac = cacByDate[d.dateStr];
        const gm = d.revenue > 0 ? (d.revenue - d.cogs) / d.revenue : 0;
        return d.aov > 0 && gm > 0 && cac > 0 ? cac / (d.aov * gm) : 0;
      });
    case "marketingPctOfRev":
      return daily.map((d) => {
        const spend = spendByDate[d.dateStr] || 0;
        return d.revenue > 0 ? (spend / d.revenue) * 100 : 0;
      });
    case "ncRoas":
      return daily.map((d) => {
        const spend = spendByDate[d.dateStr] || 0;
        const ncRev = ncRevByDate[d.dateStr] || 0;
        return spend > 0 ? ncRev / spend : 0;
      });
    case "ncAov":
      return daily.map((d) => {
        const ncRev = ncRevByDate[d.dateStr] || 0;
        return d.newCustomers > 0 ? ncRev / d.newCustomers : 0;
      });
    case "rcAov":
      return daily.map((d) => {
        const ncRev = ncRevByDate[d.dateStr] || 0;
        const rcRev = Math.max(0, d.revenue - ncRev);
        return d.returningCustomers > 0 ? rcRev / d.returningCustomers : 0;
      });
    case "pctRevFromNew":
      return daily.map((d) => {
        const ncRev = ncRevByDate[d.dateStr] || 0;
        return d.revenue > 0 ? (ncRev / d.revenue) * 100 : 0;
      });
    case "addToCartRate":
      return daily.map((d) => (d.sessions > 0 ? ((d.addToCarts || 0) / d.sessions) * 100 : 0));
    case "checkoutRate":
      return daily.map((d) => (d.sessions > 0 ? ((d.checkoutStarts || 0) / d.sessions) * 100 : 0));
    case "cartAbandonRate":
      return daily.map((d) => {
        const cs = d.checkoutStarts || 0;
        return cs > 0 ? ((d.abandonedCarts || 0) / cs) * 100 : 0;
      });

    default:
      return daily.map(() => 0);
  }
}

// ───── Tooltip ─────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, fmtType }) => {
  if (!active || !payload?.length) return null;
  const cur = payload.find((p) => p.dataKey === "value");
  const pri = payload.find((p) => p.dataKey === "priorValue");
  return (
    <div className="rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] backdrop-blur-xl px-4 py-3 shadow-md min-w-[150px]">
      <p className="text-xs text-[var(--text-muted)] mb-1.5">{label}</p>
      {cur && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#43a9df]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{formatValue(cur.value, fmtType)}</span>
        </div>
      )}
      {pri && pri.value != null && (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-[#8e68ad]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{formatValue(pri.value, fmtType)}</span>
        </div>
      )}
    </div>
  );
};

// Resolves the per-card display data given the live KPI numbers
function buildCardData(key, c, ch, p, compareEnabled) {
  const cfg = CARD_BY_KEY[key];
  if (!cfg) return null;

  // For all keys, the numeric value lives on `c[key]` after augmentKPIs.
  const rawValue = c[key];
  const value = formatValue(rawValue, cfg.fmt);
  const change = ch[key];

  const subtitle = SUBTITLE_BUILDERS[key] ? SUBTITLE_BUILDERS[key](c) : null;
  const priorRaw = compareEnabled && p[key] != null ? p[key] : null;
  const priorValue = priorRaw != null ? formatValue(priorRaw, cfg.fmt) : null;

  return {
    key,
    title: cfg.title,
    fmt: cfg.fmt,
    value,
    change,
    subtitle,
    priorValue,
  };
}

export default function Overview({ dateRange, compare }) {
  const { start, end } = dateRange;
  const compareEnabled = compare.enabled && compare.start && compare.end;
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.4)" : "#94a3b8";

  const [activeMetric, setActiveMetric] = useState("netRevenue");
  const [viewsState, setViewsState] = useState(() => loadViewsState());
  const { activeViewId, customViews } = viewsState;
  const [editMode, setEditMode] = useState(false);
  const [activeDragId, setActiveDragId] = useState(null);
  const [goals, setGoalsState] = useState(() => loadGoals());
  const [drillOpen, setDrillOpen] = useState(false);

  // Close drill drawer when entering edit mode (clicks become drags)
  useEffect(() => {
    if (editMode && drillOpen) setDrillOpen(false);
  }, [editMode, drillOpen]);

  // Card body click → just update the chart below.
  // Drill icon click → also open the side drawer.
  const handleCardClick = (key) => {
    setActiveMetric(key);
  };
  const handleDrillDown = (key) => {
    setActiveMetric(key);
    setDrillOpen(true);
  };

  useEffect(() => {
    saveGoals(goals);
  }, [goals]);

  const handleSaveGoal = (metricKey, value) => {
    setGoalsState((prev) => ({ ...prev, [metricKey]: value }));
  };
  const handleClearGoal = (metricKey) => {
    setGoalsState((prev) => {
      const next = { ...prev };
      delete next[metricKey];
      return next;
    });
  };

  const activeView = useMemo(
    () => findView(activeViewId, customViews),
    [activeViewId, customViews]
  );
  const cardOrder = activeView.cardOrder;

  useEffect(() => {
    saveViewsState(viewsState);
  }, [viewsState]);

  // Fall back if active metric isn't in the current view's cards
  useEffect(() => {
    if (!cardOrder.includes(activeMetric) && cardOrder.length > 0) {
      setActiveMetric(cardOrder[0]);
    }
  }, [cardOrder, activeMetric]);

  // Update the current view's cardOrder. If the active view is a preset,
  // auto-fork into a custom view ("Founder (modified)") so presets stay pristine.
  const updateCardOrder = (newOrder) => {
    if (activeView.isPreset) {
      const forkId = newCustomViewId();
      const fork = {
        id: forkId,
        name: `${activeView.name} (modified)`,
        isPreset: false,
        cardOrder: newOrder,
      };
      setViewsState({ activeViewId: forkId, customViews: [...customViews, fork] });
    } else {
      setViewsState({
        activeViewId,
        customViews: customViews.map((v) =>
          v.id === activeViewId ? { ...v, cardOrder: newOrder } : v
        ),
      });
    }
  };

  const handleSwitchView = (id) => {
    setViewsState({ activeViewId: id, customViews });
  };

  const handleCreateNew = () => {
    const name = window.prompt("Name this view:", "My View");
    if (!name || !name.trim()) return;
    const id = newCustomViewId();
    const newView = {
      id,
      name: name.trim(),
      isPreset: false,
      cardOrder: [...cardOrder],
    };
    setViewsState({ activeViewId: id, customViews: [...customViews, newView] });
  };

  const handleRename = (id) => {
    const view = customViews.find((v) => v.id === id);
    if (!view) return;
    const name = window.prompt("Rename view:", view.name);
    if (!name || !name.trim()) return;
    setViewsState({
      activeViewId,
      customViews: customViews.map((v) =>
        v.id === id ? { ...v, name: name.trim() } : v
      ),
    });
  };

  const handleDelete = (id) => {
    const view = customViews.find((v) => v.id === id);
    if (!view) return;
    if (!window.confirm(`Delete view "${view.name}"?`)) return;
    const remaining = customViews.filter((v) => v.id !== id);
    setViewsState({
      activeViewId: activeViewId === id ? PRESET_VIEWS[0].id : activeViewId,
      customViews: remaining,
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const kpisRaw = useMemo(
    () => getOverviewKPIs(start, end, compare.start, compare.end),
    [start, end, compare.start, compare.end]
  );
  const merKpis = useMemo(() => getMERKPIs(start, end), [start, end]);
  const priorMerKpis = useMemo(
    () => (compareEnabled ? getMERKPIs(compare.start, compare.end) : null),
    [compareEnabled, compare.start, compare.end]
  );

  // Cohort-derived LTV input for LTV:CAC. Use the most recent cohort's avgLTV
  // (proxy for current customer LTV).
  const cohortLtv = useMemo(() => {
    const cohorts = getCohortData();
    if (!cohorts || cohorts.length === 0) return null;
    return cohorts[cohorts.length - 1].avgLTV;
  }, []);

  const kpis = useMemo(
    () => augmentKPIs(kpisRaw, { merKpis, priorMerKpis, cohortLtv }),
    [kpisRaw, merKpis, priorMerKpis, cohortLtv]
  );
  const { current: c, prior: p, changes: ch } = kpis;

  const filteredData = useMemo(() => getDataForRange(start, end), [start, end]);
  const priorData = useMemo(
    () => (compareEnabled ? getDataForRange(compare.start, compare.end) : []),
    [compareEnabled, compare.start, compare.end]
  );
  const merData = useMemo(() => getMERDataForRange(start, end), [start, end]);
  const priorMerData = useMemo(
    () => (compareEnabled ? getMERDataForRange(compare.start, compare.end) : []),
    [compareEnabled, compare.start, compare.end]
  );

  const activeCfg = CARD_BY_KEY[activeMetric] || CARD_BY_KEY.netRevenue;

  const chartData = useMemo(() => {
    const curSeries = buildChartSeries(activeMetric, filteredData, merData, cohortLtv);
    const priorSeries = compareEnabled
      ? buildChartSeries(activeMetric, priorData, priorMerData, cohortLtv)
      : [];
    return filteredData.map((d, i) => ({
      label: format(d.date, "MMM d"),
      value: curSeries[i] ?? null,
      priorValue: compareEnabled ? (priorSeries[i] ?? null) : null,
    }));
  }, [activeMetric, filteredData, priorData, merData, priorMerData, compareEnabled, cohortLtv]);

  const ANOMALY_THRESHOLD = 15; // % change vs prior period

  const cards = useMemo(
    () =>
      cardOrder
        .map((key) => {
          const card = buildCardData(key, c, ch, p, compareEnabled);
          if (!card) return null;
          // Anomaly detection — only when comparing to a prior period
          if (compareEnabled && typeof card.change === "number" && Math.abs(card.change) >= ANOMALY_THRESHOLD) {
            const isPositive = card.change >= 0;
            const goodIfUp = isGoodIfUp(key);
            card.anomaly = {
              isPositive,
              isGood: isPositive === goodIfUp,
              change: card.change,
            };
          } else {
            card.anomaly = null;
          }
          return card;
        })
        .filter(Boolean),
    [cardOrder, c, ch, p, compareEnabled]
  );

  const chartTitle = `${activeCfg.title} Over Time`;
  const activeGoal = goals[activeMetric];

  const handleAdd = (key) => {
    if (cardOrder.includes(key)) return;
    updateCardOrder([...cardOrder, key]);
  };
  const handleRemove = (key) => {
    if (cardOrder.length <= 1) return;
    updateCardOrder(cardOrder.filter((k) => k !== key));
  };
  const handleDragStart = (event) => setActiveDragId(event.active.id);
  const handleDragEnd = (event) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cardOrder.indexOf(active.id);
    const newIndex = cardOrder.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    updateCardOrder(arrayMove(cardOrder, oldIndex, newIndex));
  };
  const handleDragCancel = () => setActiveDragId(null);

  const activeDragCard = activeDragId
    ? cards.find((card) => card.key === activeDragId)
    : null;

  return (
    <div>
      {/* Toolbar — view switcher + Edit + button */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Overview
        </h2>
        <div className="flex items-center gap-2">
          <ViewSwitcher
            activeView={activeView}
            customViews={customViews}
            onSwitch={handleSwitchView}
            onCreateNew={handleCreateNew}
            onRename={handleRename}
            onDelete={handleDelete}
          />
          <EditCardsMenu
            cardOrder={cardOrder}
            onAdd={handleAdd}
            onRemove={handleRemove}
            editMode={editMode}
            onToggleEditMode={setEditMode}
          />
        </div>
      </div>

      {/* Sortable card grid */}
      <div
        className={`relative rounded-xl transition-colors ${
          editMode
            ? "bg-[var(--bg-surface)]/30 p-3 -m-3 ring-1 ring-[var(--border-color)]"
            : ""
        }`}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 auto-rows-fr gap-3">
              {cards.map((card, i) => (
                <SortableKPICard
                  key={card.key}
                  cardKey={card.key}
                  title={card.title}
                  value={card.value}
                  change={card.change}
                  index={i}
                  active={activeMetric === card.key}
                  onClick={() => handleCardClick(card.key)}
                  onDrillDown={handleDrillDown}
                  subtitle={card.subtitle}
                  compareEnabled={compareEnabled}
                  priorValue={card.priorValue}
                  editMode={editMode}
                  onRemove={handleRemove}
                  anomaly={card.anomaly}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeDragCard ? (
              <div className="rotate-1 shadow-2xl ring-1 ring-[var(--accent-blue)] rounded-xl">
                <KPICard
                  title={activeDragCard.title}
                  value={activeDragCard.value}
                  change={activeDragCard.change}
                  index={0}
                  subtitle={activeDragCard.subtitle}
                  compareEnabled={compareEnabled}
                  priorValue={activeDragCard.priorValue}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Export */}
      <div className="flex justify-end mt-4 mb-1">
        <ExportCSV
          data={filteredData.map((d) => ({
            Date: d.dateStr,
            "Gross Revenue": d.grossRevenue,
            "Net Revenue": d.revenue,
            Orders: d.orders,
            Returns: d.returns,
            "Return Items": d.returnItems,
            Shipping: d.shippingCollected,
            Discounts: d.discounts,
            Sessions: d.sessions,
            AOV: d.aov,
            "Conversion Rate": d.conversionRate,
            "New Customers": d.newCustomers,
            "Returning Customers": d.returningCustomers,
          }))}
          filename="overview-daily-data"
        />
      </div>

      {/* Dynamic Chart */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] backdrop-blur-2xl p-6 hover:border-[var(--border-hover)] transition-colors">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{chartTitle}</h3>
          <GoalEditor
            metricKey={activeMetric}
            metricLabel={activeCfg.title}
            metricFmt={activeCfg.fmt}
            currentGoal={activeGoal}
            formatValue={formatValue}
            onSave={(v) => handleSaveGoal(activeMetric, v)}
            onClear={() => handleClearGoal(activeMetric)}
          />
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="overviewGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#43a9df" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#43a9df" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="overviewPriorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8e68ad" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#8e68ad" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: tickColor }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              tickFormatter={(v) => formatYAxis(v, activeCfg.fmt)}
              tick={{ fontSize: 12, fill: tickColor }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip fmtType={activeCfg.fmt} />} />
            {compareEnabled && (
              <Area
                type="monotone"
                dataKey="priorValue"
                stroke="#8e68ad"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                fill="url(#overviewPriorGrad)"
                dot={false}
                name="Prior"
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke="#43a9df"
              strokeWidth={2}
              fill="url(#overviewGrad)"
              name="Current"
            />
            {activeGoal != null && (
              <ReferenceLine
                y={activeGoal}
                stroke="#8e68ad"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
                label={{
                  value: `Goal: ${formatValue(activeGoal, activeCfg.fmt)}`,
                  position: "insideTopRight",
                  fill: "#8e68ad",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <MetricDrillDrawer
        open={drillOpen && !editMode}
        onClose={() => setDrillOpen(false)}
        metric={cards.find((card) => card.key === activeMetric) || null}
        dateRange={dateRange}
        compareEnabled={compareEnabled}
        formatValue={formatValue}
        dailySeries={chartData}
      />
    </div>
  );
}
