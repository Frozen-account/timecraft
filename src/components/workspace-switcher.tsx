"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LayoutGrid } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { ALL_WORKSPACES, type WorkspaceFilter } from "@/lib/types";
import { WORKSPACES, workspaceLabel } from "@/lib/workspaces";

const OPTIONS: WorkspaceFilter[] = [ALL_WORKSPACES, ...WORKSPACES.map((w) => w.id)];

// Two initials from the workspace name, used when a registry entry has no icon.
const initials = (name: string) =>
  name
    .split(/[\s.\-_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/**
 * Round accent badge for a workspace. The aggregate view gets a grid glyph on neutral
 * chrome; a real workspace gets its registry colour as a tinted fill plus a hairline ring,
 * which reads on the dark sidebar without the colour having to pass contrast as text.
 */
export function WorkspaceAvatar({
  filter,
  size = "md",
  className = "",
}: {
  filter: WorkspaceFilter;
  size?: "sm" | "md";
  className?: string;
}) {
  const { name, icon, color } = workspaceLabel(filter);
  const box = size === "md" ? "size-8" : "size-7";
  const glyph = size === "md" ? "text-[15px]" : "text-[13px]";
  const shared = [box, className, "grid shrink-0 place-items-center rounded-full leading-none"]
    .filter(Boolean)
    .join(" ");

  if (filter === ALL_WORKSPACES) {
    return (
      <span className={`${shared} bg-white/10 text-white/75 ring-1 ring-inset ring-white/15`} aria-hidden>
        <LayoutGrid className={size === "md" ? "size-4" : "size-3.5"} />
      </span>
    );
  }

  return (
    <span
      className={`${shared} ${glyph} font-bold`}
      style={{
        backgroundColor: `${color}26`,
        color: color ?? undefined,
        boxShadow: `inset 0 0 0 1px ${color}59`,
      }}
      aria-hidden
    >
      {icon || initials(name)}
    </span>
  );
}

export function WorkspaceSwitcher() {
  const { workspace, setWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const active = workspaceLabel(workspace);

  // Close on outside click or Escape, returning focus to the trigger on Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative px-3 pb-3">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Воркспейс: ${active.name}`}
        className={`flex w-full items-center gap-2.5 rounded-xl border border-white/10 py-2 pl-2 pr-2.5 text-left transition-colors duration-200 ${
          open ? "bg-white/10" : "bg-white/[0.04] hover:bg-white/[0.08]"
        }`}
      >
        <WorkspaceAvatar filter={workspace} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-white">{active.name}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-white/35 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Воркспейсы"
          className="animate-pop-in absolute left-3 right-3 top-full z-30 mt-1.5 origin-top rounded-xl border border-white/10 bg-slate-800 p-1 shadow-2xl"
        >
          {OPTIONS.map((id) => {
            const { name, color } = workspaceLabel(id);
            const selected = id === workspace;
            return (
              <li key={id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    setWorkspace(id);
                    setOpen(false);
                    trigger.current?.focus();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 ${
                    selected ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  <WorkspaceAvatar filter={id} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">{name}</span>
                  {selected && (
                    <Check
                      className="size-4 shrink-0"
                      style={{ color: color ?? "var(--color-brand-light)" }}
                      aria-hidden
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Small workspace chip used in "all workspaces" lists so rows stay attributable. */
export function WorkspaceBadge({ id, className = "" }: { id: WorkspaceFilter; className?: string }) {
  const { name, icon, color } = workspaceLabel(id);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${className}`}
      style={color ? { backgroundColor: `${color}1a`, color, boxShadow: `inset 0 0 0 1px ${color}40` } : undefined}
    >
      <span aria-hidden>{icon}</span>
      {name}
    </span>
  );
}
