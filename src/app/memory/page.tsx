import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Brain } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { getAgents, getMemoryDocs } from "@/lib/data";
import { canSeeProject } from "@/lib/access";

export const metadata: Metadata = { title: "Память · TimeCraft" };

export default function MemoryPage() {
  const docs = getMemoryDocs();
  const agents = getAgents().filter((a) => a.scopes.includes("memory"));
  // Shared context first, then grouped by project.
  const groups = Map.groupBy(docs, (d): string => d.project ?? "Общий контекст");
  const order = ["Общий контекст", ...[...groups.keys()].filter((k) => k !== "Общий контекст").sort()];

  return (
    <>
      <PageHeader title="Память" subtitle="Контекст проектов для агентов — файлы memory/*.md. Формат описан в memory/README.md." />
      {docs.length === 0 && <p className="text-sm text-ink-muted">Файлов памяти пока нет.</p>}
      {order.filter((k) => groups.has(k)).map((group) => (
        <section key={group} className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-subtle">{group}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groups.get(group)!.map((d) => {
              const readers = agents.filter((a) => canSeeProject(a, d.project));
              return (
                <Link
                  key={d.slug}
                  href={`/memory/${d.slug}`}
                  className="group flex flex-col rounded-xl border border-line bg-surface p-5 shadow-sm transition-all duration-200 hover:border-brand hover:shadow-md"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <Brain className="size-5 text-brand" aria-hidden />
                    {d.updated && <span className="text-[11px] font-semibold text-ink-muted tabular-nums">{d.updated}</span>}
                  </div>
                  <h3 className="font-bold">{d.title}</h3>
                  {d.summary && <p className="mt-1 flex-1 text-sm text-ink-muted">{d.summary}</p>}
                  <p className="mt-3 flex flex-wrap gap-1 text-[11px] font-semibold">
                    <span className="text-ink-muted">Видят:</span>
                    {readers.length > 0
                      ? readers.map((a) => <span key={a.id} className="rounded bg-brand-soft px-1.5 py-px text-brand-dark">{a.name}</span>)
                      : <span className="text-ink-muted">никто из агентов</span>}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-ink-subtle group-hover:text-brand">
                    memory/{d.slug}.md <ArrowRight className="size-3.5" aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
