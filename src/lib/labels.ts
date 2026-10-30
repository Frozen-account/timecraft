// Russian UI copy and accent classes for the enum-ish fields, shared by the board, the
// calendar and the task form. Kept in lib/ so components never have to import each other
// just for a label (which previously made the module graph circular).
import type { Priority, Status } from "./types";

export const STATUS_LABEL: Record<Status, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

export const PRIORITY: Record<Priority, { label: string; dot: string; text: string }> = {
  high: { label: "High", dot: "bg-red-600", text: "text-red-700" },
  medium: { label: "Medium", dot: "bg-amber-500", text: "text-amber-700" },
  low: { label: "Low", dot: "bg-gray-400", text: "text-ink-muted" },
};
