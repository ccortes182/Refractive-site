// Shared table sort indicator: stacked arrows, active direction highlighted.
export default function SortArrow({ active, direction }) {
  return (
    <span className="ml-1 inline-flex flex-col leading-none text-[10px]">
      <span className={active && direction === "asc" ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)] opacity-30"}>▲</span>
      <span className={active && direction === "desc" ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)] opacity-30"}>▼</span>
    </span>
  );
}
