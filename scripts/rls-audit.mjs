import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "prisma", "migrations");
const directories = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const sql = (await Promise.all(directories.map((directory) => readFile(path.join(root, directory, "migration.sql"), "utf8")))).join("\n");
const schema = await readFile(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
const required = [
  "FORCE ROW LEVEL SECURITY",
  "current_organization_id",
  "current_auth_subject",
  "public.users",
  "WITH CHECK",
  "NOSUPERUSER",
  "private.read_broker_secret",
  "private.destroy_broker_secret",
  "ACCOUNT_CONNECTIONS_PERMISSION_ROLE_LOGIN_ENABLED",
  "rolname IN ('app_runtime', 'app_secret_broker')",
  "AND rolcanlogin",
  "REVOKE ALL ON FUNCTION vault.create_secret(text, text, text, uuid) FROM PUBLIC, anon, authenticated, service_role, app_runtime, app_secret_broker",
  "REVOKE ALL ON FUNCTION vault.update_secret(uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated, service_role, app_runtime, app_secret_broker",
  "credential_references",
  "organization_connection_fkey",
  "organization_credential_fkey",
  "private.is_active_auth_session",
  "credential_references_cleanup_status_check",
  "credential_references_organization_connection_fkey",
  "private.consume_rate_limit",
  "rate_limit_buckets_organization_id_idx",
  "private.cleanup_expired_oauth_transactions",
  "requested_auth_subject = private.current_auth_subject()",
  "organization_invitations.recipient_auth_subject = private.current_auth_subject()",
  "ALTER TABLE private.idempotency_records FORCE ROW LEVEL SECURITY",
  "ALTER TABLE private.rate_limit_buckets FORCE ROW LEVEL SECURITY",
  "user_id = private.current_actor_id()",
  "private.cleanup_expired_idempotency_records",
  "pg_get_function_identity_arguments",
  "ALTER COLUMN credential_reference_id TYPE uuid",
  "connections_organization_id_credential_reference_id_idx",
  "connections_credential_owner_fkey",
  "FOREIGN KEY (organization_id, id, credential_reference_id)",
  "REFERENCES private.credential_references (organization_id, connection_id, id)",
];
const missing = required.filter((fragment) => !sql.includes(fragment));
const orderingErrors = [];
const baseIndex = directories.indexOf("20260810120000_account_connections");
const uuidRepairIndex = directories.indexOf("20260810120100_credential_reference_uuid");
const firstUuidConsumerIndex = directories.indexOf("20260810180000_credential_reference_tenant_scope");
if (baseIndex < 0 || uuidRepairIndex <= baseIndex || uuidRepairIndex >= firstUuidConsumerIndex) orderingErrors.push("credential UUID repair migration order");
if (!/credentialReferenceId\s+String\?\s+@map\("credential_reference_id"\)\s+@db\.Uuid/u.test(schema)) orderingErrors.push("Prisma credential UUID mapping");
if (missing.length || orderingErrors.length) {
  console.error(`RLS/migration audit failed: ${[...missing, ...orderingErrors].join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("RLS/migration audit passed: tenant policies, UUID-compatible credential relationships, same-connection ownership, cleanup integrity, identity binding, rate limits, idempotency, and broker boundaries are present.");
}
