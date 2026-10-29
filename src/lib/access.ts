// Agent access rules, shared by /api/context (enforcement) and /agents (display).
import type { AgentAccess, Project } from "./types";

export const tokenEnvName = (agent: Pick<AgentAccess, "id">) => `AGENT_TOKEN_${agent.id.toUpperCase()}`;

// A memory file without a project is shared context: any agent with the "memory" scope sees it.
export function canSeeProject(agent: AgentAccess, project: Project | undefined): boolean {
  return project === undefined || agent.projects.includes("*") || agent.projects.includes(project);
}
