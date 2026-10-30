-- TimeCraft: writable tasks in Postgres.
--
-- Not applied by anything in this repo — run it yourself when you decide to move tasks off
-- backlog/tasks.json:  supabase db push   (or paste into the SQL editor).
--
-- Design notes:
--  * ids stay text, so the readable slugs already in backlog/tasks.json import unchanged.
--  * a task stores only its direction; the workspace is reached through directions.workspace_id.
--    Storing both would allow a task whose workspace contradicts its direction — exactly the
--    inconsistency src/lib/data.ts has to validate against today.
--  * workspaces/directions mirror src/data/workspaces.json and PROJECT_WORKSPACE. Until the app
--    reads them from here, the code stays the source of truth and these two tables are a mirror.

create table if not exists public.workspaces (
  id    text primary key,
  name  text not null,
  icon  text not null,
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort  int  not null default 0
);

create table if not exists public.directions (
  name         text primary key,
  workspace_id text not null references public.workspaces (id) on update cascade,
  sort         int  not null default 0
);

create table if not exists public.tasks (
  id               text primary key,
  title            text not null check (length(btrim(title)) > 0),
  status           text not null default 'backlog' check (status in ('backlog', 'in_progress', 'review', 'done')),
  priority         text not null default 'medium'  check (priority in ('high', 'medium', 'low')),
  assignee         text not null default 'Human'   check (assignee in ('Claude', 'Gemini', 'Human')),
  direction        text not null references public.directions (name) on update cascade,
  tags             text[] not null default '{}',
  notes            text,
  -- "YYYY-MM" or "YYYY-MM-DD": tasks.json allows month-only due dates, so this is not a date.
  due              text check (due ~ '^\d{4}-\d{2}(-\d{2})?$'),
  link             text check (link like '/%'),
  scheduled_date   date,
  scheduled_time   time,
  duration_minutes int check (duration_minutes between 15 and 720),
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) default auth.uid(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users (id) default auth.uid(),
  -- Mirrors the data.ts rules: a time needs a date, and a duration needs a time.
  constraint tasks_time_needs_date check (scheduled_time is null or scheduled_date is not null),
  constraint tasks_duration_needs_time check (duration_minutes is null or scheduled_time is not null)
);

create index if not exists tasks_direction_idx on public.tasks (direction);
create index if not exists tasks_status_idx    on public.tasks (status);
create index if not exists tasks_scheduled_idx on public.tasks (scheduled_date) where scheduled_date is not null;

-- Workspace comes from the direction, never from the row itself.
create or replace view public.tasks_with_workspace
with (security_invoker = true) as
  select t.*, d.workspace_id as workspace
  from public.tasks t
  join public.directions d on d.name = t.direction;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- RLS: internal tool, so any signed-in user may read and write tasks. Narrow this to
-- per-workspace membership by adding a workspace_members table and testing the direction's
-- workspace_id against it — the view above is the natural place to hang that off.
alter table public.workspaces enable row level security;
alter table public.directions enable row level security;
alter table public.tasks      enable row level security;

create policy "workspaces readable by signed-in users" on public.workspaces
  for select to authenticated using (true);

create policy "directions readable by signed-in users" on public.directions
  for select to authenticated using (true);

create policy "tasks readable by signed-in users" on public.tasks
  for select to authenticated using (true);

create policy "tasks writable by signed-in users" on public.tasks
  for insert to authenticated with check (true);

create policy "tasks updatable by signed-in users" on public.tasks
  for update to authenticated using (true) with check (true);

create policy "tasks deletable by signed-in users" on public.tasks
  for delete to authenticated using (true);

-- Seed: mirrors src/data/workspaces.json and PROJECT_WORKSPACE in src/lib/types.ts.
insert into public.workspaces (id, name, icon, color, sort) values
  ('imosta',    'IMOSTA',    '🏛️', '#7c3aed', 1),
  ('traff',     'Traff.org', '📈', '#059669', 2),
  ('bizbroker', 'BizBroker', '🤝', '#d97706', 3),
  ('personal',  'Personal',  '🌱', '#0284c7', 4)
on conflict (id) do nothing;

insert into public.directions (name, workspace_id, sort) values
  ('JDG',               'imosta', 1),
  ('Spolka',            'imosta', 2),
  ('Meta Ads',          'imosta', 3),
  ('Webinar',           'imosta', 4),
  ('Forms',             'imosta', 5),
  ('English Expansion', 'imosta', 6),
  ('Video Education',   'imosta', 7),
  ('Marketing',         'imosta', 8)
on conflict (name) do nothing;
