-- Your lifts (step 5 of the redesign): the lifts a lifter picks to follow on
-- Progress, in their order, up to six. No picks means "my most-trained lifts".
--
-- RLS follows 20261119140000_rls_policy_cleanup.sql: `to authenticated`,
-- `(select auth.uid())` evaluated once per query, explicit WITH CHECK.
--
-- Rollback:
--   drop function public.save_tracked_lifts(uuid[]); drop table public.tracked_lifts;

create table if not exists public.tracked_lifts (
  user_id     uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  position    int  not null check (position between 0 and 5),
  primary key (user_id, exercise_id),
  unique (user_id, position)
);

create index if not exists idx_tracked_lifts_exercise_id on public.tracked_lifts (exercise_id);

alter table public.tracked_lifts enable row level security;

create policy "users own tracked lifts" on public.tracked_lifts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Replaces the caller's picks in one transaction, so a failed save never
-- leaves a half-written list. Runs as the caller (RLS applies) and only keeps
-- exercises the caller can read, so another user's custom exercise is skipped.
create or replace function public.save_tracked_lifts(p_exercise_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(array_length(p_exercise_ids, 1), 0) > 6 then
    raise exception 'Pick up to 6 lifts';
  end if;

  delete from public.tracked_lifts where user_id = (select auth.uid());

  insert into public.tracked_lifts (user_id, exercise_id, position)
  select (select auth.uid()), picked.exercise_id, (picked.ordinality - 1)::int
  from unnest(p_exercise_ids) with ordinality as picked(exercise_id, ordinality)
  where exists (select 1 from public.exercises e where e.id = picked.exercise_id);
end;
$$;

revoke all on function public.save_tracked_lifts(uuid[]) from public;
grant execute on function public.save_tracked_lifts(uuid[]) to authenticated;
