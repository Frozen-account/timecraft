"use client";

import { useEffect } from "react";

/** Modal shell: backdrop click and Escape close it. Shared by the calendar and the task form. */
export function DialogFrame({
  labelledBy,
  onClose,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border-t-4 border-t-brand bg-surface p-5 shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}

export const fieldCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
export const labelCls = "text-xs font-semibold text-ink-muted";
