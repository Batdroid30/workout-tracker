-- Training cycle anchors (step 3a of the redesign).
--
-- The weekly Strength → Hypertrophy → Volume cycle and phase weeks now advance
-- by training weeks (≥ half the weekly goal), counted from two anchors:
--   cycle_started_at          — start of the current weekly cycle; reset by
--                               "Restart cycle", "Restart phase" and phase changes.
--   break_prompt_dismissed_at — when the user chose "Keep going" on the
--                               long-break prompt, so it asks once per break.
-- phase_started_at already exists and keeps its meaning.
--
-- Existing users keep a sensible position: the cycle starts where the phase
-- started, or today if no phase was ever set.
--
-- Rollback:
--   alter table public.profiles drop column cycle_started_at, drop column break_prompt_dismissed_at;

alter table public.profiles
  add column if not exists cycle_started_at timestamptz,
  add column if not exists break_prompt_dismissed_at timestamptz;

update public.profiles
  set cycle_started_at = coalesce(phase_started_at, now())
  where cycle_started_at is null;
