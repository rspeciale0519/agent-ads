## Claude progress

- Sender: Claude.
- Recipient: Codex and Rob.
- Task: DOC-02 corrections (builder); DOC-01 relay review (reviewer).
- UTC time: 2026-10-04T22:34:14Z.
- Type: completion (handoff for DOC-03 re-review and transfer).
- Reply to: `20261004T223300Z-codex-doc03-findings.md` and `20261004T222951Z-codex-doc01-relay-review.md`.
- Relay request: yes. Please copy this note unchanged to the canonical notes directory and publish it as the Claude progress section.

### Status

| Task | State | Evidence or result | Next step |
|---|---|---|---|
| DOC-02 | review | Six DOC-03 findings resolved in the worktree; 29 specification files, 1,109 insertions, 215 deletions against base `4358fdf` | Codex re-reviews and transfers |
| DOC-01 review | verified (by Claude) | Relay copies, report copy, and progress publication verified byte-identical; coordination guide, plan, progress header, and root `CLAUDE.md` reviewed below | Codex sets DOC-01 state |
| Product build | planned | No product task is active | Wait for owner decisions |

### Finding resolutions

1. **Implemented versus planned; Meta.** `README.md` now says the D-037 actions are the accepted boundary and that no provider write is implemented. Every place that said both read adapters "exist", "ship", or are "built and verified" now says: Google has OAuth, discovery, and a campaign report read verified locally; Meta has OAuth and asset discovery only, with no campaign reporting; nothing is verified in a target environment. Changed in `README.md`, `product-brief.md`, `personas-and-user-journeys.md`, `paid-advertising.md`, `ai-reach.md`, `pilot-onboarding-and-launch.md`, `platform-capability-matrix.md`, `implementation-roadmap.md` (Gate P0 and work package 4), `requirements-traceability.md`, and the D-032 amendment. The system-architecture and paid-advertising implementation sections are labelled "Audit source: HEAD `4358fdf`, 2026-10-04, local inspection only". Historical D-032 text and PAID-001 are unchanged.

2. **Conflicting prerequisites.** `README.md` gains a "Scope before and after acceptance" table. `implementation-roadmap.md` gains the same statement, Gate P1 and P3 wording for both states, and pilot stages that skip stage 4 when the Pilot Scope Record does not select those actions; milestone C's CMS draft is conditional. `product-brief.md` first-release list and success outcomes, `personas` journey 1, `client-onboarding-form.md` sources step, and `product-requirements.md` release criteria now say requirements follow the Pilot Scope Record under D-043/D-044 and name the accepted D-032/D-037 scope separately. `platform-capability-matrix.md` makes Search Console and AI-answer sampling conditional under D-043 while keeping the D-032 column. `ai-reach.md` puts sampling behind its own enabled-capability gate in stage 1 and the read-only gate. `requirements-traceability.md` no longer uses Google and Meta reports as universal proof. Provider authorization, F0/F1, restore, owner, and observation safeguards are stated as unchanged in both states.

3. **Traceability and status rule.** `requirements-traceability.md` adds rows for ONB-017–020, PAID-015–020, AGT-011–012, APR-013–016, and DAT-013–014. The requirements introduction now applies the proposed-status rule to every requirement or amendment marked D-043 through D-049, and states that original IDs and completed evidence states are preserved.

4. **Budget and cancellation.** Reservation states are now `pending`, `dispatched`, `committed`, `uncertain`, `released`. Pending converts atomically to committed on verified activation; live and uncertain exposure stays counted until reconciliation proves safe release; expiry releases only an undispatched pending reservation; release from dispatched, committed, or uncertain needs a reconciliation reference. Kill switches stop new dispatch and cancel queued work; an in-flight request may finish and is reconciled with an approved recovery action; no immediate-stop promise. Aligned in D-044, ACT-007, ACT-012, `domain-data-model.md` (fields and integrity rules), `platform-integration-architecture.md` (steps 13–14), `system-architecture.md` (workflow plane and write path), `paid-advertising.md`, `security-privacy-compliance-and-autonomy.md`, `deployment-environments-and-operations.md` (jobs), `implementation-roadmap.md` (work package 9), `requirements-traceability.md` (ACT-RSV-001), and `testing-and-agent-evaluation.md` (five new test cases).

5. **Product claims.** `product-brief.md` now states "take over most execution work" as the goal, measured by pilot evidence. The configured-workspace paragraph explains the application-owned control and repeatability requirements without the absolute claims.

6. **Shadow review versus calibration.** D-047, LRN-007, and `measurement-attribution-and-experimentation.md` now allow offline review of reasoning, evidence use, and permission compliance for any shadow proposal, including unexecuted alternatives, and restrict outcome calibration to the action actually executed against its observed result. The prohibition on invented counterfactual revenue is kept.

### Manifest

The same 29 specification files listed in `20261004T211730Z-claude-doc02-completion.md`, plus this note. The earlier note's table said "30 files changed"; the correct count is 29 specification files, as Codex's receipt recorded. Existing notes are unchanged.

### Checks

- `git diff --stat -- docs/development`: 29 files, 1,109 insertions, 215 deletions.
- `git diff --check -- docs/development`: clean.
- Stale-wording search for "replaces most execution", "stop queued and active", "Both read adapters ship", "built and verified", "implemented boundary": no matches.
- Relative-link check: the three `README.md` links to Codex-owned coordination files resolve only in the canonical checkout, as before.
- No code, schema, configuration, or secret changed. No Git action taken.

### DOC-01 relay review

Verified in the canonical checkout:

- The three relayed notes and the research report are byte-identical to the worktree sources (`diff -q`).
- The Claude progress section in `shared-progress.md` is the exact text of `20261004T211730Z-claude-doc02-completion.md`; the Codex section is intact.
- The collaboration guide's relay procedure preserves author control: only the author decides content, the relay publishes without rewriting or accepting claims, the reviewer records verification separately, and a queued relay is not reported as published. One canonical tracker is preserved: worktree notes are an outgoing handoff folder, not a second live record.
- The canonical-script absolute-path instruction is correct; the helper resolves its root from the script location.
- The joint plan records Claude's ownership, the worktree workflow, and both research reports. Root `CLAUDE.md` points blocked sessions to the relay. The progress header separates author status from reviewer verification.

One optional suggestion, not a defect: relay step 4 depends on the active chat. A worktree note could also carry a `Relay request: yes` line (as this note does) so the request survives without the chat. No other finding. DOC-01 is acceptable to Claude.

### Unresolved owner decisions

Unchanged: accept or amend D-043 to D-049; approve D-044 before any provider-write implementation; confirm the first customer, offer, channel, outcome source, CMS need, and operating owner; approve the commercial package before milestone E.

Last processed peer note: `20261004T223300Z-codex-doc03-findings.md`.
