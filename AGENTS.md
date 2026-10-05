# AGENTS.md — Agent Ads Repository Instructions

Apply the global instructions first. These rules add repository facts and required local safeguards.

## Repository

- This repository contains one Next.js App Router application.
- Use Node.js 22 and `pnpm@10.12.4`.
- Use `develop` as the default branch and pull-request target.
- Do not assume that `main` exists.
- The current implementation is the Next.js control plane.
- Treat broader Hermes, Temporal, worker, billing, and publishing designs as roadmap work until source code implements them.
- Use `app/` for routes and UI.
- Use `lib/` for shared services, domain logic, authentication, security, and provider adapters.
- Use `prisma/` for the application schema and current migrations.
- Treat `supabase/migrations/` as immutable legacy onboarding history.

## Architecture and code

- Keep TypeScript strict and do not add authored `any`.
- Use Server Components by default.
- Add `"use client"` only for browser APIs, state, or interactive behavior.
- Validate API, provider, environment, and external-data boundaries with Zod.
- Put route handlers under `app/api/`.
- Keep reusable business and security logic outside route handlers.
- Co-locate unit and contract tests with `.test.ts` names.
- Return stable uppercase API error codes.
- Use the shared no-store response helpers for authenticated or sensitive APIs.
- Never expose raw provider responses, internal errors, secrets, or broker handles.

For defects, find the root cause and add a regression test when practical.
Search all consumers before changing a schema, route, event, adapter contract, or shared type.

## Security and data

- Supabase Auth supplies identity and sessions.
- Application organizations, memberships, roles, and permissions supply authorization.
- Resolve organization context from the authenticated session and active membership.
- Never trust an organization identifier from a route, form, or client request.
- Use transaction-local tenant context and the low-privilege Prisma runtime role.
- Keep RLS enabled and forced on tenant and sensitive application tables.
- Store provider secrets only through `SecretBroker`.
- Store only opaque credential references and safe metadata in application records.
- Keep provider operations read-only until a separate approved mutation plan exists.
- Require current AAL2, active-session binding, and action-bound step-up grants for sensitive actions.
- Keep OAuth state random, hashed, bound, short-lived, single-use, and exchanged server-side.
- Allow only same-origin approved redirect destinations.
- Treat uploaded files and external content as untrusted.

Use these project skills for Supabase or PostgreSQL work:

- `.agents/skills/supabase/SKILL.md` for Supabase services, SDK integration, configuration, and diagnosis.
- `.agents/skills/supabase-postgres-best-practices/SKILL.md` for PostgreSQL changes, RLS, SQL, and database diagnosis.

Use both for work that crosses these areas.
Use these project copies instead of duplicate plugin skills.
Preserve their local adaptations during upstream skill updates.
Use current primary documentation for the affected behavior.

Use Prisma for application schema and migration changes.
Supabase skill migration procedures do not apply to this repository.
Keep `supabase/migrations/` immutable.
Database execution still requires the approved target and procedure.
Follow the security and operations runbooks for migrations, secrets, restore, revocation, and incident work.

## Workflow and documentation

### Joint development startup

- Use `C:/Users/rob/Documents/Software/marketing/agent-ads` as the canonical coordination checkout on this machine.
- At session start, read `docs/development/README.md` and `.Codex/plans/plan-joint-marketing-director-delivery.md` in that checkout.
- Read `docs/development/delivery/shared-progress.md` and new notes in `docs/development/collaboration/notes/` before work.
- Follow `docs/development/collaboration/README.md` for task ownership, reviews, handoffs, and progress updates.
- Use the canonical progress and notes files from every worktree. Do not create separate live copies.
- Update your own progress section at task start, blockage, handoff, review, and completion through the shared helper.
- One agent owns each task's files. Request an acknowledged handoff before editing another agent's active files.
- Saved notes do not wake an idle agent. Do not claim background collaboration unless both sessions are active.
- These coordination rules do not grant Git, deployment, production, provider-write, or spending permission.

### Existing workflow rules

- Preserve all existing dirty-worktree changes.
- Base authorized feature and fix branches on `develop`.
- Do not use the `fullpush` skill in this repository.
- Stage only task files and keep each Git action subject to its existing approval requirement.
- For Account Connections work, read the outcome, applicable decisions, and relevant phase gates in `.Codex/plans/feature-account-connections.md`.
- Treat the plan's initial assessment as historical.
- Verify current implementation against source code.
- Use `docs/development/` as the current product and architecture authority.
- Treat `docs/agentic-marketing/` as older research when the two document sets disagree.
- Mark roadmap work complete only when it is implemented and verified.
- Revise planned roadmap scope only when the user requests it or a project instruction requires it.
- Keep staging, provider, restore, owner, and observation gates incomplete until evidence proves them.
- Put retained temporary evidence in `docs/temp/`.

## Commands and completion

Install dependencies with:

```text
pnpm install --frozen-lockfile
```

Start local development with:

```text
pnpm run dev
```

The default port is `3000`. The `PORT` environment variable can override it.

Run these checks for relevant code changes:

```text
pnpm run type-check
pnpm run lint
pnpm run test
pnpm run build
```

Run these checks for authentication, API, database, onboarding, or Account Connections changes:

```text
pnpm run security:scan
pnpm run security:rls-audit
pnpm run security:mutation-audit
```

Run `node node_modules/prisma/build/index.js validate` for Prisma schema or migration changes.
Use `node node_modules/prisma/build/index.js migrate deploy` only through the approved migration procedure with `DIRECT_URL`.
Use `pnpm run bootstrap:owner` only as an approved controlled maintenance action.

Use [.github/workflows/validate.yml](.github/workflows/validate.yml) as the current CI authority.
It includes Prisma validation, type-check, lint, tests, dependency checks, security audits, database proofs, and build.
CI does not replace the required local checks.

For rendered changes, follow the global browser-tool order.
Verify relevant redirects, interactions, responsive states, accessibility, console output, network failures, and security headers.

Follow `docs/development/delivery/vercel-supabase-resend-deployment.md` for deployment.
Preview or production deployment requires explicit approval.

Do not bypass a type, lint, test, migration, RLS, or security failure.
Report every failed or unavailable check.
Do not claim external Account Connections gates are complete without target-environment evidence.

## Generated and private files

- Do not hand-edit `.next/`, `node_modules/`, `.pnpm-store/`, `out/`, or `scripts/gate0/generated/`.
- Do not hand-edit `next-env.d.ts`, `*.tsbuildinfo`, or `.vercel/`.
- Treat `archive/` as retained historical material outside active build and validation inputs.
- Use `.env.example` as the environment-variable template.
- Never read, print, log, commit, or copy values from real `.env*` files into agent context.
