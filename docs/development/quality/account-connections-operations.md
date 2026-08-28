# Account Connections operations and restore runbook

## Environment configuration

Use separate Supabase projects, Auth redirect URLs, provider applications, Vault root keys, Prisma URLs, and notification credentials for development, staging, pilot, and production. `DATABASE_URL` is the transaction-safe runtime pooler URL; `DIRECT_URL` is used only for migrations and controlled maintenance. Keep `pgbouncer=true`, disable prepared statements for transaction pooling, and use a conservative `connection_limit`/`pool_timeout`.

`DATABASE_URL` must use an environment-specific login principal. That principal inherits only the `app_runtime` permission role. `SECRET_BROKER_DATABASE_URL` must use a different login principal. That principal inherits only the `app_secret_broker` permission role.

Required deployment variables are documented in `.env.example`. Values are injected by the environment secret manager. The repository must contain names and safe placeholders only.

## Disposable local F0 proof

`pnpm run security:f0-schema-single` is destructive inside its selected PostgreSQL cluster. Never use a shared, staging, pilot, or production data directory.

The command requires these local process variables:

- `F0_ALLOW_DISPOSABLE_DATABASE=1`.
- `F0_POSTGRES_DATA_DIR` resolved inside this repository's `docs/temp/` directory.
- `F0_DISPOSABLE_MARKER` set to a canonical lowercase UUIDv4.
- `POSTGRES_BIN` resolved to a PostgreSQL 17 `postgres` executable.

The data directory must keep `pg_wal` inside itself and keep `pg_tblspc` empty. It must contain no escaping link or hard-linked file. Its configured `data_directory` must resolve to the same approved directory.

Run `pnpm run security:f0-schema-single:mark` before `pnpm run security:f0-schema-single`. The mark command inventories `postgres`, `template1`, and selected shared and database-local catalogs before it writes the marker. The proof requires that prior marker and repeats both source-database inventories before it creates `agent_ads_f0` from `template1`.

The proofs never clone `template0`. Its metadata is checked, but its internal catalog is not available to the network proof.

The shared guard rejects altered PostgreSQL 17 roles and memberships. It also rejects unexpected access methods, schemas, objects, and database settings. Its privilege checks cover database, public-schema, default, and parameter privileges.

The network proof requires `F0_ALLOW_DISPOSABLE_DATABASE=1`, `F0_DATABASE_URL`, and a canonical lowercase UUIDv4 `F0_DISPOSABLE_MARKER`. `PSQL_BIN` is optional when `psql` is on `PATH`. `F0_DATABASE_URL` must use a numeric loopback address, select `agent_ads_f0`, and contain no query or fragment.

Run these commands in order on a new disposable cluster:

1. Run `pnpm run security:f0-mark-guard` before the marker exists.
2. Run `pnpm run security:f0-schema:mark`.
3. Run `pnpm run security:f0-guard`.
4. Run `pnpm run security:f0-schema`.

The wrapper replaces libpq routing variables with validated fields. Guard connections disable login event triggers and search trusted catalogs first.

The URL check cannot detect a local proxy or tunnel that forwards traffic to another server.

Use a trusted PostgreSQL client installation and a trusted `PATH`. The wrapper cannot detect a malicious executable that copies the `psql` name and output.

Use a cluster that you own exclusively. Do not allow another session to change state during either proof. Readiness probes are allowed. The network proof has check-to-write race windows between connections and processes.

Discard the complete disposable cluster after every successful or failed proof. Never reuse its databases, roles, files, or server process. The proof scripts do not claim general cleanup.

These safeguards cover accidental target selection and known PostgreSQL data links. They do not prove hostile filesystem isolation, networked RLS, Supavisor, Vault, backup, or restore behavior.

The inventories do not cover `template0` internals, every built-in attribute, comments, security labels, transforms, or server configuration.

## Migration and backup procedure

1. Record the Supabase project reference, host, database name, environment class, migration heads, Git revision, artifact digest, backup identifier, operator, approver, and UTC time.
2. Confirm the target fingerprint before any migration or destructive proof.
3. Inventory `_prisma_migrations` and inspect live column types, constraints, RLS state, roles, and grants.
4. Confirm the complete recovery set, including database, Storage objects, Vault root key, role definitions, configuration, scheduler, flags, artifact, and migration revision.
5. Run `node node_modules/prisma/build/index.js validate`.
6. Run `node node_modules/prisma/build/index.js migrate deploy` only through the approved procedure with `DIRECT_URL`, never `DATABASE_URL`.
7. Run post-migration catalog, index, forced-RLS, role, tenant-isolation, and application checks.
8. Record the result and keep the previous compatible build available for flag-only rollback.

The local candidate repair converts the credential pointer to UUID before its first consumer. Do not apply it to a shared target without the checks below.

