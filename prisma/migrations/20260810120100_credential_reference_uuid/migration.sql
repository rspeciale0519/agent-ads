-- Repair the connection pointer before later migrations compare it with a UUID.
-- The guarded conversion keeps existing values unchanged and fails closed when
-- unsafe data needs operator review.
BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL row_security = off;

LOCK TABLE public.connections IN ACCESS EXCLUSIVE MODE;
LOCK TABLE private.credential_references IN SHARE MODE;

DO $migration$
DECLARE
  column_type regtype;
  reference_has_organization_id boolean;
BEGIN
  SELECT attribute.atttypid::regtype
  INTO column_type
  FROM pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.connections'::regclass
    AND attribute.attname = 'credential_reference_id'
    AND NOT attribute.attisdropped;

  IF column_type IS NULL THEN
    RAISE EXCEPTION 'connections.credential_reference_id is missing';
  END IF;

  IF column_type = 'uuid'::regtype THEN
    RETURN;
  END IF;

  IF column_type <> 'text'::regtype THEN
    RAISE EXCEPTION 'connections.credential_reference_id has unsupported type %, expected text or uuid', column_type;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.connections
    WHERE credential_reference_id IS NOT NULL
      AND credential_reference_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'connections.credential_reference_id contains a non-canonical UUID; reconcile the row before retrying';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute AS attribute
    WHERE attribute.attrelid = 'private.credential_references'::regclass
      AND attribute.attname = 'organization_id'
      AND NOT attribute.attisdropped
  ) INTO reference_has_organization_id;

  IF NOT reference_has_organization_id THEN
    IF EXISTS (SELECT 1 FROM public.connections WHERE credential_reference_id IS NOT NULL) THEN
      RAISE EXCEPTION 'credential_references.organization_id is missing while credential pointers exist; complete the approved tenant backfill before retrying';
    END IF;
  ELSIF EXISTS (
    SELECT 1
    FROM public.connections AS connection
    LEFT JOIN private.credential_references AS reference
      ON reference.id = connection.credential_reference_id::uuid
     AND reference.organization_id = connection.organization_id
    WHERE connection.credential_reference_id IS NOT NULL
      AND reference.id IS NULL
  ) THEN
    RAISE EXCEPTION 'connections.credential_reference_id contains an orphaned or cross-tenant reference; reconcile the row before retrying';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT organization_id, credential_reference_id::uuid
      FROM public.connections
      WHERE credential_reference_id IS NOT NULL
      GROUP BY organization_id, credential_reference_id::uuid
      HAVING count(*) > 1
    ) AS duplicate_active_references
  ) THEN
    RAISE EXCEPTION 'connections.credential_reference_id contains references that collide after UUID normalization';
  END IF;

  EXECUTE 'ALTER TABLE public.connections ALTER COLUMN credential_reference_id TYPE uuid USING credential_reference_id::uuid';
END
$migration$;

CREATE INDEX IF NOT EXISTS connections_organization_id_credential_reference_id_idx
  ON public.connections (organization_id, credential_reference_id);

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index AS index_definition
    WHERE index_definition.indexrelid = 'public.connections_organization_id_credential_reference_id_idx'::regclass
      AND index_definition.indrelid = 'public.connections'::regclass
      AND index_definition.indisvalid
      AND index_definition.indisready
      AND NOT index_definition.indisunique
      AND index_definition.indpred IS NULL
      AND ARRAY(
        SELECT attribute.attname::text
        FROM unnest(index_definition.indkey) WITH ORDINALITY AS key(attnum, position)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = index_definition.indrelid
         AND attribute.attnum = key.attnum
        ORDER BY key.position
      ) = ARRAY['organization_id', 'credential_reference_id']
  ) THEN
    RAISE EXCEPTION 'connections credential reference index has an unexpected definition';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute AS attribute
    WHERE attribute.attrelid = 'public.connections'::regclass
      AND attribute.attname = 'credential_reference_id'
      AND attribute.atttypid = 'uuid'::regtype
      AND NOT attribute.attisdropped
  ) THEN
    RAISE EXCEPTION 'connections.credential_reference_id UUID conversion did not complete';
  END IF;
END
$migration$;

COMMIT;
