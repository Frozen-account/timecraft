# TimeCraft

Workspace for a team and its AI agents: task calendar, project dashboards, Markdown memory and controlled agent access to project context.
Production: **https://timecraft.pro** (alias: timecraft.com).

Migrated from the IMOSTA marketing hub; the IMOSTA data (tasks, project docs, `IMOSTA-SSOT.md`) came along as the first workspace.

- `backlog/tasks.json` — tasks
- `content/calendar.json` — content plan
- `projects/*.md` — project documentation
- `memory/*.md` — long-lived context for agents (format: `memory/README.md`)
- `agents/access.json` — which agent may read which project's context
- `IMOSTA-SSOT.md` — IMOSTA brand, funnels and lead requirements
- `src/` — web app (Next.js 16, App Router, TypeScript, Tailwind CSS v4)

## Routes

| Route        | View                                   | Data source            |
| ------------ | -------------------------------------- | ---------------------- |
| `/`          | Dashboard: open work, next slot and memory per project | `backlog/tasks.json`, `memory/` |
| `/tasks`     | Kanban: Backlog → In Progress → Review → Done | `backlog/tasks.json` |
| `/schedule`  | Weekly time-blocking calendar: drag & drop, quick task creation | `backlog/tasks.json` + browser-local changes |
| `/projects`  | Markdown documentation reader          | `projects/*.md`        |
| `/memory`    | Memory files, grouped by project, with the agents that can read each | `memory/*.md` |
| `/agents`    | Agent access matrix and API usage      | `agents/access.json`   |
| `/content`   | Weekly content calendar                | `content/calendar.json` |
| `/analytics` | Lead counter and UTM attribution table | demo data (`src/lib/mock-data.ts`) |
| `GET /api/context` | Tasks + memory an agent may see (bearer token) | all of the above |

Data is Git-driven: edit the files, commit, push — Vercel rebuilds.
Files are validated at build time (`src/lib/data.ts`); an invalid value fails the build with the file and entry index.

Allowed values (see `src/lib/types.ts`):
- task `status`: `backlog`, `in_progress`, `review`, `done` · `priority`: `high`, `medium`, `low`
- `assignee` / `owner`: `Claude`, `Gemini`, `Human` · `project`: `JDG`, `Spolka`, `Meta Ads`, `Webinar`, `Forms`, `English Expansion`, `Video Education`, `Marketing`
- optional task scheduling: `scheduledDate` (`YYYY-MM-DD`), `scheduledTime` (`HH:MM`, needs a date), `durationMinutes` (15–720)
- content `format`: `Reels`, `Screen recording`, `Blog` · `status`: `idea`, `scripted`, `recorded`, `published`
- `projects/*.md` may start with a `---` block containing `title:`, `summary:` and optional `status:` / `category:`
- `memory/*.md` frontmatter: `title`, `summary`, optional `project` (omit = shared context), optional `updated` (`YYYY-MM-DD`)

### Calendar changes

Moves and new tasks on `/schedule` are stored in the browser only. To publish them: **Скопировать JSON** → paste into `backlog/tasks.json` → commit → after the deploy press **Сбросить**.

## Agent access

`agents/access.json` lists each agent with `projects` (`"*"` or project names) and `scopes` (`tasks`, `memory`).
Each agent authenticates with its own token from env `AGENT_TOKEN_<ID>`:

```bash
curl -H "Authorization: Bearer $AGENT_TOKEN_CLAUDE" "https://timecraft.pro/api/context?project=Marketing"
```

- Without `?project=` the agent gets everything it is allowed to see.
- Memory files without a `project` are shared with every agent that has the `memory` scope.
- Wrong or missing token → 401; a project outside the agent's list → 403.

## Workspaces

Each business entity (IMOSTA, Traff.org, BizBroker, Personal) is a workspace, so directions,
tasks, memory and agent access stay partitioned while `Все воркспейсы` keeps the unified view.

| Where | How the workspace is set |
| --- | --- |
| `src/data/workspaces.json` | the registry: `id`, `name`, `icon`, `color` (validated at build) |
| `src/lib/types.ts` | `PROJECT_WORKSPACE` maps every direction to a workspace — exhaustive, so a new direction without one is a compile error |
| `backlog/tasks.json` | `"workspace": "imosta"`; omit it and the task inherits its direction's workspace |
| `memory/*.md` | `workspace:` frontmatter; inherited from `project`, and shared across workspaces when neither is set |
| `agents/access.json` | `allowed_workspaces: ["imosta"]` or `["*"]`; omit it and the agent is scoped to the workspaces of its own directions |

The switcher sits in the sidebar and keeps its choice in `localStorage` plus the `?workspace=`
search param, so a link opens in the workspace it names. Filtering runs client-side on purpose —
reading the param on the server would opt every page out of static prerendering.

Agents pass `?workspace=<id>` to `/api/context`. Workspace and project scoping are orthogonal and
both are enforced: unknown id → 400, a workspace outside `allowed_workspaces` → 403, and a
`?project=` that lives in a different workspace → 400.

## Authentication

Team members sign in at `/login` with their Supabase email + password. `src/proxy.ts` gates every
route on a valid session and refreshes the Supabase cookies on each request, so a session persists
per device for as long as the refresh token lives.

Users are managed in Supabase → Authentication → Users (there is no public sign-up route).
Agent access to `GET /api/context` is separate and still uses the `AGENT_TOKEN_*` bearer tokens.

| File | Role |
| --- | --- |
| `src/lib/supabase/client.ts` | browser client (Client Components) |
| `src/lib/supabase/server.ts` | server client (Server Components, Actions, Route Handlers) |
| `src/lib/supabase/middleware.ts` | `updateSession()` — cookie refresh used by `src/proxy.ts` |
| `src/app/api/auth/route.ts` | `POST` sign-in, `DELETE` sign-out |

## Development

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY at least
npm install
npm run dev     # http://localhost:3000
npm run build
```

Brand tokens (`brand`, `ink`, `canvas`, …) are defined in `src/app/globals.css` under `@theme`.

### Deploy

Import the repo in Vercel (framework preset: Next.js, root directory: repo root) and set the variables from `.env.example`.
Attach the domains `timecraft.pro` and `timecraft.com` in Vercel → Settings → Domains.
All pages require a signed-in Supabase user (`/login`); responses carry `X-Robots-Tag: noindex, nofollow`.
