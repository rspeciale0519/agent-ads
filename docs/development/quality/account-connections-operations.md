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
- `POSTGRES_BIN` resolved to the PostgreSQL `postgres` executable.

Before its first database write, the proof rejects unexpected databases, roles, relations, extensions, or database comments. It then writes and verifies a server-side marker.

The proof changes only its isolated cluster. It does not prove networked RLS, Supavisor, Vault, backup, or restore behavior.

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

Supabase database backups do not include Storage objects. Back up Storage objects and their object-reference manifest separately.

1. Restore a recent database export into a disposable Supabase project or isolated PostgreSQL target.
2. Restore the matching Vault root-key material through the approved recovery workflow; never paste it into a shell command, issue, log, or test fixture.
3. Restore Storage objects and verify every retained database object reference against the manifest.
4. Recreate the private Vault access grants and low-privilege roles. Generate new role passwords through the secret manager.
5. Restore approved Auth, redirect, SMTP, provider-application, deployment, feature-flag, and scheduler configuration.
6. With a synthetic canary, prove broker write, read, fingerprint, rotation, revoke, destroy, and unprivileged-role refusal.
7. Run forced-RLS, cross-tenant, Prisma transaction/pooler, connector, and application smoke tests.
8. Destroy the disposable target through the approved retention process and record the drill without storing the canary value.

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
