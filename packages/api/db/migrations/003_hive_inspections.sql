CREATE TABLE IF NOT EXISTS hive_inspections (
  inspection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hive_id UUID NOT NULL REFERENCES hives(hive_id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL,
  inspection_time TIME NOT NULL,
  queen_right BOOLEAN NOT NULL,
  eggs BOOLEAN NOT NULL,
  larva BOOLEAN NOT NULL,
  capped_brood BOOLEAN NOT NULL,
  brood_pattern TEXT CHECK (brood_pattern IN ('good', 'fair', 'poor', 'na')),
  additional_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hive_inspections_hive_newest_idx
  ON hive_inspections (hive_id, inspection_date DESC, inspection_time DESC, created_at DESC, inspection_id DESC);
