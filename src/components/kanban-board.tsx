"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, CalendarClock, ExternalLink, Loader2, Sparkles, User } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { WorkspaceBadge } from "@/components/workspace-switcher";
import { ALL_WORKSPACES, ASSIGNEES, PROJECTS, projectWorkspace, type Assignee, type Priority, type Project, type Status, type Task } from "@/lib/types";
import { STATUS_LABEL, PRIORITY } from "@/lib/labels";
import { inWorkspace } from "@/lib/workspaces";

const COLUMNS: { id: Status; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

const ASSIGNEE_STYLE: Record<Assignee, { cls: string; icon: typeof Bot }> = {
  Claude: { cls: "bg-orange-50 text-orange-800 ring-orange-200", icon: Bot },
  Gemini: { cls: "bg-blue-50 text-blue-800 ring-blue-200", icon: Sparkles },
  Human: { cls: "bg-muted text-ink ring-line", icon: User },
};

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

// "28 окт., 14:00–15:00" or just "28 окт." for date-only tasks.
function formatSlot({ scheduledDate, scheduledTime, durationMinutes }: Task) {
  const [y, m, d] = scheduledDate!.split("-").map(Number);
  const day = new Date(y, m - 1, d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  if (!scheduledTime) return day;
  const [h, min] = scheduledTime.split(":").map(Number);
  const end = h * 60 + min + (durationMinutes ?? 60);
  const endStr = `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  return `${day}, ${scheduledTime}–${endStr}`;
}

function formatDue(due: string) {
  const [y, m, d] = due.split("-").map(Number);
  const date = new Date(y, m - 1, d ?? 1);
  return d
    ? date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
    : date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const { workspace } = useWorkspace();
  const router = useRouter();
  // Ids with a PATCH in flight, plus the last failure, so a rejected drop says why.
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<Status | null>(null);
  const [assignee, setAssignee] = useState<Assignee | "all">("all");
  const [project, setProject] = useState<Project | "all">("all");
  const showWorkspace = workspace === ALL_WORKSPACES;

  // Only directions belonging to the active workspace are offered in the project filter.
  const projectOptions = useMemo(
    () => PROJECTS.filter((p) => inWorkspace(projectWorkspace(p), workspace)),
    [workspace],
  );

  // Derived, not synced: a direction filter left over from another workspace would silently
  // empty the board, so it reads as "all" until the user picks one that exists here.
  const activeProject = project !== "all" && projectOptions.includes(project) ? project : "all";

  const visible = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            inWorkspace(t.workspace, workspace) &&
            (assignee === "all" || t.assignee === assignee) &&
            (activeProject === "all" || t.project === activeProject),
        )
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
    [tasks, assignee, activeProject, workspace],
  );

  async function setStatus(id: string, status: Status) {
    setSaving((s) => new Set(s).add(id));
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; detail?: string };
      if (!res.ok || !data.ok) setError(data.detail ?? data.error ?? "Не удалось изменить статус.");
      else router.refresh();
    } catch {
      setError("Нет связи с сервером. Статус не сохранён.");
    } finally {
      setSaving((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  const endDrag = () => {
    setDragId(null);
    setDropTarget(null);
  };

  // Only react to our own card drags, not files or text dragged in from outside.
  const columnProps = (col: Status) => ({
    onDragOver: (e: React.DragEvent<HTMLElement>) => {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropTarget(col);
    },
    onDragLeave: (e: React.DragEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        setDropTarget((c) => (c === col ? null : c));
      }
    },
    onDrop: (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain") || dragId;
      const task = id ? tasks.find((t) => t.id === id) : undefined;
      if (task && task.status !== col) void setStatus(task.id, col);
      endDrag();
    },
  });

  return (
    <div>
      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto rounded-md px-2.5 py-1 font-semibold hover:bg-red-100">Скрыть</button>
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FilterSelect label="Исполнитель" value={assignee} options={ASSIGNEES} onChange={(v) => setAssignee(v as Assignee | "all")} />
        <FilterSelect label="Проект" value={activeProject} options={projectOptions} onChange={(v) => setProject(v as Project | "all")} />
      </div>

      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = visible.filter((t) => t.status === col.id);
          return (
            <section
              key={col.id}
              aria-label={col.title}
              {...columnProps(col.id)}
              className={`flex w-72 shrink-0 snap-start flex-col rounded-xl border p-3 transition-colors duration-150 md:w-auto ${
                dropTarget === col.id ? "border-brand bg-brand/5" : "border-line bg-muted/60"
              }`}
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-ink-subtle">{col.title}</h2>
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-ink-muted ring-1 ring-line">{items.length}</span>
              </header>
              <div className="flex min-h-24 flex-1 flex-col gap-2.5">
                {items.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    showWorkspace={showWorkspace}
                    saving={saving.has(task.id)}
                    dragging={dragId === task.id}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", task.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(task.id);
                    }}
                    onDragEnd={endDrag}
                    onStatusChange={(status) => void setStatus(task.id, status)}
                  />
                ))}
                {items.length === 0 && (
                  <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-ink-muted">
                    {dropTarget === col.id ? "Отпустите, чтобы перенести" : "Пусто"}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({
  task, showWorkspace, saving, dragging, onDragStart, onDragEnd, onStatusChange,
}: {
  task: Task;
  showWorkspace: boolean;
  saving: boolean;
  dragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onStatusChange: (status: Status) => void;
}) {
  const a = ASSIGNEE_STYLE[task.assignee];
  const AssigneeIcon = a.icon;
  const pr = PRIORITY[task.priority];
  return (
    <article
      draggable={!saving}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-busy={saving || undefined}
      className={`rounded-xl border border-line bg-surface p-3.5 shadow-sm transition-all duration-200 hover:shadow-md ${
        saving ? "opacity-60" : "cursor-grab active:cursor-grabbing"
      } ${dragging ? "opacity-50" : ""}`}
    >
      {showWorkspace && (
        <p className="mb-2">
          <WorkspaceBadge id={task.workspace} />
        </p>
      )}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-semibold text-white">{task.project}</span>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${pr.text}`}>
          <span className={`size-2 rounded-full ${pr.dot}`} aria-hidden />
          {pr.label}
        </span>
      </div>
      <h3 className="text-sm font-semibold leading-snug">
        {task.link ? (
          <Link href={task.link} className="hover:text-brand hover:underline">
            {task.title} <ExternalLink className="inline size-3 align-baseline text-ink-muted" aria-hidden />
          </Link>
        ) : task.title}
      </h3>
      {task.notes && <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{task.notes}</p>}
      {task.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span key={tag} className="rounded bg-canvas px-1.5 py-0.5 text-[11px] font-medium text-ink-subtle ring-1 ring-line">#{tag}</span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5 text-xs">
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold ring-1 ${a.cls}`}>
          <AssigneeIcon className="size-3" aria-hidden /> {task.assignee}
        </span>
        <label className="inline-flex items-center gap-1">
          <span className="sr-only">Статус: {task.title}</span>
          {saving ? (
            <Loader2 className="size-3.5 animate-spin text-brand" aria-label="Сохранение" />
          ) : (
            <select
              value={task.status}
              onChange={(e) => onStatusChange(e.target.value as Status)}
              className="rounded-md border border-line bg-canvas px-1.5 py-0.5 text-[11px] font-semibold text-ink-subtle hover:border-brand focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {COLUMNS.map((c) => <option key={c.id} value={c.id}>{STATUS_LABEL[c.id]}</option>)}
            </select>
          )}
        </label>
        {task.scheduledDate ? (
          <span className="ml-auto inline-flex items-center gap-1 font-semibold text-ink-subtle">
            <CalendarClock className="size-3.5 text-brand" aria-hidden /> {formatSlot(task)}
          </span>
        ) : task.due && (
          <span className="ml-auto inline-flex items-center gap-1 text-ink-muted">
            <CalendarClock className="size-3.5" aria-hidden /> {formatDue(task.due)}
          </span>
        )}
      </div>
    </article>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-sm">
      <span className="font-semibold text-ink-muted">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent font-semibold focus:outline-none">
        <option value="all">Все</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
