CREATE TABLE apiaries (
  apiary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  status BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT apiaries_account_id_apiary_id_key UNIQUE (account_id, apiary_id)
);

CREATE INDEX apiaries_account_id_idx ON apiaries (account_id);
CREATE UNIQUE INDEX apiaries_account_id_lower_name_key ON apiaries (account_id, LOWER(name));

ALTER TABLE hives ADD COLUMN apiary_id UUID;

INSERT INTO apiaries (account_id, name)
SELECT DISTINCT account_id, 'Default Apiary'
FROM hives;

UPDATE hives
SET apiary_id = apiaries.apiary_id
FROM apiaries
WHERE apiaries.account_id = hives.account_id
  AND apiaries.name = 'Default Apiary';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM hives WHERE apiary_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot require hives.apiary_id because the apiary backfill is incomplete';
  END IF;
END
$$;

ALTER TABLE hives ALTER COLUMN apiary_id SET NOT NULL;

ALTER TABLE hives
  ADD CONSTRAINT hives_account_id_apiary_id_fkey
  FOREIGN KEY (account_id, apiary_id)
  REFERENCES apiaries (account_id, apiary_id);

CREATE INDEX hives_account_id_apiary_id_idx ON hives (account_id, apiary_id);
