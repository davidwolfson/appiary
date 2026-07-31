CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti UUID PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hives (
  hive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status BOOLEAN NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS revoked_tokens_expires_at_idx ON revoked_tokens (expires_at);
CREATE INDEX IF NOT EXISTS hives_account_id_idx ON hives (account_id);
CREATE UNIQUE INDEX IF NOT EXISTS hives_account_id_lower_name_key ON hives (account_id, LOWER(name));
CREATE INDEX IF NOT EXISTS hive_inspections_hive_newest_idx
  ON hive_inspections (hive_id, inspection_date DESC, inspection_time DESC, created_at DESC, inspection_id DESC);
