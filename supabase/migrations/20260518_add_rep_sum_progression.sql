ALTER TABLE routine_exercises
  ADD COLUMN progression_model TEXT NOT NULL DEFAULT 'double'
    CHECK (progression_model IN ('double', 'rep_sum')),
  ADD COLUMN rep_sum_target INTEGER CHECK (rep_sum_target IS NULL OR rep_sum_target > 0);
