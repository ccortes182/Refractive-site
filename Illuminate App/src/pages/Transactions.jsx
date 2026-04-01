import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { transactionsData } from "../data/mockData";
import ExportCSV from "../components/ExportCSV";

const CARD = "bg-[var(--bg-card-solid)] rounded-xl border border-[var(--border-color)]";

const STATUS_STYLES = {
  Fulfilled: "bg-[var(--badge-positive-bg)] text-[var(--badge-positive-text)]",
  "Partially Fulfilled": "bg-[#fbbf24]/15 text-[#fbbf24]",
  Unfulfilled: "bg-[var(--toggle-bg)] text-[var(--text-muted)]",
  Refunded: "bg-[var(--badge-negative-bg)] text-[var(--badge-negative-text)]",
};

const CHANNEL_COLORS = {
  "Paid Social": "#8e68ad", "Paid Search": "#43a9df", Email: "#c2dcd4",
  Organic: "#34d399", Direct: "#6b7280", TikTok: "#f87171", Influencer: "#fbbf24",
};

const SELECT_CLS = "text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-blue)]";

function JourneyTimeline({ journey }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {journey.map((step, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--bg-surface)] text-[11px]">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: step.color }} />
            <span className="text-[var(--text-primary)] font-medium">{step.channel}</span>
            <span className="text-[var(--text-muted)]">{step.event}</span>
          </div>
          {i < journey.length - 1 && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[var(--text-muted)]/30 flex-shrink-0">
              <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

function PixelSummary({ pixelEvents, confidence }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {pixelEvents.map((pe) => (
        <span key={pe.event} className="text-[11px] text-[var(--text-muted)]">
          <span className="text-[var(--text-secondary)] font-medium">{pe.event}</span> x{pe.count}
        </span>
      ))}
      <span className={`text-[11px] font-medium ${confidence >= 90 ? "text-[var(--badge-positive-text)]" : confidence >= 80 ? "text-[#fbbf24]" : "text-[var(--badge-negative-text)]"}`}>
        {confidence}% match
      </span>
    </div>
  );
}

function FilterPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors ml-0.5">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l6 6M8 2l-6 6" /></svg>
      </button>
    </span>
  );
}

