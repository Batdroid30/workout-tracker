-- Backfill secondary_muscles for the seeded exercise catalog.
-- Only updates rows where secondary_muscles IS NULL to avoid overwriting
-- any user-edited values.

UPDATE exercises SET secondary_muscles = ARRAY['triceps','shoulders'] WHERE name IN (
  'Bench Press (Barbell)', 'Incline Bench Press (Smith Machine)',
  'Incline Chest Press (Machine)', 'Chest Press (Machine)'
) AND is_custom = false AND secondary_muscles IS NULL;

UPDATE exercises SET secondary_muscles = ARRAY['triceps','shoulders'] WHERE name IN (
  'Chest Dip', 'Chest Dip (Assisted)', 'Chest Dip (Weighted)', 'Push Up'
) AND is_custom = false AND secondary_muscles IS NULL;

UPDATE exercises SET secondary_muscles = ARRAY['triceps'] WHERE name IN (
  'Decline Bench Press (Machine)', 'Decline Bench Press (Smith Machine)'
) AND is_custom = false AND secondary_muscles IS NULL;

-- Back / Lats
UPDATE exercises SET secondary_muscles = ARRAY['hamstrings','glutes','traps'] WHERE name = 'Deadlift (Barbell)'
  AND is_custom = false AND secondary_muscles IS NULL;

UPDATE exercises SET secondary_muscles = ARRAY['biceps','traps'] WHERE name IN (
  'Bent Over Row (Barbell)', 'Deficit Dead Barbell Rows',
  'T Bar Row', 'Chest Supported Incline Row - Wide Grip'
) AND is_custom = false AND secondary_muscles IS NULL;

UPDATE exercises SET secondary_muscles = ARRAY['biceps'] WHERE name IN (
  'Meadows Rows (Barbell)', 'Dumbbell Row',
  'Chest Supported Incline Row (Dumbbell)',
  'Pull Up', 'Pull Up (Assisted)', 'Pull Up (Weighted)', 'Chin Up (Weighted)',
  'Lat Pulldown (Cable)', 'Behind The Neck Pulldown',
  'Reverse Grip Lat Pulldown (Cable)', 'Single Arm Lat Pulldown',
  'Seated Cable Row - Bar Grip', 'Seated Cable Row - V Grip (Cable)',
  'Seated Row (Machine)', 'Iso-Lateral Row (Machine)', 'Iso-Lateral Low Row'
) AND is_custom = false AND secondary_muscles IS NULL;

UPDATE exercises SET secondary_muscles = ARRAY['biceps','traps'] WHERE name IN (
  'Seated Cable Row - Bar Wide Grip'
) AND is_custom = false AND secondary_muscles IS NULL;

-- Shoulders
UPDATE exercises SET secondary_muscles = ARRAY['triceps','traps'] WHERE name = 'Overhead Press (Barbell)'
  AND is_custom = false AND secondary_muscles IS NULL;

UPDATE exercises SET secondary_muscles = ARRAY['triceps'] WHERE name IN (
  'Overhead Press (Smith Machine)', 'Shoulder Press (Dumbbell)',
  'Seated Shoulder Press (Machine)'
) AND is_custom = false AND secondary_muscles IS NULL;

UPDATE exercises SET secondary_muscles = ARRAY['traps','biceps'] WHERE name IN (
  'Upright Row (Barbell)', 'Upright Row (Cable)'
) AND is_custom = false AND secondary_muscles IS NULL;

-- Legs — squats and presses work glutes and hamstrings secondarily
UPDATE exercises SET secondary_muscles = ARRAY['glutes','hamstrings'] WHERE name IN (
  'Squat (Barbell)', 'Squat (Smith Machine)', 'Leg Press (Machine)',
  'Bulgarian Split Squat',
  'Lunge (Barbell)', 'Lunge (Dumbbell)',
  'Reverse Lunge (Barbell)', 'Walking Lunge (Dumbbell)'
) AND is_custom = false AND secondary_muscles IS NULL;

UPDATE exercises SET secondary_muscles = ARRAY['glutes'] WHERE name IN (
  'Hack Squat (Machine)'
) AND is_custom = false AND secondary_muscles IS NULL;

UPDATE exercises SET secondary_muscles = ARRAY['glutes','back'] WHERE name IN (
  'Romanian Deadlift (Barbell)', 'Romanian Deadlift (Dumbbell)',
  'Stiff Leg Deadlift (Dumbbell)'
) AND is_custom = false AND secondary_muscles IS NULL;
