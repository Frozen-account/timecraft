import type { Metadata } from "next";
import { Check, KeyRound, Minus } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { getAgents, getMemoryDocs, getTasks } from "@/lib/data";
import { canSeeProject, tokenEnvName } from "@/lib/access";
import { PROJECTS } from "@/lib/types";

export const metadata: Metadata = { title: "Агенты · TimeCraft" };

export default function AgentsPage() {
  const agents = getAgents();
  const tasks = getTasks();
  const memory = getMemoryDocs();

  return (
    <>
      <PageHeader title="Агенты" subtitle="Кто из агентов какой контекст получает через /api/context. Правила — agents/access.json." />

      <div className="grid gap-4 md:grid-cols-2">
        {agents.map((a) => {
          const projects = PROJECTS.filter((p) => canSeeProject(a, p));
          const taskCount = a.scopes.includes("tasks") ? tasks.filter((t) => canSeeProject(a, t.project)).length : 0;
          const memoryCount = a.scopes.includes("memory") ? memory.filter((d) => canSeeProject(a, d.project)).length : 0;
          return (
            <section key={a.id} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
              <h2 className="text-lg font-bold">{a.name}</h2>
              {a.description && <p className="mt-1 text-sm text-ink-muted">{a.description}</p>}
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="Проектов" value={projects.length} />
                <Stat label="Задач" value={a.scopes.includes("tasks") ? taskCount : "—"} />
                <Stat label="Файлов памяти" value={a.scopes.includes("memory") ? memoryCount : "—"} />
              </dl>
              <p className="mt-4 flex items-center gap-2 text-xs text-ink-subtle">
                <KeyRound className="size-3.5 text-brand" aria-hidden /> Токен в переменной окружения <code className="font-semibold">{tokenEnvName(a)}</code>
              </p>
            </section>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-ink-subtle">Матрица доступа</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wider text-ink-subtle">
            <tr>
              <th className="px-4 py-2.5 font-bold">Проект</th>
              {agents.map((a) => <th key={a.id} className="px-4 py-2.5 text-center font-bold">{a.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map((p) => (
              <tr key={p} className="border-t border-line">
                <td className="px-4 py-2 font-semibold">{p}</td>
                {agents.map((a) => (
                  <td key={a.id} className="px-4 py-2 text-center">
                    {canSeeProject(a, p)
                      ? <Check className="mx-auto size-4 text-emerald-600" aria-label="есть доступ" />
                      : <Minus className="mx-auto size-4 text-ink-muted/50" aria-label="нет доступа" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-ink-subtle">Как агенту получить контекст</h2>
      <pre className="overflow-x-auto rounded-xl bg-ink p-4 text-xs leading-relaxed text-white/90">{`curl -H "Authorization: Bearer $AGENT_TOKEN" \
  "https://timecraft.pro/api/context?project=English%20Expansion"`}</pre>
      <p className="mt-2 text-xs text-ink-muted">
        Без <code>?project=</code> — всё, что разрешено агенту. Файлы памяти без проекта — общий контекст, их видят все агенты со scope <code>memory</code>.
        Чужой проект → 403, неверный токен → 401.
      </p>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col-reverse rounded-lg bg-canvas px-2 py-2 ring-1 ring-line">
      <dt className="text-[11px] font-semibold text-ink-muted">{label}</dt>
      <dd className="text-xl font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}
