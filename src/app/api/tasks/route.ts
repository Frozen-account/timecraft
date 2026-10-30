// POST /api/tasks — create a task in Postgres.
//
// Callers: a signed-in person (session cookie, RLS applies and created_by is set), or an agent
// holding an AGENT_TOKEN_* bearer token. Agent requests use the service-role client, which
// bypasses RLS, so the agent's direction and workspace scope is enforced here.
import { NextResponse, type NextRequest } from "next/server";
import { callerMayTouch, resolveCaller } from "@/lib/task-auth";
import { fetchTaskIds, insertTask } from "@/lib/tasks-repo";
import { parseDraft } from "@/lib/task-validate";
import { uniqueSlug } from "@/lib/slug";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const STATUS_FOR = { unauthorized: 401, not_configured: 503, forbidden_scope: 403 } as const;

export async function POST(request: NextRequest) {
  const caller = await resolveCaller(request);
  if (caller.kind === "none") return json({ ok: false, error: caller.error }, STATUS_FOR[caller.error]);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const parsed = parseDraft(body);
  if ("error" in parsed) return json({ ok: false, error: "invalid_task", detail: parsed.error }, 400);
  const draft = parsed.value;

  if (!callerMayTouch(caller, draft.project, draft.workspace)) {
    return json(
      { ok: false, error: "forbidden_scope", detail: `"${draft.project}" is outside this agent's scope` },
      403,
    );
  }

  try {
    const taken = await fetchTaskIds(caller.client);
    const task = await insertTask(caller.client, draft, uniqueSlug(draft.title, taken));
    return json({ ok: true, task }, 201);
  } catch (err) {
    const { message, code } = err as Error & { code?: string };
    // 23505 = unique violation: another request claimed the slug between the scan and the insert.
    if (code === "23505") return json({ ok: false, error: "id_conflict", detail: "Попробуйте ещё раз." }, 409);
    if (code === "42501") return json({ ok: false, error: "forbidden" }, 403);
    console.error(`[api/tasks] insert failed: ${message}`);
    return json({ ok: false, error: "insert_failed", detail: message }, 500);
  }
}
