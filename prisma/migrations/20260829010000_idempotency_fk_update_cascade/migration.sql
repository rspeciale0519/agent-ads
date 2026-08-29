BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

ALTER TABLE private.idempotency_records
  DROP CONSTRAINT idempotency_records_organization_id_fkey,
  ADD CONSTRAINT idempotency_records_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  DROP CONSTRAINT idempotency_records_user_id_fkey,
  ADD CONSTRAINT idempotency_records_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

COMMIT;
