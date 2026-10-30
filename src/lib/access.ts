// Agent access rules, shared by /api/context (enforcement) and /agents (display).
import type { AgentAccess, Project, WorkspaceId } from "./types";

export const tokenEnvName = (agent: Pick<AgentAccess, "id">) => `AGENT_TOKEN_${agent.id.toUpperCase()}`;

// A memory file without a project is shared context: any agent with the "memory" scope sees it.
export function canSeeProject(agent: AgentAccess, project: Project | undefined): boolean {
  return project === undefined || agent.projects.includes("*") || agent.projects.includes(project);
}

// Workspace scoping is orthogonal to project scoping — an agent must pass both.
// A memory file without a workspace is shared across workspaces.
export function canSeeWorkspace(agent: AgentAccess, workspace: WorkspaceId | undefined): boolean {
  return workspace === undefined || agent.allowedWorkspaces.includes("*") || agent.allowedWorkspaces.includes(workspace);
}