Inspect every target first. Never rewrite a migration already applied to a shared target.

If an applied target needs repair, use a later forward expand-and-contract migration. Do not use an automatic database rollback.

### Failed migration and UUID repair procedure

1. Read `_prisma_migrations` without changing it. Record names, checksums, start times, finish times, rollback times, and errors.
2. Inspect `connections.credential_reference_id`, `credential_references.id`, and `credential_references.organization_id` in the target catalog.
3. Inspect partial indexes and constraints left by any failed `20260810200000_tenant_relationship_integrity` attempt.
4. Stop if a failed migration record exists. Prisma will not apply the new repair while that record remains unresolved.
5. Take the approved backup and prove its restore path before any repair action.
6. Record connection row counts, non-null pointer counts, table size, active locks, and the maintenance window.
7. Rehearse the conversion and ownership constraint with production-shaped synthetic data.
8. Select the repair path from the recorded target state. Do not infer it from repository order alone.

Use `prisma migrate resolve --rolled-back <migration_name>` only after the database owner confirms the failed migration left no unsafe partial state. Then retry `migrate deploy` through the approved `DIRECT_URL` procedure.

Use `prisma migrate resolve --applied <migration_name>` only after the database owner proves the target already contains the exact migration result. Store the catalog and checksum evidence.

If later migrations are already successful, do not apply an earlier-dated repair without a drift review. Add a new append-only repair at the current migration head when required.

The UUID conversion uses an `ACCESS EXCLUSIVE` lock. A failed transaction restores its schema state, but blocked requests can still fail. Keep provider features disabled during execution.

## First-owner bootstrap

Run `pnpm run bootstrap:owner` only as a one-time controlled maintenance operation after the protected Supabase Auth subject and organization values have been approved. Supply `APP_BOOTSTRAP_DATABASE_URL` (or the migration-only `DIRECT_URL`) through the deployment secret manager; never point the command at the pooled `DATABASE_URL`, and never put the URL or any password in shell history, source control, logs, or support tickets. The command verifies that the database role is not `app_runtime`, refuses a second active owner, creates the organization/member/audit record without handling a password, and exits without printing credentials.

## Database login principals

The migration creates `app_runtime` and `app_secret_broker` as `NOLOGIN` permission roles. Never enable `LOGIN` on these roles.

The database/security owner creates two environment-specific login principals after the migration. Use names such as `app_runtime_login` and `app_secret_broker_login`. Add the project reference to each Supavisor username.

Each login principal must use `LOGIN`, `INHERIT`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, and `NOBYPASSRLS`. Grant `app_runtime` only to the runtime login. Grant `app_secret_broker` only to the broker login. Do not grant database-object permissions directly to either login principal.

Create and rotate each password through the approved secret manager and controlled administration path. Never put a password in migration SQL, shell history, source control, logs, or support tickets.

### Existing permission-role login transition

An earlier operations draft allowed `LOGIN` on a stable permission role. The Vault boundary migration fails with `ACCOUNT_CONNECTIONS_PERMISSION_ROLE_LOGIN_ENABLED` when either permission role can still log in. The migration makes no grant change after this guard fails.

Use this expand-and-contract transition before retrying the migration:

1. Keep every Account Connections and provider flag disabled.
2. Record the target fingerprint, current build, role attributes, memberships, active sessions, backup, operator, approver, and UTC time.
3. Create separate runtime and broker login principals through the controlled administration path.
4. Give each principal the safe attributes listed above.
5. Grant only its matching permission role with `INHERIT TRUE`, `SET FALSE`, and `ADMIN FALSE`.
6. Put both new connection URLs in the environment secret manager.
7. Restart the previous compatible build without running the pending migration.
8. Test both principals through Supavisor and the direct approved broker path.
9. Prove tenant isolation, missing-context denial, broker separation, and allowed broker functions.
10. Obtain approval for the login cutover.
11. Set `app_runtime` and `app_secret_broker` to `NOLOGIN` through the controlled direct administration path.
12. Confirm new connections work and old permission-role logins fail.
13. Inspect `_prisma_migrations` for a failed `20260827190000_vault_write_function_boundary` row.
14. Confirm the failed transaction changed no Vault grants or other database state.
15. If Prisma recorded the failure, obtain repair approval and run `node node_modules/prisma/build/index.js migrate resolve --rolled-back 20260827190000_vault_write_function_boundary` through the approved `DIRECT_URL` procedure.
16. Run the pending migration through the approved `DIRECT_URL` procedure.
17. Record the final role state, migration result, tests, and approver.

Do not drop either permission role. Existing grants and ownership depend on those stable roles.

