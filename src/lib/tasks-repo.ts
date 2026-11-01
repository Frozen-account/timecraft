// Postgres is the source of truth for tasks; backlog/tasks.json is the seeded history and the
// fallback when the database cannot be reached (see getTasks in src/lib/data.ts).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ASSIGNEES, PRIORITIES, PROJECTS, STATUSES, WORKSPACE_IDS, projectWorkspace,
  type Assignee, type Priority, type Project, type Status, type Task, type WorkspaceId,
} from "./types";

/** Read through the view: `workspace` is derived from directions, never stored on the row. */
const VIEW = "tasks_with_workspace";
const TABLE = "tasks";
// Deliberately "*" rather than an explicit column list: the view is rebuilt by migrations, and
// naming a column that a not-yet-applied migration would add turns every read into an error
// (and a silent fallback to backlog/tasks.json). Unknown columns are simply ignored by rowToTask.
const COLUMNS = "*";

type Row = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  direction: string;
  tags: string[] | null;
  notes: string | null;
  due: string | null;
  link: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  workspace?: string | null;
  // Absent until 20261101000000_daily_focus.sql is applied.
  is_daily_focus?: boolean | null;
};

const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  allowed.includes(v as T) ? (v as T) : undefined;

// Postgres `time` comes back as "12:30:00"; Task (and the calendar grid) expect "12:30".
const toHHMM = (v: string | null): string | undefined => (v ? v.slice(0, 5) : undefined);

/**
 * Narrows a row to Task, returning null when a value falls outside the TypeScript unions.
 * The table has matching check constraints, so this only fires if the two drift apart —
 * in which case dropping the row beats rendering a broken card.
 */
export function rowToTask(row: Row): Task | null {
  const status = oneOf<Status>(row.status, STATUSES);
  const priority = oneOf<Priority>(row.priority, PRIORITIES);
  const assignee = oneOf<Assignee>(row.assignee, ASSIGNEES);
  const project = oneOf<Project>(row.direction, PROJECTS);
  if (!row.id || !row.title || !status || !priority || !assignee || !project) return null;

  // Trust the view's derived workspace, but fall back to the direction's own mapping.
  const workspace = oneOf<WorkspaceId>(row.workspace, WORKSPACE_IDS) ?? projectWorkspace(project);

  return {
    id: row.id,
    title: row.title,
    status,
    priority,
    assignee,
    project,
    workspace,
    tags: row.tags ?? [],
    notes: row.notes ?? undefined,
    due: row.due ?? undefined,
    link: row.link ?? undefined,
    scheduledDate: row.scheduled_date ?? undefined,
    scheduledTime: toHHMM(row.scheduled_time),
    durationMinutes: row.duration_minutes ?? undefined,
    // Only set when true, like the other optional fields, so payloads stay lean.
    ...(row.is_daily_focus ? { isDailyFocus: true } : {}),
  };
}

/** Task -> row. `workspace` is intentionally dropped: it lives on directions. */
export function taskToRow(task: Omit<Task, "id">, id: string) {
  return {
    id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    assignee: task.assignee,
    direction: task.project,
    tags: task.tags,
    notes: task.notes ?? null,
    due: task.due ?? null,
    link: task.link ?? null,
    scheduled_date: task.scheduledDate ?? null,
    scheduled_time: task.scheduledTime ?? null,
    duration_minutes: task.durationMinutes ?? null,
  };
}

/**
 * Moves "Дело дня" to this task, or clears it. Done through the set_daily_focus function so the
 * clear-then-set pair is one statement: two clients racing on the same date would otherwise both
 * clear and both set, and the unique index would reject the loser with an opaque 23505.
 */
export async function setDailyFocus(client: SupabaseClient, id: string, value: boolean): Promise<void> {
  const { error } = await client.rpc("set_daily_focus", { p_task_id: id, p_value: value });
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
}

/** Null signals "database unreachable" so the caller can fall back; [] means genuinely empty. */
export async function fetchTasks(client: SupabaseClient): Promise<Task[] | null> {
  const { data, error } = await client.from(VIEW).select(COLUMNS).order("id");
  if (error) {
    console.error(`[tasks-repo] ${VIEW} read failed: ${error.message}`);
    return null;
  }
  return (data as Row[]).map(rowToTask).filter((t): t is Task => t !== null);
}

export async function fetchTaskIds(client: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await client.from(TABLE).select("id");
  if (error) throw new Error(error.message);
  return new Set((data as { id: string }[]).map((r) => r.id));
}

export async function fetchTask(client: SupabaseClient, id: string): Promise<Task | null> {
  const { data, error } = await client.from(VIEW).select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data ? rowToTask(data as Row) : null;
}

/** Partial update. Keys present with null clear the column; absent keys are left alone. */
export async function updateTask(
  client: SupabaseClient,
  id: string,
  patch: {
    status?: string;
    priority?: string;
    scheduled_date?: string | null;
    scheduled_time?: string | null;
    duration_minutes?: number | null;
  },
): Promise<Task> {
  const { error } = await client.from(TABLE).update(patch).eq("id", id);
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  const updated = await fetchTask(client, id);
  if (!updated) throw new Error("task disappeared while updating");
  return updated;
}

export async function insertTask(client: SupabaseClient, task: Omit<Task, "id">, id: string): Promise<Task> {
  const { error } = await client.from(TABLE).insert(taskToRow(task, id));
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  // Read back through the view so the caller gets the derived workspace, not a guess.
  const { data, error: readError } = await client.from(VIEW).select(COLUMNS).eq("id", id).single();
  if (readError) throw new Error(readError.message);
  const created = rowToTask(data as Row);
  if (!created) throw new Error("inserted row did not match the Task shape");
  return created;
}
