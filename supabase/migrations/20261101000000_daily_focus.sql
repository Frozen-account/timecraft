-- TimeCraft: "Дело дня" — one most-important task per calendar date.
--
-- Apply with `supabase db push`, or paste into the SQL editor.
--
-- Scope decision: the unique index is per DATE, not per date+workspace. A task row stores only
-- its direction (the workspace is reached through directions.workspace_id), so a per-workspace
-- index would need a denormalised column — the very thing the schema avoids. It also matches
-- what MIT means: one single most important thing for the day, whichever entity it belongs to.
-- For one-per-workspace instead, drop the index below and recreate it over a function that
-- resolves the workspace, or add a generated workspace column.

alter table public.tasks
  add column if not exists is_daily_focus boolean not null default false;

-- A focus task must have a day to be the focus of. This is also what lets the UI require a date
-- before the toggle can be turned on.
alter table public.tasks
  drop constraint if exists tasks_daily_focus_needs_date;
alter table public.tasks
  add constraint tasks_daily_focus_needs_date
  check (not is_daily_focus or scheduled_date is not null);

-- At most one focus task per date. Partial, so unscheduled and non-focus rows are unaffected.
create unique index if not exists tasks_unique_daily_focus_per_date
  on public.tasks (scheduled_date)
  where (is_daily_focus = true and scheduled_date is not null);

-- The view expands t.* at creation time, so it must be rebuilt to expose the new column.
-- Dropped rather than replaced: CREATE OR REPLACE VIEW can only append columns, and t.* puts
-- is_daily_focus before workspace.
drop view if exists public.tasks_with_workspace;
create view public.tasks_with_workspace
with (security_invoker = true) as
  select t.*, d.workspace_id as workspace
  from public.tasks t
  join public.directions d on d.name = t.direction;

-- Moving the focus has to be one statement, or two clients racing on the same date would both
-- clear and then both set, and the unique index would reject the loser with an opaque 23505.
-- security invoker, so RLS still applies for a signed-in user; agents call it with service-role.
create or replace function public.set_daily_focus(p_task_id text, p_value boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  d date;
begin
  if not p_value then
    update public.tasks set is_daily_focus = false where id = p_task_id;
    return;
  end if;

  select scheduled_date into d from public.tasks where id = p_task_id;
  if d is null then
    raise exception 'task % has no scheduled_date and cannot be the daily focus', p_task_id
      using errcode = 'check_violation';
  end if;

  -- Clear the incumbent first so the unique index never sees two focus rows on one date.
  update public.tasks
     set is_daily_focus = false
   where scheduled_date = d and is_daily_focus and id <> p_task_id;

  update public.tasks set is_daily_focus = true where id = p_task_id;
end;
$$;

grant execute on function public.set_daily_focus(text, boolean) to authenticated, service_role;