Before step 11, recover by restoring the prior URLs and revoking the new login principals. After step 11, keep flags disabled if a new login fails. Under incident approval, temporarily restore only the affected old login and URL. Repair the new principal, repeat the proof, disable the old login again, confirm database rollback, resolve the failed migration record when present, and then retry the migration.

Before deployment, verify the two login principals, role memberships, role attributes, and direct grants. Connect through Supavisor with each principal. Run the missing-context, cross-tenant, RLS, broker-denial, and allowed-function tests.

If provisioning fails, keep all provider flags disabled. Revoke the affected login principal and restore the last approved connection URL. The `NOLOGIN` permission roles remain the stable grant boundary.

The Vault boundary migration removes write-function access from public and non-broker roles. Its transaction rolls back after a migration failure. If broker calls fail after deployment, keep provider flags disabled and inspect the live function signatures and grants. Restore only the approved broker grant through a reviewed forward migration. Never restore public access.

## Restore / clone drill

The Supabase Vault ciphertext is portable only when the documented Vault root-key path is preserved. A database dump without the corresponding root key is not a valid recovery set.

Supabase database backups do not include Storage objects. Back up Storage objects, bucket settings, access policies, and their object-reference manifest separately.

Use only synthetic staging data for a pre-pilot recovery drill. Do not copy production or customer data into a drill.

### Same-project incident recovery

This mode restores an existing environment. It is not a disposable drill.

1. Plan and record downtime.
2. Record and drop custom subscriptions and replication slots. Supabase manages the Realtime slot.
3. Restore the approved physical backup.
4. Keep the existing Vault root key.
5. Verify Supabase-managed credentials.
6. Reset every application-created `LOGIN` password through the secret manager.
7. Recreate and verify custom subscriptions and replication slots.
8. Restore platform configuration in an inert state.
9. Keep schedulers, external endpoints, provider credentials, provider flags, and mutations disabled.
10. Verify Storage references, Vault, roles, RLS, tenant isolation, pooling, Auth, and the application.
11. Enable only the approved read path after all incident gates pass.
12. Never destroy the restored environment as a drill-cleanup step.

### Disposable physical-clone drill

1. Use only an inert staging source without active external jobs or real provider credentials.
2. For incident use, block external destinations outside the database before creating the clone.
3. Confirm paid-plan access, physical backups, clone restrictions, and cost approval.
4. Restrict access because roles, users, Auth data, and the Vault root key are copied.
5. Apply production-class controls and retention when real data exists. Require explicit approval before deletion.
6. Disable copied `pg_cron`, `pg_net`, wrappers, and other external operations before testing.
7. Keep the copied Vault root key.
8. Reset every application-created `LOGIN` password through the secret manager.
9. Restore missing Storage objects and platform configuration in an inert state.

### Disposable logical-restore drill

The Beta `pgsodium` Management API needs `project_admin_write`.

Logical mode stays blocked until operations approve and test a nonlogging transfer tool.

1. Keep the source and target active.
2. Use a new isolated target before any schema, data, secret, or encrypted-value write.
3. Prove the target has no application data and no Vault secrets.
4. Freeze restore activity until the key transfer finishes.
5. Use the least-privileged available operator identity for the required projects.
6. Create a fine-grained token with `project_admin_write` and no unrelated permission.
7. Disable shell tracing, transcripts, command logging, and CI capture.
8. Stream `GET /v1/projects/{source_ref}/pgsodium` directly into `PUT /v1/projects/{target_ref}/pgsodium`.
9. Never print, save, copy, or record the response body.
10. Compare both keys in memory. Record only a match result and request status.
11. Revoke the Management API token immediately.
12. Restore the logical backup and reviewed role SQL.
13. Create new application login passwords through the secret manager.
14. If transfer or verification fails, isolate the target and use the approved retention process.

### Common disposable-target proof

1. Restore Storage objects and verify every retained database reference against the manifest.
2. Verify private Vault grants, roles, login attributes, memberships, and direct grants. Do not recreate verified objects.
3. Restore Auth and platform settings in an inert state.
4. Keep schedulers, external endpoints, real credentials, provider flags, and provider mutations disabled.
5. With a synthetic canary, prove broker write, read, fingerprint, rotation, revoke, destroy, and unprivileged-role refusal.
6. Run forced-RLS, cross-tenant, Prisma transaction/pooler, Auth, connector, and application smoke tests.
7. Verify zero external operations occurred.
8. Destroy the disposable target through the approved retention process. Record the drill without the canary value.

