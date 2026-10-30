import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell";
import { MemoryList, type MemoryCard } from "@/components/memory-list";
import { getAgents, getMemoryDocs } from "@/lib/data";
import { canSeeProject, canSeeWorkspace } from "@/lib/access";

export const metadata: Metadata = { title: "Память · TimeCraft" };

// Readers are resolved here (server side) so access.json rules stay out of the client bundle.
export default function MemoryPage() {
  const agents = getAgents().filter((a) => a.scopes.includes("memory"));
  const docs: MemoryCard[] = getMemoryDocs().map((d) => ({
    slug: d.slug,
    title: d.title,
    summary: d.summary,
    project: d.project,
    workspace: d.workspace,
    updated: d.updated,
    readers: agents
      .filter((a) => canSeeProject(a, d.project) && canSeeWorkspace(a, d.workspace))
      .map((a) => ({ id: a.id, name: a.name })),
  }));

  return (
    <>
      <PageHeader title="Память" subtitle="Контекст проектов для агентов — файлы memory/*.md. Формат описан в memory/README.md." />
      <MemoryList docs={docs} />
    </>
  );
}
