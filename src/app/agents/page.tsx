import type { Metadata } from "next";
import { Check, KeyRound, Minus } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { getAgents, getMemoryDocs, getTasks } from "@/lib/data";
import { canSeeProject, canSeeWorkspace, tokenEnvName } from "@/lib/access";
import { PROJECTS, WORKSPACE_IDS, projectWorkspace } from "@/lib/types";
import { getWorkspace } from "@/lib/workspaces";

export const metadata: Metadata = { title: "Агенты · TimeCraft" };
// Tasks come from Postgres per request, so this route blocks on that read instead of being
// prerendered. Everything here is behind the auth gate, so there is no public page-speed cost;
// the alternative is streaming the board inside <Suspense> with a skeleton.
export const instant = false;


export default async function AgentsPage() {
  const agents = getAgents();
  const tasks = await getTasks();
  const memory = getMemoryDocs();

  return (
    <>
      <PageHeader title="Агенты" subtitle="Кто из агентов какой контекст получает через /api/context. Правила — agents/access.json." />

      <div className="grid gap-4 md:grid-cols-2">
        {agents.map((a) => {
          const projects = PROJECTS.filter((p) => canSeeProject(a, p) && canSeeWorkspace(a, projectWorkspace(p)));
          const workspaces = WORKSPACE_IDS.filter((w) => canSeeWorkspace(a, w));
          const taskCount = a.scopes.includes("tasks")
            ? tasks.filter((t) => canSeeProject(a, t.project) && canSeeWorkspace(a, t.workspace)).length
            : 0;
          const memoryCount = a.scopes.includes("memory")
            ? memory.filter((d) => canSeeProject(a, d.project) && canSeeWorkspace(a, d.workspace)).length
            : 0;
          return (
            <section key={a.id} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
              <h2 className="text-lg font-bold">{a.name}</h2>
              {a.description && <p className="mt-1 text-sm text-ink-muted">{a.description}</p>}
              <p className="mt-3 flex flex-wrap gap-1.5">
                {workspaces.map((w) => {
                  const ws = getWorkspace(w);
                  return (
                    <span
                      key={w}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: `${ws.color}1a`, color: ws.color, boxShadow: `inset 0 0 0 1px ${ws.color}40` }}
                    >
                      <span aria-hidden>{ws.icon}</span>
                      {ws.name}
                    </span>
                  );
                })}
              </p>
              <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
                <Stat label="Воркспейсов" value={workspaces.length} />
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
              <th className="px-4 py-2.5 font-bold">Воркспейс</th>
              {agents.map((a) => <th key={a.id} className="px-4 py-2.5 text-center font-bold">{a.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map((p) => (
              <tr key={p} className="border-t border-line">
                <td className="px-4 py-2 font-semibold">{p}</td>
                <td className="px-4 py-2 text-xs font-semibold" style={{ color: getWorkspace(projectWorkspace(p)).color }}>
                  {getWorkspace(projectWorkspace(p)).icon} {getWorkspace(projectWorkspace(p)).name}
                </td>
                {agents.map((a) => (
                  <td key={a.id} className="px-4 py-2 text-center">
                    {canSeeProject(a, p) && canSeeWorkspace(a, projectWorkspace(p))
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
        Без <code>?project=</code> и <code>?workspace=</code> — всё, что разрешено агенту. Файлы памяти без проекта — общий контекст,
        их видят все агенты со scope <code>memory</code>; файлы без воркспейса общие для всех воркспейсов.
        Чужой проект или воркспейс → 403, неизвестный → 400, неверный токен → 401.
        Тем же токеном можно писать: <code>POST /api/tasks</code> (создать) и <code>PATCH /api/tasks/&lt;id&gt;</code>
        (статус, приоритет, расписание) — в пределах тех же направлений и воркспейсов.
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
