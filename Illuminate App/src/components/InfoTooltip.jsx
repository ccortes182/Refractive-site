import { useState } from "react";

export default function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-1.5" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="w-4 h-4 rounded-full bg-[var(--toggle-bg)] border border-[var(--border-color)] flex items-center justify-center text-[9px] font-bold text-[var(--text-muted)] cursor-help select-none">
        i
      </span>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 rounded-lg bg-[var(--tooltip-bg)] border border-[var(--tooltip-border)] backdrop-blur-xl text-[11px] text-[var(--text-secondary)] leading-relaxed shadow-lg pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 rotate-45 bg-[var(--tooltip-bg)] border-r border-b border-[var(--tooltip-border)]" />
        </span>
      )}
    </span>
  );
}
