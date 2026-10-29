# memory/

Long-lived context that agents read before working on a project. One fact or topic per file.

```markdown
---
title: Short title
summary: One line shown in lists
project: English Expansion   # optional; omit for context shared with every agent
updated: 2026-10-29          # optional, YYYY-MM-DD
---

Body in Markdown.
```

- `project` must be one of the projects in `src/lib/types.ts`; the build fails otherwise.
- Which agent sees which file is set in `agents/access.json` (see `/agents`).
- This README is not listed in the app.
