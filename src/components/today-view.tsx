"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Inbox, Star } from "lucide-react";
import { DayTimeline } from "@/components/day-timeline";
import { FOCUS_CARD } from "@/components/daily-focus";
import { DONE_CARD, DONE_TITLE, DoneBadge, DoneCheckbox } from "@/components/done-checkbox";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { useTaskMutations } from "@/components/task-mutations";
import { useWorkspace } from "@/components/workspace-provider";
import { WorkspaceBadge } from "@/components/workspace-switcher";
import { iso } from "@/lib/dates";
import { PRIORITY } from "@/lib/labels";
import { ALL_WORKSPACES, type Schedule, type Task } from "@/lib/types";
import { getWorkspace, inWorkspace } from "@/lib/workspaces";

/**
 * "Сегодня" — the app's first screen, and the one that has to work on a phone held in one hand.
 *
 * Three bands, in the order you need them: what matters most today, what is happening at a
 * specific hour, and what merely has to happen before the day is out. Everything else (the week
 * grid, the backlog, the board) is a tap away rather than on screen.
 */
export function TodayView({ tasks }: { tasks: Task[] }) {
  const { workspace } = useWorkspace();
  const { saving, error, setError, patchTask, toggleDone } = useTaskMutations();
  const [now, setNow] = useState<Date | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);

  // Dates are client-only so prerendering never bakes in the build date. The tick keeps the
  // "now" marker and the "сейчас" badge honest without a reload.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client init
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const todayIso = now ? iso(now) : null;
  const showWorkspace = workspace === ALL_WORKSPACES;

  const { timed, anytime, focus, done, total } = useMemo(() => {
    const forToday = tasks.filter((t) => t.scheduledDate === todayIso && inWorkspace(t.workspace, workspace));
    return {
      timed: forToday.filter((t) => t.scheduledTime),
      anytime: forToday.filter((t) => !t.scheduledTime),
      focus: forToday.find((t) => t.isDailyFocus === true),
      done: forToday.filter((t) => t.status === "done").length,
      total: forToday.length,
    };
  }, [tasks, todayIso, workspace]);

  // Held back until the clock is known, so the server-rendered markup matches the first paint
  // instead of flashing an empty day.
  if (!now || !todayIso) return <TodaySkeleton />;

  const heading = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold capitalize tracking-tight md:text-3xl">{heading}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {total === 0 ? "На сегодня задач нет" : `Задач на сегодня: ${total} · сделано ${done}`}
          </p>
        </div>
        <Link
          href="/schedule"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink-muted shadow-sm transition-colors hover:text-brand"
        >
          <CalendarDays className="size-4" aria-hidden /> Неделя
        </Link>
      </header>

      {error && (
        <p className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto rounded-md px-2.5 py-1 font-semibold hover:bg-red-100">
            Скрыть
          </button>
        </p>
      )}

      {focus && (
        <button
          onClick={() => setEditing(focus)}
          className={`flex w-full items-start gap-3 rounded-xl border border-amber-300 p-4 text-left shadow-sm transition-shadow hover:shadow-md ${FOCUS_CARD} ${
            focus.status === "done" ? DONE_CARD : ""
          }`}
        >
          <Star className="mt-0.5 size-5 shrink-0 text-amber-500" aria-hidden fill="currentColor" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-800">Дело дня</span>
            <span className={`mt-0.5 block text-base font-bold leading-snug ${focus.status === "done" ? DONE_TITLE : ""}`}>
              {focus.title}
            </span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
              {focus.status === "done" && <DoneBadge compact />}
              {focus.scheduledTime && <span className="tabular-nums">{focus.scheduledTime}</span>}
              <span className="rounded bg-ink px-1 py-px text-[10px] text-white">{focus.project}</span>
              {showWorkspace && <WorkspaceBadge id={focus.workspace} />}
            </span>
          </span>
        </button>
      )}

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">Расписание</h2>
        <DayTimeline
          tasks={timed}
          now={now}
          isToday
          showWorkspace={showWorkspace}
          saving={saving}
          onOpen={setEditing}
          onToggleDone={toggleDone}
        />
      </section>

      {anytime.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
            <Inbox className="size-3.5" aria-hidden /> Без времени
          </h2>
          <ul className="flex flex-col gap-1.5">
            {anytime.map((t) => {
              const isDone = t.status === "done";
              return (
                <li key={t.id}>
                  <div
                    className={`flex items-start gap-2.5 rounded-xl border border-line border-l-4 bg-surface p-3 shadow-sm ${isDone ? DONE_CARD : ""}`}
                    style={{ borderLeftColor: getWorkspace(t.workspace).color }}
                  >
                    <span className="pt-0.5">
                      <DoneCheckbox
                        done={isDone}
                        saving={saving.has(t.id)}
                        title={t.title}
                        onToggle={(next) => toggleDone(t, next)}
                      />
                    </span>
                    <button onClick={() => setEditing(t)} className="min-w-0 flex-1 text-left" title="Открыть задачу">
                      <span className={`block text-sm font-bold leading-snug ${isDone ? DONE_TITLE : ""}`}>{t.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
                        <span className={`size-1.5 rounded-full ${PRIORITY[t.priority].dot}`} aria-label={`Приоритет: ${PRIORITY[t.priority].label}`} />
                        <span className="rounded bg-ink px-1 py-px text-[10px] text-white">{t.project}</span>
                        {showWorkspace && <WorkspaceBadge id={t.workspace} />}
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {total === 0 && (
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand hover:underline"
        >
          Открыть задачи <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}

      {editing && (
        <ScheduleDialog
          task={tasks.find((t) => t.id === editing.id) ?? editing}
          defaultDate={todayIso}
          saving={saving.has(editing.id)}
          onClose={() => setEditing(null)}
          onSave={(s: Schedule | null, isDailyFocus: boolean) => {
            void patchTask(editing.id, {
              scheduledDate: s?.scheduledDate ?? null,
              scheduledTime: s?.scheduledTime ?? null,
              durationMinutes: s?.durationMinutes ?? null,
              ...(s ? { isDailyFocus } : {}),
            });
            setEditing(null);
          }}
          onAttachments={(next) => patchTask(editing.id, { attachments: next })}
        />
      )}
    </div>
  );
}

/** Matches the real layout's rhythm so the swap to live content does not jump the page. */
function TodaySkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl animate-pulse flex-col gap-5" aria-hidden>
      <div className="h-9 w-64 rounded-lg bg-muted" />
      <div className="h-20 rounded-xl bg-muted" />
      <div className="h-24 rounded-xl bg-muted" />
      <div className="h-24 rounded-xl bg-muted" />
    </div>
  );
}
