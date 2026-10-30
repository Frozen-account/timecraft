// PATCH /api/tasks/[id] — update status, priority or the schedule of one task.
//
// Same callers as POST /api/tasks: a signed-in person, or an agent bearer token (service-role
// client, so the agent's scope is enforced here). Scope is checked against the task as it
// already exists, since none of the patchable fields can move a task between workspaces.
import { NextResponse, type NextRequest } from "next/server";
import { callerMayTouch, resolveCaller } from "@/lib/task-auth";
import { fetchTask, updateTask } from "@/lib/tasks-repo";
import { checkSchedule, parsePatch } from "@/lib/task-validate";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const STATUS_FOR = { unauthorized: 401, not_configured: 503, forbidden_scope: 403 } as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await resolveCaller(request);
  if (caller.kind === "none") return json({ ok: false, error: caller.error }, STATUS_FOR[caller.error]);

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const parsed = parsePatch(body);
  if ("error" in parsed) return json({ ok: false, error: "invalid_patch", detail: parsed.error }, 400);
  const patch = parsed.value;

  try {
    const existing = await fetchTask(caller.client, id);
    if (!existing) return json({ ok: false, error: "not_found" }, 404);

    if (!callerMayTouch(caller, existing.project, existing.workspace)) {
      return json(
        { ok: false, error: "forbidden_scope", detail: `"${existing.project}" is outside this agent's scope` },
        403,
      );
    }

    // Cross-field rules apply to the resulting row: clearing a date while leaving a time behind
    // has to fail, and a patch that only sets a time must see the date the task already has.
    const resolved = {
      scheduledDate: "scheduledDate" in patch ? patch.scheduledDate : (existing.scheduledDate ?? null),
      scheduledTime: "scheduledTime" in patch ? patch.scheduledTime : (existing.scheduledTime ?? null),
      durationMinutes: "durationMinutes" in patch ? patch.durationMinutes : (existing.durationMinutes ?? null),
    };
    const scheduleError = checkSchedule(resolved);
    if (scheduleError) return json({ ok: false, error: "invalid_patch", detail: scheduleError }, 400);

    const task = await updateTask(caller.client, id, {
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.priority !== undefined && { priority: patch.priority }),
      // Unscheduling clears the dependent columns too, so the row cannot keep a stale time.
      ...("scheduledDate" in patch && { scheduled_date: resolved.scheduledDate }),
      ...("scheduledTime" in patch && { scheduled_time: resolved.scheduledTime }),
      ...("durationMinutes" in patch && { duration_minutes: resolved.durationMinutes }),
    });
    return json({ ok: true, task });
  } catch (err) {
    const { message, code } = err as Error & { code?: string };
    if (code === "42501") return json({ ok: false, error: "forbidden" }, 403);
    console.error(`[api/tasks/${id}] update failed: ${message}`);
    return json({ ok: false, error: "update_failed", detail: message }, 500);
  }
}
