-- Close three RLS holes found in the 2026-11-19 audit.
--
-- 1. coach_usage: users could delete their own usage rows through the API and
--    reset the daily coach limit, which counts these rows.
-- 2. avatars bucket: any signed-in user could overwrite any other user's avatar,
--    and anyone could list every object (exposing user ids).
-- 3. exercises: every user's custom exercises were readable by everyone,
--    including signed-out visitors.
--
-- Previous policies (for rollback):
--   coach_usage  "Users can view and record their own usage"  ALL  public
--                using/check (auth.uid() = user_id)
--   storage.objects "Public Access"       SELECT public using (bucket_id = 'avatars')
--   storage.objects "User Update Access"  UPDATE public
--                using (bucket_id = 'avatars' and auth.role() = 'authenticated')
--   storage.objects "User Upload Access"  INSERT public
--                check (bucket_id = 'avatars' and auth.role() = 'authenticated')
--   exercises "read all exercises"    SELECT public using (true)
--   exercises "manage own exercises"  ALL    public
--                using ((is_custom = true) and (created_by = auth.uid()))
--   avatars bucket: file_size_limit null, allowed_mime_types null

-- ── 1. coach_usage: append-only ledger ──────────────────────────────────────
drop policy "Users can view and record their own usage" on public.coach_usage;

create policy coach_usage_select_own on public.coach_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy coach_usage_insert_own on public.coach_usage
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- No update/delete policy on purpose: the daily coach limit counts these rows,
-- so users must never be able to remove or rewrite them. Revoking the grants as
-- well means a future permissive policy can't silently reopen the hole.
revoke update, delete on public.coach_usage from anon, authenticated;

-- ── 2. avatars: each user owns only their own folder ────────────────────────
drop policy "Public Access" on storage.objects;
drop policy "User Update Access" on storage.objects;
drop policy "User Upload Access" on storage.objects;

-- The bucket is public, so images are served by URL without any policy.
-- This SELECT only governs API listing/upsert, so scope it to the owner.
create policy avatars_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Users can upload straight to this public bucket with their own token, so cap
-- it to small images. 1 MB matches the default Server Action body limit the app
-- uploads through.
update storage.buckets
  set file_size_limit = 1048576,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
  where id = 'avatars';

-- ── 3. exercises: global catalog + own custom exercises only ────────────────
drop policy "read all exercises" on public.exercises;
drop policy "manage own exercises" on public.exercises;

create policy exercises_select on public.exercises
  for select to authenticated
  using (is_custom = false or created_by = (select auth.uid()));

create policy exercises_insert_own on public.exercises
  for insert to authenticated
  with check (is_custom = true and created_by = (select auth.uid()));

create policy exercises_update_own on public.exercises
  for update to authenticated
  using (is_custom = true and created_by = (select auth.uid()))
  with check (is_custom = true and created_by = (select auth.uid()));

create policy exercises_delete_own on public.exercises
  for delete to authenticated
  using (is_custom = true and created_by = (select auth.uid()));
