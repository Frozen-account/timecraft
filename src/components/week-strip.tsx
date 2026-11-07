"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isoWeekRange, isoWeeksInYear } from "@/lib/dates";

const fmt = (d: Date) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

// One arrow click moves roughly five chips — enough to feel like a step, short enough to keep
// the eye on the week you came from.
const STEP_PX = 180;

/**
 * ISO week picker. A full year is 52 or 53 chips, which is far wider than the calendar card, so
 * the chips live in their own fixed-width scroll window with arrows on either side: the strip
 * itself never contributes more than ~22rem of intrinsic width to the layout around it.
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
  const [edges, setEdges] = useState({ start: true, end: true });

  const weeks = useMemo(() => {
    const count = isoWeeksInYear(year);
    return Array.from({ length: count }, (_, i) => {
      const week = i + 1;
      const { start, end } = isoWeekRange(week, year);
      return { week, label: `${fmt(start)} – ${fmt(end)}` };
    });
  }, [year]);

  // Arrows that cannot move anything are disabled rather than silently inert.
  const syncEdges = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft >= max - 1 });
  }, []);

  // weeks.length is a dependency on purpose: a 53-week year is one chip wider than a 52-week
  // one, which changes scrollWidth without resizing the box the ResizeObserver watches.
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    syncEdges();
    el.addEventListener("scroll", syncEdges, { passive: true });
    const ro = new ResizeObserver(syncEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", syncEdges);
      ro.disconnect();
    };
  }, [syncEdges, weeks.length]);

  // Keep the active chip in view when the main toolbar moves the window. No state is touched,
  // so this stays a pure "update an external system" effect. block:"nearest" keeps the page
  // itself from scrolling: only the chip window moves.
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (!el) return;
    // Jump on first paint, animate afterwards: a smooth scroll on mount reads as a glitch.
    el.scrollIntoView({ behavior: firstRun.current ? "auto" : "smooth", inline: "center", block: "nearest" });
    firstRun.current = false;
  }, [activeWeek, year]);

  const scrollByStep = (dir: -1 | 1) => strip.current?.scrollBy({ left: dir * STEP_PX, behavior: "smooth" });

  const arrowCls =
    "shrink-0 rounded-md p-0.5 text-ink-muted transition-colors duration-150 hover:bg-muted hover:text-brand disabled:pointer-events-none disabled:opacity-30";

  return (
    <div
      className="flex max-w-full items-center gap-1 overflow-hidden border-b border-line px-2 py-1.5"
      role="group"
      aria-label="Номера недель (ISO)"
    >
      <span className="shrink-0 pr-0.5 text-[11px] font-bold tabular-nums text-ink-subtle">{year}</span>
      <button
        type="button"
        onClick={() => scrollByStep(-1)}
        disabled={edges.start}
        title="Недели раньше"
        aria-label="Недели раньше"
        className={arrowCls}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      {/* min-w-0 is what keeps the chips from widening the calendar card: without it the flex
          item is sized by its (very wide) content instead of by the space available. */}
      <div ref={strip} className="no-scrollbar flex min-w-0 max-w-[22rem] flex-1 items-center gap-1 overflow-x-auto">
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
      <button
        type="button"
        onClick={() => scrollByStep(1)}
        disabled={edges.end}
        title="Недели позже"
        aria-label="Недели позже"
        className={arrowCls}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
