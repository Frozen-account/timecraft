"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarPlus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox,
  Loader2, PanelRightClose, PanelRightOpen, Paperclip, Plus, Star, X,
} from "lucide-react";
import { DailyFocusBadge, DailyFocusToggle, FOCUS_BLOCK } from "@/components/daily-focus";
import { DayTimeline } from "@/components/day-timeline";
import { DONE_CARD, DONE_TITLE, DoneBadge, DoneCheckbox } from "@/components/done-checkbox";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { useTaskMutations } from "@/components/task-mutations";
import { WeekStrip } from "@/components/week-strip";
import { DialogFrame, fieldCls, labelCls } from "@/components/dialog-frame";
import { addDays, iso, isoWeek, isoWeekYear, mondayOf, mondayOfIsoWeek } from "@/lib/dates";
import { PRIORITY, STATUS_LABEL } from "@/lib/labels";
import { END_HOUR, HOUR_PX, START_HOUR, fmtTime, taskEnd, toMinutes } from "@/lib/schedule";
import { useWorkspace } from "@/components/workspace-provider";
import { WorkspaceBadge } from "@/components/workspace-switcher";
import {
  ALL_WORKSPACES, ASSIGNEES, PRIORITIES, PROJECTS, STATUSES, projectWorkspace,
  type Assignee, type Priority, type Project, type Schedule, type Status, type Task, type WorkspaceFilter,
} from "@/lib/types";
import { getWorkspace, inWorkspace } from "@/lib/workspaces";

// Hover-only controls stay visible on touch screens, which have no hover.
const REVEAL = "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100";

/** Paperclip shown on a card when the task carries files, so a ticket is findable without opening it. */
function AttachmentMark({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-px text-[10px] font-semibold text-ink-subtle ring-1 ring-line"
      title={`Вложений: ${count}`}
    >
      <Paperclip className="size-2.5" aria-hidden />
      {count}
    </span>
  );
}

// Date-navigation steps, in render order around the "Сегодня" button.
const STEPS = [
  { days: -7, icon: ChevronsLeft, label: "Назад на неделю" },
  { days: -1, icon: ChevronLeft, label: "Назад на день" },
  { days: 1, icon: ChevronRight, label: "Вперёд на день" },
  { days: 7, icon: ChevronsRight, label: "Вперёд на неделю" },
] as const;

const INITIATIVE_LABEL: Record<string, string> = {
  "/projects/english-expansion": "English Expansion",
  "/projects/video-education": "Video Education",
};

const fmtShort = (d: Date) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

interface Block { task: Task; start: number; end: number; lane: number; lanes: number }

