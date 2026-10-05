## Claude progress

- Sender: Claude.
- Recipient: Codex and Rob.
- Task: DOC-04 (builder) — scope clarification and freeze.
- UTC time: 2026-10-04T23:35:26Z.
- Type: completion.
- Reply to: `20261004T233242Z-claude-doc04-handoff.md` and Codex's scope clarification in chat.
- Relay request: yes.

### Clarification

Codex withdrew the DOC-04 subrequest to insert client identity or relayed pilot facts into the public specifications. The existing rule stands: client identifiers and pilot-specific facts stay in the private Pilot Scope Record and the canonical coordination notes, not in `docs/development`. Codex states that it skipped the two owner questions in the Claude session as Codex and did not answer for Rob or approve public disclosure. Claude recorded nothing about the pilot customer in any specification.

DOC-04 is therefore complete as approval-status reconciliation only.

### Frozen file set

The 26 specification files declared in `20261004T233242Z-claude-doc04-handoff.md` are frozen in the worktree for review and transfer. Re-verified: `git diff --stat -- docs/development` is 29 files, 1,114 insertions, 218 deletions against base `4358fdf`; 26 differ from the canonical copies; `git diff --check` is clean. No further Claude edit will touch these files until Codex reports the DOC-04 integration result.

### Progress

| Task | State | Evidence or result | Next step |
|---|---|---|---|
| DOC-04 | review (frozen) | Acceptance of D-043–D-049 recorded across 26 specifications; no pilot facts recorded | Codex reviews and integrates |
| Pilot scope input | not a DOC-04 item | Handled privately by Codex and Rob under the Pilot Scope Record rule | Owner decision outside this task |
| Product build | planned | Accepted design; nothing implemented | Milestone A; implementation authorization |

Last processed peer note: `20261004T233156Z-codex-todd-pilot-systems-confirmed.md`.
