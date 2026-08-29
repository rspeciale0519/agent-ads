-- A current pointer must name a credential reference owned by the same
-- organization and the same connection. Historical references remain allowed.
BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

ALTER TABLE private.credential_references
  ADD COLUMN IF NOT EXISTS connection_id UUID;

UPDATE private.credential_references AS reference
SET connection_id = connection.id
FROM public.connections AS connection
WHERE connection.credential_reference_id = reference.id
  AND reference.connection_id IS NULL;

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM private.credential_references
    WHERE connection_id IS NULL
  ) THEN
    RAISE EXCEPTION 'credential reference connection backfill incomplete';
  END IF;
END
$migration$;

ALTER TABLE private.credential_references
  ALTER COLUMN connection_id SET NOT NULL;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'credential_references_organization_connection_fkey'
      AND conrelid = 'private.credential_references'::regclass
  ) THEN
    ALTER TABLE private.credential_references
      ADD CONSTRAINT credential_references_organization_connection_fkey
      FOREIGN KEY (organization_id, connection_id)
      REFERENCES public.connections (organization_id, id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$migration$;

CREATE UNIQUE INDEX IF NOT EXISTS credential_references_organization_id_connection_id_id_key
  ON private.credential_references (organization_id, connection_id, id);

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index AS index_definition
    WHERE index_definition.indexrelid = 'private.credential_references_organization_id_connection_id_id_key'::regclass
      AND index_definition.indrelid = 'private.credential_references'::regclass
      AND index_definition.indisvalid
      AND index_definition.indisready
      AND index_definition.indisunique
      AND index_definition.indpred IS NULL
      AND ARRAY(
        SELECT attribute.attname::text
        FROM unnest(index_definition.indkey) WITH ORDINALITY AS key(attnum, position)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = index_definition.indrelid
         AND attribute.attnum = key.attnum
        ORDER BY key.position
      ) = ARRAY['organization_id', 'connection_id', 'id']
  ) THEN
    RAISE EXCEPTION 'credential reference ownership index has an unexpected definition';
  END IF;
END
$migration$;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'connections_credential_owner_fkey'
      AND conrelid = 'public.connections'::regclass
  ) THEN
    ALTER TABLE public.connections
      ADD CONSTRAINT connections_credential_owner_fkey
      FOREIGN KEY (organization_id, id, credential_reference_id)
      REFERENCES private.credential_references (organization_id, connection_id, id)
      ON DELETE RESTRICT ON UPDATE CASCADE
      NOT VALID;
  END IF;
END
$migration$;

ALTER TABLE public.connections
  VALIDATE CONSTRAINT connections_credential_owner_fkey;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_definition
    WHERE constraint_definition.conname = 'connections_credential_owner_fkey'
      AND constraint_definition.conrelid = 'public.connections'::regclass
      AND constraint_definition.confrelid = 'private.credential_references'::regclass
      AND constraint_definition.contype = 'f'
      AND constraint_definition.convalidated
      AND constraint_definition.confupdtype = 'c'
      AND constraint_definition.confdeltype = 'r'
      AND ARRAY(
        SELECT attribute.attname::text
        FROM unnest(constraint_definition.conkey) WITH ORDINALITY AS key(attnum, position)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = constraint_definition.conrelid
         AND attribute.attnum = key.attnum
        ORDER BY key.position
      ) = ARRAY['organization_id', 'id', 'credential_reference_id']
      AND ARRAY(
        SELECT attribute.attname::text
        FROM unnest(constraint_definition.confkey) WITH ORDINALITY AS key(attnum, position)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = constraint_definition.confrelid
         AND attribute.attnum = key.attnum
        ORDER BY key.position
      ) = ARRAY['organization_id', 'connection_id', 'id']
  ) THEN
    RAISE EXCEPTION 'connections credential owner foreign key has an unexpected definition';
  END IF;
END
$migration$;

COMMIT;
