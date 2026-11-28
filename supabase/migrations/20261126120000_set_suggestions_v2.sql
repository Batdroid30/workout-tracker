-- Set suggestions v2: remember what kind of week a workout was, where each
-- RPE came from, and what the app suggested for a set, so later suggestions
-- can trust real RPEs and learn from how the lifter followed the advice.
-- Also lets a lifter set their own weight step per exercise.
--
-- Rollback:
--   alter table public.workouts drop column week_type, drop column is_deload;
--   alter table public.sets drop column rpe_source, drop column suggested_weight_kg, drop column suggested_reps;
--   alter table public.user_exercise_preferences drop column weight_step_kg;

alter table public.workouts
  add column if not exists week_type text check (week_type in ('strength','hypertrophy','volume')),
  add column if not exists is_deload boolean;

alter table public.sets
  add column if not exists rpe_source text check (rpe_source in ('entered','prompt')),
  add column if not exists suggested_weight_kg numeric,
  add column if not exists suggested_reps integer check (suggested_reps > 0);

alter table public.user_exercise_preferences
  add column if not exists weight_step_kg numeric check (weight_step_kg > 0 and weight_step_kg <= 10);
