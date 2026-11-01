#!/usr/bin/env node
// One-off import of backlog/tasks.json into the Supabase `tasks` table.
//
//   node scripts/seed-tasks.mjs --dry-run     # show what would be written
//   node scripts/seed-tasks.mjs               # upsert
//
// Needs SUPABASE_SERVICE_ROLE_KEY in .env.local: the RLS policies grant writes to
// `authenticated` only, and a script has no user session. The key never leaves this machine.
//
// Idempotent — rows are upserted on `id`, so re-running after editing tasks.json is safe.

import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DRY = process.argv.includes("--dry-run");

function readEnv(file) {
  const env = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (v.length >= 2 && v[0] === v.at(-1) && (v[0] === '"' || v[0] === "'")) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

const env = readEnv(path.join(ROOT, ".env.local"));
const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is not set in .env.local");
if (!serviceKey && !DRY) {
  fail(
    "SUPABASE_SERVICE_ROLE_KEY is empty in .env.local.\n" +
      "  Dashboard -> Project Settings -> API -> service_role (or API Keys -> secret key).\n" +
      "  Re-run with --dry-run to preview the mapping without it.",
  );
}

function fail(msg) {
  console.error(`\n  ERROR: ${msg}\n`);
  process.exit(1);
}

async function api(pathname, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${url}/rest/v1/${pathname}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(prefer && { Prefer: prefer }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  if (!res.ok) fail(`${method} ${pathname} -> HTTP ${res.status}\n  ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

// `workspace` is deliberately absent: it is derived through directions.workspace_id, so storing
// it on the row would allow a task whose workspace contradicts its direction.
const toRow = (t) => ({
  id: t.id,
  title: t.title,
  status: t.status,
  priority: t.priority,
  assignee: t.assignee,
  direction: t.project,
  tags: t.tags ?? [],
  notes: t.notes ?? null,
  due: t.due ?? null,
  link: t.link ?? null,
  scheduled_date: t.scheduledDate ?? null,
  scheduled_time: t.scheduledTime ?? null,
  duration_minutes: t.durationMinutes ?? null,
  is_daily_focus: t.isDailyFocus === true,
});

const tasks = JSON.parse(readFileSync(path.join(ROOT, "backlog", "tasks.json"), "utf8"));
if (!Array.isArray(tasks)) fail("backlog/tasks.json must contain a JSON array");

const rows = tasks.map(toRow);
const ids = new Set();
for (const r of rows) {
  if (!r.id) fail("a task is missing an id");
  if (ids.has(r.id)) fail(`duplicate task id "${r.id}"`);
  ids.add(r.id);
}

console.log(`\n  backlog/tasks.json: ${rows.length} tasks`);
const byDirection = rows.reduce((acc, r) => ({ ...acc, [r.direction]: (acc[r.direction] ?? 0) + 1 }), {});
for (const [d, n] of Object.entries(byDirection).sort()) console.log(`    ${d.padEnd(20)} ${n}`);

if (DRY) {
  console.log(`\n  --dry-run: nothing written. First row as it would be sent:\n`);
  console.log(JSON.stringify(rows[0], null, 2).split("\n").map((l) => `    ${l}`).join("\n"));
  console.log();
  process.exit(0);
}

// Every direction must already exist (seeded by the migration), or the FK rejects the insert
// with an opaque error — check first so the failure names the missing direction.
const directions = await api("directions?select=name,workspace_id");
const known = new Map(directions.map((d) => [d.name, d.workspace_id]));
const missing = [...new Set(rows.map((r) => r.direction))].filter((d) => !known.has(d));
if (missing.length) {
  fail(`directions missing from the database: ${missing.join(", ")}\n  Apply supabase/migrations/*.sql first.`);
}

// tasks.json still carries a denormalised `workspace`; confirm it agrees with the direction's
// workspace before dropping it, so a silent mismatch cannot slip into the database.
const conflicts = tasks
  .filter((t) => t.workspace && known.get(t.project) !== t.workspace)
  .map((t) => `${t.id}: workspace="${t.workspace}" but direction "${t.project}" is in "${known.get(t.project)}"`);
if (conflicts.length) fail(`workspace/direction mismatch in tasks.json:\n  ${conflicts.join("\n  ")}`);

await api("tasks?on_conflict=id", {
  method: "POST",
  body: rows,
  prefer: "resolution=merge-duplicates,return=minimal",
});

// Read back through the view so the derived workspace is checked, not just the row count.
const after = await api("tasks_with_workspace?select=id,direction,workspace,status&order=id");
const seeded = after.filter((r) => ids.has(r.id));
console.log(`\n  upserted ${rows.length} -> table now holds ${after.length} task(s)`);

const wrong = seeded.filter((r) => r.workspace !== known.get(r.direction));
console.log(`  derived workspace correct for ${seeded.length - wrong.length}/${seeded.length} seeded rows`);
if (wrong.length) fail(`view returned unexpected workspace for: ${wrong.map((r) => r.id).join(", ")}`);

const byWorkspace = seeded.reduce((acc, r) => ({ ...acc, [r.workspace]: (acc[r.workspace] ?? 0) + 1 }), {});
console.log(`  by workspace: ${JSON.stringify(byWorkspace)}\n`);
