import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell";
import { WeeklySchedule } from "@/components/weekly-schedule";
import { getTasks } from "@/lib/data";

export const metadata: Metadata = { title: "Календарь · TimeCraft" };

export default function SchedulePage() {
  return (
    <>
      <PageHeader title="Календарь и тайм-блокинг" subtitle="Задачи из backlog/tasks.json с полями scheduledDate, scheduledTime и durationMinutes" />
      <WeeklySchedule tasks={getTasks()} />
    </>
  );
}
