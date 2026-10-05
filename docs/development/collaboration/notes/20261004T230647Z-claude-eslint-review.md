## Claude progress

- Sender: Claude.
- Recipient: Codex and Rob.
- Task: ESLint configuration repair (reviewer).
- UTC time: 2026-10-04T23:06:47Z.
- Type: finding.
- State: changes-requested (one required finding).
- Reply to: `20261004T230400Z-codex-eslint-review-handoff.md`.
- Relay request: yes.

### Review scope

Read-only inspection of canonical `eslint.config.mjs` and `eslint.config.test.ts`, compared with `HEAD:eslint.config.mjs`. Independent checks were run from the canonical checkout with Node.js 22.22.2 and did not change any file.

### Verified

| Check | Result |
|---|---|
| Plugin resolution from the application root | `eslint-plugin-react-hooks` is not resolvable from the root; the original configuration could not load it |
| Plugin resolution from `dirname(require.resolve("eslint-config-next"))` | Resolves to `node_modules/.pnpm/eslint-plugin-react-hooks@5.2.0_.../index.js`; `eslint-config-next@15.5.26` has `main: index.js` and no `exports` map, so `require.resolve` is stable |
| Rules retained | `eslint --print-config app/page.tsx` lists `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, `@next/next/no-html-link-for-pages`, and `@typescript-eslint/no-unused-vars`; `compat.extends` arguments are unchanged from HEAD |
| Input scope | A worktree file (`.claude/worktrees/.../middleware.ts`) is ignored by pattern; `lib/audit.ts` lints with exit 0; the two new ignore patterns are the only additions to the ignore list |
| Regression coverage | `vitest run eslint.config.test.ts`: 2 tests passed in 10.7 s. The tests exercise the real CLI through the Node loader, accept valid Hooks, reject conditional Hooks (`rules-of-hooks`, severity 2), and report missing dependencies (`exhaustive-deps`, severity 1) |
| Dependencies | `package.json` and `pnpm-lock.yaml` unchanged |

The cause analysis is correct: pnpm's isolated layout keeps Next's bundled plugins beside their owner, and `FlatCompat` resolved them from the project root. The option used is the documented `resolvePluginsRelativeTo`.

### Required finding

1. **Mixed line endings in `eslint.config.mjs`.** `git ls-files --eol eslint.config.mjs` reports `i/lf w/mixed`. The index has LF; the working file now mixes CRLF and LF. Normalize the file to LF so it matches the index and the rest of the repository, and so the Git CRLF warning disappears. No other change.

### Optional suggestions (not required)

2. Add one assertion that the ignore patterns hold, for example `eslint --no-warn-ignored` on a path under `.claude/worktrees/` returning no results, so a future ignore-list edit cannot silently widen or narrow lint input.
3. `expect(result.stderr).toBe("")` is strict. Keep it; if a future ESLint version prints a deprecation notice, relax it to "no error lines" rather than removing the check.

### Out of scope, as instructed

The full `pnpm run test` failures (duplicate worktree suites, the retained `node:test` artifact, and the two timeouts that pass on focused rerun) are not part of this review and were not repaired.

### Progress

| Task | State | Evidence or result | Next step |
|---|---|---|---|
| ESLint repair review | changes-requested | One required finding (line endings); correctness, scope, and coverage verified | Codex normalizes line endings; Claude re-checks `git ls-files --eol` |
| DOC-02 | integrated | Unchanged | None |
| Product build | planned | Unchanged; D-043–D-049 proposed, D-044 awaits owner approval | Owner decisions |

Last processed peer note: `20261004T230400Z-codex-eslint-review-handoff.md`.
