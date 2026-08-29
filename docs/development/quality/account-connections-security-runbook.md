# Account Connections security runbook

This runbook is the release and incident checklist for the Account Connections workspace. It assumes the first release is read-only and that provider credentials are never collected in onboarding, email, URLs, browser storage, logs, audit metadata, analytics, or support tickets.

## Release gates

1. Apply migrations with `DIRECT_URL` over the direct Supabase connection. Do not run Prisma migrations through the transaction pooler.
2. Run `pnpm prisma validate`, `pnpm run type-check`, `pnpm run lint`, `pnpm run test`, `pnpm run security:scan`, `pnpm run security:rls-audit`, `pnpm run security:mutation-audit`, and `pnpm run build`.
3. Re-run Gate 0 against the target staging project: Prisma interactive transactions through the selected pooler mode, forced-RLS tenant isolation with omitted repository filters, low-privilege runtime role, Vault privilege/lifecycle, failure compensation, rotation/revocation concurrency, and restore portability.
4. Confirm `IDEMPOTENCY_HMAC_KEY` is secret-manager injected, at least 32 characters, environment-specific, and distinct from OAuth state, fingerprint, maintenance, provider, and broker keys.
5. Confirm `ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH=false` only after the staging smoke test. Keep the global flag and each provider flag off by default; enable the supervised pilot provider for a named organization only through the deployment change record.
6. Confirm the deployed callback URLs exactly match the provider console and the environment-specific allowlist. Never accept a client-supplied provider, issuer, redirect URI, or token host.
7. Verify the organization invitation was accepted by the intended authenticated recipient. Email delivery is a notification, not proof of membership or provider access.
8. Confirm every sensitive action has a persisted `auth.sessions` match for the JWT `session_id`, AAL2, and a fresh action-bound ten-minute step-up grant. A grant is single-use and bound to user, organization, session, and action class.
9. Staff performs a read-only mock journey and, when enabled, a supervised Google journey with Chrome DevTools. Record the result without saving tokens, callback query strings, raw provider responses, or screenshots containing secrets.
10. Complete the Meta role-confirmation gate for the pilot. Apply the same gate to TikTok only after an expansion decision.

## Data and secret boundary

- Tenant records use `organization_id`, Prisma transaction-local context, and forced RLS. Application code must not add a repository filter as a substitute for RLS.
- The `SecretBroker` is the only credential boundary. Relational rows store opaque broker handles, key-version labels, fingerprints, expiry, and safe status metadata.
- A provider adapter may return only the typed exchange/discovery/verification contract. It has no generic HTTP escape hatch and no write-operation method.
- Notes, identifiers, display names, and diagnostics pass through Zod validation and recursive redaction. Reject private keys, JWTs, cookies, bearer tokens, passwords, cloud keys, and token-shaped API fields before persistence.
- Do not place secrets in `NEXT_PUBLIC_*` variables. The browser receives only safe status and resource summaries.
- Onboarding drafts are stored only in the applicant-bound server record. Browser storage may contain the opaque submission ID, but never the onboarding form payload, attachment metadata, credentials, or access codes. A legacy browser draft is removed from browser storage before it can be migrated through the current Zod and secret-detection boundary.
- Onboarding free text and attachment filenames must pass the shared secret-material boundary. Private uploads stay outside automated and agent retrieval until an authorized person completes content/DLP review; metadata, path, extension, or filename checks do not make file contents safe for agent context.
- The idempotency ledger stores only tenant/user/action scope, HMAC hashes, timestamps, and safe state. It never stores mutation payloads, responses, OAuth state, grants, credentials, or secrets.

## Mutation replay and reconciliation

- A browser keeps one `Idempotency-Key` and `X-Correlation-Id` in memory for each logical mutation and reuses them only when retrying the identical intent after an unknown outcome. It rotates the identity after confirmed success or an explicit user reset; neither value belongs in browser storage.
- `IDEMPOTENCY_IN_PROGRESS` means wait and reconcile current state. `IDEMPOTENCY_ALREADY_COMPLETED` means the side effect completed but its response is not replayable. `IDEMPOTENCY_RECONCILIATION_REQUIRED` means the recorded attempt failed or its outcome cannot safely be inferred. `IDEMPOTENCY_KEY_REUSED` means the same key was paired with a different action or request and is rejected.
- `IDEMPOTENCY_STORE_UNAVAILABLE` and `IDEMPOTENCY_STORE_INVALID` fail closed. Preserve the correlation ID, inspect the ledger and domain state through approved operations, and do not retry with a new key until the original outcome is reconciled.
- Sensitive responses are never persisted for replay. In particular, a completed step-up verification does not reveal the prior grant again; the user must reconcile and explicitly obtain a fresh challenge/grant.

