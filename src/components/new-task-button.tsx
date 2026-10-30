"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { useWorkspace } from "@/components/workspace-provider";
import type { Task } from "@/lib/types";

const MESSAGES: Record<string, string> = {
  unauthorized: "Сессия истекла. Войдите снова.",
  forbidden: "Недостаточно прав для создания задачи.",
  id_conflict: "Задача с таким названием только что создана. Попробуйте ещё раз.",
  invalid_task: "Проверьте поля формы.",
  insert_failed: "База данных недоступна. Задача не сохранена.",
};

/** "+ Создать задачу" trigger. Writes straight to Postgres via POST /api/tasks. */
export function NewTaskButton({
  variant = "primary",
  className = "",
}: {
  variant?: "primary" | "subtle";
  className?: string;
}) {
  const { workspace } = useWorkspace();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const styles =
    variant === "primary"
      ? "bg-brand text-white shadow-sm hover:bg-brand-dark hover:shadow-md"
      : "border border-line bg-surface text-ink-subtle hover:border-brand hover:text-brand";

  /** Resolves to an error message for the dialog to show, or null on success. */
  async function create(draft: Omit<Task, "id">): Promise<string | null> {
    let res: Response;
    try {
      res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
    } catch {
      return "Нет связи с сервером.";
    }
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; detail?: string };
    if (!res.ok || !data.ok) {
      const base = MESSAGES[data.error ?? ""] ?? "Не удалось создать задачу.";
      return data.detail && data.error === "invalid_task" ? `${base} (${data.detail})` : base;
    }
    setOpen(false);
    // The board is server-rendered from Postgres, so re-render rather than patching state.
    router.refresh();
    return null;
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
