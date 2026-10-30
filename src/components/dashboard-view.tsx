"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Brain, CalendarClock, ListTodo } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { WorkspaceBadge } from "@/components/workspace-switcher";
import { ALL_WORKSPACES, PROJECTS, projectWorkspace, type Project, type Task, type WorkspaceId } from "@/lib/types";
import { getWorkspace, inWorkspace, workspaceLabel } from "@/lib/workspaces";

// Slim projections: the dashboard only counts these, so memory bodies stay out of the client bundle.
export type MemoryRef = { project?: Project; workspace?: WorkspaceId };
export type AgentRef = { id: string; allowedWorkspaces: (WorkspaceId | "*")[] };

export function DashboardView({ tasks, memory, agents }: { tasks: Task[]; memory: MemoryRef[]; agents: AgentRef[] }) {
  const { workspace } = useWorkspace();
  const showBadges = workspace === ALL_WORKSPACES;

  const { stats, directions } = useMemo(() => {
    const scopedTasks = tasks.filter((t) => inWorkspace(t.workspace, workspace));
    const scopedMemory = memory.filter((d) => inWorkspace(d.workspace, workspace));
    const scopedAgents = agents.filter(
      (a) => workspace === ALL_WORKSPACES || a.allowedWorkspaces.includes("*") || a.allowedWorkspaces.includes(workspace),
    );
    const open = scopedTasks.filter((t) => t.status !== "done");

    const directions = PROJECTS.filter((name) => inWorkspace(projectWorkspace(name), workspace))
      .map((name) => {
        const projectOpen = open.filter((t) => t.project === name);
        const scheduled = projectOpen
          .filter((t) => t.scheduledDate)
          .sort((a, b) =>
            `${a.scheduledDate} ${a.scheduledTime ?? ""}`.localeCompare(`${b.scheduledDate} ${b.scheduledTime ?? ""}`));
        return {
          name,
          workspace: projectWorkspace(name),
          open: projectOpen.length,
          high: projectOpen.filter((t) => t.priority === "high").length,
          inProgress: projectOpen.filter((t) => t.status === "in_progress").length,
          next: scheduled[0],
          memory: scopedMemory.filter((d) => d.project === name).length,
          docs: [...new Set(scopedTasks.filter((t) => t.project === name && t.link).map((t) => t.link!))],
        };
      })
      .sort((a, b) => b.open - a.open || b.high - a.high);

    return {
      stats: [
        { label: "Открытых задач", value: open.length },
        { label: "В работе", value: scopedTasks.filter((t) => t.status === "in_progress").length },
        { label: "На ревью", value: scopedTasks.filter((t) => t.status === "review").length },
        { label: "Файлов памяти", value: scopedMemory.length },
        { label: "Агентов", value: scopedAgents.length },
      ],
      directions,
    };
  }, [tasks, memory, agents, workspace]);

  const label = workspaceLabel(workspace);

  return (
    <>
      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse rounded-xl border border-line bg-surface p-4 shadow-sm">
            <dt className="text-xs font-semibold text-ink-muted">{s.label}</dt>
            <dd className="text-2xl font-extrabold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mb-3 flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-subtle">
        Направления
        <span className="font-semibold normal-case tracking-normal text-ink-muted">
          {label.icon} {label.name}
        </span>
      </h2>

      {directions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-surface p-6 text-sm text-ink-muted">
          В этом воркспейсе пока нет направлений. Добавьте их в <code>PROJECT_WORKSPACE</code> (src/lib/types.ts).
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {directions.map((p) => (
            <section
              key={p.name}
              className={`flex flex-col rounded-xl border border-line bg-surface p-5 shadow-sm ${p.open === 0 ? "opacity-70" : ""}`}
              style={{ borderLeft: `3px solid ${getWorkspace(p.workspace).color}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold">{p.name}</h3>
                {p.high > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">High: {p.high}</span>
                )}
              </div>
              {showBadges && <p className="mt-2"><WorkspaceBadge id={p.workspace} /></p>}
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-subtle">
                <span className="inline-flex items-center gap-1.5"><ListTodo className="size-4 text-brand" aria-hidden /> {p.open} откр. · {p.inProgress} в работе</span>
                <span className="inline-flex items-center gap-1.5"><Brain className="size-4 text-brand" aria-hidden /> {p.memory} в памяти</span>
              </p>
              {p.next && (
                <p className="mt-2 flex items-start gap-1.5 text-sm">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  <span><span className="font-semibold tabular-nums">{p.next.scheduledDate}{p.next.scheduledTime && ` ${p.next.scheduledTime}`}</span> — {p.next.title}</span>
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-xs font-semibold">
                {p.docs.map((href) => (
                  <Link key={href} href={href} className="inline-flex items-center gap-1 text-ink-subtle hover:text-brand">
                    {href} <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
