// Workspace registry. Imported by both server and client code, so no "server-only" here —
// the JSON is bundled, not read from disk.
import registry from "@/data/workspaces.json";
import { ALL_WORKSPACES, WORKSPACE_IDS, type Workspace, type WorkspaceFilter, type WorkspaceId } from "./types";

// src/data/workspaces.json is hand-edited: a typo should fail the build, not render garbage.
function validate(): Workspace[] {
  const seen = new Set<string>();
  const list = registry.map((w, i) => {
    const where = `src/data/workspaces.json [${i}]`;
    if (!WORKSPACE_IDS.includes(w.id as WorkspaceId)) {
      throw new Error(`${where}: "id" must be one of ${WORKSPACE_IDS.join(", ")} (got ${JSON.stringify(w.id)})`);
    }
    if (seen.has(w.id)) throw new Error(`${where}: duplicate id "${w.id}"`);
    seen.add(w.id);
    if (!w.name?.trim()) throw new Error(`${where}: "name" must be a non-empty string`);
    if (!w.icon?.trim()) throw new Error(`${where}: "icon" must be a non-empty string`);
    if (!/^#[0-9a-f]{6}$/i.test(w.color ?? "")) throw new Error(`${where}: "color" must be #rrggbb (got ${JSON.stringify(w.color)})`);
    return { id: w.id as WorkspaceId, name: w.name, icon: w.icon, color: w.color };
  });
  const missing = WORKSPACE_IDS.filter((id) => !seen.has(id));
  if (missing.length > 0) throw new Error(`src/data/workspaces.json: missing entries for ${missing.join(", ")}`);
  // Keep WORKSPACE_IDS order so the switcher is stable regardless of JSON ordering.
  return WORKSPACE_IDS.map((id) => list.find((w) => w.id === id)!);
}

export const WORKSPACES: Workspace[] = validate();

const BY_ID = new Map(WORKSPACES.map((w) => [w.id, w]));

export const getWorkspace = (id: WorkspaceId): Workspace => BY_ID.get(id)!;

export const isWorkspaceId = (v: unknown): v is WorkspaceId =>
  typeof v === "string" && WORKSPACE_IDS.includes(v as WorkspaceId);

export const isWorkspaceFilter = (v: unknown): v is WorkspaceFilter =>
  v === ALL_WORKSPACES || isWorkspaceId(v);

/** Workspace label for UI: the aggregate state has no registry entry. */
export function workspaceLabel(filter: WorkspaceFilter): { name: string; icon: string; color: string | null } {
  if (filter === ALL_WORKSPACES) return { name: "Все воркспейсы", icon: "🗂️", color: null };
  const w = getWorkspace(filter);
  return { name: w.name, icon: w.icon, color: w.color };
}

/** Does an entity in `workspace` show under the active filter? Undefined = shared, always visible. */
export const inWorkspace = (entity: WorkspaceId | undefined, filter: WorkspaceFilter): boolean =>
  filter === ALL_WORKSPACES || entity === undefined || entity === filter;

/** Inline styles keep accent colors out of Tailwind's class scan (hex comes from JSON at runtime). */
export const badgeStyle = (color: string) => ({
  backgroundColor: `${color}1a`,
  color,
  boxShadow: `inset 0 0 0 1px ${color}40`,
});
