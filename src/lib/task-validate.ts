// Payload validation for the task endpoints. Mirrors the rules in src/lib/data.ts and the check
// constraints in supabase/migrations, so a bad request names the offending field instead of
// surfacing a Postgres constraint name. Shared by POST and PATCH so the two cannot drift.
import {
  ASSIGNEES, PRIORITIES, PROJECTS, STATUSES, projectWorkspace,
  type Assignee, type Priority, type Project, type Status, type Task,
} from "./types";

export type Draft = Omit<Task, "id">;

/** Null clears the field; undefined (absent) leaves it unchanged. */
export type TaskPatch = {
  status?: Status;
  priority?: Priority;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  durationMinutes?: number | null;
  isDailyFocus?: boolean;
};

export type Parsed<T> = { value: T } | { error: string };

type Rec = Record<string, unknown>;

const pick = <T extends string>(body: Rec, key: string, allowed: readonly T[]): T | undefined =>
  allowed.includes(body[key] as T) ? (body[key] as T) : undefined;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DUE = /^\d{4}-\d{2}(-\d{2})?$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Rules that span fields, checked against the resulting row rather than the patch alone. */
export function checkSchedule(s: {
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  durationMinutes?: number | null;
}): string | null {
  if (s.scheduledDate && !DATE.test(s.scheduledDate)) return "scheduledDate must be YYYY-MM-DD";
  if (s.scheduledTime && !TIME.test(s.scheduledTime)) return "scheduledTime must be HH:MM (24h)";
  if (s.scheduledTime && !s.scheduledDate) return "scheduledTime requires scheduledDate";
  if (s.durationMinutes != null) {
    if (!Number.isInteger(s.durationMinutes) || s.durationMinutes < 15 || s.durationMinutes > 720) {
      return "durationMinutes must be an integer between 15 and 720";
    }
    if (!s.scheduledTime) return "durationMinutes requires scheduledTime";
  }
  return null;
}

export function parseDraft(body: Rec): Parsed<Draft> {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return { error: "title is required" };

  const status = pick<Status>(body, "status", STATUSES);
  const priority = pick<Priority>(body, "priority", PRIORITIES);
  const assignee = pick<Assignee>(body, "assignee", ASSIGNEES);
  const project = pick<Project>(body, "project", PROJECTS);
  if (!status) return { error: `status must be one of ${STATUSES.join(", ")}` };
  if (!priority) return { error: `priority must be one of ${PRIORITIES.join(", ")}` };
  if (!assignee) return { error: `assignee must be one of ${ASSIGNEES.join(", ")}` };
  if (!project) return { error: `project must be one of ${PROJECTS.join(", ")}` };

  const due = typeof body.due === "string" && body.due ? body.due : undefined;
  if (due && !DUE.test(due)) return { error: "due must be YYYY-MM or YYYY-MM-DD" };

  const link = typeof body.link === "string" && body.link ? body.link : undefined;
  if (link && !link.startsWith("/")) return { error: "link must be an internal path starting with /" };

  const scheduledDate = typeof body.scheduledDate === "string" && body.scheduledDate ? body.scheduledDate : undefined;
  const scheduledTime = typeof body.scheduledTime === "string" && body.scheduledTime ? body.scheduledTime : undefined;
  const durationMinutes = body.durationMinutes == null ? undefined : (body.durationMinutes as number);
  const scheduleError = checkSchedule({ scheduledDate, scheduledTime, durationMinutes });
  if (scheduleError) return { error: scheduleError };

  const tags = body.tags ?? [];
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string")) {
    return { error: "tags must be an array of strings" };
  }

  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : undefined;

  // "Дело дня" is the focus *of a day*, so it cannot exist without one.
  if (body.isDailyFocus !== undefined && typeof body.isDailyFocus !== "boolean") {
    return { error: "isDailyFocus must be a boolean" };
  }
  const isDailyFocus = body.isDailyFocus === true;
  if (isDailyFocus && !scheduledDate) return { error: "isDailyFocus requires scheduledDate" };

  // The workspace follows the direction and is never taken from the client; a payload that
  // disagrees is a caller bug, so report it rather than silently overriding.
  const workspace = projectWorkspace(project);
  if (typeof body.workspace === "string" && body.workspace !== workspace) {
    return { error: `workspace "${body.workspace}" does not match direction "${project}" (${workspace})` };
  }

  return {
    value: {
      title, status, priority, assignee, project, workspace,
      tags: tags as string[],
      ...(notes && { notes }),
      ...(due && { due }),
      ...(link && { link }),
      ...(scheduledDate && { scheduledDate }),
      ...(scheduledTime && { scheduledTime }),
      ...(durationMinutes !== undefined && { durationMinutes }),
      ...(isDailyFocus && { isDailyFocus: true }),
    },
  };
}

const SCHEDULE_KEYS = ["scheduledDate", "scheduledTime", "durationMinutes"] as const;
const PATCHABLE = ["status", "priority", "isDailyFocus", ...SCHEDULE_KEYS] as const;

export function parsePatch(body: Rec): Parsed<TaskPatch> {
  const unknown = Object.keys(body).filter((k) => !PATCHABLE.includes(k as (typeof PATCHABLE)[number]));
  if (unknown.length) {
    return { error: `cannot patch ${unknown.join(", ")}; allowed: ${PATCHABLE.join(", ")}` };
  }

  const patch: TaskPatch = {};

  if ("status" in body) {
    const status = pick<Status>(body, "status", STATUSES);
    if (!status) return { error: `status must be one of ${STATUSES.join(", ")}` };
    patch.status = status;
  }
  if ("priority" in body) {
    const priority = pick<Priority>(body, "priority", PRIORITIES);
    if (!priority) return { error: `priority must be one of ${PRIORITIES.join(", ")}` };
    patch.priority = priority;
  }

  if ("isDailyFocus" in body) {
    if (typeof body.isDailyFocus !== "boolean") return { error: "isDailyFocus must be a boolean" };
    patch.isDailyFocus = body.isDailyFocus;
  }

  // null is meaningful here: it unschedules. Only a wrong *type* is an error.
  for (const key of SCHEDULE_KEYS) {
    if (!(key in body)) continue;
    const v = body[key];
    if (v === null) {
      patch[key] = null;
    } else if (key === "durationMinutes") {
      if (typeof v !== "number") return { error: "durationMinutes must be a number or null" };
      patch.durationMinutes = v;
    } else {
      if (typeof v !== "string") return { error: `${key} must be a string or null` };
      patch[key] = v;
    }
  }

  if (Object.keys(patch).length === 0) return { error: `nothing to update; allowed: ${PATCHABLE.join(", ")}` };
  return { value: patch };
}
