"use client";

import { useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import type { Status, Task } from "@/lib/types";

/** Applied to a finished card: it stays readable but drops out of the foreground. */
export const DONE_CARD = "opacity-60";
export const DONE_TITLE = "line-through decoration-ink-muted/60";

/**
 * Remembers what a task's status was before it was ticked off, so un-ticking restores it
 * instead of guessing. Memory is per view and per session; "in_progress" is the fallback,
 * which is also what un-ticking a task that was already done on load gives.
 */
export function usePreviousStatus() {
  const seen = useRef(new Map<string, Status>());
  return {
    remember: (task: Task) => {
      if (task.status !== "done") seen.current.set(task.id, task.status);
    },
    restore: (id: string): Status => seen.current.get(id) ?? "in_progress",
  };
}

export function DoneBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded bg-emerald-100 font-bold text-emerald-800 ring-1 ring-emerald-300 ${
        compact ? "px-1 py-px text-[10px]" : "px-1.5 py-0.5 text-[11px]"
      }`}
    >
      <Check className={compact ? "size-2.5" : "size-3"} aria-hidden strokeWidth={3} />
      Сделано
    </span>
  );
}

/**
 * Quick completion toggle. Stops both click and mousedown from reaching the card, so ticking
 * one neither opens the task dialog nor starts a drag.
 */
export function DoneCheckbox({
  done,
  saving,
  title,
  onToggle,
  className = "",
}: {
  done: boolean;
  saving: boolean;
  title: string;
  onToggle: (next: boolean) => void;
  className?: string;
}) {
  if (saving) {
    return <Loader2 className={`size-4 shrink-0 animate-spin text-brand ${className}`} aria-label="Сохранение" />;
  }
  return (
    <input
      type="checkbox"
      checked={done}
      draggable={false}
      aria-label={done ? `Снять отметку «сделано»: ${title}` : `Отметить сделанным: ${title}`}
      title={done ? "Снять отметку «сделано»" : "Отметить сделанным"}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDragStart={(e) => e.preventDefault()}
      onChange={(e) => {
        e.stopPropagation();
        onToggle(e.target.checked);
      }}
      className={`size-4 shrink-0 cursor-pointer accent-emerald-600 ${className}`}
    />
  );
}
