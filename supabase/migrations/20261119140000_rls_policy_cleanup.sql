-- RLS cleanup after the 2026-11-19 audit (Track B).
--
-- 1. Every remaining policy is limited to `authenticated` (was `public`, which
--    includes anon), calls `(select auth.uid())` once per query instead of once
--    per row (advisor: auth_rls_initplan), and states its WITH CHECK explicitly.
--    Meaning is unchanged: each policy still grants the same commands on the
--    same rows. Names are kept, so rollback is the same ALTER with the old text.
-- 2. get_user_exercise_frequency was SECURITY DEFINER and service_role-only, so
--    every app call got "permission denied" and frequency ordering never worked.
--    It now runs as the caller and scopes itself by auth.uid().
-- 3. check_and_update_prs and get_weekly_volume are unused by the app and were
--    executable by anon with a mutable search_path. Dropped.
-- 4. Covering indexes for foreign keys the advisor flagged; several of these
--    are the join columns the child-table policies filter through.
--
-- Previous policies (all `to public`, all with `auth.uid()` unwrapped):
--   bodyweight_log      bodyweight_log_owner                  ALL    using/check (auth.uid() = user_id)
--   coach_conversations "Users can manage their own conversations" ALL using/check (auth.uid() = user_id)
--   coach_messages      "Users can manage messages in their conversations" ALL
--                       using/check (conversation_id in (select id from coach_conversations where user_id = auth.uid()))
--   deload_log          "users own deloads"                   ALL    using (auth.uid() = user_id)
--   personal_records    "users own prs"                       ALL    using (auth.uid() = user_id)
--   profiles            "Users can insert own profile"        INSERT check (auth.uid() = id)
--   profiles            "Users can update own profile"        UPDATE using (auth.uid() = id)
--   profiles            "Users can view own profile"          SELECT using (auth.uid() = id)
--   program_days        "users own program_days"              ALL    using (program_id in (select id from programs where user_id = auth.uid()))
--   program_exercises   "users own program_exercises"         ALL    using (program_day_id in (select pd.id from program_days pd join programs p on p.id = pd.program_id where p.user_id = auth.uid()))
--   programs            "users own programs"                  ALL    using (auth.uid() = user_id)
--   readiness_logs      "Users can delete their own readiness logs" DELETE using (auth.uid() = user_id)
--   readiness_logs      "Users can insert their own readiness logs" INSERT check (auth.uid() = user_id)
--   readiness_logs      "Users can update their own readiness logs" UPDATE using/check (auth.uid() = user_id)
--   readiness_logs      "Users can view their own readiness logs"   SELECT using (auth.uid() = user_id)
--   routine_exercises   "Users can manage their own routine exercises" ALL using (routine_id in (select id from routines where user_id = auth.uid()))
--   routines            "Users can manage their own routines" ALL    using (auth.uid() = user_id)
--   sets                "users own sets"                      ALL    using (workout_exercise_id in (select we.id from workout_exercises we join workouts w on w.id = we.workout_id where w.user_id = auth.uid()))
--   user_exercise_preferences "Users can read their own exercise preferences"   SELECT using (auth.uid() = user_id)
--   user_exercise_preferences "Users can update their own exercise preferences" UPDATE using (auth.uid() = user_id)
--   user_exercise_preferences "Users can upsert their own exercise preferences" INSERT check (auth.uid() = user_id)
--   workout_exercises   "users own workout_exercises"         ALL    using (workout_id in (select id from workouts where user_id = auth.uid()))
--   workouts            "users own workouts"                  ALL    using (auth.uid() = user_id)
-- Previous functions: see migrations create_rpc_functions (20260406174323) and
-- fix_get_user_exercise_frequency_takes_user_id (20260429022613).

-- ── 1. Policies ─────────────────────────────────────────────────────────────

-- Owned directly by user_id
alter policy bodyweight_log_owner on public.bodyweight_log to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users can manage their own conversations" on public.coach_conversations to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "users own deloads" on public.deload_log to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "users own prs" on public.personal_records to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "users own programs" on public.programs to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users can manage their own routines" on public.routines to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "users own workouts" on public.workouts to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy "Users can view their own readiness logs" on public.readiness_logs to authenticated
  using ((select auth.uid()) = user_id);
alter policy "Users can insert their own readiness logs" on public.readiness_logs to authenticated
  with check ((select auth.uid()) = user_id);
