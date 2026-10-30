// GET /api/context[?project=<name>][?workspace=<id>] with "Authorization: Bearer <AGENT_TOKEN_<ID>>".
// Returns the directions, tasks and memory files the agent may see under agents/access.json.
// The proxy lets this path through; the bearer token is the only credential here.
import { NextResponse, type NextRequest } from "next/server";
import { canSeeProject, canSeeWorkspace, tokenEnvName } from "@/lib/access";
import { getAgents, getMemoryDocs, getTasksAsAgent } from "@/lib/data";
import { safeEqual } from "@/lib/session";
import { PROJECTS, WORKSPACE_IDS, projectWorkspace, type Project, type WorkspaceId } from "@/lib/types";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1]?.trim();
  const agent = token
    ? getAgents().find((a) => {
        const expected = process.env[tokenEnvName(a)];
        return Boolean(expected) && safeEqual(token, expected!);
      })
    : undefined;
  if (!agent) {
    // Slow down guessing; serverless has no shared state for real rate limiting.
    await new Promise((r) => setTimeout(r, 600));
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const requestedWorkspace = request.nextUrl.searchParams.get("workspace");
  if (requestedWorkspace !== null && !WORKSPACE_IDS.includes(requestedWorkspace as WorkspaceId)) {
    return json({ ok: false, error: "unknown_workspace", workspaces: WORKSPACE_IDS }, 400);
  }
  const workspace = (requestedWorkspace as WorkspaceId | null) ?? undefined;
  if (workspace && !canSeeWorkspace(agent, workspace)) {
    return json({ ok: false, error: "forbidden_workspace" }, 403);
  }

  const requested = request.nextUrl.searchParams.get("project");
  if (requested !== null && !PROJECTS.includes(requested as Project)) {
    return json({ ok: false, error: "unknown_project", projects: PROJECTS }, 400);
  }
  const project = (requested as Project | null) ?? undefined;
  if (project && !canSeeProject(agent, project)) return json({ ok: false, error: "forbidden_project" }, 403);
  // Both filters are applied, so an allowed direction in another workspace still yields nothing.
  if (project && workspace && projectWorkspace(project) !== workspace) {
    return json({ ok: false, error: "project_outside_workspace" }, 400);
  }

  // Without ?workspace= an agent sees every workspace it is allowed in, never more.
  const allowedWorkspace = (w: WorkspaceId | undefined) => canSeeWorkspace(agent, w) && (!workspace || w === undefined || w === workspace);

  // With ?project=, keep that project's items plus shared (project-less) memory.
  const visible = (p: Project | undefined, w: WorkspaceId | undefined) =>
    canSeeProject(agent, p) && allowedWorkspace(w) && (!project || p === undefined || p === project);

  const directions = (agent.projects.includes("*") ? [...PROJECTS] : (agent.projects.filter((p) => p !== "*") as Project[]))
    .filter((p) => allowedWorkspace(projectWorkspace(p)))
    .filter((p) => !project || p === project);

  return json({
    ok: true,
    agent: { id: agent.id, name: agent.name },
    workspace: workspace ?? "all",
    workspaces: agent.allowedWorkspaces.includes("*") ? [...WORKSPACE_IDS] : agent.allowedWorkspaces,
    projects: directions,
    ...(agent.scopes.includes("tasks") && {
      tasks: (await getTasksAsAgent()).filter((t) => visible(t.project, t.workspace)),
    }),
    ...(agent.scopes.includes("memory") && {
      memory: getMemoryDocs()
        .filter((d) => visible(d.project, d.workspace))
        .map(({ slug, title, summary, project: p, workspace: w, updated, body }) => ({
          path: `memory/${slug}.md`,
          title,
          summary,
          project: p ?? null,
          workspace: w ?? null,
          updated: updated ?? null,
          body,
        })),
    }),
  });
}
