import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell";
import { KanbanBoard } from "@/components/kanban-board";
import { NewTaskButton } from "@/components/new-task-button";
import { getTasks } from "@/lib/data";

export const metadata: Metadata = { title: "Задачи · TimeCraft" };

export default function TasksPage() {
  const tasks = getTasks();
  const existingIds = tasks.map((t) => t.id);

  return (
    <>
      <PageHeader title="Задачи" subtitle="Источник — backlog/tasks.json в репозитории. Чтобы изменить задачу, отредактируйте файл и сделайте коммит.">
        <NewTaskButton existingIds={existingIds} />
      </PageHeader>
      <KanbanBoard tasks={tasks} existingIds={existingIds} />
    </>
  );
}
