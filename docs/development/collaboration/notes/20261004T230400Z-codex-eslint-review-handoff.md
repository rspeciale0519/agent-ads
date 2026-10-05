## Codex progress

- Sender: Codex.
- Recipient: Claude and Rob.
- Task: DOC-01 helper validation; ESLint configuration repair.
- UTC time: 2026-10-04T23:04:00Z.
- Type: handoff.
- State: review.
- Reply to: `20261004T224805Z-codex-lint-fix-start.md`.
- Requested response: Claude reviews the two source files and records any required changes in a new note.

### Result and cause

The missing-plugin error is fixed in the canonical checkout.
The installed `eslint-config-next@15.5.26` owns `eslint-plugin-react-hooks@5.2.0`.
pnpm's isolated layout makes that plugin available from its owner, but not from the application root.
`FlatCompat` previously resolved plugins from the application root.

`eslint.config.mjs` now resolves bundled plugins from the installed Next configuration package.
It also excludes private recovery artifacts and separate Claude worktrees from application lint input.
The first complete lint attempt after plugin repair found an inaccessible recovery-artifact directory.
No lint rule changed. Application, library, test, and helper paths remain lint inputs.
No dependency was added. `package.json` and `pnpm-lock.yaml` have no changes.

### Task files

- `eslint.config.mjs`: plugin resolution and artifact exclusions.
- `eslint.config.test.ts`: two CLI regression tests with in-memory TSX input.
- Coordination notes, the Codex progress section, and the joint plan's obsolete lint status.

The regression tests accept valid Hooks and reject conditional Hooks.
They also confirm that missing effect dependencies produce the configured warning.
The valid-component test reproduced the original plugin error before the configuration change.

### Checks

All commands used Node.js `22.22.2`. pnpm reported version `10.12.4`.

| Check | Result |
|---|---|
| `node node_modules/vitest/vitest.mjs run eslint.config.test.ts scripts/collaboration/update-progress.test.ts` | Passed: 2 files, 7 tests |
| `pnpm run lint` | Passed, exit 0 |
| `pnpm run type-check` | Passed, exit 0 |
| `pnpm run build` | Passed, exit 0; Prisma generation, Next compilation, lint, types, and 15 static pages succeeded |
| ESLint input-scope check | Passed: recovery artifacts and worktrees ignored; five application/configuration/helper paths included |
| `git diff --check -- eslint.config.mjs` | Passed; Git reported its existing LF-to-CRLF warning |
| `pnpm run test` | Failed: 216 of 221 files passed; 1870 tests passed, 4 failed, 6 skipped |
| `pnpm run test scripts/release-evidence/verify-staging-record.test.ts scripts/release-evidence/verify-staging-record.content.test.ts --exclude '.claude/worktrees/**'` | Passed: both canonical files, 32 tests |

The full test command also discovered duplicate worktree suites and a retained `node:test` proof artifact.
Vitest reported no suite in `docs/temp/release-evidence/key-match-check/proof.test.mjs`.
It reported four timeouts: two canonical release-evidence tests and two duplicate worktree tests.
The two canonical files passed together when rerun without duplicate worktree suites.
The complete test command remains failed. Its discovery scope was not changed during this repair.

The pnpm launcher reported existing warnings about ignored package-level pnpm settings.
No install ran. No security, database, UI, or provider behavior changed.
No production action or Git write occurred.

### Review and recovery

Claude should inspect the actual canonical files and keep this review read-only, apart from its new review note.
The review should check plugin resolution, retained rule enforcement, input exclusions, and regression coverage.
Do not repair unrelated test discovery under this task.
Recovery requires reverting only this task's configuration edits and archiving its new test file under the repository's preservation rules.

The documented API option matches the installed implementation.
Source: [ESLintRC ESM usage](https://github.com/eslint/eslintrc#usage-esm).

### Existing delivery state

DOC-02 remains integrated. DOC-03 remains verified.
Helper lint now passes. Product work remains planned, with D-043 through D-049 still proposed.
Last processed peer note: `20261004T224343Z-claude-doc02-integration-acknowledgment.md`.
