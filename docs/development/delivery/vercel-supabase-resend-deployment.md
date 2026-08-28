# Vercel, Supabase, and Resend deployment

## Status

The Next.js control plane can build and run in Vercel Preview.

This does not prove staging, pilot, or production readiness.

Do not merge a branch that deploys a shared environment until the required target and recovery gates pass.

## Deployment authority

- `prisma/schema.prisma` and `prisma/migrations/` define the current application database.
- `supabase/migrations/` is immutable legacy onboarding history.
- Do not apply legacy onboarding migrations to a current application target.
- Use `pnpm run build`. Its `prebuild` hook generates the Prisma client.
- Use `DIRECT_URL` only through the approved Prisma migration procedure.
- Use separate low-privilege runtime and secret-broker login principals.
- Keep every provider mutation feature disabled.

## Required environment boundaries

Use separate Vercel projects, Supabase projects, OAuth applications, credentials, redirect URLs, and email test settings for staging and pilot production.

Preview must use mock or nonproduction providers. It must not receive pilot or production credentials.

The current GitHub deployment record maps the `develop` head to a Vercel `Production` deployment.

Treat each merge into `develop` as a shared deployment until a later verified configuration changes this mapping.

Keep the pull request unmerged until staging, recovery, and rollback gates pass.

Record these values in private release evidence without secrets.

Keep project references, deployment URLs, backup identifiers, and owner details outside Git, pull requests, public documents, and ordinary logs.

- environment name;
- Git commit and artifact identifier;
- Vercel project identifier and deployment URL;
- Supabase project reference and PostgreSQL major version;
- expected and current Prisma migration heads;
- Supavisor mode and port;
- approved callback origins;
- enabled feature flags;
- backup identifier and recovery-manifest revision;
- release, database, security, and rollback owners.

## Supabase preflight

1. Confirm the target is the approved isolated environment.
2. Capture the target fingerprint and migration inventory.
3. Stop on an unknown, changed, missing, or failed migration.
4. Inspect column types, constraints, indexes, RLS, roles, memberships, and grants.
5. Confirm tenant tables use enabled and forced RLS.
6. Confirm `app_runtime` and `app_secret_broker` are `NOLOGIN` permission roles.
7. Confirm each login principal has only its approved permission-role membership.
8. Confirm the runtime principal cannot call Vault functions.
9. Confirm the broker principal cannot read application or Vault tables directly.
10. Confirm a complete recovery set exists before migration.

Run Prisma migrations only with the direct database route:

```text
node node_modules/prisma/build/index.js validate
node node_modules/prisma/build/index.js migrate deploy
```

The second command needs the approved procedure, `DIRECT_URL`, database owner, and operations reviewer.

Never run migrations through Supavisor transaction mode.

## Vercel configuration

1. Link the reviewed repository and the approved environment-specific Vercel project.
2. Keep the build command as `pnpm run build`.
3. Add only variables from the Vercel runtime allowlist below.
4. Never copy a real value into documentation, Git, logs, support records, or browser-safe variables.
5. Keep the service-role key server-only for the contained onboarding boundary.
6. Use the low-privilege Prisma runtime URL for application database access.
7. Use the separate broker URL only through `SecretBroker`.
8. Start with account connections, provider flags, and mutation features disabled.