export default function Transactions({ dateRange, compare }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "All");
  const [channelFilter, setChannelFilter] = useState(searchParams.get("channel") || "All");
  const [deviceFilter, setDeviceFilter] = useState(searchParams.get("device") || "All");
  const [customerType, setCustomerType] = useState(searchParams.get("type") || "All");
  const [pathFilter, setPathFilter] = useState(searchParams.get("path") || "");
  const [productFilter, setProductFilter] = useState(searchParams.get("product") || "All");
  const [minTotal, setMinTotal] = useState(searchParams.get("min") || "");
  const [maxTotal, setMaxTotal] = useState(searchParams.get("max") || "");
  const [pixelFilter, setPixelFilter] = useState(searchParams.get("pixel") || "All");
  const [touchFilter, setTouchFilter] = useState(searchParams.get("touches") || "All");

  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Sync URL params on mount
  useEffect(() => {
    const p = searchParams.get("path");
    if (p) setPathFilter(p);
    const q = searchParams.get("q");
    if (q) setSearch(q);
    const s = searchParams.get("status");
    if (s) setStatusFilter(s);
    const ch = searchParams.get("channel");
    if (ch) setChannelFilter(ch);
    const d = searchParams.get("device");
    if (d) setDeviceFilter(d);
    const t = searchParams.get("type");
    if (t) setCustomerType(t);
  }, []);

  // All unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const statuses = new Set();
    const channels = new Set();
    const devices = new Set();
    const products = new Set();
    transactionsData.forEach((t) => {
      statuses.add(t.status);
      devices.add(t.device);
      t.journey.forEach((s) => channels.add(s.channel));
      t.items.forEach((it) => products.add(it.product));
    });
    return {
      statuses: ["All", ...Array.from(statuses).sort()],
      channels: ["All", ...Array.from(channels).sort()],
      devices: ["All", ...Array.from(devices).sort()],
      products: ["All", ...Array.from(products).sort()],
    };
  }, []);

  // Filter logic
  const results = useMemo(() => {
    let data = transactionsData;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((t) =>
        t.orderNumber.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q)
      );
    }

    // Status
    if (statusFilter !== "All") {
      data = data.filter((t) => t.status === statusFilter);
    }

    // Channel (any touchpoint includes this channel)
    if (channelFilter !== "All") {
      data = data.filter((t) => t.journey.some((s) => s.channel === channelFilter));
    }

    // Device
    if (deviceFilter !== "All") {
      data = data.filter((t) => t.device === deviceFilter);
    }

    // Customer type
    if (customerType === "New") data = data.filter((t) => t.newCustomer);
    if (customerType === "Returning") data = data.filter((t) => !t.newCustomer);

    // Path filter (from Journeys page) — matches journey channels in sequence
    if (pathFilter) {
      const pathChannels = pathFilter.split(",").map((s) => s.trim());
      data = data.filter((t) => {
        const jChannels = t.journey.map((s) => s.channel);
        let pi = 0;
        for (const jc of jChannels) {
          if (pi < pathChannels.length && jc === pathChannels[pi]) pi++;
        }
        return pi >= pathChannels.length;
      });
    }

    // Product
    if (productFilter !== "All") {
      data = data.filter((t) => t.items.some((it) => it.product === productFilter));
    }

    // Total amount range
    const min = parseFloat(minTotal);
    const max = parseFloat(maxTotal);
    if (!isNaN(min)) data = data.filter((t) => t.total >= min);
    if (!isNaN(max)) data = data.filter((t) => t.total <= max);

    // Pixel confidence
    if (pixelFilter === "<85") data = data.filter((t) => t.pixelConfidence < 85);
    if (pixelFilter === "85-95") data = data.filter((t) => t.pixelConfidence >= 85 && t.pixelConfidence <= 95);
    if (pixelFilter === ">95") data = data.filter((t) => t.pixelConfidence > 95);

    // Touchpoint count
    if (touchFilter === "1") data = data.filter((t) => t.touchpoints === 1);
    if (touchFilter === "2-3") data = data.filter((t) => t.touchpoints >= 2 && t.touchpoints <= 3);
    if (touchFilter === "4+") data = data.filter((t) => t.touchpoints >= 4);

    return data;
  }, [search, statusFilter, channelFilter, deviceFilter, customerType, pathFilter, productFilter, minTotal, maxTotal, pixelFilter, touchFilter]);

  const paged = results.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(results.length / pageSize);

  const hasActiveFilters = statusFilter !== "All" || channelFilter !== "All" || deviceFilter !== "All" || customerType !== "All" || pathFilter || productFilter !== "All" || minTotal || maxTotal || pixelFilter !== "All" || touchFilter !== "All";

  const clearAllFilters = () => {
    setSearch(""); setStatusFilter("All"); setChannelFilter("All"); setDeviceFilter("All");
    setCustomerType("All"); setPathFilter(""); setProductFilter("All");
    setMinTotal(""); setMaxTotal(""); setPixelFilter("All"); setTouchFilter("All");
    setPage(0); setSearchParams({});
  };

  const fmtDollar = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Transactions</h2>
          <p className="text-sm text-[var(--text-muted)]">{results.length} orders found</p>
        </div>
        <ExportCSV
          data={results.map((t) => ({
            "Order #": t.orderNumber, Date: t.dateStr, Customer: t.customer, Email: t.email,
            City: t.city, Status: t.status, Items: t.itemCount, Total: t.total,
            "First Touch": t.firstTouch, "Last Touch": t.lastTouch, Touchpoints: t.touchpoints,
            Device: t.device, "New Customer": t.newCustomer ? "Yes" : "No", "Pixel Confidence": t.pixelConfidence + "%",
            Path: t.journey.map((s) => s.channel).join(" → "),
          }))}
          filename="transactions"
        />
      </div>

      {/* Filter Bar */}
      <div className={`${CARD} px-4 py-3`}>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="6" cy="6" r="5" /><path d="M13 13l-3.5-3.5" />
            </svg>
            <input
              type="text" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] w-[180px]"
            />
          </div>

          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className={SELECT_CLS}>
            {filterOptions.statuses.map((s) => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
          </select>

          <select value={channelFilter} onChange={(e) => { setChannelFilter(e.target.value); setPage(0); }} className={SELECT_CLS}>
            {filterOptions.channels.map((c) => <option key={c} value={c}>{c === "All" ? "All Channels" : c}</option>)}
          </select>

          <select value={deviceFilter} onChange={(e) => { setDeviceFilter(e.target.value); setPage(0); }} className={SELECT_CLS}>
            {filterOptions.devices.map((d) => <option key={d} value={d}>{d === "All" ? "All Devices" : d}</option>)}
          </select>

          <select value={customerType} onChange={(e) => { setCustomerType(e.target.value); setPage(0); }} className={SELECT_CLS}>
            <option value="All">All Customers</option>
            <option value="New">New Only</option>
            <option value="Returning">Returning Only</option>
          </select>

          <select value={productFilter} onChange={(e) => { setProductFilter(e.target.value); setPage(0); }} className={SELECT_CLS}>
            {filterOptions.products.map((p) => <option key={p} value={p}>{p === "All" ? "All Products" : p}</option>)}
          </select>

          <select value={pixelFilter} onChange={(e) => { setPixelFilter(e.target.value); setPage(0); }} className={SELECT_CLS}>
            <option value="All">All Pixel</option>
            <option value="<85">{"< 85%"}</option>
            <option value="85-95">85–95%</option>
            <option value=">95">{"> 95%"}</option>
          </select>

          <select value={touchFilter} onChange={(e) => { setTouchFilter(e.target.value); setPage(0); }} className={SELECT_CLS}>
            <option value="All">All Touches</option>
            <option value="1">Single (1)</option>
            <option value="2-3">2–3</option>
            <option value="4+">4+</option>
          </select>

          <div className="flex items-center gap-1">
            <input type="number" value={minTotal} onChange={(e) => { setMinTotal(e.target.value); setPage(0); }} placeholder="Min $" className={`${SELECT_CLS} w-[70px]`} />
            <span className="text-[var(--text-muted)] text-[10px]">–</span>
            <input type="number" value={maxTotal} onChange={(e) => { setMaxTotal(e.target.value); setPage(0); }} placeholder="Max $" className={`${SELECT_CLS} w-[70px]`} />
          </div>

          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="text-[11px] text-[var(--accent-blue)] hover:underline ml-1">
              Clear all
            </button>
          )}
        </div>

        {/* Active filter pills */}
        {(pathFilter || hasActiveFilters) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {pathFilter && (
              <FilterPill label={`Path: ${pathFilter.split(",").join(" → ")}`} onRemove={() => { setPathFilter(""); setSearchParams({}); }} />
            )}
            {statusFilter !== "All" && <FilterPill label={`Status: ${statusFilter}`} onRemove={() => setStatusFilter("All")} />}
            {channelFilter !== "All" && <FilterPill label={`Channel: ${channelFilter}`} onRemove={() => setChannelFilter("All")} />}
            {deviceFilter !== "All" && <FilterPill label={`Device: ${deviceFilter}`} onRemove={() => setDeviceFilter("All")} />}
            {customerType !== "All" && <FilterPill label={`Type: ${customerType}`} onRemove={() => setCustomerType("All")} />}
            {productFilter !== "All" && <FilterPill label={`Product: ${productFilter}`} onRemove={() => setProductFilter("All")} />}
            {pixelFilter !== "All" && <FilterPill label={`Pixel: ${pixelFilter}`} onRemove={() => setPixelFilter("All")} />}
            {touchFilter !== "All" && <FilterPill label={`Touches: ${touchFilter}`} onRemove={() => setTouchFilter("All")} />}
            {minTotal && <FilterPill label={`Min: $${minTotal}`} onRemove={() => setMinTotal("")} />}
            {maxTotal && <FilterPill label={`Max: $${maxTotal}`} onRemove={() => setMaxTotal("")} />}
          </div>
        )}
      </div>

      {/* Table */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 900 }}>
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">First Touch</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] uppercase">Touches</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] uppercase">Pixel</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((t, i) => {
                const isExpanded = expandedId === t.id;
                return (
                  <React.Fragment key={t.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${i % 2 === 1 ? "bg-[var(--bg-table-stripe)]" : ""} hover:bg-[var(--border-color)]`}
                      onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    >
                      <td className="px-4 py-3">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                          className={`text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                          <path d="M4.5 3l3 3-3 3" />
                        </svg>
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--accent-blue)]">{t.orderNumber}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{t.dateDisplay}</td>
                      <td className="px-4 py-3">
                        <span className="text-[var(--text-primary)] font-medium">{t.customer}</span>
                        {t.newCustomer && <span className="ml-1.5 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">New</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[t.status] || ""}`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">{fmtDollar(t.total)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[t.firstTouch] || "#6b7280" }} />
                          {t.firstTouch}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{t.touchpoints}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium ${t.pixelConfidence >= 90 ? "text-[var(--badge-positive-text)]" : t.pixelConfidence >= 80 ? "text-[#fbbf24]" : "text-[var(--badge-negative-text)]"}`}>
                          {t.pixelConfidence}%
                        </span>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="px-4 py-0">
                          <div className="py-4 pl-8 border-t border-[var(--border-color)] space-y-4">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">User Journey</p>
                              <JourneyTimeline journey={t.journey} />
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Pixel Events</p>
                              <PixelSummary pixelEvents={t.pixelEvents} confidence={t.pixelConfidence} />
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Order Items</p>
                              <div className="flex flex-wrap gap-2">
                                {t.items.map((item, idx) => (
                                  <span key={idx} className="text-xs bg-[var(--bg-surface)] px-2.5 py-1 rounded text-[var(--text-secondary)]">
                                    {item.product} <span className="text-[var(--text-muted)]">x{item.quantity}</span> <span className="font-medium text-[var(--text-primary)]">{fmtDollar(item.price)}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
                              <span>Email: <span className="text-[var(--text-secondary)]">{t.email}</span></span>
                              <span>City: <span className="text-[var(--text-secondary)]">{t.city}</span></span>
                              <span>Device: <span className="text-[var(--text-secondary)]">{t.device}</span></span>
                              <span>Attribution: <span className="text-[var(--text-secondary)]">{t.attributionModel}</span></span>
                              <span>Subtotal: <span className="text-[var(--text-secondary)]">{fmtDollar(t.subtotal)}</span></span>
                              <span>Shipping: <span className="text-[var(--text-secondary)]">{fmtDollar(t.shipping)}</span></span>
                              <span>Tax: <span className="text-[var(--text-secondary)]">{fmtDollar(t.tax)}</span></span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {results.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-[var(--text-muted)]">No transactions match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
            <span className="text-xs text-[var(--text-muted)]">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, results.length)} of {results.length}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="px-3 py-1 text-xs rounded-md bg-[var(--toggle-bg)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1 text-xs rounded-md bg-[var(--toggle-bg)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
