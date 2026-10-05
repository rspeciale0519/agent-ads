## Claude progress

- Sender: Claude.
- Recipient: Codex and Rob.
- Task: DOC-02 (builder).
- UTC time: 2026-10-04T21:17:30Z.
- Type: completion (handoff for DOC-03 review).
- Reply to: `20261004T200232Z-codex-doc02-assignment.md`.

### Result

The `docs/development/` specifications in the Claude worktree now reflect the final agreement. All changes are uncommitted in worktree `.claude/worktrees/agentic-marketing-strategy-252a73` on branch `cc/agentic-marketing-strategy-252a73` (base HEAD `4358fdf`). The canonical checkout is untouched.

| Task | State | Evidence or result | Next step |
|---|---|---|---|
| DOC-02 | review | 30 files changed under `docs/development/`; manifest below | Codex reviews the actual diff (DOC-03) |
| DOC-01 review | review | Findings in `20261004T211730Z-claude-doc01-review.md` | Codex resolves or accepts |
| Product build | planned | No product task is active | Wait for authorization |

### What changed

- `governance/decision-register.md`: amendment notes on D-026, D-032, D-033, D-036, D-037; new proposed decisions D-043 (Marketing Director direction and first complete workflow), D-044 (supervised acquisition workflow and separate action definitions; the D-037 amendment, pending Rob's explicit approval), D-045 (official read APIs and canonical data layer), D-046 (runtime prototype), D-047 (learning contract), D-048 (autonomy levels L0–L3), D-049 (pilot sequencing and planning allowance). All seven are `proposed`. No historical decision was deleted or reworded.
- `product/product-requirements.md`: new families DIR-001–010, ACT-001–012, LRN-001–012; new ONB-017–020, PAID-015–020, AGT-011–012, APR-013–016, DAT-013–014; AIR-011 amended with the original rule preserved; release criteria extended. Existing IDs unchanged.
- `README.md`: product definition rewritten; new "Agreed design versus implemented behavior" section; coordination links; reading order.
- `product/product-brief.md`, `product/ux-and-information-architecture.md`, `product/personas-and-user-journeys.md`, `product/client-onboarding-form.md`: Director promise, business-type playbooks, daily briefing rule, campaign package artifact and states, decision inbox, L0–L3 table, new journey 2b.
- `architecture/*`: implemented-behavior boundary refreshed in system architecture (as of `4358fdf`); target loop diagram; write path under D-044; new state machines; Director and specialist role table, task contract, runtime prototype criteria, operating loops; proposed records (BusinessFactVersion, CampaignPackageVersion, PackageVerification, BudgetReservation, TaskContract, LearningRecord, SkillCandidate, CreativeLineage) marked proposed and Codex-owned under B-01; proposed routes, events, tools, action types, and prediction field; capability keys split into separate actions; cloud hosting and Hermes status notes; stale OpenAI defaults reconciled to D-039/D-041.
- `capabilities/*`: paid advertising gains the fifteen-step acquisition workflow, action definition table, approval binding and activation rules, outcome uploads, platform-automation note, and readiness gates; AI Reach gains implemented-behavior note, stage 2b, and ranked-decision wording; measurement gains predictions before approval, learning record, creative history, improvement cycle, improvement metrics, and layer promotion authority; creative pipeline gains draft mode and batch-size rules; capability matrix row for Google Ads.
- `quality/*`: acquisition workflow tests, marketing evaluation library (16 cases), promotion controls, runtime prototype evidence, L2/L3 rules; security risk classes per action, approval binding, budget reservation, four new threat rows; deployment and observability wording.
- `delivery/*`: milestone overlay A–F with gate mapping, planning ranges, and assumptions; P2 and P3 wording under D-043/D-044; workstreams; work package 8a; pilot stages; pilot scorecard; first paid pilot versus repeatability; risk register R-047–R-054; phase-0 workbook rows and checklist items. Existing evidence checkboxes unchanged.
- `governance/open-questions.md`: owner decisions section; model-provider and runtime questions; 2026-09-29/30 amendments; proposed 2026-10-04 items. `governance/requirements-traceability.md`: three new requirement rows and nine new evidence IDs, all `not started` or `blocked`.

### Manifest (worktree paths, all modified unless marked new)

```text
docs/development/README.md
docs/development/architecture/agent-orchestration-architecture.md
docs/development/architecture/api-event-and-tool-contracts.md
docs/development/architecture/cloud-hosting-and-service-delivery.md
docs/development/architecture/domain-data-model.md
docs/development/architecture/hermes-multi-agent-architecture.md
docs/development/architecture/platform-integration-architecture.md
docs/development/architecture/system-architecture.md
docs/development/capabilities/ai-reach.md
docs/development/capabilities/creative-and-content-pipeline.md
docs/development/capabilities/measurement-attribution-and-experimentation.md
docs/development/capabilities/paid-advertising.md
docs/development/capabilities/platform-capability-matrix.md
docs/development/delivery/implementation-roadmap.md
docs/development/delivery/phase-0-readiness-workbook.md
docs/development/delivery/pilot-onboarding-and-launch.md
docs/development/delivery/risk-register.md
docs/development/governance/decision-register.md
docs/development/governance/open-questions.md
docs/development/governance/requirements-traceability.md
docs/development/product/client-onboarding-form.md
docs/development/product/personas-and-user-journeys.md
docs/development/product/product-brief.md
docs/development/product/product-requirements.md
docs/development/product/ux-and-information-architecture.md
docs/development/quality/deployment-environments-and-operations.md
docs/development/quality/observability-and-incident-response.md
docs/development/quality/security-privacy-compliance-and-autonomy.md
docs/development/quality/testing-and-agent-evaluation.md
docs/development/collaboration/notes/20261004T205458Z-claude-doc02-acknowledgment.md   (new)
docs/development/collaboration/notes/20261004T211730Z-claude-doc02-completion.md       (new)
docs/development/collaboration/notes/20261004T211730Z-claude-doc01-review.md           (new)
```

Not changed: `quality/account-connections-operations.md`, `quality/account-connections-security-runbook.md`, `delivery/vercel-supabase-resend-deployment.md`, `architecture/account-connections-provider-review.md`, `capabilities/organic-publishing.md`, `product/opportunity-and-experiment-policy.md`, `delivery/shared-progress.md`, `collaboration/README.md`, `collaboration/note-template.md`.

### Checks

- `git diff --stat -- docs/development`: 28 specification files, 1,047 insertions, 192 deletions before the last five small edits.
- Search for stale wording: remaining matches of "exactly three" and "OpenAI remains" are inside historical decision text (D-026, D-030, D-033, D-036 originals) and the 2026-08-07 resolved list in open-questions, each now followed by an amendment note.
- Relative-link check on changed files: three links from `README.md` point to Codex-owned files that exist only in the canonical checkout (`.Codex/plans/plan-joint-marketing-director-delivery.md`, `delivery/shared-progress.md`, `collaboration/README.md`). They resolve after transfer.
- No code, schema, configuration, or secret changed. `pnpm` checks are not applicable to Markdown-only changes and were not run. No Git action was taken.

### Transfer instructions

Copy the manifest files from the worktree to the canonical checkout, or apply `git diff -- docs/development` from the worktree. Do not copy the worktree's `AGENTS.md`, `CLAUDE.md`, or `docs/temp/` report unless wanted. Then copy the three notes into the canonical notes directory and run the helper for Claude:

```text
node scripts/collaboration/update-progress.mjs claude --input docs/development/collaboration/notes/20261004T211730Z-claude-doc02-completion.md
```

### Remaining disagreements

None between Codex and Claude.

### Unresolved owner decisions

- Accept, amend, or reject D-043 to D-049.
- Approve D-044 explicitly before any provider-write implementation beyond D-037.
- Confirm the first customer, offer, channel, outcome source, CMS need, and operating owner (milestone A).
- Approve the commercial package and any production dependency before milestone E.

Last processed peer note: `20261004T203820Z-codex-doc02-retry.md`.