The core Vercel runtime allowlist is:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET`;
- `DATABASE_URL` with the low-privilege runtime principal;
- `SECRET_BROKER_BACKEND`, `SECRET_BROKER_KEY_VERSION`, and `SECRET_BROKER_DATABASE_URL`;
- `SECRET_FINGERPRINT_KEY`, `OAUTH_STATE_HMAC_KEY`, `RATE_LIMIT_HMAC_KEY`, and `IDEMPOTENCY_HMAC_KEY`;
- approved `ACCOUNT_CONNECTIONS_*_ENABLED` flags, `ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH`, and `ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS`.

Add `ACCOUNT_CONNECTIONS_MAINTENANCE_TOKEN` only after the scheduler gate passes.

Add Resend variables only for an approved test or customer-message flow.

Add one provider's credentials only after that provider's separate read-only access gate passes.

Never add `DIRECT_URL`, `APP_BOOTSTRAP_*`, database-owner credentials, migration credentials, or `ACCOUNT_CONNECTIONS_MOCK_PROVIDER` to Vercel.

Do not copy all `.env.example` entries into Vercel. Omit unused and unapproved variables.

Do not replace `pnpm run build` with `next build`. The direct command skips Prisma client generation.

## Supabase Auth and Storage

- Add only the approved environment URL and its `/auth/callback` route.
- Verify login, logout, expiry, revocation, active-session binding, MFA, and current AAL2 behavior.
- Keep the onboarding bucket private.
- Treat every uploaded file as untrusted.
- Do not let an agent use submitted media before malware, rights, and safety reviews pass.
- Record Storage object recovery, bucket settings, access policies, retention, and object-reference verification separately.

## Resend

- Use a nonproduction domain or approved test mode in staging.
- Use Resend test addresses such as `delivered@resend.dev` and `bounced@resend.dev` by default.
- Require separate approval before sending to any real mailbox.
- Do not send a real customer message during staging.
- Verify delivery, failure handling, suppression, and sensitive-data removal.
- Production sending needs the approved domain, sender, recipient rules, and incident owner.

## Deployment sequence

1. Require all exact-commit GitHub checks.
2. Keep staging access, provider flags, schedulers, and external operations disabled.
3. Verify the staging target fingerprint and recovery manifest.
4. Apply the approved forward migration to staging.
5. Recheck migration history, RLS, roles, grants, and Supavisor behavior.
6. Build and deploy the reviewed Git commit and lockfile in isolated staging.
7. Verify the staging deployment before changing access or flags.
8. Run authentication, connector, browser, accessibility, console, network, and security-header checks.
9. Run backup and restore verification with synthetic data.
10. Record failures, limitations, recovery steps, owners, and evidence.
11. Keep the pilot domain, organization access, provider flags, schedulers, and external operations disabled.
12. Verify the pilot target fingerprint and recovery manifest.
13. Apply the approved forward migration to the pilot target with `DIRECT_URL`.
14. Recheck pilot migration history, RLS, roles, grants, and Supavisor behavior.
15. Build the same reviewed Git commit and lockfile in the approved pilot project.
16. Verify the resulting Production deployment before changing access or flags.
17. Record separate staging and pilot deployment identifiers.

Before a staging release, create a private disabled-operations manifest.

The manifest must prove these states without recording secrets:

- account, domain, and organization access remains disabled;
- every provider read or mutation flag is absent or false;
- the global kill switch is true;
- schedulers and maintenance triggers are absent or disabled;
- copied `pg_cron`, `pg_net`, wrappers, webhooks, and external jobs are disabled;
- real customer email and provider operations are disabled;
- an outbound-operation audit shows zero external actions.

Record only variable names, safe Boolean states, deployment identifiers, observation times, owner roles, and restricted evidence references.

The `EXTERNAL_OPERATIONS_DISABLED` staging check must reference this manifest. Fixed safety literals alone do not prove the state.

A Preview-to-Production promotion rebuilds with Production variables. Separate Vercel projects also create separate deployments.

A staged Production promotion does not rebuild. Create it with `vercel --prod --skip-domain`, then promote it only after verification.

## Recovery modes

Select one recovery mode before the operation. Do not mix their assumptions.

Use a physical clone or logical restore with synthetic staging data for pre-pilot drills. Same-project restore is an incident procedure.

### Same-project physical restore

A physical restore can restore database role state from the backup. Supabase reapplies current Supabase-managed credentials after the restore.

Plan and record downtime because the project is unavailable during the restore.

Record and drop custom subscriptions and replication slots before the restore. Recreate and verify them afterward. Supabase manages the Realtime slot.

The same project keeps its Vault root key. Do not replace it.

Verify every managed login after restore. Rotate or reset each application-created `LOGIN` role through the secret manager.

### Physical restore to a new project

A Supabase physical clone copies database roles, permissions, users, Auth data, and the Vault root key.

Confirm paid-plan access, physical backups, clone restrictions, and cost approval before cloning.

For a drill, clone only an inert staging source without active external jobs or real provider credentials.

Before an incident clone, block external destinations outside the database. Do this before creating the clone.

Restrict target access because the clone contains database and Auth data. Do not replace the copied Vault root key.

Apply production-class access controls and retention rules when the clone contains real data. Require explicit approval before deleting that target.

Disable `pg_cron`, `pg_net`, wrappers, and other external-operation extensions immediately after cloning. Do this before application or recovery tests.

Verify and reconcile restored roles before creating or changing any role. Reset every application-created `LOGIN` password through the secret manager.

Reconfigure Auth settings, API keys, Realtime, database settings, redirects, and provider applications in an inert state.

### Logical restore

A logical backup does not carry custom role passwords. Restore role definitions from reviewed role SQL. Create new passwords through the secret manager.

Retrieve the source Vault root key before pausing or deleting the source. Keep it through the approved out-of-band process.

Verify the target has no data encrypted with another key before replacing its root key. Restore Storage objects and bucket configuration separately.

### Manual logical Vault key transfer

This Beta Management API needs `project_admin_write`. Logical mode stays blocked until operations approve and test a nonlogging transfer tool.

1. Keep the source and target projects active.
2. Use a new isolated target before any schema, data, secret, or encrypted-value write.
3. Prove the target contains no application data and no Vault secrets.
4. Freeze restore activity until the key transfer finishes.
5. Use the least-privileged available operator identity for the required projects.
6. Create a fine-grained token with `project_admin_write` and no unrelated permission.
7. Disable shell tracing, transcripts, command logging, and CI capture.
8. Stream `GET /v1/projects/{source_ref}/pgsodium` directly into `PUT /v1/projects/{target_ref}/pgsodium`.
9. Never print, save, copy, or record the response body.
10. Compare source and target keys in memory. Record only a match result and request status.
11. Revoke the Management API token immediately.
12. Restore the logical backup only after the key match succeeds.
13. Verify decryption through `SecretBroker` with a synthetic canary.
14. If any step fails, isolate the target and use the approved retention process. Never place it into service.

For all modes, verify migrations, RLS, tenant isolation, Vault operations, Storage references, Auth, flags, scheduler configuration, and the deployed artifact.

Official recovery references:

- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase restore to a new project](https://supabase.com/docs/guides/platform/clone-project)
- [Supabase physical-restore credential correction](https://supabase.com/changelog)
- [Supabase Vault key portability](https://supabase.com/docs/guides/database/vault#key-portability-and-migration)
- [Vercel Preview promotion](https://vercel.com/docs/deployments/promote-preview-to-production)
- [Vercel staged Production deployment](https://vercel.com/docs/cli/deploying-from-cli#deploying-a-staged-production-build)

## Rollback

- Disable affected feature flags first.
- Revoke affected provider access when needed.
- Roll back the application to the previous compatible Vercel artifact.
- Repair database behavior with a reviewed forward migration.
- Never use an automatic database rollback.
- Restore data only through the approved recovery procedure.
- Record the exact target, cause, impact, recovery result, and prevention action.

## Pilot entry rule

Minimum approved read-only staging access can begin after target F0, recovery F1, and approved pilot scope P0 pass.

Use this access only to complete read-only source reconciliation for P1.

Source-system records stay unchanged. Agent Ads can create approved internal copies, encrypted token records, and audit records.

Customer pilot access stays disabled until read-only source P1 and AI Reach P2 pass.

No advertising, website, publishing, email, or CRM source-system mutation occurs during the read-only pilot.
