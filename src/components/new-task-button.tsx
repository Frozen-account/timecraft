"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { useWorkspace } from "@/components/workspace-provider";
import { addDraft } from "@/lib/task-drafts";
import type { Task } from "@/lib/types";

/**
 * "+ Создать задачу" trigger. `existingIds` are the ids already in backlog/tasks.json, so a
 * generated slug cannot collide with a committed task.
 */
export function NewTaskButton({
  existingIds,
  variant = "primary",
  className = "",
}: {
  existingIds: string[];
  variant?: "primary" | "subtle";
  className?: string;
}) {
  const { workspace } = useWorkspace();
  const [open, setOpen] = useState(false);

  const styles =
    variant === "primary"
      ? "bg-brand text-white shadow-sm hover:bg-brand-dark hover:shadow-md"
      : "border border-line bg-surface text-ink-subtle hover:border-brand hover:text-brand";

  function create(draft: Omit<Task, "id">) {
    addDraft(draft, existingIds);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition-all duration-200 ${styles} ${className}`}
      >
        <Plus className="size-4" aria-hidden />
        Создать задачу
      </button>
      {open && <TaskFormDialog workspace={workspace} onClose={() => setOpen(false)} onCreate={create} />}
    </>
  );
}
