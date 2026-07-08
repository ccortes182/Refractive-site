import { useEffect, useRef, useState } from "react";

/**
 * Small centered modal on the app's card surfaces. Replaces window.prompt /
 * window.confirm so dialogs match the product.
 */
export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        style={{ animation: "drillFade 160ms ease-out" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-solid)] shadow-2xl p-5"
        style={{ animation: "drillFade 160ms ease-out" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--border-color)] text-[var(--text-muted)] transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

const BTN_PRIMARY =
  "rounded-lg bg-[var(--accent-blue)] hover:opacity-90 text-white text-xs font-medium px-3 py-1.5 transition-opacity disabled:opacity-40";
const BTN_GHOST =
  "rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--border-color)] text-xs font-medium px-3 py-1.5 transition-colors";

/** Text-input modal (window.prompt replacement). */
export function PromptModal({ open, title, label, initialValue = "", confirmLabel = "Save", onConfirm, onClose }) {
  if (!open) return null;
  // Keyed remount on open resets the field to initialValue without effects.
  return (
    <PromptModalBody
      title={title}
      label={label}
      initialValue={initialValue}
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}

function PromptModalBody({ title, label, initialValue, confirmLabel, onConfirm, onClose }) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onConfirm(v);
    onClose();
  };

  return (
    <Modal open title={title} onClose={onClose}>
      {label && <p className="text-xs text-[var(--text-muted)] mb-2">{label}</p>}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        className="w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={BTN_GHOST} onClick={onClose}>Cancel</button>
        <button type="button" className={BTN_PRIMARY} onClick={submit} disabled={!value.trim()}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

/** Confirm modal (window.confirm replacement). */
export function ConfirmModal({ open, title, message, confirmLabel = "Confirm", danger = false, onConfirm, onClose }) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={BTN_GHOST} onClick={onClose}>Cancel</button>
        <button
          type="button"
          className={danger
            ? "rounded-lg bg-[var(--error)] hover:opacity-90 text-white text-xs font-medium px-3 py-1.5 transition-opacity"
            : BTN_PRIMARY}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
