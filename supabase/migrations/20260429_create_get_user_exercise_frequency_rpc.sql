-- Returns how many completed sets each exercise has logged by the given user
-- over the last 90 days. Used by the "suggest next exercise" system to bias
-- toward exercises the user actually trains.
--
-- Auth model: this project uses NextAuth, so auth.uid() is null at the DB
-- layer. Instead the user_id is passed in as a parameter, always sourced
-- from the server session inside a Server Action — never from the client.
--
-- Permissions: service_role only. Granting to `authenticated` would let any
-- logged-in user query any other user's frequency.
create or replace function public.get_user_exercise_frequency(p_user_id uuid)
returns table (
  exercise_id uuid,
  set_count   bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    we.exercise_id,
    count(s.id)::bigint as set_count
  from public.sets s
  join public.workout_exercises we on we.id = s.workout_exercise_id
  join public.workouts w           on w.id  = we.workout_id
  where w.user_id = p_user_id
    and s.completed_at is not null
    and s.completed_at >= (now() - interval '90 days')
  group by we.exercise_id
$$;

revoke all on function public.get_user_exercise_frequency(uuid) from public, anon, authenticated;
grant execute on function public.get_user_exercise_frequency(uuid) to service_role;
