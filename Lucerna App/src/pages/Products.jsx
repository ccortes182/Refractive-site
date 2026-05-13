import { useMemo, useState } from "react";
import { getProducts } from "../data/mockData";
import ExportCSV from "../components/ExportCSV";

function SortArrow({ active, direction }) {
  return (
    <span className="ml-1 inline-flex flex-col leading-none text-[10px]">
      <span className={active && direction === "asc" ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)] opacity-30"}>
        ▲
      </span>
      <span className={active && direction === "desc" ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)] opacity-30"}>
        ▼
      </span>
    </span>
  );
}

export default function Products({ dateRange }) {
  const [sortField, setSortField] = useState("revenue");
  const [sortDirection, setSortDirection] = useState("desc");

  const products = useMemo(() => getProducts(), []);

  const sorted = useMemo(() => {
    const copy = [...products];
    copy.sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      if (typeof aVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    return copy;
  }, [products, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const fmt = (n) => n.toLocaleString("en-US");
  const fmtDollar = (n) =>
    "$" + Math.round(n).toLocaleString("en-US");
  const fmtDollarCents = (n) =>
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const columns = [
    { key: "name", label: "Product Name", align: "text-left" },
    { key: "unitsSold", label: "Units Sold", align: "text-right" },
    { key: "revenue", label: "Revenue", align: "text-right" },
    { key: "refundRate", label: "Refund Rate", align: "text-right" },
    { key: "aov", label: "AOV", align: "text-right" },
  ];

  return (
    <div>
      <div className="bg-[var(--bg-card-solid)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Product Performance
          </h2>
          <ExportCSV
            data={sorted.map((r) => ({
              Product: r.name,
              "Units Sold": r.unitsSold,
              Revenue: Math.round(r.revenue),
              "Refund Rate": r.refundRate.toFixed(1) + "%",
              AOV: r.aov.toFixed(2),
            }))}
            filename="product-performance"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 640 }}>
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-6 py-3 font-medium text-[var(--text-muted)] uppercase text-xs cursor-pointer select-none ${col.align}`}
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      <SortArrow
                        active={sortField === col.key}
                        direction={sortDirection}
                      />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr
                  key={row.id}
                  className={i % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-table-stripe)]"}
                >
                  <td className="px-6 py-3 text-left font-medium text-[var(--text-primary)]">
                    {row.name}
                  </td>
                  <td className="px-6 py-3 text-right text-[var(--text-secondary)]">
                    {fmt(row.unitsSold)}
                  </td>
                  <td className="px-6 py-3 text-right text-[var(--text-secondary)]">
                    {fmtDollar(row.revenue)}
                  </td>
                  <td className="px-6 py-3 text-right text-[var(--text-secondary)]">
                    {row.refundRate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-3 text-right text-[var(--text-secondary)]">
                    {fmtDollarCents(row.aov)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
