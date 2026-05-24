-- Deduplicate the exercise catalog.
--
-- For each generic-named exercise (no equipment in name), migrate all
-- references in workout_exercises, personal_records, and routine_exercises
-- to the canonical named variant, then delete the generic row.
-- Pairs that don't exist in the DB are skipped gracefully.

DO $$
DECLARE
  pairs CONSTANT text[][] := ARRAY[
    ARRAY['Barbell Bench Press',  'Bench Press (Barbell)'],
    ARRAY['Deadlift',             'Deadlift (Barbell)'],
    ARRAY['Pull-ups',             'Pull Up'],
    ARRAY['Lat Pulldown',         'Lat Pulldown (Cable)'],
    ARRAY['Overhead Press',       'Overhead Press (Barbell)'],
    ARRAY['Lateral Raise',        'Lateral Raise (Dumbbell)'],
    ARRAY['Romanian Deadlift',    'Romanian Deadlift (Barbell)'],
    ARRAY['Squat',                'Squat (Barbell)'],
    ARRAY['Leg Press',            'Leg Press (Machine)'],
    ARRAY['Barbell Curl',         'Bicep Curl (Barbell)'],
    ARRAY['Hammer Curl',          'Hammer Curl (Dumbbell)'],
    ARRAY['Skull Crusher',        'Skullcrusher (Barbell)'],
    ARRAY['Tricep Pushdown',      'Triceps Pushdown'],
    ARRAY['Barbell Row',          'Bent Over Row (Barbell)'],
    ARRAY['Weighted Dips',        'Chest Dip (Weighted)'],
    ARRAY['Dips',                 'Chest Dip'],
    ARRAY['Leg Curl',             'Lying Leg Curl (Machine)']
  ];
  pair      text[];
  remove_id uuid;
  keep_id   uuid;
BEGIN
  FOREACH pair SLICE 1 IN ARRAY pairs LOOP
    SELECT id INTO remove_id FROM exercises WHERE name = pair[1] AND is_custom = false;
    SELECT id INTO keep_id   FROM exercises WHERE name = pair[2] AND is_custom = false;

    IF remove_id IS NULL OR keep_id IS NULL THEN
      RAISE NOTICE 'Skipping (%, %): one or both not found in DB', pair[1], pair[2];
      CONTINUE;
    END IF;

    UPDATE workout_exercises SET exercise_id = keep_id WHERE exercise_id = remove_id;
    UPDATE personal_records  SET exercise_id = keep_id WHERE exercise_id = remove_id;
    UPDATE routine_exercises SET exercise_id = keep_id WHERE exercise_id = remove_id;

    DELETE FROM exercises WHERE id = remove_id;

    RAISE NOTICE 'Merged "%" → "%"', pair[1], pair[2];
  END LOOP;
END $$;
