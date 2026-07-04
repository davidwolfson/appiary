CREATE TABLE IF NOT EXISTS hives (
  hive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status BOOLEAN NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hives_account_id_idx ON hives (account_id);
CREATE UNIQUE INDEX IF NOT EXISTS hives_account_id_lower_name_key ON hives (account_id, LOWER(name));
