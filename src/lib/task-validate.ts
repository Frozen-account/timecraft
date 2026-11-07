// Payload validation for the task endpoints. Mirrors the rules in src/lib/data.ts and the check
// constraints in supabase/migrations, so a bad request names the offending field instead of
// surfacing a Postgres constraint name. Shared by POST and PATCH so the two cannot drift.
import {
  ASSIGNEES, MAX_ATTACHMENT_BYTES, PRIORITIES, PROJECTS, STATUSES, isAttachmentType, projectWorkspace,
  type Assignee, type Attachment, type Priority, type Project, type Status, type Task,
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
  attachments?: Attachment[];
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

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/;

/**
 * Attachment metadata arrives from the browser after it has uploaded the bytes to storage, so
 * it is caller-supplied and fully distrusted. `path` is the one field worth being strict about:
 * it addresses an object in a shared bucket, so it is pinned to "<task id>/<file>" — a payload
 * naming another task's folder, an absolute path or a `..` segment is rejected rather than
 * silently stored and later signed.
 */
export function parseAttachments(value: unknown, taskId: string): Parsed<Attachment[]> {
  if (!Array.isArray(value)) return { error: "attachments must be an array" };
  if (value.length > 20) return { error: "attachments: at most 20 files per task" };

  const out: Attachment[] = [];
  const seen = new Set<string>();

  for (const [i, raw] of value.entries()) {
    const where = `attachments[${i}]`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: `${where} must be an object` };
    const a = raw as Rec;

    const str = (key: string): string | null => (typeof a[key] === "string" && a[key] ? (a[key] as string) : null);
    const id = str("id");
    const name = str("name");
    const path = str("path");
    const type = str("type");
    const createdAt = str("createdAt");
    if (!id) return { error: `${where}.id is required` };
    if (!name) return { error: `${where}.name is required` };
    if (!path) return { error: `${where}.path is required` };
    if (!type) return { error: `${where}.type is required` };
    if (!createdAt) return { error: `${where}.createdAt is required` };

    if (!isAttachmentType(type)) return { error: `${where}.type "${type}" is not an accepted file type` };
    if (!ISO_DATETIME.test(createdAt)) return { error: `${where}.createdAt must be an ISO datetime` };

    // Exactly two segments, the first being this task's id: no traversal, no absolute path,
    // no reaching into another task's folder.
    const segments = path.split("/");
    if (segments.length !== 2 || segments[0] !== taskId || !segments[1] || segments.includes("..")) {
      return { error: `${where}.path must be "${taskId}/<file>"` };
    }
    if (seen.has(path)) return { error: `${where}.path is listed twice` };
    seen.add(path);

    const size = a.size;
    if (typeof size !== "number" || !Number.isInteger(size) || size < 0 || size > MAX_ATTACHMENT_BYTES) {
      return { error: `${where}.size must be an integer between 0 and ${MAX_ATTACHMENT_BYTES}` };
    }

    out.push({ id, name: name.slice(0, 200), path, size, type, createdAt });
  }

  return { value: out };
}

const SCHEDULE_KEYS = ["scheduledDate", "scheduledTime", "durationMinutes"] as const;
const PATCHABLE = ["status", "priority", "isDailyFocus", "attachments", ...SCHEDULE_KEYS] as const;

export function parsePatch(body: Rec, taskId: string): Parsed<TaskPatch> {
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

  // The whole list is sent, not a delta: the browser already holds it, and replacing it wholesale
  // keeps add and remove on one code path.
  if ("attachments" in body) {
    const parsed = parseAttachments(body.attachments, taskId);
    if ("error" in parsed) return { error: parsed.error };
    patch.attachments = parsed.value;
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
