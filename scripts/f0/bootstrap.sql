\set ON_ERROR_STOP on

-- This file supplies only the Supabase-owned objects needed for a disposable
-- PostgreSQL migration proof. Never use it on staging or production.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $bootstrap$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$bootstrap$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS vault;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS auth.sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS vault.secrets (
  id uuid PRIMARY KEY,
  secret text NOT NULL,
  name text,
  description text,
  key_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW vault.decrypted_secrets AS
SELECT id, secret AS decrypted_secret
FROM vault.secrets;

CREATE OR REPLACE FUNCTION vault.create_secret(
  new_secret text,
  new_name text,
  new_description text,
  new_key_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, vault
AS $$
DECLARE
  created_id uuid := md5(random()::text || clock_timestamp()::text)::uuid;
BEGIN
  INSERT INTO vault.secrets (id, secret, name, description, key_id)
  VALUES (created_id, new_secret, new_name, new_description, new_key_id);
  RETURN created_id;
END
$$;

CREATE OR REPLACE FUNCTION vault.update_secret(
  secret_id uuid,
  new_secret text,
  new_name text,
  new_description text,
  new_key_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, vault
AS $$
  UPDATE vault.secrets
  SET secret = new_secret,
      name = new_name,
      description = new_description,
      key_id = new_key_id,
      updated_at = now()
  WHERE id = secret_id
$$;

\ir ../../supabase/migrations/20260806_onboarding_submissions.sql
\ir ../../supabase/migrations/20260806_onboarding_auth.sql
