import type { Metadata } from "next";
import { TodayView } from "@/components/today-view";
import { getTasks } from "@/lib/data";

export const metadata: Metadata = { title: "Сегодня · TimeCraft" };
// Tasks come from Postgres per request, so this route blocks on that read instead of being
// prerendered. Everything here is behind the auth gate, so there is no public page-speed cost.
export const instant = false;

// The first screen, on every device. "Today" rather than the dashboard because the question you
// open the app with on a phone is "what is next", not "how is every direction doing" — and the
// dashboard's wide grid of directions is the one view that cannot be read one-handed.
// TodayView renders its own header: the date is client-side, so PageHeader cannot carry it.
export default async function TodayPage() {
  return <TodayView tasks={await getTasks()} />;
}
