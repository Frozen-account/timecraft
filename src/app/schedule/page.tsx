import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell";
import { WeeklySchedule } from "@/components/weekly-schedule";
import { getTasks } from "@/lib/data";

export const metadata: Metadata = { title: "Календарь · TimeCraft" };
// Tasks come from Postgres per request, so this route blocks on that read instead of being
// prerendered. Everything here is behind the auth gate, so there is no public page-speed cost;
// the alternative is streaming the board inside <Suspense> with a skeleton.
export const instant = false;


export default async function SchedulePage() {
  return (
    <>
      <PageHeader title="Календарь и тайм-блокинг" subtitle="Задачи из backlog/tasks.json с полями scheduledDate, scheduledTime и durationMinutes" />
      <WeeklySchedule tasks={await getTasks()} />
    </>
  );
}