## Kill switches and rollback

Set the smallest switch needed:

| Situation | Action |
| --- | --- |
| Any tenant or secret-boundary concern | Set `ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH=true`; redeploy or restart workers. Existing connections remain readable only through already-approved operational paths. |
| One provider outage, review problem, or unexpected scope | Set that provider's `ACCOUNT_CONNECTIONS_<PROVIDER>_ENABLED=false`. |
| Suspected authorization callback issue | Disable the provider, revoke outstanding OAuth transactions, and rotate `OAUTH_STATE_HMAC_KEY` only with a documented migration plan. |
| Idempotency ledger or hash-key concern | Stop affected mutations, preserve safe correlation IDs, reconcile domain state against ledger state, and rotate `IDEMPOTENCY_HMAC_KEY` only with a documented retained-row migration plan. |
| Suspected broker exposure | Disable all connection authorization, revoke provider grants where safe, rotate the broker key version, and follow the incident procedure below. |

Rollback means disabling flags and deploying the last known-good build. Do not roll back a migration that has already been applied to shared data; create a forward migration and preserve audit history. Never delete connection, health, invitation, or audit rows to hide an incident; archive/revoke them through the lifecycle APIs.

## Incident response

1. Stop new authorization with the global kill switch and preserve the correlation ID, deployment revision, environment, and UTC timestamps.
2. Do not copy tokens or raw callback URLs into the incident. Capture only safe error codes, provider, organization ID, connection ID, and audit event ID.
3. Revoke affected provider grants through the provider console or adapter, destroy broker handles, mark connections `revoked`, and record the outcome.
4. If the broker is suspected, rotate to a new key version, verify decryptability of a synthetic canary, and invalidate the previous version only after all live handles are migrated or revoked.
5. Check cross-tenant queries, RLS policy changes, runtime-role grants, and recent deployments. Preserve database and Vault audit evidence.
6. Notify the named security and platform owners, document customer impact, and keep the provider flag disabled until the post-incident test matrix passes.

## Rotation, retention, and offboarding

- Rotate OAuth client secrets, fingerprint/HMAC keys, Vault key versions, and provider grants on the schedule set by the environment owner; never put values in source control. Rotating `IDEMPOTENCY_HMAC_KEY` changes how retained request/key hashes compare and therefore requires a migration or retention-drain plan.
- Revocation destroys the broker secret, records `revokedAt` on the opaque credential reference, disables the connection, and keeps non-secret lifecycle evidence.
- Expired or invalid grants become `expired`/`degraded` and require reconnect. Email or a manually marked invitation never upgrades a connection to verified.
- Retain only the minimum safe metadata required for support, audit, and reconciliation. Exported evidence must be redacted and access-controlled.
- Organization offboarding disables memberships, revokes active connections, destroys broker handles, archives inventory, and retains append-only audit records according to the approved retention schedule. Batches are separately idempotent, and final deactivation takes an exclusive organization lock while allowing only terminal ledger finalization afterward.

## Required evidence

Onboarding evidence must prove applicant-bound server drafts, absence of form payloads from browser storage, free-text and filename secret rejection, and authorized attachment-content review before any uploaded material enters agent context.

Store test output and review notes in `docs/temp/` or the approved restricted evidence store. Synthetic values only. The evidence set must include Gate 0 JSON, migration/RLS checks, durable mutation claim/replay/reconciliation cases, invitation replay and recipient checks, MFA/step-up cases, OAuth state/PKCE replay and open-redirect cases, onboarding draft/browser-storage containment, onboarding text/filename secret rejection, authorized attachment-content review, secret redaction scans, revoke/rotate/offboarding concurrency, cleanup/retention behavior, restore proof, provider official-source review, and the final type/lint/test/build results.
