"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { DailyFocusToggle } from "@/components/daily-focus";
import { DialogFrame, fieldCls, labelCls } from "@/components/dialog-frame";
import { WorkspaceAvatar } from "@/components/workspace-switcher";
import { PRIORITY, STATUS_LABEL } from "@/lib/labels";
import {
  ALL_WORKSPACES, ASSIGNEES, PRIORITIES, PROJECTS, STATUSES, projectWorkspace,
  type Assignee, type Priority, type Project, type Status, type Task, type WorkspaceFilter,
} from "@/lib/types";
import { getWorkspace, inWorkspace } from "@/lib/workspaces";

export function TaskFormDialog({
  workspace,
  onClose,
  onCreate,
}: {
  workspace: WorkspaceFilter;
  onClose: () => void;
  /** Resolves to an error message to display, or null once the task is saved. */
  onCreate: (draft: Omit<Task, "id">) => Promise<string | null>;
}) {
  // Only directions in the active workspace are offered, so a task cannot land somewhere
  // the user is not looking at. In the aggregate view every direction is available.
  const projectOptions = useMemo(
    () => PROJECTS.filter((p) => inWorkspace(projectWorkspace(p), workspace)),
    [workspace],
  );

  const [title, setTitle] = useState("");
  const [project, setProject] = useState<Project>(projectOptions[0] ?? "Marketing");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<Status>("backlog");
  const [assignee, setAssignee] = useState<Assignee>("Human");
  const [due, setDue] = useState("");
  // Calendar date, separate from the soft deadline above: "дело дня" is tied to a scheduled day.
  const [scheduledDate, setScheduledDate] = useState("");
  const [isDailyFocus, setIsDailyFocus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // The workspace is never picked by hand: a direction belongs to exactly one workspace
  // (PROJECT_WORKSPACE), so deriving it here is what keeps the two from drifting apart.
  const derivedWorkspace = projectWorkspace(project);
  const ws = getWorkspace(derivedWorkspace);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!title.trim()) {
      setError("Введите название задачи.");
      return;
    }
    // Mirrors the validation in src/lib/data.ts so a draft cannot break the build when committed.
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      setError("Срок должен быть в формате ГГГГ-ММ-ДД.");
      return;
    }
    if (isDailyFocus && !scheduledDate) {
      setError("У «дела дня» должна быть дата в календаре.");
      return;
    }
    setPending(true);
    const message = await onCreate({
      title: title.trim(),
      status,
      priority,
      assignee,
      project,
      workspace: derivedWorkspace,
      tags: [],
      ...(due && { due }),
      ...(scheduledDate && { scheduledDate }),
      ...(isDailyFocus && { isDailyFocus: true }),
    });
    // On success the parent closes the dialog; on failure keep the input so nothing is retyped.
    if (message) {
      setError(message);
      setPending(false);
    }
  }

  return (
    <DialogFrame labelledBy="task-form-title" onClose={onClose}>
      <div className="flex items-start gap-3">
        <h2 id="task-form-title" className="flex flex-1 items-center gap-2 text-lg font-bold">
          <Plus className="size-5 text-brand" aria-hidden /> Новая задача
        </h2>
        <button onClick={onClose} aria-label="Закрыть" className="rounded-md p-1 text-ink-muted hover:text-ink">
          <X className="size-5" />
        </button>
      </div>

      <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={submit} noValidate>
        <label className={`${labelCls} sm:col-span-2`}>
          Название *
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(null); }}
            placeholder="Созвон с клиентом UK"
            className={`mt-1 ${fieldCls}`}
          />
        </label>

        <label className={labelCls}>
          Направление
          <select value={project} onChange={(e) => setProject(e.target.value as Project)} className={`mt-1 ${fieldCls}`}>
            {projectOptions.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>

        {/* Read-only on purpose: it follows the direction rather than being chosen separately. */}
        <div className={labelCls}>
          Воркспейс
          <p className="mt-1 flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
            <WorkspaceAvatar filter={derivedWorkspace} size="sm" />
            <span className="truncate text-sm font-semibold text-ink">{ws.name}</span>
            <span className="ml-auto text-[11px] font-semibold text-ink-muted">
              {workspace === ALL_WORKSPACES ? "по направлению" : "текущий"}
            </span>
          </p>
        </div>

        <label className={labelCls}>
          Приоритет
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={`mt-1 ${fieldCls}`}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
          </select>
        </label>

        <label className={labelCls}>
          Статус
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className={`mt-1 ${fieldCls}`}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>

        <label className={labelCls}>
          Срок
          <input
            type="date"
            value={due}
            onChange={(e) => { setDue(e.target.value); setError(null); }}
            className={`mt-1 ${fieldCls}`}
          />
        </label>

        <label className={labelCls}>
          Дата в календаре
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => {
              setScheduledDate(e.target.value);
              if (!e.target.value) setIsDailyFocus(false); // focus cannot outlive its day
              setError(null);
            }}
            className={`mt-1 ${fieldCls}`}
          />
        </label>

        <label className={labelCls}>
          Исполнитель
          <select value={assignee} onChange={(e) => setAssignee(e.target.value as Assignee)} className={`mt-1 ${fieldCls}`}>
            {ASSIGNEES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>

        <div className="sm:col-span-2">
          <DailyFocusToggle
            checked={isDailyFocus}
            hasDate={Boolean(scheduledDate)}
            disabled={pending}
            onChange={(v) => { setIsDailyFocus(v); setError(null); }}
          />
        </div>

        {error && <p role="alert" className="text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}

        <p className="-mt-1 text-xs text-ink-subtle sm:col-span-2">
          Задача сохраняется в Supabase и сразу видна команде и агентам через{" "}
          <code className="text-[11px]">/api/context</code>.
        </p>

        <div className="mt-2 flex items-center gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} disabled={pending} className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-60">
            Отмена
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-brand-dark hover:shadow-md disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Создать
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}
