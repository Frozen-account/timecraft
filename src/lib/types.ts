// Workspaces isolate business entities. "all" is a virtual UI/API state, never stored on an entity.
export const WORKSPACE_IDS = ["imosta", "traff", "bizbroker", "personal"] as const;
export const ALL_WORKSPACES = "all";

export type WorkspaceId = (typeof WORKSPACE_IDS)[number];
export type WorkspaceFilter = WorkspaceId | typeof ALL_WORKSPACES;

export interface Workspace {
  id: WorkspaceId;
  name: string;
  icon: string; // emoji
  color: string; // #rrggbb — accent for badges and calendar blocks
}

export const STATUSES = ["backlog", "in_progress", "review", "done"] as const;
export const PRIORITIES = ["high", "medium", "low"] as const;
export const ASSIGNEES = ["Claude", "Gemini", "Human"] as const;
export const PROJECTS = ["JDG", "Spolka", "Meta Ads", "Webinar", "Forms", "English Expansion", "Video Education", "Marketing"] as const;

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type Assignee = (typeof ASSIGNEES)[number];
export type Project = (typeof PROJECTS)[number];

// Which workspace each direction belongs to. `satisfies` makes this exhaustive: adding a
// direction to PROJECTS without assigning a workspace is a compile error.
export const PROJECT_WORKSPACE = {
  JDG: "imosta",
  Spolka: "imosta",
  "Meta Ads": "imosta",
  Webinar: "imosta",
  Forms: "imosta",
  "English Expansion": "imosta",
  "Video Education": "imosta",
  Marketing: "imosta",
} as const satisfies Record<Project, WorkspaceId>;

export const projectWorkspace = (project: Project): WorkspaceId => PROJECT_WORKSPACE[project];

export interface Task {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  assignee: Assignee;
  project: Project;
  workspace: WorkspaceId; // defaults to the direction's workspace when absent in tasks.json
  tags: string[];
  notes?: string;
  due?: string; // YYYY-MM or YYYY-MM-DD
  link?: string; // internal path, e.g. /projects/english-expansion
  scheduledDate?: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:MM, 24h; requires scheduledDate
  durationMinutes?: number;
  isDailyFocus?: boolean; // "Дело дня": at most one per scheduledDate, which it requires
}

export type Schedule = Pick<Task, "scheduledDate" | "scheduledTime" | "durationMinutes">;

export const CONTENT_FORMATS = ["Reels", "Screen recording", "Blog"] as const;
export const CONTENT_STATUSES = ["idea", "scripted", "recorded", "published"] as const;

export type ContentFormat = (typeof CONTENT_FORMATS)[number];
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export interface ContentItem {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string;
  format: ContentFormat;
  title: string;
  channel: string;
  owner: Assignee;
  status: ContentStatus;
}

export interface ProjectDoc {
  slug: string;
  title: string;
  summary: string;
  status?: string; // frontmatter, e.g. "active"
  category?: string; // frontmatter, e.g. "Marketing & Tech"
  body: string;
}

export type LeadSegment = "JDG" | "Spolka" | "Консультация";

export interface Lead {
  id: string;
  createdAt: string; // ISO datetime
  segment: LeadSegment;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
}

// Memory: long-lived context files (memory/*.md) that agents read before working on a project.
export interface MemoryDoc {
  slug: string;
  title: string;
  summary: string;
  project?: Project; // omitted = shared with every agent that has the "memory" scope
  workspace?: WorkspaceId; // omitted = shared across all workspaces; derived from `project` when set
  updated?: string; // YYYY-MM-DD
  body: string;
}

// Agent access: who may pull which project context through /api/context (agents/access.json).
export const SCOPES = ["tasks", "memory"] as const;
export type Scope = (typeof SCOPES)[number];

export interface AgentAccess {
  id: string; // lowercase, used in AGENT_TOKEN_<ID>
  name: string;
  description?: string;
  projects: (Project | "*")[];
  allowedWorkspaces: (WorkspaceId | "*")[]; // JSON key: allowed_workspaces
  scopes: Scope[];
}
