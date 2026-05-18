ALTER TABLE profiles
  ADD COLUMN height_cm  INTEGER CHECK (height_cm  IS NULL OR (height_cm  BETWEEN 100 AND 250)),
  ADD COLUMN age_years  INTEGER CHECK (age_years  IS NULL OR (age_years  BETWEEN 13  AND 100)),
  ADD COLUMN sex        TEXT    CHECK (sex        IS NULL OR  sex IN ('male', 'female'));
