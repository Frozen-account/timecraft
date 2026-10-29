// GET /api/context[?project=<name>] with "Authorization: Bearer <AGENT_TOKEN_<ID>>".
// Returns the tasks and memory files the agent may see under agents/access.json.
// The proxy lets this path through; the bearer token is the only credential here.
import { NextResponse, type NextRequest } from "next/server";
import { canSeeProject, tokenEnvName } from "@/lib/access";
import { getAgents, getMemoryDocs, getTasks } from "@/lib/data";
import { safeEqual } from "@/lib/session";
import { PROJECTS, type Project } from "@/lib/types";

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

  const requested = request.nextUrl.searchParams.get("project");
  if (requested !== null && !PROJECTS.includes(requested as Project)) {
    return json({ ok: false, error: "unknown_project", projects: PROJECTS }, 400);
  }
  const project = (requested as Project | null) ?? undefined;
  if (project && !canSeeProject(agent, project)) return json({ ok: false, error: "forbidden_project" }, 403);

  // With ?project=, keep that project's items plus shared (project-less) memory.
  const visible = (p: Project | undefined) => canSeeProject(agent, p) && (!project || p === undefined || p === project);
  return json({
    ok: true,
    agent: { id: agent.id, name: agent.name },
    projects: agent.projects.includes("*") ? PROJECTS : agent.projects,
    ...(agent.scopes.includes("tasks") && { tasks: getTasks().filter((t) => visible(t.project)) }),
    ...(agent.scopes.includes("memory") && {
      memory: getMemoryDocs()
        .filter((d) => visible(d.project))
        .map(({ slug, title, summary, project: p, updated, body }) => ({ path: `memory/${slug}.md`, title, summary, project: p ?? null, updated: updated ?? null, body })),
    }),
  });
}
