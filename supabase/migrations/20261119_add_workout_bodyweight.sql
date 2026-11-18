-- Bodyweight used for a workout's weighted / assisted maths.
--
-- Weighted sets store bodyweight + added weight in sets.weight_kg, and
-- assisted volume is (bodyweight - assistance) x reps. Both need the
-- bodyweight on the day of the workout, not today's, so history stays
-- stable when bodyweight changes.
--
-- Nullable: workouts with no bodyweight on record fall back to the latest
-- logged bodyweight when read.

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS bodyweight_kg NUMERIC(5, 2);

-- Backfill from the bodyweight_log entry closest in time to each workout.
-- Users with no bodyweight logs stay NULL.
UPDATE workouts w
SET bodyweight_kg = (
  SELECT b.weight_kg
  FROM bodyweight_log b
  WHERE b.user_id = w.user_id
  ORDER BY ABS(EXTRACT(EPOCH FROM (b.logged_at - w.started_at)))
  LIMIT 1
)
WHERE w.bodyweight_kg IS NULL;
