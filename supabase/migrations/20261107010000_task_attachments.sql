-- TimeCraft: file attachments on tasks — train tickets, photos, documents.
--
-- Apply with `supabase db push`, or paste into the SQL editor. The app degrades gracefully
-- until it is applied: tasks read back with an empty attachment list and the upload control
-- reports that the migration is missing rather than throwing.
--
-- Storage layout: one object per attachment at <task id>/<uuid>.<ext> inside the
-- task-attachments bucket. The task row holds only metadata; the bytes live in storage.
--
-- The bucket is PRIVATE, and the row stores the object `path`, not a URL. Two reasons:
--  * these are personal documents (a ticket carries a full name and a booking reference), and
--    a public bucket is a permanent unauthenticated read for anyone who ever sees the link;
--  * a signed URL expires, so persisting one in jsonb would rot — the column would fill with
--    links that worked on the day they were written. The UI signs `path` on demand instead.

alter table public.tasks
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- jsonb will happily store an object or a scalar; the app expects a list and nothing else.
alter table public.tasks
  drop constraint if exists tasks_attachments_is_array;
alter table public.tasks
  add constraint tasks_attachments_is_array
  check (jsonb_typeof(attachments) = 'array');

-- The view expands t.* at creation time, so it must be rebuilt to expose the new column —
-- the same reason 20261101000000_daily_focus.sql rebuilds it. Dropped rather than replaced:
-- CREATE OR REPLACE VIEW can only append columns, and t.* puts attachments before workspace.
drop view if exists public.tasks_with_workspace;
create view public.tasks_with_workspace
with (security_invoker = true) as
  select t.*, d.workspace_id as workspace
  from public.tasks t
  join public.directions d on d.name = t.direction;

-- 10 MB and a fixed mime allow-list, enforced by storage itself rather than only in the client:
-- the browser check is a courtesy, this is the boundary. Keep both lists in step with
-- ATTACHMENT_TYPES / MAX_ATTACHMENT_BYTES in src/lib/types.ts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-attachments', 'task-attachments', false, 10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Same stance as the tasks table: internal tool, so any signed-in user may read and write.
-- Narrow this the same way — resolve the task id out of the object path and test its
-- direction's workspace against a membership table.
drop policy if exists "task attachments readable by signed-in users" on storage.objects;
create policy "task attachments readable by signed-in users" on storage.objects
  for select to authenticated using (bucket_id = 'task-attachments');

drop policy if exists "task attachments writable by signed-in users" on storage.objects;
create policy "task attachments writable by signed-in users" on storage.objects
  for insert to authenticated with check (bucket_id = 'task-attachments');

drop policy if exists "task attachments deletable by signed-in users" on storage.objects;
create policy "task attachments deletable by signed-in users" on storage.objects
  for delete to authenticated using (bucket_id = 'task-attachments');
