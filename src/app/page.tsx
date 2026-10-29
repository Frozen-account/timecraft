import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Brain, CalendarClock, ListTodo } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { getAgents, getMemoryDocs, getTasks } from "@/lib/data";
import { PROJECTS } from "@/lib/types";

export const metadata: Metadata = { title: "Дашборд · TimeCraft" };

// Overview of every project ("направление"): open work, schedule and how much context agents have for it.
export default function DashboardPage() {
  const tasks = getTasks();
  const memory = getMemoryDocs();
  const open = tasks.filter((t) => t.status !== "done");

  const stats = [
    { label: "Открытых задач", value: open.length },
    { label: "В работе", value: tasks.filter((t) => t.status === "in_progress").length },
    { label: "На ревью", value: tasks.filter((t) => t.status === "review").length },
    { label: "Файлов памяти", value: memory.length },
    { label: "Агентов", value: getAgents().length },
  ];

  const projects = PROJECTS.map((name) => {
    const projectOpen = open.filter((t) => t.project === name);
    const scheduled = projectOpen.filter((t) => t.scheduledDate).sort((a, b) =>
      `${a.scheduledDate} ${a.scheduledTime ?? ""}`.localeCompare(`${b.scheduledDate} ${b.scheduledTime ?? ""}`));
    return {
      name,
      open: projectOpen.length,
      high: projectOpen.filter((t) => t.priority === "high").length,
      inProgress: projectOpen.filter((t) => t.status === "in_progress").length,
      next: scheduled[0],
      memory: memory.filter((d) => d.project === name).length,
      docs: [...new Set(tasks.filter((t) => t.project === name && t.link).map((t) => t.link!))],
    };
  }).sort((a, b) => b.open - a.open || b.high - a.high);

  return (
    <>
      <PageHeader title="Дашборд" subtitle="Все направления на одном экране. Данные — из backlog/tasks.json и memory/." />

      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse rounded-xl border border-line bg-surface p-4 shadow-sm">
            <dt className="text-xs font-semibold text-ink-muted">{s.label}</dt>
            <dd className="text-2xl font-extrabold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-subtle">Направления</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <section key={p.name} className={`flex flex-col rounded-xl border border-line bg-surface p-5 shadow-sm ${p.open === 0 ? "opacity-70" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold">{p.name}</h3>
              {p.high > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">High: {p.high}</span>}
            </div>
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
    </>
  );
}
