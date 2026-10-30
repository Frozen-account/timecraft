// Who is calling a task endpoint: a signed-in person, or an agent holding an AGENT_TOKEN_*.
//
// Agents have no user JWT, so their requests run through the service-role client, which
// bypasses RLS entirely. Every scope rule for an agent is therefore enforced here in
// application code — see callerMayTouch, and keep that in mind before adding an endpoint.
import "server-only";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canSeeProject, canSeeWorkspace, tokenEnvName } from "./access";
import { getAgents } from "./data";
import { safeEqual } from "./session";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import type { AgentAccess, Project, WorkspaceId } from "./types";

export type Caller =
  | { kind: "user"; client: SupabaseClient }
  | { kind: "agent"; client: SupabaseClient; agent: AgentAccess }
  | { kind: "none"; error: "unauthorized" | "not_configured" | "forbidden_scope" };

export async function resolveCaller(request: NextRequest): Promise<Caller> {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1]?.trim();

  if (token) {
    const agent = getAgents().find((a) => {
      const expected = process.env[tokenEnvName(a)];
      return Boolean(expected) && safeEqual(token, expected!);
    });
    // A bearer token that matches nothing must not fall through to cookie auth: that would let
    // a bad token silently act as whoever happens to be signed in on this browser.
    if (!agent) {
      await new Promise((r) => setTimeout(r, 600)); // slow down guessing
      return { kind: "none", error: "unauthorized" };
    }
    // Writing tasks needs the "tasks" scope, the same one that gates reading them.
    if (!agent.scopes.includes("tasks")) return { kind: "none", error: "forbidden_scope" };
    const client = createAdminClient();
    if (!client) return { kind: "none", error: "not_configured" };
    return { kind: "agent", client, agent };
  }

  const client = await createClient();
  const { data } = await client.auth.getUser();
  if (!data.user) return { kind: "none", error: "unauthorized" };
  return { kind: "user", client };
}

/**
 * Agents may only touch tasks inside their own directions and workspaces; a signed-in person is
 * not scoped (RLS is the boundary there). Both axes must pass, as in GET /api/context.
 */
export function callerMayTouch(caller: Caller, project: Project, workspace: WorkspaceId): boolean {
  if (caller.kind !== "agent") return caller.kind === "user";
  return canSeeProject(caller.agent, project) && canSeeWorkspace(caller.agent, workspace);
}
