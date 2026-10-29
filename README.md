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

## Development

```bash
cp .env.example .env.local   # set TIMECRAFT_ACCESS_KEY at least
npm install
npm run dev     # http://localhost:3000
npm run build
```

Brand tokens (`brand`, `ink`, `canvas`, …) are defined in `src/app/globals.css` under `@theme`.

### Deploy

Import the repo in Vercel (framework preset: Next.js, root directory: repo root) and set the variables from `.env.example`.
Attach the domains `timecraft.pro` and `timecraft.com` in Vercel → Settings → Domains.
All pages require the access key (`/login`); responses carry `X-Robots-Tag: noindex, nofollow`.
