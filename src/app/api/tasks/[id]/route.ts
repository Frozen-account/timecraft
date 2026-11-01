// PATCH /api/tasks/[id] — update status, priority or the schedule of one task.
//
// Same callers as POST /api/tasks: a signed-in person, or an agent bearer token (service-role
// client, so the agent's scope is enforced here). Scope is checked against the task as it
// already exists, since none of the patchable fields can move a task between workspaces.
import { NextResponse, type NextRequest } from "next/server";
import { callerMayTouch, resolveCaller } from "@/lib/task-auth";
import { fetchTask, setDailyFocus, updateTask } from "@/lib/tasks-repo";
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

    // Focus requires a date on the resulting row; unscheduling therefore gives it up.
    const wantsFocus = patch.isDailyFocus ?? (existing.isDailyFocus === true && resolved.scheduledDate !== null);
    if (patch.isDailyFocus === true && resolved.scheduledDate === null) {
      return json({ ok: false, error: "invalid_patch", detail: "isDailyFocus requires scheduledDate" }, 400);
    }

    // Moving a focus task's date has to drop the flag inside the same UPDATE, then re-apply it:
    //  - to null, the check constraint (focus needs a date) would reject the row;
    //  - to a date that already has a focus task, the unique index would reject it.
    // Re-applying afterwards goes through set_daily_focus, which clears the incumbent first.
    const dateChanges =
      "scheduledDate" in patch && (patch.scheduledDate ?? null) !== (existing.scheduledDate ?? null);
    const dropFocusFirst = dateChanges && existing.isDailyFocus === true;

    const touchesOtherFields =
      patch.status !== undefined ||
      patch.priority !== undefined ||
      "scheduledDate" in patch ||
      "scheduledTime" in patch ||
      "durationMinutes" in patch;

    await updateTask(caller.client, id, {
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.priority !== undefined && { priority: patch.priority }),
      // Unscheduling clears the dependent columns too, so the row cannot keep a stale time.
      ...("scheduledDate" in patch && { scheduled_date: resolved.scheduledDate }),
      ...("scheduledTime" in patch && { scheduled_time: resolved.scheduledTime }),
      ...("durationMinutes" in patch && { duration_minutes: resolved.durationMinutes }),
      ...(dropFocusFirst && { is_daily_focus: false }),
    });

    // After the schedule is in place, so "others on that date" is computed against the new date.
    // That ordering means the row update is already committed if this step fails, so say so
    // rather than letting the caller assume the whole patch was rejected.
    const focusAfterUpdate = dropFocusFirst ? false : existing.isDailyFocus === true;
    if (wantsFocus !== focusAfterUpdate) {
      try {
        await setDailyFocus(caller.client, id, wantsFocus);
      } catch (err) {
        const { message, code } = err as Error & { code?: string };
        const saved = touchesOtherFields ? " Остальные поля сохранены." : "";
        if (code === "PGRST202" || code === "42883" || code === "42703") {
          return json(
            { ok: false, error: "daily_focus_unavailable", detail: `Миграция 20261101000000_daily_focus.sql ещё не применена.${saved}` },
            503,
          );
        }
        if (code === "42501") return json({ ok: false, error: "forbidden", detail: `Нет прав на «дело дня».${saved}` }, 403);
        console.error(`[api/tasks/${id}] daily focus failed: ${message}`);
        return json({ ok: false, error: "daily_focus_failed", detail: `${message}${saved}` }, 500);
      }
    }

    const task = await fetchTask(caller.client, id);
    if (!task) return json({ ok: false, error: "not_found" }, 404);
    return json({ ok: true, task });
  } catch (err) {
    const { message, code } = err as Error & { code?: string };
    if (code === "42501") return json({ ok: false, error: "forbidden" }, 403);
    // The migration adding is_daily_focus / set_daily_focus has not been applied yet.
    if (code === "PGRST202" || code === "42883" || code === "42703") {
      return json({ ok: false, error: "daily_focus_unavailable", detail: "Миграция 20261101000000_daily_focus.sql ещё не применена." }, 503);
    }
    console.error(`[api/tasks/${id}] update failed: ${message}`);
    return json({ ok: false, error: "update_failed", detail: message }, 500);
  }
}
