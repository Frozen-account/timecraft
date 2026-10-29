import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell";
import { KanbanBoard } from "@/components/kanban-board";
import { getTasks } from "@/lib/data";

export const metadata: Metadata = { title: "Задачи · TimeCraft" };

export default function TasksPage() {
  return (
    <>
      <PageHeader title="Задачи" subtitle="Источник — backlog/tasks.json в репозитории. Чтобы изменить задачу, отредактируйте файл и сделайте коммит." />
      <KanbanBoard tasks={getTasks()} />
    </>
  );
}
