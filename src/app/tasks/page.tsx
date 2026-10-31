import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell";
import { KanbanBoard } from "@/components/kanban-board";
import { NewTaskButton } from "@/components/new-task-button";
import { getTasks } from "@/lib/data";

export const metadata: Metadata = { title: "Задачи · TimeCraft" };
// Tasks come from Postgres per request, so this route blocks on that read instead of being
// prerendered. Everything here is behind the auth gate, so there is no public page-speed cost;
// the alternative is streaming the board inside <Suspense> with a skeleton.
export const instant = false;


export default async function TasksPage() {
  const tasks = await getTasks();

  return (
    <>
      <PageHeader title="Задачи" subtitle="Управление задачами и бэклогом">
        <NewTaskButton />
      </PageHeader>
      <KanbanBoard tasks={tasks} />
    </>
  );
}