// Side-by-side lanes for overlapping blocks within one day.
function layoutDay(tasks: Task[]): Block[] {
  const items = tasks
    .map((task) => {
      const start = toMinutes(task.scheduledTime!);
      return { task, start, end: taskEnd(start, task.durationMinutes), lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);
  let cluster: Block[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => { cluster.forEach((b) => (b.lanes = laneEnds.length)); cluster = []; laneEnds = []; };
  for (const b of items) {
    if (b.start >= clusterEnd) flush();
    const lane = laneEnds.findIndex((end) => end <= b.start);
    b.lane = lane === -1 ? laneEnds.length : lane;
    laneEnds[b.lane] = b.end;
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.end);
  }
  flush();
  return items;
}

export function WeeklySchedule({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [anchor, setAnchor] = useState<Date | null>(null); // first visible day of the window
  const [now, setNow] = useState<Date | null>(null);
  const [view, setView] = useState<"week" | "day">("week");
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState<Schedule | null>(null); // prefill for the "new task" dialog
  const [trayOpen, setTrayOpen] = useState(true);
  const [allPriorities, setAllPriorities] = useState(false);
  // Writes are shared with Сегодня and the day timeline, so a PATCH behaves the same everywhere.
  const { saving, error, setError, patchTask, toggleDone } = useTaskMutations();
  const [dragId, setDragId] = useState<string | null>(null);
  // "allday:<date>" | "slot:<date>:<hour>" | "tray"
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Dates and browser storage are client-only, so prerendering never depends on build time.
  useEffect(() => {
    const d = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client init
    setNow(d);
    // Open on the aligned Mon–Sun week containing today, the familiar default.
    setAnchor(mondayOf(new Date(d.getFullYear(), d.getMonth(), d.getDate())));
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // `merged` is the full set from Postgres; drag lookups use it so a task hidden by the current
  // workspace filter can still be resolved. Rendering uses `scoped`.
  const merged = tasks;
  const scoped = useMemo(() => merged.filter((t) => inWorkspace(t.workspace, workspace)), [merged, workspace]);
  const showWorkspace = workspace === ALL_WORKSPACES;
  const days = anchor ? (view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(anchor, i)) : [anchor]) : [];
  const todayIso = now ? iso(now) : "";
  const unscheduled = scoped.filter((t) => !t.scheduledDate && t.status !== "done" && (allPriorities || t.priority === "high"));

  const today = now ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : null;

  /** Moves the window by whole days: ±1 slides it, ±7 jumps a week and keeps the alignment. */
  const shift = (days: number) => setAnchor((a) => (a ? addDays(a, days) : a));

  // In week mode snap back to the aligned week, so "Сегодня" always restores Mon–Sun.
  const goToday = () => today && setAnchor(view === "week" ? mondayOf(today) : today);

  function changeView(next: "week" | "day") {
    if (next === view) return;
    setView(next);
    setAnchor((a) => {
      if (!a) return a;
      if (next === "week") return mondayOf(a); // open the aligned week containing this day
      // Week -> day: prefer today when it is on screen, otherwise the first visible day.
      const onScreen = today && iso(today) >= iso(a) && iso(today) <= iso(addDays(a, 6));
      return onScreen ? today : a;
    });
  }

  // Quick-create defaults to today when it is visible, rather than to the window edge.
  const focusDate =
    today && days.length > 0 && iso(today) >= iso(days[0]) && iso(today) <= iso(days[days.length - 1])
      ? iso(today)
      : (days[0] ? iso(days[0]) : todayIso);

  // Unscheduling sends explicit nulls; the endpoint clears the dependent columns together and
  // gives up "дело дня", which cannot exist without a date.
  const setSchedule = (id: string, s: Schedule | null, isDailyFocus?: boolean) => {
    void patchTask(id, {
      scheduledDate: s?.scheduledDate ?? null,
      scheduledTime: s?.scheduledTime ?? null,
      durationMinutes: s?.durationMinutes ?? null,
      ...(isDailyFocus !== undefined && s ? { isDailyFocus } : {}),
    });
  };

  async function createTask(draft: Omit<Task, "id">): Promise<string | null> {
    let res: Response;
    try {
      res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
    } catch {
      return "Нет связи с сервером.";
    }
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; detail?: string };
    if (!res.ok || !data.ok) return data.detail ?? data.error ?? "Не удалось создать задачу.";

    setCreating(null);
    router.refresh();
    if (draft.scheduledDate) {
      const [y, m, d] = draft.scheduledDate.split("-").map(Number);
      setAnchor(new Date(y, m - 1, d)); // show it even if it was dated outside the visible range
    } else {
      setTrayOpen(true);
      if (draft.priority !== "high") setAllPriorities(true);
    }
    return null;
  }

  // --- drag & drop (native HTML5; touch devices keep using the dialog) ---
  const endDrag = () => { setDragId(null); setDropTarget(null); };
  const dragProps = (t: Task) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent<HTMLElement>) => {
      e.dataTransfer.setData("text/plain", t.id);
      e.dataTransfer.effectAllowed = "move";
      setDragId(t.id);
    },
    onDragEnd: endDrag,
  });
  const dragCls = (t: Task) => `cursor-grab active:cursor-grabbing ${dragId === t.id ? "opacity-50" : ""}`;

  // Only react to our own task drags, not files or text dragged in from outside.
  const over = (key: string) => (e: React.DragEvent<HTMLElement>) => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(key);
  };
  const leave = (key: string) => (e: React.DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget((c) => (c === key ? null : c));
  };
  const drop = (toSchedule: (t: Task) => Schedule | null) => (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    const task = merged.find((t) => t.id === (e.dataTransfer.getData("text/plain") || dragId));
    if (task) {
      setSchedule(task.id, toSchedule(task));
      if (!toSchedule(task) && task.priority !== "high") setAllPriorities(true); // keep it visible in the tray
    }
    endDrag();
  };
  const hourAt = (e: React.DragEvent<HTMLElement>) => {
    const h = START_HOUR + Math.floor((e.clientY - e.currentTarget.getBoundingClientRect().top) / HOUR_PX);
    return Math.min(Math.max(h, START_HOUR), END_HOUR - 1);
  };
  const dragged = dragId ? merged.find((t) => t.id === dragId) : undefined;
  const dropCls = (key: string) => (dropTarget === key ? "bg-brand/10 ring-1 ring-inset ring-brand/40" : "");

  const range =
    days.length === 0 ? "…"
      : view === "week"
        ? `${fmtShort(days[0])} – ${fmtShort(days[6])} ${days[6].getFullYear()}`
        : days[0].toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-w-0 max-w-full">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center overflow-hidden rounded-lg border border-line bg-surface shadow-sm" role="group" aria-label="Навигация по датам">
          {STEPS.slice(0, 2).map(({ days: n, icon: Icon, label }) => (
            <button
              key={n}
              onClick={() => shift(n)}
              title={label}
              aria-label={label}
              className="p-2 text-ink-muted transition-colors duration-150 hover:bg-muted hover:text-brand focus-visible:bg-muted focus-visible:text-brand focus-visible:outline-none"
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
          <button
            onClick={goToday}
            title="Вернуться к текущей дате"
            className="border-x border-line px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:bg-muted hover:text-brand focus-visible:bg-muted focus-visible:text-brand focus-visible:outline-none"
          >
            Сегодня
          </button>
          {STEPS.slice(2).map(({ days: n, icon: Icon, label }) => (
            <button
              key={n}
              onClick={() => shift(n)}
              title={label}
              aria-label={label}
              className="p-2 text-ink-muted transition-colors duration-150 hover:bg-muted hover:text-brand focus-visible:bg-muted focus-visible:text-brand focus-visible:outline-none"
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
        <span className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white tabular-nums first-letter:uppercase">{range}</span>
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 shadow-sm" role="group" aria-label="Вид">
          {(["week", "day"] as const).map((v) => (
            <button
              key={v}
              onClick={() => changeView(v)}
              aria-pressed={view === v}
              className={`rounded-md px-3 py-1 text-sm font-semibold transition-colors ${view === v ? "bg-brand text-white" : "text-ink-muted hover:text-ink"}`}
            >
              {v === "week" ? "Неделя" : "День"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setTrayOpen((o) => !o)}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink-muted shadow-sm hover:text-ink"
          aria-expanded={trayOpen}
        >
          {trayOpen ? <PanelRightClose className="size-4" aria-hidden /> : <PanelRightOpen className="size-4" aria-hidden />}
          Без времени
          <span className="rounded-full bg-brand px-1.5 text-xs text-white">{unscheduled.length}</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto rounded-md px-2.5 py-1 font-semibold hover:bg-red-100">
            Скрыть
          </button>
        </div>
      )}

      <div className={`grid min-w-0 max-w-full gap-4 ${trayOpen ? "lg:grid-cols-[minmax(0,1fr)_18rem]" : ""}`}>
        {/* Time grid */}
        <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          {anchor && (
            <WeekStrip
              activeWeek={isoWeek(anchor)}
              year={isoWeekYear(anchor)}
              todayWeek={today ? isoWeek(today) : null}
              todayYear={today ? isoWeekYear(today) : null}
              onPick={(week) => setAnchor(mondayOfIsoWeek(week, isoWeekYear(anchor)))}
            />
          )}
          {view === "day" && anchor ? (
            <DayPanel
              date={iso(anchor)}
              tasks={scoped}
              now={now}
              isToday={iso(anchor) === todayIso}
              showWorkspace={showWorkspace}
              saving={saving}
              onOpen={setEditing}
              onToggleDone={toggleDone}
              onCreate={() => setCreating({ scheduledDate: iso(anchor) })}
            />
          ) : (
          <div className="overflow-x-auto rounded-b-xl">
            <div className="min-w-[860px]">
            <div className="grid border-b border-line" style={{ gridTemplateColumns: `3.5rem repeat(${Math.max(days.length, 1)}, minmax(0, 1fr))` }}>
              <div />
              {days.map((d) => {
                const isToday = iso(d) === todayIso;
                return (
                  <div key={iso(d)} className={`group relative border-l border-line ${isToday ? "bg-brand-soft/60" : ""}`}>
                    <button
                      onClick={() => { setAnchor(d); setView("day"); }}
                      className="w-full px-2 py-2.5 text-left transition-colors hover:bg-canvas/70"
                      title="Открыть день"
                    >
                      <span className={`block text-xs font-bold uppercase tracking-wider ${isToday ? "text-brand" : "text-ink-muted"}`}>
                        {d.toLocaleDateString("ru-RU", { weekday: "short" })}
                      </span>
                      <span className={`text-lg font-extrabold tabular-nums ${isToday ? "text-brand" : ""}`}>{d.getDate()}</span>
                    </button>
                    <button
                      onClick={() => setCreating({ scheduledDate: iso(d) })}
                      aria-label={`Новая задача на ${fmtShort(d)}`}
                      title="Новая задача на этот день"
                      className={`absolute right-1.5 top-1.5 rounded-md p-1 text-ink-muted hover:bg-brand hover:text-white ${REVEAL}`}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* All-day row: tasks with a date but no time yet */}
            <div className="grid border-b border-line bg-canvas/60" style={{ gridTemplateColumns: `3.5rem repeat(${Math.max(days.length, 1)}, minmax(0, 1fr))` }}>
              <div className="flex items-start justify-end px-2 py-2 text-right text-[10px] font-bold uppercase leading-tight tracking-wider text-ink-muted">Весь<br />день</div>
              {days.map((d) => {
                const date = iso(d);
                const allDay = scoped.filter((t) => t.scheduledDate === date && !t.scheduledTime);
                const key = `allday:${date}`;
                return (
                  <div
                    key={date}
                    onDragOver={over(key)}
                    onDragLeave={leave(key)}
                    onDrop={drop(() => ({ scheduledDate: date }))}
                    className={`flex min-h-10 flex-col gap-1 border-l border-line p-1 transition-colors duration-150 ${dropCls(key)}`}
                  >
                    {allDay.map((t) => (
                      <div key={t.id} className="flex items-center gap-1">
                        <DoneCheckbox
                          done={t.status === "done"}
                          saving={saving.has(t.id)}
                          title={t.title}
                          onToggle={(next) => toggleDone(t, next)}
                          className="size-3.5"
                        />
                      <button
                        {...dragProps(t)}
                        onClick={() => setEditing(t)}
                        title="Назначить время или перетащить"
                        className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md border px-1.5 py-1 text-left text-[11px] font-semibold leading-snug transition-colors ${
                          t.isDailyFocus && t.status !== "done"
                            ? `border-amber-400 bg-amber-50 ${FOCUS_BLOCK}`
                            : "border-dashed border-brand/50 bg-surface hover:border-brand hover:bg-brand-soft/40"
                        } ${t.status === "done" ? DONE_CARD : ""} ${dragCls(t)}`}
                      >
                        {t.isDailyFocus && t.status !== "done" ? (
                          <Star className="size-3 shrink-0 text-amber-500" aria-hidden fill="currentColor" />
                        ) : (
                          <span className={`size-1.5 shrink-0 rounded-full ${PRIORITY[t.priority].dot}`} aria-hidden />
                        )}
                        <span className={`line-clamp-2 flex-1 ${t.status === "done" ? DONE_TITLE : ""}`}>{t.title}</span>
                        {t.attachments && t.attachments.length > 0 && (
                          <Paperclip className="size-3 shrink-0 text-ink-muted" aria-label={`Вложений: ${t.attachments.length}`} />
                        )}
                        {t.status === "done" ? (
                          <DoneBadge compact />
                        ) : (
                          <CalendarPlus className="size-3.5 shrink-0 text-brand" aria-hidden />
                        )}
                      </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="grid" style={{ gridTemplateColumns: `3.5rem repeat(${Math.max(days.length, 1)}, minmax(0, 1fr))` }}>
              <div className="relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_PX }}>
                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                  <span key={i} className="absolute right-2 -translate-y-1/2 text-[11px] font-semibold text-ink-muted tabular-nums" style={{ top: i * HOUR_PX }}>
                    {i === 0 ? "" : `${String(START_HOUR + i).padStart(2, "0")}:00`}
                  </span>
                ))}
              </div>
              {days.map((d) => {
                const key = iso(d);
                const isToday = key === todayIso;
                const blocks = layoutDay(scoped.filter((t) => t.scheduledDate === key && t.scheduledTime));
                const nowMin = now ? now.getHours() * 60 + now.getMinutes() : -1;
                const showNow = isToday && nowMin >= START_HOUR * 60 && nowMin <= END_HOUR * 60;
                const slotPrefix = `slot:${key}:`;
                const hoverHour = dropTarget?.startsWith(slotPrefix) ? Number(dropTarget.slice(slotPrefix.length)) : null;
                return (
                  <div
                    key={key}
                    onDragOver={(e) => over(`${slotPrefix}${hourAt(e)}`)(e)}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget((c) => (c?.startsWith(slotPrefix) ? null : c)); }}
                    onDrop={(e) => {
                      const time = `${String(hourAt(e)).padStart(2, "0")}:00`;
                      drop((t) => ({ scheduledDate: key, scheduledTime: time, durationMinutes: t.durationMinutes ?? 60 }))(e);
                    }}
                    className={`relative border-l border-line ${isToday ? "bg-brand-soft/20" : ""}`}
                    style={{ height: (END_HOUR - START_HOUR) * HOUR_PX }}
                  >
                    {/* Hour slots: grid lines that double as "new task at HH:00" (blocks render on top, so only empty space reacts) */}
                    {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
                      const time = `${String(START_HOUR + i).padStart(2, "0")}:00`;
                      return (
                        <button
                          key={i}
                          type="button"
                          tabIndex={-1}
                          onClick={() => setCreating({ scheduledDate: key, scheduledTime: time, durationMinutes: 60 })}
                          aria-label={`Новая задача: ${fmtShort(d)}, ${time}`}
                          className="group/slot absolute inset-x-0 flex items-start border-t border-line/70 p-1 text-left"
                          style={{ top: i * HOUR_PX, height: HOUR_PX }}
                        >
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-bold text-brand opacity-0 transition-opacity group-hover/slot:opacity-100 tabular-nums">
                            <Plus className="size-3" aria-hidden /> {time}
                          </span>
                        </button>
                      );
                    })}
                    {hoverHour !== null && (
                      <div
                        className="pointer-events-none absolute inset-x-1 z-30 rounded-lg border-2 border-dashed border-brand/60 bg-brand/10 px-1.5 py-1 text-[11px] font-bold text-brand tabular-nums"
                        style={{
                          top: (hoverHour - START_HOUR) * HOUR_PX,
                          height: (Math.min(dragged?.durationMinutes ?? 60, (END_HOUR - hoverHour) * 60) / 60) * HOUR_PX,
                        }}
                        aria-hidden
                      >
                        {String(hoverHour).padStart(2, "0")}:00
                      </div>
                    )}
                    {blocks.map((b) => {
                      const top = ((Math.max(b.start, START_HOUR * 60) - START_HOUR * 60) / 60) * HOUR_PX;
                      const bottom = ((Math.min(b.end, END_HOUR * 60) - START_HOUR * 60) / 60) * HOUR_PX;
                      const pr = PRIORITY[b.task.priority];
                      const initiative = b.task.link ? INITIATIVE_LABEL[b.task.link] : undefined;
                      const projectLabel = b.task.project;
                      const height = Math.max(bottom - top - 2, 22);
                      const done = b.task.status === "done";
                      return (
                        <div
                          key={b.task.id}
                          className="absolute"
                          style={{
                            top: top + 1,
                            height,
                            left: `calc(${(b.lane / b.lanes) * 100}% + 2px)`,
                            width: `calc(${100 / b.lanes}% - 4px)`,
                          }}
                        >
                          <button
                            {...dragProps(b.task)}
                            onClick={() => setEditing(b.task)}
                            className={`size-full overflow-hidden rounded-lg border border-line border-l-4 p-1.5 text-left shadow-sm transition-all duration-200 hover:z-10 hover:shadow-md ${
                              b.task.isDailyFocus && !done ? `z-10 bg-amber-50 ${FOCUS_BLOCK}` : "bg-surface"
                            } ${done ? DONE_CARD : ""} ${dragCls(b.task)}`}
                            style={{ borderLeftColor: getWorkspace(b.task.workspace).color }}
                          >
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-muted tabular-nums">
                              <span className={`size-1.5 shrink-0 rounded-full ${pr.dot}`} aria-label={`Приоритет: ${pr.label}`} />
                              {fmtTime(b.start)}–{fmtTime(b.end)}
                            </span>
                            <span className={`mt-0.5 line-clamp-2 text-xs font-semibold leading-snug ${done ? DONE_TITLE : ""}`}>
                              {b.task.title}
                            </span>
                            <span className="mt-1 flex flex-wrap gap-1">
                              {done && <DoneBadge compact />}
                              <span className="rounded bg-ink px-1 py-px text-[10px] font-semibold text-white">{projectLabel}</span>
                              {initiative && initiative !== projectLabel && (
                                <span className="rounded bg-muted px-1 py-px text-[10px] font-semibold text-ink-subtle ring-1 ring-line">{initiative}</span>
                              )}
                              {b.task.isDailyFocus && !done && <DailyFocusBadge compact />}
                              {b.task.attachments && b.task.attachments.length > 0 && <AttachmentMark count={b.task.attachments.length} />}
                              {showWorkspace && <WorkspaceBadge id={b.task.workspace} />}
                            </span>
                          </button>
                          {/* Hidden on very short blocks, where it would cover the title. */}
                          {height >= 34 && (
                            <span className="absolute right-1 top-1 z-20 rounded bg-surface/90 p-px shadow-sm">
                              <DoneCheckbox
                                done={done}
                                saving={saving.has(b.task.id)}
                                title={b.task.title}
                                onToggle={(next) => toggleDone(b.task, next)}
                              />
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {showNow && (
                      <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: ((nowMin - START_HOUR * 60) / 60) * HOUR_PX }} aria-hidden>
                        <span className="-ml-1 size-2.5 rounded-full bg-brand" />
                        <span className="h-0.5 flex-1 bg-brand" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
          )}
        </div>

        {/* Unscheduled tray */}
        {trayOpen && (
          <aside
            onDragOver={(e) => { if (dragged?.scheduledDate) over("tray")(e); }}
            onDragLeave={leave("tray")}
            onDrop={drop(() => null)}
            className={`flex flex-col rounded-xl border border-line bg-surface p-4 shadow-sm transition-colors duration-150 ${dropCls("tray")}`}
            aria-label="Задачи без времени"
          >
            <h2 className="flex items-center gap-2 font-bold"><Inbox className="size-4 text-brand" aria-hidden /> Без времени</h2>
            <label className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
              <input type="checkbox" checked={allPriorities} onChange={(e) => setAllPriorities(e.target.checked)} className="accent-[var(--color-brand)]" />
              Показать все приоритеты (не только High)
            </label>
            <ul className="mt-3 flex flex-col gap-2">
              {dropTarget === "tray" && (
                <li className="rounded-lg border-2 border-dashed border-brand/60 bg-brand/10 p-3 text-center text-xs font-bold text-brand">Отпустите, чтобы снять с расписания</li>
              )}
              {unscheduled.map((t) => (
                <li key={t.id} {...dragProps(t)} className={`rounded-lg border border-line bg-canvas p-3 ${dragCls(t)}`}>
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                    <span className={`size-1.5 rounded-full ${PRIORITY[t.priority].dot}`} aria-hidden />
                    <span className={PRIORITY[t.priority].text}>{PRIORITY[t.priority].label}</span>
                    {t.attachments && t.attachments.length > 0 && <AttachmentMark count={t.attachments.length} />}
                    <span className="ml-auto rounded bg-ink px-1 py-px text-[10px] text-white">{t.project}</span>
                  </p>
                  <p className="mt-1 flex items-start gap-2 text-sm font-semibold leading-snug">
                    <DoneCheckbox
                      done={t.status === "done"}
                      saving={saving.has(t.id)}
                      title={t.title}
                      onToggle={(next) => toggleDone(t, next)}
                      className="mt-0.5"
                    />
                    <span className="flex-1">{t.title}</span>
                  </p>
                  <button
                    onClick={() => setEditing(t)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-brand px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-brand-dark"
                  >
                    <CalendarPlus className="size-3.5" aria-hidden /> Назначить время
                  </button>
                </li>
              ))}
              {unscheduled.length === 0 && <li className="py-4 text-center text-xs text-ink-muted">Все задачи распланированы</li>}
            </ul>
          </aside>
        )}
      </div>

      {editing && (
        <ScheduleDialog
          task={merged.find((t) => t.id === editing.id) ?? editing}
          defaultDate={focusDate}
          saving={saving.has(editing.id)}
          onClose={() => setEditing(null)}
          onSave={(s, focus) => { setSchedule(editing.id, s, focus); setEditing(null); }}
          onAttachments={(next) => patchTask(editing.id, { attachments: next })}
        />
      )}

      {creating && <CreateTaskDialog initial={creating} workspace={workspace} onClose={() => setCreating(null)} onCreate={createTask} />}
    </div>
  );
}

/**
 * One day on /schedule. The same DayTimeline that "Сегодня" uses, so the two cannot drift, plus
 * this day's untimed tasks underneath — the week grid shows those in its "весь день" row, which
 * the timeline has no equivalent for.
 */
function DayPanel({ date, tasks, now, isToday, showWorkspace, saving, onOpen, onToggleDone, onCreate }: {
  date: string;
  /** Every workspace-scoped task; the panel picks this day's out of it. */
  tasks: Task[];
  now: Date | null;
  isToday: boolean;
  showWorkspace: boolean;
  saving: ReadonlySet<string>;
  onOpen: (task: Task) => void;
  onToggleDone: (task: Task, next: boolean) => void;
  onCreate: () => void;
}) {
  const forDay = tasks.filter((t) => t.scheduledDate === date);
  const untimed = forDay.filter((t) => !t.scheduledTime);

  return (
    <div className="p-3 sm:p-4">
      <DayTimeline
        tasks={forDay.filter((t) => t.scheduledTime)}
        now={now}
        isToday={isToday}
        showWorkspace={showWorkspace}
        saving={saving}
        onOpen={onOpen}
        onToggleDone={onToggleDone}
        onCreate={onCreate}
      />
      {untimed.length > 0 && (
        <section className="mt-4 border-t border-line pt-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
            <Inbox className="size-3.5" aria-hidden /> Весь день
          </h3>
          <ul className="flex flex-col gap-1.5">
            {untimed.map((t) => {
              const done = t.status === "done";
              return (
                <li
                  key={t.id}
                  className={`flex items-start gap-2.5 rounded-xl border border-line border-l-4 bg-surface p-2.5 shadow-sm ${done ? DONE_CARD : ""}`}
                  style={{ borderLeftColor: getWorkspace(t.workspace).color }}
                >
                  <span className="pt-0.5">
                    <DoneCheckbox done={done} saving={saving.has(t.id)} title={t.title} onToggle={(next) => onToggleDone(t, next)} />
                  </span>
                  <button onClick={() => onOpen(t)} className="min-w-0 flex-1 text-left" title="Открыть задачу">
                    <span className={`block text-sm font-bold leading-snug ${done ? DONE_TITLE : ""}`}>{t.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
                      <span className={`size-1.5 rounded-full ${PRIORITY[t.priority].dot}`} aria-hidden />
                      <span className="rounded bg-ink px-1 py-px text-[10px] text-white">{t.project}</span>
                      {t.attachments && t.attachments.length > 0 && <AttachmentMark count={t.attachments.length} />}
                      {showWorkspace && <WorkspaceBadge id={t.workspace} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function CreateTaskDialog({ initial, workspace, onClose, onCreate }: {
  initial: Schedule;
  workspace: WorkspaceFilter;
  onClose: () => void;
  /** Resolves to an error message to display, or null once the task is saved. */
  onCreate: (task: Omit<Task, "id">) => Promise<string | null>;
}) {
  // Only directions in the active workspace can be picked, so a new task cannot land in a
  // workspace the user is not looking at. In "all" mode every direction is offered.
  const projectOptions = useMemo(
    () => PROJECTS.filter((p) => inWorkspace(projectWorkspace(p), workspace)),
    [workspace],
  );
  const [title, setTitle] = useState("");
  const [project, setProject] = useState<Project>(projectOptions[0] ?? "Marketing");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<Status>("backlog");
  const [assignee, setAssignee] = useState<Assignee>("Human");
  const [date, setDate] = useState(initial.scheduledDate ?? "");
  const [time, setTime] = useState(initial.scheduledTime ?? "");
  const [duration, setDuration] = useState(initial.durationMinutes ?? 60);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [isDailyFocus, setIsDailyFocus] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timed = Boolean(date && time);
  const outsideGrid = timed && (toMinutes(time) < START_HOUR * 60 || toMinutes(time) + duration > END_HOUR * 60);

  return (
    <DialogFrame labelledBy="create-title" onClose={onClose}>
      <div className="flex items-start gap-3">
        <h2 id="create-title" className="flex flex-1 items-center gap-2 text-lg font-bold"><Plus className="size-5 text-brand" aria-hidden /> Новая задача</h2>
        <button onClick={onClose} aria-label="Закрыть" className="rounded-md p-1 text-ink-muted hover:text-ink"><X className="size-5" /></button>
      </div>
      <form
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim() || pending) return;
          setPending(true);
          setError(null);
          // Field order and validation mirror the tasks table (see src/lib/task-validate.ts).
          const message = await onCreate({
            title: title.trim(),
            status,
            priority,
            assignee,
            project,
            workspace: projectWorkspace(project),
            tags: [...new Set(tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean))],
            ...(notes.trim() && { notes: notes.trim() }),
            ...(date && { scheduledDate: date }),
            ...(timed && { scheduledTime: time, durationMinutes: Math.min(Math.max(Math.round(duration / 15) * 15, 15), 720) }),
            ...(date && isDailyFocus && { isDailyFocus: true }),
          });
          // On success the parent closes the dialog; on failure keep the input.
          if (message) {
            setError(message);
            setPending(false);
          }
        }}
      >
        <label className={`${labelCls} sm:col-span-2`}>Название *
          <input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Созвон с клиентом UK" className={`mt-1 ${fieldCls}`} />
        </label>
        <label className={labelCls}>Проект
          <select value={project} onChange={(e) => setProject(e.target.value as Project)} className={`mt-1 ${fieldCls}`}>
            {projectOptions.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className={labelCls}>Исполнитель
          <select value={assignee} onChange={(e) => setAssignee(e.target.value as Assignee)} className={`mt-1 ${fieldCls}`}>
            {ASSIGNEES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <label className={labelCls}>Приоритет
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={`mt-1 ${fieldCls}`}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
          </select>
        </label>
        <label className={labelCls}>Статус
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className={`mt-1 ${fieldCls}`}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          <label className={labelCls}>Дата
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (!e.target.value) setIsDailyFocus(false); // focus cannot outlive its day
              }}
              className={`mt-1 ${fieldCls}`}
            />
          </label>
          <label className={labelCls}>Время
            <input type="time" step={900} value={time} disabled={!date} onChange={(e) => setTime(e.target.value)} className={`mt-1 ${fieldCls} disabled:opacity-50`} />
          </label>
          <label className={labelCls}>Минут
            <input type="number" min={15} max={720} step={15} value={duration} disabled={!timed} onChange={(e) => setDuration(Number(e.target.value))} className={`mt-1 ${fieldCls} disabled:opacity-50`} />
          </label>
        </div>
        <p className="-mt-1 text-xs text-ink-subtle sm:col-span-2">
          {!date ? "Без даты задача попадёт в «Без времени»." : !time ? "Без времени — в строку «Весь день»." : outsideGrid ? <span className="text-amber-700">Блок выходит за сетку 08:00–20:00 и будет обрезан.</span> : null}
        </p>
        <label className={`${labelCls} sm:col-span-2`}>Заметки
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`mt-1 ${fieldCls}`} />
        </label>
        <div className="sm:col-span-2">
          <DailyFocusToggle checked={isDailyFocus} hasDate={Boolean(date)} disabled={pending} onChange={setIsDailyFocus} />
        </div>
        <label className={`${labelCls} sm:col-span-2`}>Теги (через запятую)
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="sales, uk, call" className={`mt-1 ${fieldCls}`} />
        </label>
        {error && <p role="alert" className="text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
        <div className="mt-2 flex items-center gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} disabled={pending} className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-60">Отмена</button>
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-brand-dark hover:shadow-md disabled:opacity-60">
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Создать
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}
