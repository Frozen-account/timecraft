// POST /api/tasks — create a task in Postgres as the signed-in user.
// src/proxy.ts already rejects unauthenticated requests with 401; the user check below also
// guards direct calls and gives RLS a session to attach created_by to.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchTaskIds, insertTask } from "@/lib/tasks-repo";
import { uniqueSlug } from "@/lib/slug";
import {
  ASSIGNEES, PRIORITIES, PROJECTS, STATUSES, projectWorkspace,
  type Assignee, type Priority, type Project, type Status, type Task,
} from "@/lib/types";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

type Draft = Omit<Task, "id">;

// Mirrors the validation in src/lib/data.ts and the table's check constraints, so a rejected
// payload reports which field is wrong instead of surfacing a Postgres constraint name.
function parseDraft(body: Record<string, unknown>): { draft: Draft } | { error: string } {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return { error: "title is required" };

  const pick = <T extends string>(key: string, allowed: readonly T[]): T | undefined =>
    allowed.includes(body[key] as T) ? (body[key] as T) : undefined;

  const status = pick<Status>("status", STATUSES);
  const priority = pick<Priority>("priority", PRIORITIES);
  const assignee = pick<Assignee>("assignee", ASSIGNEES);
  const project = pick<Project>("project", PROJECTS);
  if (!status) return { error: `status must be one of ${STATUSES.join(", ")}` };
  if (!priority) return { error: `priority must be one of ${PRIORITIES.join(", ")}` };
  if (!assignee) return { error: `assignee must be one of ${ASSIGNEES.join(", ")}` };
  if (!project) return { error: `project must be one of ${PROJECTS.join(", ")}` };

  const due = typeof body.due === "string" && body.due ? body.due : undefined;
  if (due && !/^\d{4}-\d{2}(-\d{2})?$/.test(due)) return { error: "due must be YYYY-MM or YYYY-MM-DD" };

  const link = typeof body.link === "string" && body.link ? body.link : undefined;
  if (link && !link.startsWith("/")) return { error: "link must be an internal path starting with /" };

  const scheduledDate = typeof body.scheduledDate === "string" && body.scheduledDate ? body.scheduledDate : undefined;
  if (scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) return { error: "scheduledDate must be YYYY-MM-DD" };

  const scheduledTime = typeof body.scheduledTime === "string" && body.scheduledTime ? body.scheduledTime : undefined;
  if (scheduledTime && !scheduledDate) return { error: "scheduledTime requires scheduledDate" };
  if (scheduledTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduledTime)) return { error: "scheduledTime must be HH:MM" };

  const duration = body.durationMinutes;
  if (duration !== undefined && duration !== null) {
    if (!Number.isInteger(duration) || (duration as number) < 15 || (duration as number) > 720) {
      return { error: "durationMinutes must be an integer between 15 and 720" };
    }
    if (!scheduledTime) return { error: "durationMinutes requires scheduledTime" };
  }

  const tags = body.tags ?? [];
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string")) return { error: "tags must be an array of strings" };

  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : undefined;

  // The workspace is derived from the direction, never taken from the client. A payload that
  // disagrees is a bug on the caller's side, so say so rather than silently overriding it.
  const workspace = projectWorkspace(project);
  if (typeof body.workspace === "string" && body.workspace !== workspace) {
    return { error: `workspace "${body.workspace}" does not match direction "${project}" (${workspace})` };
  }

  return {
    draft: {
      title, status, priority, assignee, project, workspace,
      tags: tags as string[],
      ...(notes && { notes }),
      ...(due && { due }),
      ...(link && { link }),
      ...(scheduledDate && { scheduledDate }),
      ...(scheduledTime && { scheduledTime }),
      ...(duration !== undefined && duration !== null && { durationMinutes: duration as number }),
    },
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return json({ ok: false, error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const parsed = parseDraft(body);
  if ("error" in parsed) return json({ ok: false, error: "invalid_task", detail: parsed.error }, 400);

  try {
    const taken = await fetchTaskIds(supabase);
    const task = await insertTask(supabase, parsed.draft, uniqueSlug(parsed.draft.title, taken));
    return json({ ok: true, task }, 201);
  } catch (err) {
    const { message, code } = err as Error & { code?: string };
    // 23505 = unique violation: another request claimed the slug between the id scan and insert.
    if (code === "23505") return json({ ok: false, error: "id_conflict", detail: "Попробуйте ещё раз." }, 409);
    // 42501 = RLS refused the insert.
    if (code === "42501") return json({ ok: false, error: "forbidden" }, 403);
    console.error(`[api/tasks] insert failed: ${message}`);
    return json({ ok: false, error: "insert_failed", detail: message }, 500);
  }
}
