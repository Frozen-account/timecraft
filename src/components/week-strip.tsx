"use client";

import { useEffect, useMemo, useRef } from "react";
import { isoWeekRange, isoWeeksInYear } from "@/lib/dates";

const fmt = (d: Date) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

/**
 * ISO week picker. The count is 52 or 53 depending on the year (2026 has 53), so it is derived
 * rather than hardcoded — a fixed 52 would hide the last week of every long year.
 */
export function WeekStrip({
  activeWeek,
  year,
  todayWeek,
  todayYear,
  onPick,
}: {
  activeWeek: number;
  year: number;
  todayWeek: number | null;
  todayYear: number | null;
  onPick: (week: number) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);

  const weeks = useMemo(() => {
    const count = isoWeeksInYear(year);
    return Array.from({ length: count }, (_, i) => {
      const week = i + 1;
      const { start, end } = isoWeekRange(week, year);
      return { week, label: `${fmt(start)} – ${fmt(end)}` };
    });
  }, [year]);

  // Keep the active chip in view when the main toolbar moves the window. No state is touched,
  // so this stays a pure "update an external system" effect.
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (!el) return;
    // Jump on first paint, animate afterwards: a smooth scroll on mount reads as a glitch.
    el.scrollIntoView({ behavior: firstRun.current ? "auto" : "smooth", inline: "center", block: "nearest" });
    firstRun.current = false;
  }, [activeWeek, year]);

  return (
    <div
      ref={strip}
      className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-line px-2 py-1.5"
      role="group"
      aria-label="Номера недель (ISO)"
    >
      {/* Stays put while the chips scroll, so the year is never ambiguous near New Year. */}
      <span className="sticky left-0 z-10 shrink-0 bg-surface pr-1 text-[11px] font-bold tabular-nums text-ink-subtle">
        {year}
      </span>
      {weeks.map(({ week, label }) => {
        const active = week === activeWeek;
        const isThisWeek = week === todayWeek && year === todayYear;
        return (
          <button
            key={week}
            type="button"
            data-active={active || undefined}
            onClick={() => onPick(week)}
            title={`Неделя ${week}: ${label}`}
            aria-label={`Неделя ${week}: ${label}`}
            aria-current={active ? "true" : undefined}
            className={`relative shrink-0 rounded-md px-2 py-0.5 text-[11px] tabular-nums transition-colors duration-150 ${
              active
                ? "bg-brand font-semibold text-white shadow-sm"
                : isThisWeek
                  ? "font-semibold text-ink ring-1 ring-inset ring-brand/50 hover:bg-muted"
                  : "text-ink-muted hover:bg-muted hover:text-ink"
            }`}
          >
            W{week}
            {isThisWeek && (
              <span
                aria-hidden
                className={`absolute inset-x-0 -bottom-0.5 mx-auto size-1 rounded-full ${active ? "bg-white" : "bg-brand"}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
