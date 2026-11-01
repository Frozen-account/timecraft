"use client";

import { Star } from "lucide-react";

export const FOCUS_TOOLTIP = "Главная цель на выбранную дату (максимум одна в день)";

/** Amber ring plus a warm wash, so the focus task reads as the top of the hierarchy. */
export const FOCUS_CARD = "ring-2 ring-amber-400/80 bg-gradient-to-br from-amber-50 to-surface";
/** Compact variant for the calendar grid, where blocks are small and already colour-coded. */
export const FOCUS_BLOCK = "ring-2 ring-amber-400/90 shadow-[0_0_0_4px_rgba(251,191,36,0.18)]";

export function DailyFocusBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title={FOCUS_TOOLTIP}
      className={`inline-flex shrink-0 items-center gap-1 rounded font-bold text-amber-800 ring-1 ring-amber-300 ${
        compact ? "bg-amber-100 px-1 py-px text-[10px]" : "bg-amber-100 px-1.5 py-0.5 text-[11px]"
      }`}
    >
      <Star className={compact ? "size-2.5" : "size-3"} aria-hidden fill="currentColor" />
      {compact ? "Дело дня" : "⭐ Дело дня"}
    </span>
  );
}

/**
 * The toggle is disabled without a date rather than silently accepting one: the column carries a
 * check constraint requiring scheduled_date, so a focus task with no day cannot be stored.
 */
export function DailyFocusToggle({
  checked,
  hasDate,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  hasDate: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  const blocked = !hasDate;
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-colors duration-150 ${
        checked ? "border-amber-300 bg-amber-50" : "border-line bg-canvas"
      }`}
    >
      <label className={`flex items-start gap-2.5 ${blocked || disabled ? "opacity-60" : "cursor-pointer"}`} title={FOCUS_TOOLTIP}>
        <input
          type="checkbox"
          checked={checked}
          disabled={blocked || disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-amber-500"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <Star className="size-4 text-amber-500" aria-hidden fill="currentColor" />
            Дело дня (главная задача)
          </span>
          <span className="mt-0.5 block text-xs text-ink-muted">
            {blocked ? "Сначала укажите дату в календаре — у «дела дня» всегда есть день." : FOCUS_TOOLTIP}
          </span>
        </span>
      </label>
    </div>
  );
}
