// Git-driven data: tasks, content plan and project docs live as files in the repo and are read at build time.
// Sync reads keep pages fully static (see Next.js caching docs: "Predictable values").
import "server-only";
import fs from "node:fs";
import path from "node:path";
import {
  ASSIGNEES, CONTENT_FORMATS, CONTENT_STATUSES, PRIORITIES, PROJECTS, SCOPES, STATUSES,
  type AgentAccess, type ContentItem, type MemoryDoc, type Project, type ProjectDoc, type Task,
} from "./types";

const ROOT = process.cwd();
const TASKS_FILE = path.join(ROOT, "backlog", "tasks.json");
const CALENDAR_FILE = path.join(ROOT, "content", "calendar.json");
const PROJECTS_DIR = path.join(ROOT, "projects");
const MEMORY_DIR = path.join(ROOT, "memory");
const AGENTS_FILE = path.join(ROOT, "agents", "access.json");

type Rec = Record<string, unknown>;

// Agents edit these files by hand, so a typo should fail the build with a clear message instead of rendering garbage.
function fail(file: string, index: number, msg: string): never {
  throw new Error(`${path.relative(ROOT, file)} [${index}]: ${msg}`);
}

function str(file: string, i: number, r: Rec, key: string, optional = false): string | undefined {
  const v = r[key];
  if (v === undefined && optional) return undefined;
  if (typeof v !== "string" || !v.trim()) fail(file, i, `"${key}" must be a non-empty string`);
  return v;
}

function oneOf<T extends string>(file: string, i: number, r: Rec, key: string, allowed: readonly T[]): T {
  const v = r[key];
  if (!allowed.includes(v as T)) fail(file, i, `"${key}" must be one of ${allowed.join(", ")} (got ${JSON.stringify(v)})`);
  return v as T;
}

function readJsonArray(file: string): Rec[] {
  const data: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(data)) throw new Error(`${path.relative(ROOT, file)} must contain a JSON array`);
  return data as Rec[];
}

export function getTasks(): Task[] {
  return readJsonArray(TASKS_FILE).map((r, i) => {
    const tags = r.tags ?? [];
    if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string")) fail(TASKS_FILE, i, `"tags" must be an array of strings`);
    const due = str(TASKS_FILE, i, r, "due", true);
    if (due && !/^\d{4}-\d{2}(-\d{2})?$/.test(due)) fail(TASKS_FILE, i, `"due" must be YYYY-MM or YYYY-MM-DD`);
    const link = str(TASKS_FILE, i, r, "link", true);
    if (link && !link.startsWith("/")) fail(TASKS_FILE, i, `"link" must be an internal path starting with /`);
    const scheduledDate = str(TASKS_FILE, i, r, "scheduledDate", true);
    const scheduledTime = str(TASKS_FILE, i, r, "scheduledTime", true);
    const duration = r.durationMinutes;
    if (scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) fail(TASKS_FILE, i, `"scheduledDate" must be YYYY-MM-DD`);
    if (scheduledTime && !scheduledDate) fail(TASKS_FILE, i, `"scheduledTime" requires "scheduledDate"`);
    if (scheduledTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduledTime)) fail(TASKS_FILE, i, `"scheduledTime" must be HH:MM (24h)`);
    if (duration !== undefined && (!Number.isInteger(duration) || (duration as number) < 15 || (duration as number) > 720)) {
      fail(TASKS_FILE, i, `"durationMinutes" must be an integer between 15 and 720`);
    }
    return {
      id: str(TASKS_FILE, i, r, "id")!,
      title: str(TASKS_FILE, i, r, "title")!,
      status: oneOf(TASKS_FILE, i, r, "status", STATUSES),
      priority: oneOf(TASKS_FILE, i, r, "priority", PRIORITIES),
      assignee: oneOf(TASKS_FILE, i, r, "assignee", ASSIGNEES),
      project: oneOf(TASKS_FILE, i, r, "project", PROJECTS),
      tags: tags as string[],
      notes: str(TASKS_FILE, i, r, "notes", true),
      due,
      link,
      scheduledDate,
      scheduledTime,
      durationMinutes: duration as number | undefined,
    };
  });
}