Use the current [Supabase backup](https://supabase.com/docs/guides/platform/backups), [restore-to-new-project](https://supabase.com/docs/guides/platform/clone-project), and [changelog](https://supabase.com/changelog) guidance for every drill.

Run this drill before pilot launch, after each recovery-design change, and quarterly during the pilot.

If revocation records `SECRET_REVOKE_CLEANUP_PENDING`, the connection is already locally revoked and must remain unavailable for authorization or archival until the broker handle cleanup is retried successfully. The cleanup-pending audit event contains only safe provider/connection metadata; never copy the broker handle or secret into an incident record.

## Scheduled Account Connections cleanup

Configure the deployment scheduler to `POST /api/internal/account-connections/maintenance` every five minutes with the secret-manager-injected `ACCOUNT_CONNECTIONS_MAINTENANCE_TOKEN` in the `Authorization: Bearer` header. Never put this token in a URL, repository file, scheduler description, log, or support record. The route uses the existing `app_secret_broker` database identity only to execute the bounded cleanup functions; those functions do not grant direct OAuth-table, idempotency-table, or Vault reads.

The same route also executes `private.cleanup_expired_idempotency_records`. The broker role has execute-only access to both bounded cleanup functions and no direct idempotency-ledger access. The response and `account_connections.maintenance` event expose only the aggregate `oauth` counts and `idempotencyRecordsDeleted`; they never contain row identifiers, mutation payloads, responses, provider secrets, or broker handles.

Each run processes at most 100 expired or terminal OAuth transactions. It destroys expired/canceled PKCE secrets transactionally, retries already-absent handles safely, and waits 15 minutes before cleaning a consumed transaction so it cannot race a callback exchange. The response and structured event contain aggregate counts only. Alert if `invalidReferences` is nonzero or `processed` remains at the batch limit across consecutive runs. Staging must prove the schedule, function privilege boundary, concurrent runs, and Vault behavior before production enablement.

Mutation ledger rows expire after 30 days and contain only tenant/user/action scope, HMAC hashes, timestamps, and safe terminal state. Each cleanup pass deletes at most the configured batch limit with `FOR UPDATE SKIP LOCKED`. Alert when `idempotencyRecordsDeleted` remains at the batch limit across consecutive runs. Staging must prove concurrent cleanup and retained-row behavior before production enablement.

For an unknown mutation outcome, retry only with the original `Idempotency-Key` and identical request. `IDEMPOTENCY_ALREADY_COMPLETED`, `IDEMPOTENCY_RECONCILIATION_REQUIRED`, and `IDEMPOTENCY_IN_PROGRESS` require reading or otherwise reconciling current state; do not invent a new key and repeat the side effect. Sensitive responses such as a step-up grant or OAuth redirect are never stored or replayed, so a completed step-up attempt requires an explicit fresh challenge after reconciliation.

## Monitoring

Emit safe structured events for authorization started/completed/failed, verification outcome, expiry, reconnect, revoke, provider latency, app-review blocks, rate-limit blocks, and kill-switch state changes. Include correlation ID, provider, organization ID, connection ID, adapter version, outcome code, and latency; exclude access tokens, refresh tokens, authorization codes, PKCE verifiers, client secrets, cookies, passwords, and raw provider bodies.

Alert on repeated OAuth state failures, broker read/write failures, cross-tenant policy-test failures, unexpected provider scope changes, revoke failures, elevated degraded/expired counts, and any audit-write outage. Authorization and audit outages fail closed.

The local lifecycle audit records `connection.authorization_started` or `connection.reconnect_started`, `connection.authorization_completed`, `connection.authorization_expired`, `connection.verified` (including safe provider and latency metadata), `connection.revoked`, `connection.revoke_cleanup_pending`, and `connection.archived`. Provider role/app-review blocks remain outcome/remediation codes; no provider response body is persisted.

Before staging enablement, run `EXPLAIN (ANALYZE, BUFFERS)` with representative tenant-sized fixtures for the request list, connection list/detail, health-history, and issued-OAuth-expiry lookups. Confirm plans use the organization/status/time indexes in the account-connections migrations, compare latency at the pilot connection/resource target, and retain only the sanitized plan summary in the release record.

## Support and offboarding

Support can view safe identifiers, owner, effective role, selected-resource count, last verification, expiry, remediation, and health history. Support cannot view provider secrets or raw response bodies. Customer exports fail explicitly with `EXPORT_SIZE_LIMIT_EXCEEDED` rather than silently truncating; an accepted asynchronous export path is required before an organization exceeds the documented synchronous limits. Offboarding processes at most 20 connections per protected request, reports the remaining count, and is safely resumable. Each confirmed batch is a separate logical mutation. Final deactivation obtains an exclusive organization lock directly, rechecks that no unarchived connection remains, then revokes invitations and grants, archives inventory, disables memberships, preserves safe audit evidence, and marks the organization inactive. Terminal ledger bookkeeping may complete after deactivation, but ordinary tenant work still fails closed for an inactive organization. Target-environment concurrent offboarding and ledger-finalization proof remains a staging release gate.
