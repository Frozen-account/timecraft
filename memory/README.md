# memory/

Long-lived context that agents read before working on a project. One fact or topic per file.

```markdown
---
title: Short title
summary: One line shown in lists
project: English Expansion   # optional; omit for context shared with every agent
workspace: imosta            # optional; inherited from `project` when that is set
updated: 2026-10-29          # optional, YYYY-MM-DD
---

Body in Markdown.
```

- `project` must be one of the projects in `src/lib/types.ts`; the build fails otherwise.
- `workspace` must be an id from `src/data/workspaces.json`. With a `project` set it is inherited
  (and must agree, or the build fails); with neither, the file is shared across all workspaces.
- Which agent sees which file is set in `agents/access.json` (see `/agents`) — an agent must pass
  both the project and the `allowed_workspaces` check.
- This README is not listed in the app.
