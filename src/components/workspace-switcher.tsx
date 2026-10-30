"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { ALL_WORKSPACES, type WorkspaceFilter } from "@/lib/types";
import { WORKSPACES, workspaceLabel } from "@/lib/workspaces";

const OPTIONS: WorkspaceFilter[] = [ALL_WORKSPACES, ...WORKSPACES.map((w) => w.id)];

export function WorkspaceSwitcher() {
  const { workspace, setWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const active = workspaceLabel(workspace);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative px-3 pb-3 md:px-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Воркспейс: ${active.name}`}
        className="flex w-full items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
      >
        <span aria-hidden className="text-base leading-none">{active.icon}</span>
        <span className="min-w-0 flex-1 truncate">{active.name}</span>
        {active.color && (
          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: active.color }} />
        )}
        <ChevronsUpDown className="size-3.5 shrink-0 text-white/50" aria-hidden />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Воркспейсы"
          className="absolute left-3 right-3 z-30 mt-1 overflow-hidden rounded-lg border border-white/15 bg-slate-800 py-1 shadow-2xl"
        >
          {OPTIONS.map((id) => {
            const { name, icon, color } = workspaceLabel(id);
            const selected = id === workspace;
            return (
              <li key={id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    setWorkspace(id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 ${
                    selected ? "bg-white/10 font-semibold text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span aria-hidden className="text-base leading-none">{icon}</span>
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  {color && <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
                  {selected && <Check className="size-3.5 shrink-0 text-brand" aria-hidden />}
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
