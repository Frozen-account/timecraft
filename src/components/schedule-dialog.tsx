"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, ExternalLink, Loader2, X } from "lucide-react";
import { DailyFocusToggle } from "@/components/daily-focus";
import { DialogFrame, fieldCls } from "@/components/dialog-frame";
import { TaskAttachments } from "@/components/task-attachments";
import { PRIORITY } from "@/lib/labels";
import { DURATIONS, END_HOUR, TIME_OPTIONS, fmtDuration, toMinutes } from "@/lib/schedule";
import type { Attachment, Schedule, Task } from "@/lib/types";

/**
 * The task editor: details on top, attachments, then the scheduling form. Opened from the week
 * grid, the day timeline and "Сегодня", so it lives here rather than inside any one of them.
 */
export function ScheduleDialog({ task, defaultDate, saving, onClose, onSave, onAttachments }: {
  task: Task;
  defaultDate: string;
  saving: boolean;
  onClose: () => void;
  onSave: (s: Schedule | null, isDailyFocus: boolean) => void;
  /** Persists the attachment list. Resolves to an error message, or null once saved. */
  onAttachments: (next: Attachment[]) => Promise<string | null>;
}) {
  const [date, setDate] = useState(task.scheduledDate ?? defaultDate);
  const [time, setTime] = useState(task.scheduledTime && TIME_OPTIONS.includes(task.scheduledTime) ? task.scheduledTime : "10:00");
  const [duration, setDuration] = useState(task.durationMinutes ?? 60);
  // Date-only tasks open with a time selected, since the point is usually to assign one.
  const [allDay, setAllDay] = useState(false);
  const [isDailyFocus, setIsDailyFocus] = useState(task.isDailyFocus === true);
  const pr = PRIORITY[task.priority];
  const endsLate = toMinutes(time) + duration > END_HOUR * 60;

  return (
    <DialogFrame labelledBy="schedule-title" onClose={onClose}>
        <div className="flex items-start gap-3">
          <h2 id="schedule-title" className="flex-1 text-lg font-bold leading-snug">{task.title}</h2>
          <button onClick={onClose} aria-label="Закрыть" className="rounded-md p-1 text-ink-muted hover:text-ink"><X className="size-5" /></button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
          <span className="rounded-md bg-ink px-2 py-0.5 text-white">{task.project}</span>
          <span className={`inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 ${pr.text}`}><span className={`size-1.5 rounded-full ${pr.dot}`} />{pr.label}</span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-ink-subtle">{task.assignee}</span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-ink-subtle">{task.status.replace("_", " ")}</span>
        </div>
        {task.notes && <p className="mt-3 text-sm text-ink-muted">{task.notes}</p>}
        {task.tags.length > 0 && <p className="mt-2 text-xs text-ink-subtle">{task.tags.map((t) => `#${t}`).join(" ")}</p>}
        {task.link && (
          <Link href={task.link} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            Открыть проект <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        )}

        {/* Uploads save on their own, immediately: they are not part of the schedule form below,
            and waiting for "Сохранить" to commit a file the user can already see would lie. */}
        <TaskAttachments
          taskId={task.id}
          attachments={task.attachments ?? []}
          disabled={saving}
          onChange={onAttachments}
        />

        <form
          className="mt-5 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!date) return;
            onSave(allDay ? { scheduledDate: date } : { scheduledDate: date, scheduledTime: time, durationMinutes: duration }, isDailyFocus);
          }}
        >
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Clock className="size-4 text-brand" aria-hidden /> {task.scheduledTime ? "Перенести" : "Назначить время"}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-ink-muted">Дата
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 ${fieldCls}`} />
            </label>
            <label className="text-xs font-semibold text-ink-muted">Начало
              <select value={time} disabled={allDay} onChange={(e) => setTime(e.target.value)} className={`mt-1 ${fieldCls} disabled:opacity-50`}>
                {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-ink-muted">Длительность
              <select value={duration} disabled={allDay} onChange={(e) => setDuration(Number(e.target.value))} className={`mt-1 ${fieldCls} disabled:opacity-50`}>
                {DURATIONS.map((d) => <option key={d} value={d}>{fmtDuration(d)}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-ink-subtle">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="accent-[var(--color-brand)]" />
            На весь день (без конкретного времени)
          </label>
          {!allDay && endsLate && <p className="mt-2 text-xs text-amber-700">Блок заканчивается после 20:00 — в сетке он будет обрезан.</p>}
          <div className="mt-3">
            <DailyFocusToggle checked={isDailyFocus} hasDate={Boolean(date)} disabled={saving} onChange={setIsDailyFocus} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {task.scheduledDate && (
              <button type="button" disabled={saving} onClick={() => onSave(null, false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted hover:text-brand disabled:opacity-60">Снять с расписания</button>
            )}
            <button type="button" onClick={onClose} className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink">Отмена</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-brand-dark hover:shadow-md disabled:opacity-60">
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Сохранить
            </button>
          </div>
        </form>
    </DialogFrame>
  );
}
