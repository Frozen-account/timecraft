-- TimeCraft: give the `personal` workspace a direction so it can actually hold anything.
--
-- Apply with `supabase db push`, or paste into the SQL editor.
--
-- The personal workspace has been seeded since 20261031000000_tasks.sql, but no direction
-- pointed at it. A task row stores only its direction and reaches its workspace through
-- directions.workspace_id, so "personal" was unreachable: every insert had to name one of the
-- eight IMOSTA directions, which put errands and travel under a business direction or kept them
-- out of the system entirely.
--
-- The name is Cyrillic where the IMOSTA directions are Latin. That is deliberate: those are
-- brand/product names that stay untranslated, while this one is a plain category and is shown
-- as-is in the direction dropdown and on task cards. It must match PROJECTS in src/lib/types.ts
-- exactly — directions.name is the foreign key tasks.direction points at.

insert into public.directions (name, workspace_id, sort) values
  ('Личное', 'personal', 9)
on conflict (name) do nothing;