export function getContentPlan(): ContentItem[] {
  return readJsonArray(CALENDAR_FILE).map((r, i) => {
    const date = str(CALENDAR_FILE, i, r, "date")!;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(CALENDAR_FILE, i, `"date" must be YYYY-MM-DD`);
    return {
      id: str(CALENDAR_FILE, i, r, "id")!,
      date,
      time: str(CALENDAR_FILE, i, r, "time", true),
      format: oneOf(CALENDAR_FILE, i, r, "format", CONTENT_FORMATS),
      title: str(CALENDAR_FILE, i, r, "title")!,
      channel: str(CALENDAR_FILE, i, r, "channel")!,
      owner: oneOf(CALENDAR_FILE, i, r, "owner", ASSIGNEES),
      status: oneOf(CALENDAR_FILE, i, r, "status", CONTENT_STATUSES),
    };
  });
}

// Minimal frontmatter: a leading `---` block of `key: value` lines; the title falls back to the first `#` heading.
function parseFrontmatter(slug: string, raw: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  const meta: Record<string, string> = {};
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const kv = /^(\w+):\s*(.*)$/.exec(line);
      if (kv) meta[kv[1]] = kv[2].trim();
    }
  }
  const body = match ? raw.slice(match[0].length) : raw;
  const title = meta.title || /^#\s+(.+)$/m.exec(body)?.[1] || slug;
  return { meta, title, body };
}

function readMarkdownDir(dir: string): { slug: string; raw: string }[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
    .sort()
    .map((f) => ({ slug: f.slice(0, -3), raw: fs.readFileSync(path.join(dir, f), "utf8") }));
}

export function getProjectDocs(): ProjectDoc[] {
  return readMarkdownDir(PROJECTS_DIR).map(({ slug, raw }) => {
    const { meta, title, body } = parseFrontmatter(slug, raw);
    return { slug, title, summary: meta.summary || "", status: meta.status || undefined, category: meta.category || undefined, body };
  });
}

// Unknown slugs render on request, where projects/ may not be bundled — treat a missing folder as "not found".
export function getProjectDoc(slug: string): ProjectDoc | undefined {
  try {
    return getProjectDocs().find((d) => d.slug === slug);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

export function getMemoryDocs(): MemoryDoc[] {
  return readMarkdownDir(MEMORY_DIR).map(({ slug, raw }) => {
    const { meta, title, body } = parseFrontmatter(slug, raw);
    const file = path.relative(ROOT, path.join(MEMORY_DIR, `${slug}.md`));
    if (meta.project && !PROJECTS.includes(meta.project as Project)) {
      throw new Error(`${file}: "project" must be one of ${PROJECTS.join(", ")} (got "${meta.project}")`);
    }
    if (meta.updated && !/^\d{4}-\d{2}-\d{2}$/.test(meta.updated)) throw new Error(`${file}: "updated" must be YYYY-MM-DD`);
    return { slug, title, summary: meta.summary || "", project: (meta.project as Project) || undefined, updated: meta.updated || undefined, body };
  });
}

export function getMemoryDoc(slug: string): MemoryDoc | undefined {
  try {
    return getMemoryDocs().find((d) => d.slug === slug);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

export function getAgents(): AgentAccess[] {
  const ids = new Set<string>();
  return readJsonArray(AGENTS_FILE).map((r, i) => {
    const id = str(AGENTS_FILE, i, r, "id")!;
    if (!/^[a-z][a-z0-9_]*$/.test(id)) fail(AGENTS_FILE, i, `"id" must be lowercase letters, digits or _ (it becomes AGENT_TOKEN_${id.toUpperCase()})`);
    if (ids.has(id)) fail(AGENTS_FILE, i, `duplicate id "${id}"`);
    ids.add(id);
    const projects = r.projects;
    if (!Array.isArray(projects) || projects.some((p) => p !== "*" && !PROJECTS.includes(p))) {
      fail(AGENTS_FILE, i, `"projects" must be an array of "*" or ${PROJECTS.join(", ")}`);
    }
    const scopes = r.scopes;
    if (!Array.isArray(scopes) || scopes.some((s) => !SCOPES.includes(s))) fail(AGENTS_FILE, i, `"scopes" must be an array of ${SCOPES.join(", ")}`);
    return {
      id,
      name: str(AGENTS_FILE, i, r, "name")!,
      description: str(AGENTS_FILE, i, r, "description", true),
      projects: projects as AgentAccess["projects"],
      scopes: scopes as AgentAccess["scopes"],
    };
  });
}
