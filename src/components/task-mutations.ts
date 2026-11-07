"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePreviousStatus } from "@/components/done-checkbox";
import type { Task } from "@/lib/types";

/**
 * Task writes shared by every view that can edit one (the week grid, the day timeline, Сегодня).
 * Each call PATCHes and then re-renders from the server, so the three never hold their own
 * divergent copy of a task — `router.refresh()` is the single source of truth after a write.
 */
export function useTaskMutations() {
  const router = useRouter();
  // Ids with a PATCH in flight, plus the last failure, so a rejected edit says why.
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const previousStatus = usePreviousStatus();

  /** PATCH one task, then re-render from the server. Resolves to an error message, or null. */
  async function patchTask(id: string, patch: Record<string, unknown>): Promise<string | null> {
    setSaving((s) => new Set(s).add(id));
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; detail?: string };
      if (!res.ok || !data.ok) {
        const message = data.detail ?? data.error ?? "Не удалось сохранить изменение.";
        setError(message);
        return message;
      }
      router.refresh();
      return null;
    } catch {
      const message = "Нет связи с сервером. Изменение не сохранено.";
      setError(message);
      return message;
    } finally {
      setSaving((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  const toggleDone = (task: Task, next: boolean) => {
    previousStatus.remember(task);
    void patchTask(task.id, { status: next ? "done" : previousStatus.restore(task.id) });
  };

  return { saving, error, setError, patchTask, toggleDone };
}
