-- Lifetime workout count and volume for a user, summed in the database.
-- security invoker, so RLS still limits rows to the caller. The app used to
-- download every set to add them up, which grew with history and was
-- silently cut off at PostgREST's 1000-row limit.
--
-- Volume follows lib/load.ts setVolume(): weight × reps, except assisted
-- exercises (name contains "assisted"), which lift bodyweight minus the
-- assistance, never below zero. Workouts without a stored bodyweight use the
-- app's 75 kg fallback (FALLBACK_BODYWEIGHT_KG).
--
-- Rollback: drop function public.get_workout_totals(uuid);

create or replace function public.get_workout_totals(p_user_id uuid)
returns table (total_workouts bigint, total_volume numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*) from public.workouts where user_id = p_user_id),
    coalesce((
      select sum(
        case
          when e.name ~* 'assisted'
            then greatest(0, coalesce(w.bodyweight_kg, 75) - coalesce(s.weight_kg, 0))
          else coalesce(s.weight_kg, 0)
        end * coalesce(s.reps, 0)
      )
      from public.sets s
      join public.workout_exercises we on we.id = s.workout_exercise_id
      join public.workouts w on w.id = we.workout_id
      left join public.exercises e on e.id = we.exercise_id
      where w.user_id = p_user_id
    ), 0)
$$;

revoke all on function public.get_workout_totals(p_user_id uuid) from public;
grant execute on function public.get_workout_totals(p_user_id uuid) to authenticated;
