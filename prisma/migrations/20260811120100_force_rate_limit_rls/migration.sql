BEGIN;

ALTER TABLE private.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.rate_limit_buckets FORCE ROW LEVEL SECURITY;

COMMIT;
