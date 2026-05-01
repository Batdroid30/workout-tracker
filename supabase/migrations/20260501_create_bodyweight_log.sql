-- bodyweight_log
--
-- Stores user bodyweight readings over time.
-- Used by the Phase Coach surface to provide an honest "is the bulk/cut
-- actually working?" signal by combining strength trend with weight trend.

CREATE TABLE IF NOT EXISTS bodyweight_log (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg  NUMERIC(5, 2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  logged_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  notes      TEXT,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Supports fast "latest reading" and "history window" queries
CREATE INDEX bodyweight_log_user_time_idx
  ON bodyweight_log (user_id, logged_at DESC);

-- Row-level security — users own their own rows only
ALTER TABLE bodyweight_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bodyweight_log_owner"
  ON bodyweight_log
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
