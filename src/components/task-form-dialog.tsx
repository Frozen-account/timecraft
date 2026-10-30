"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
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
  onCreate: (draft: Omit<Task, "id">) => void;
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
  const [error, setError] = useState<string | null>(null);

  // The workspace is never picked by hand: a direction belongs to exactly one workspace
  // (PROJECT_WORKSPACE), so deriving it here is what keeps the two from drifting apart.
  const derivedWorkspace = projectWorkspace(project);
  const ws = getWorkspace(derivedWorkspace);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Введите название задачи.");
      return;
    }
    // Mirrors the validation in src/lib/data.ts so a draft cannot break the build when committed.
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      setError("Срок должен быть в формате ГГГГ-ММ-ДД.");
      return;
    }
    onCreate({
      title: title.trim(),
      status,
      priority,
      assignee,
      project,
      workspace: derivedWorkspace,
      tags: [],
      ...(due && { due }),
    });
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
          Исполнитель
          <select value={assignee} onChange={(e) => setAssignee(e.target.value as Assignee)} className={`mt-1 ${fieldCls}`}>
            {ASSIGNEES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>

        {error && <p role="alert" className="text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}

        <p className="-mt-1 text-xs text-ink-subtle sm:col-span-2">
          Задача сохранится только в этом браузере. Чтобы её увидела команда, скопируйте JSON в{" "}
          <code className="text-[11px]">backlog/tasks.json</code> и закоммитьте — кнопка на странице «Календарь».
        </p>

        <div className="mt-2 flex items-center gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink">
            Отмена
          </button>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-brand-dark hover:shadow-md">
            Создать
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}