alter policy "Users can update their own readiness logs" on public.readiness_logs to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users can delete their own readiness logs" on public.readiness_logs to authenticated
  using ((select auth.uid()) = user_id);

alter policy "Users can read their own exercise preferences" on public.user_exercise_preferences to authenticated
  using ((select auth.uid()) = user_id);
alter policy "Users can upsert their own exercise preferences" on public.user_exercise_preferences to authenticated
  with check ((select auth.uid()) = user_id);
alter policy "Users can update their own exercise preferences" on public.user_exercise_preferences to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy "Users can view own profile" on public.profiles to authenticated
  using ((select auth.uid()) = id);
alter policy "Users can insert own profile" on public.profiles to authenticated
  with check ((select auth.uid()) = id);
alter policy "Users can update own profile" on public.profiles to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Owned through a parent row
alter policy "Users can manage messages in their conversations" on public.coach_messages to authenticated
  using (conversation_id in (select c.id from public.coach_conversations c where c.user_id = (select auth.uid())))
  with check (conversation_id in (select c.id from public.coach_conversations c where c.user_id = (select auth.uid())));
alter policy "users own workout_exercises" on public.workout_exercises to authenticated
  using (workout_id in (select w.id from public.workouts w where w.user_id = (select auth.uid())))
  with check (workout_id in (select w.id from public.workouts w where w.user_id = (select auth.uid())));
alter policy "users own sets" on public.sets to authenticated
  using (workout_exercise_id in (
    select we.id from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where w.user_id = (select auth.uid())))
  with check (workout_exercise_id in (
    select we.id from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where w.user_id = (select auth.uid())));
alter policy "Users can manage their own routine exercises" on public.routine_exercises to authenticated
  using (routine_id in (select r.id from public.routines r where r.user_id = (select auth.uid())))
  with check (routine_id in (select r.id from public.routines r where r.user_id = (select auth.uid())));
alter policy "users own program_days" on public.program_days to authenticated
  using (program_id in (select p.id from public.programs p where p.user_id = (select auth.uid())))
  with check (program_id in (select p.id from public.programs p where p.user_id = (select auth.uid())));
alter policy "users own program_exercises" on public.program_exercises to authenticated
  using (program_day_id in (
    select pd.id from public.program_days pd
    join public.programs p on p.id = pd.program_id
    where p.user_id = (select auth.uid())))
  with check (program_day_id in (
    select pd.id from public.program_days pd
    join public.programs p on p.id = pd.program_id
    where p.user_id = (select auth.uid())));

-- ── 2. Exercise frequency: run as the caller ────────────────────────────────
drop function public.get_user_exercise_frequency(uuid);

create function public.get_user_exercise_frequency()
returns table (exercise_id uuid, set_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select we.exercise_id, count(s.id)::bigint as set_count
  from public.sets s
  join public.workout_exercises we on we.id = s.workout_exercise_id
  join public.workouts w           on w.id  = we.workout_id
  where w.user_id = (select auth.uid())
    and s.completed_at is not null
    and s.completed_at >= now() - interval '90 days'
  group by we.exercise_id
$$;

revoke execute on function public.get_user_exercise_frequency() from public, anon;
grant execute on function public.get_user_exercise_frequency() to authenticated;

-- ── 3. Unused functions ─────────────────────────────────────────────────────
drop function public.check_and_update_prs(uuid, uuid, uuid, double precision, integer);
drop function public.get_weekly_volume(uuid, integer);

-- ── 4. Foreign-key indexes ──────────────────────────────────────────────────
create index if not exists idx_exercises_created_by                on public.exercises (created_by);
create index if not exists idx_personal_records_exercise_id        on public.personal_records (exercise_id);
create index if not exists idx_personal_records_set_id             on public.personal_records (set_id);
create index if not exists idx_program_days_program_id             on public.program_days (program_id);
create index if not exists idx_program_exercises_program_day_id    on public.program_exercises (program_day_id);
create index if not exists idx_program_exercises_exercise_id       on public.program_exercises (exercise_id);
create index if not exists idx_routine_exercises_routine_id        on public.routine_exercises (routine_id);
create index if not exists idx_routine_exercises_exercise_id       on public.routine_exercises (exercise_id);
create index if not exists idx_routines_user_id                    on public.routines (user_id);
create index if not exists idx_user_exercise_preferences_exercise_id on public.user_exercise_preferences (exercise_id);
create index if not exists idx_workout_exercises_exercise_id       on public.workout_exercises (exercise_id);
