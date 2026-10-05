## Claude progress

- Sender: Claude.
- Recipient: Codex and Rob.
- Task: DOC-02 final handoff (builder).
- UTC time: 2026-10-04T22:38:24Z.
- Type: completion (final handoff for DOC-03 transfer).
- Reply to: `20261004T223550Z-codex-doc03-final-clarifications.md`.
- Relay request: yes. Please copy this note unchanged to the canonical notes directory and publish it as the Claude progress section.

### Status

| Task | State | Evidence or result | Next step |
|---|---|---|---|
| DOC-02 | review | Three final clarifications applied; 29 specification files in the worktree | Codex transfers and verifies |
| DOC-01 review | verified (by Claude) | Accepted by Codex in `20261004T223550Z-codex-doc03-final-clarifications.md` | None |
| Product build | planned | No product task is active | Wait for owner decisions |

### Clarification resolutions

1. **APR-004.** The original one-action rule and the batch deferral are preserved. A D-044 exception follows: one approval may bind creation and activation of one campaign package on one account when verification passes between the steps (APR-014). Approving unrelated packages, several platforms, or several accounts in one decision remains batch approval and stays expansion scope.

2. **Traceability scope note.** `requirements-traceability.md` now has a scope note above the pilot gate evidence table and at the evidence index: under accepted D-032/D-037 scope every row applies as written; under D-043/D-044, source, sampling, CMS draft, and follow-up evidence (PIL-CONN-001, AIR-SMP-001, and those parts of PIL-MUT-001) applies only when the Pilot Scope Record enables them. Every evidence status is unchanged. Foundation, recovery, authorization, approval, security, observation, and operational evidence stays mandatory in both scopes. The AIR-SMP-001 row carries the same qualifier.

3. **Budget ledger wording.** All statements now describe a local ledger: `dispatched` is recorded in a local transaction before the provider request is sent; dispatched and uncertain exposure stays counted across failures; after independent provider reconciliation verifies activation, the local ledger updates atomically from `dispatched` to `committed` without reducing counted exposure; a failed or unknown result moves the row to `uncertain`, still counted; no transaction spans the application database and the provider API. Aligned in D-044, ACT-007, `domain-data-model.md`, `platform-integration-architecture.md` step 13, `system-architecture.md` (workflow plane and write path), `paid-advertising.md`, `security-privacy-compliance-and-autonomy.md`, `requirements-traceability.md` (ACT-RSV-001), and two test cases in `testing-and-agent-evaluation.md`. No "atomic with verified activation" wording remains.

### Manifest

The same 29 specification files listed in `20261004T211730Z-claude-doc02-completion.md`, plus this note and `20261004T223414Z-claude-doc02-corrections.md`. Existing notes are unchanged. Transfer by `git diff -- docs/development` from the worktree, or copy the 29 files by path.

### Checks

- `git diff --stat -- docs/development`: 29 files (statistics in the chat handoff).
- `git diff --check -- docs/development`: clean.
- Search for the superseded wording "atomic with verified activation" and "converts atomically to a counted": no matches.
- No code, schema, configuration, or secret changed. No Git action taken.

### Unresolved owner decisions

Unchanged: accept or amend D-043 to D-049; approve D-044 before any provider-write implementation; confirm the first customer, offer, channel, outcome source, CMS need, and operating owner; approve the commercial package before milestone E.

Last processed peer note: `20261004T223550Z-codex-doc03-final-clarifications.md`.
