"use client";

import { CalendarPlus, Paperclip, Plus } from "lucide-react";
import { DailyFocusBadge, FOCUS_CARD } from "@/components/daily-focus";
import { DONE_CARD, DONE_TITLE, DoneBadge, DoneCheckbox } from "@/components/done-checkbox";
import { WorkspaceBadge } from "@/components/workspace-switcher";
import { PRIORITY } from "@/lib/labels";
import { fmtDuration, fmtTime, taskEnd, toMinutes } from "@/lib/schedule";
import type { Task } from "@/lib/types";
import { getWorkspace } from "@/lib/workspaces";

/**
 * One day, top to bottom, in chronological order — the mobile-first counterpart to the week
 * grid. Shared by "Сегодня" and by /schedule's День view, so the two cannot drift apart.
 *
 * Deliberately a list and not an hour grid: a grid wastes most of its height on empty hours,
 * which is exactly the space a phone does not have. Gaps between tasks are shown as a label
 * ("2 ч свободно") rather than as proportional emptiness.
 */
export function DayTimeline({
  tasks,
  now,
  isToday,
  showWorkspace,
  saving,
  onOpen,
  onToggleDone,
  onCreate,
}: {
  /** Timed tasks for this one day. Order does not matter; the component sorts. */
  tasks: Task[];
  now: Date | null;
  isToday: boolean;
  showWorkspace: boolean;
  saving: ReadonlySet<string>;
  onOpen: (task: Task) => void;
  onToggleDone: (task: Task, next: boolean) => void;
  onCreate?: () => void;
}) {
  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : null;
  const showNow = isToday && nowMinutes !== null;

  const blocks = tasks
    .map((task) => {
      const start = toMinutes(task.scheduledTime!);
      return { task, start, end: taskEnd(start, task.durationMinutes) };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  if (blocks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-10 text-center">
        <p className="text-sm font-semibold text-ink-muted">На этот день ничего не запланировано по времени.</p>
        {onCreate && (
          <button
            onClick={onCreate}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-dark"
          >
            <Plus className="size-4" aria-hidden /> Запланировать
          </button>
        )}
      </div>
    );
  }

  // The marker goes before the first task that has not started yet, so it reads as "you are
  // here" in the list even when the gap either side is hours long.
  const nowIndex = showNow ? blocks.findIndex((b) => b.start > nowMinutes!) : -1;
  const nowAtEnd = showNow && nowIndex === -1;

  return (
    <ol className="flex flex-col">
      {blocks.map((b, i) => {
        const { task } = b;
        const done = task.status === "done";
        const past = showNow && b.end <= nowMinutes!;
        const current = showNow && b.start <= nowMinutes! && b.end > nowMinutes!;
        const pr = PRIORITY[task.priority];
        const focus = task.isDailyFocus === true && !done;
        // Idle time before this task, shown as a label rather than as proportional emptiness.
        const gap = i > 0 ? b.start - blocks[i - 1].end : 0;

        return (
          <li key={task.id}>
            {i === nowIndex && <NowMarker minutes={nowMinutes!} />}
            {gap >= 30 && (
              <p className="py-1 pl-16 text-[11px] text-ink-muted tabular-nums">{fmtDuration(gap)} свободно</p>
            )}
            <div className="flex gap-2 sm:gap-3">
              {/* Time rail. Fixed width so every card starts on the same vertical line. */}
              <div className="flex w-12 shrink-0 flex-col items-end pt-2 sm:w-14">
                <span className={`text-xs font-bold tabular-nums ${past || done ? "text-ink-muted" : "text-ink"}`}>
                  {fmtTime(b.start)}
                </span>
                <span className="text-[10px] text-ink-muted tabular-nums">{fmtTime(b.end)}</span>
              </div>

              {/* The checkbox is a sibling of the button, not a child: an <input> inside a
                  <button> is invalid HTML, and browsers then swallow the tick. */}
              <div
                className={`mb-2 flex min-w-0 flex-1 gap-2.5 rounded-xl border border-line border-l-4 bg-surface p-3 shadow-sm transition-all duration-200 hover:shadow-md ${
                  focus ? FOCUS_CARD : ""
                } ${done ? DONE_CARD : ""} ${past && !done ? "opacity-75" : ""} ${
                  current && !done ? "ring-2 ring-brand/40" : ""
                }`}
                style={{ borderLeftColor: getWorkspace(task.workspace).color }}
              >
                <span className="pt-0.5">
                  <DoneCheckbox
                    done={done}
                    saving={saving.has(task.id)}
                    title={task.title}
                    onToggle={(next) => onToggleDone(task, next)}
                  />
                </span>
                <button onClick={() => onOpen(task)} title="Открыть задачу" className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted tabular-nums">
                    <span className={`size-1.5 shrink-0 rounded-full ${pr.dot}`} aria-label={`Приоритет: ${pr.label}`} />
                    {fmtTime(b.start)}–{fmtTime(b.end)}
                    <span className="text-ink-muted/70">· {fmtDuration(b.end - b.start)}</span>
                    {current && !done && <span className="font-bold text-brand">· сейчас</span>}
                  </span>
                  <span className={`mt-0.5 block text-sm font-bold leading-snug ${done ? DONE_TITLE : ""}`}>
                    {task.title}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1">
                    {done && <DoneBadge compact />}
                    {focus && <DailyFocusBadge compact />}
                    <span className="rounded bg-ink px-1 py-px text-[10px] font-semibold text-white">{task.project}</span>
                    {task.attachments && task.attachments.length > 0 && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-px text-[10px] font-semibold text-ink-subtle ring-1 ring-line"
                        title={`Вложений: ${task.attachments.length}`}
                      >
                        <Paperclip className="size-2.5" aria-hidden />
                        {task.attachments.length}
                      </span>
                    )}
                    {showWorkspace && <WorkspaceBadge id={task.workspace} />}
                  </span>
                </button>
              </div>
            </div>
          </li>
        );
      })}
      {nowAtEnd && (
        <li>
          <NowMarker minutes={nowMinutes!} />
        </li>
      )}
      {onCreate && (
        <li className="pl-14 sm:pl-[4.25rem]">
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-brand hover:text-brand"
          >
            <CalendarPlus className="size-3.5" aria-hidden /> Добавить задачу
          </button>
        </li>
      )}
    </ol>
  );
}

function NowMarker({ minutes }: { minutes: number }) {
  return (
    <p className="flex items-center gap-2 py-1.5" aria-label={`Текущее время: ${fmtTime(minutes)}`}>
      <span className="w-12 shrink-0 text-right text-[11px] font-bold text-brand tabular-nums sm:w-14">
        {fmtTime(minutes)}
      </span>
      <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden />
      <span className="h-0.5 flex-1 rounded-full bg-brand/70" aria-hidden />
    </p>
  );
}
