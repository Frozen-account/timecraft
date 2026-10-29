import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell";
import { ContentCalendar } from "@/components/content-calendar";
import { getContentPlan } from "@/lib/data";

export const metadata: Metadata = { title: "Контент-план · TimeCraft" };

export default function ContentPage() {
  return (
    <>
      <PageHeader title="Контент-план" subtitle="Reels, записи экрана и статьи блога. Источник — content/calendar.json." />
      <ContentCalendar items={getContentPlan()} />
    </>
  );
}
