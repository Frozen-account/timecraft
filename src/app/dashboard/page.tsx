import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard-view";
import { getAgents, getMemoryDocs, getTasks } from "@/lib/data";

export const metadata: Metadata = { title: "Дашборд · TimeCraft" };
// Tasks come from Postgres per request, so this route blocks on that read instead of being
// prerendered. Everything here is behind the auth gate, so there is no public page-speed cost;
// the alternative is streaming the board inside <Suspense> with a skeleton.
export const instant = false;


// Overview of every direction ("направление"): open work, schedule and how much context agents have.
// Filtering by workspace happens in DashboardView, so this page stays statically prerendered.
export default async function DashboardPage() {
  return (
    <>
      <PageHeader title="Дашборд" subtitle="Все направления на одном экране. Данные — из backlog/tasks.json и memory/." />
      <DashboardView
        tasks={await getTasks()}
        memory={getMemoryDocs().map(({ project, workspace }) => ({ project, workspace }))}
        agents={getAgents().map(({ id, allowedWorkspaces }) => ({ id, allowedWorkspaces }))}
      />
    </>
  );
}
