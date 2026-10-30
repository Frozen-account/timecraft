"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Brain } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { WorkspaceBadge } from "@/components/workspace-switcher";
import { ALL_WORKSPACES, WORKSPACE_IDS, type Project, type WorkspaceId } from "@/lib/types";
import { getWorkspace, inWorkspace } from "@/lib/workspaces";

const SHARED = "Общий контекст";

// Slim projection of MemoryDoc: bodies are rendered on the detail page, not here.
export type MemoryCard = {
  slug: string;
  title: string;
  summary: string;
  project?: Project;
  workspace?: WorkspaceId;
  updated?: string;
  readers: { id: string; name: string }[];
};

export function MemoryList({ docs }: { docs: MemoryCard[] }) {
  const { workspace } = useWorkspace();

  const sections = useMemo(() => {
    const scoped = docs.filter((d) => inWorkspace(d.workspace, workspace));

    // In "all" mode group by workspace; inside one workspace group by direction, as before.
    if (workspace === ALL_WORKSPACES) {
      const order: (WorkspaceId | typeof SHARED)[] = [SHARED, ...WORKSPACE_IDS];
      return order
        .map((key) => ({
          key,
          title: key === SHARED ? SHARED : getWorkspace(key).name,
          accent: key === SHARED ? null : getWorkspace(key).color,
          items: scoped.filter((d) => (key === SHARED ? d.workspace === undefined : d.workspace === key)),
        }))
        .filter((g) => g.items.length > 0);
    }

    const groups = Map.groupBy(scoped, (d): string => d.project ?? SHARED);
    const keys = [SHARED, ...[...groups.keys()].filter((k) => k !== SHARED).sort()];
    return keys
      .filter((k) => groups.has(k))
      .map((k) => ({ key: k, title: k, accent: getWorkspace(workspace).color, items: groups.get(k)! }));
  }, [docs, workspace]);

  const total = sections.reduce((n, g) => n + g.items.length, 0);
  if (total === 0) {
    return <p className="text-sm text-ink-muted">В этом воркспейсе файлов памяти пока нет.</p>;
  }

  return (
    <>
      {sections.map((group) => (
        <section key={group.key} className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-subtle">
            {group.accent && <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: group.accent }} />}
            {group.title}
            <span className="font-semibold tabular-nums text-ink-muted">{group.items.length}</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((d) => (
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
                {workspace === ALL_WORKSPACES && d.workspace && (
                  <p className="mt-3"><WorkspaceBadge id={d.workspace} /></p>
                )}
                <p className="mt-3 flex flex-wrap gap-1 text-[11px] font-semibold">
                  <span className="text-ink-muted">Видят:</span>
                  {d.readers.length > 0
                    ? d.readers.map((a) => <span key={a.id} className="rounded bg-brand-soft px-1.5 py-px text-brand-dark">{a.name}</span>)
                    : <span className="text-ink-muted">никто из агентов</span>}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-ink-subtle group-hover:text-brand">
                  memory/{d.slug}.md <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
