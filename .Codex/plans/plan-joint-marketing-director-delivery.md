# Joint Marketing Director delivery plan

Date: 2026-10-04.
Status: task ownership accepted by Codex and Claude. Reviewed specifications are integrated into the canonical checkout.

The documentation and coordination process are ready. The ESLint plugin-resolution repair passed full lint, including the collaboration helper.
See the [repair evidence](../../docs/development/collaboration/notes/20261004T231012Z-codex-eslint-completion.md) for checks, peer review, and separate full-test limitations.
Rob accepted product decisions D-043–D-049 on 2026-10-04, including the explicit D-044 action-design amendment.
The [owner approval record](../../docs/development/collaboration/notes/20261004T232534Z-codex-owner-decisions-approved.md) preserves his statement and its scope.
Product implementation has not started. The pilot customer is selected; remaining scope fields need confirmation.
Live operations and protected actions need their separate authorization.

This plan assigns the build work to Codex and Claude. It defines dependencies, reviews, release evidence, and the shared work process.

Rob authorized this planning, documentation, and coordination task on 2026-10-04. This task does not start product implementation or approve external operations.

## Document locations

The canonical checkout is `C:/Users/rob/Documents/Software/marketing/agent-ads`.

| Purpose | Path from the canonical checkout |
|---|---|
| Product and technical specifications | `docs/development/README.md` |
| Build sequence and release gates | `docs/development/delivery/implementation-roadmap.md` |
| Decisions and approval status | `docs/development/governance/decision-register.md` |
| Work assignment and dependencies | `.Codex/plans/plan-joint-marketing-director-delivery.md` |
| Shared progress document | `docs/development/delivery/shared-progress.md` |
| Collaboration rules and commands | `docs/development/collaboration/README.md` |
| Agent notes and review receipts | `docs/development/collaboration/notes/` |
| Codex research report | `.Codex/plans/report-marketing-director-research-and-launch.md` |
| Claude research report, retained copy | `docs/temp/agentic-marketing-strategy-report-2026-10-04.md` |

Use the canonical progress and notes paths from every local worktree. Copies in other worktrees are not a second progress authority.

The development specifications control product behavior. This plan controls task ownership and sequence. The progress document records observed work status.

The research reports remain evidence. They do not override current decisions or grant implementation approval.

Claude accepted the task split in `20261004T205458Z-claude-doc02-acknowledgment.md`.
Its original report remains in `.claude/worktrees/agentic-marketing-strategy-252a73/docs/temp/`.
The retained canonical copy preserves the original bytes.

## Product outcome

Build a subscription product with assisted setup for nontechnical business owners. One Marketing Director coordinates bounded marketing specialists.

The application controls identity, permissions, budgets, approvals, execution, records, and recovery. Models propose work through typed contracts.

The first complete workflow covers one customer type, offer, ad channel, website, and outcome source.

Rob selected the first pilot customer and confirmed the website, current advertising channel, and use of a CRM.
Client-specific inputs remain in the Git-ignored private working directory `docs/temp/pilot-scope/` and excluded pilot input notes.
Advertising reports and confirmed business outcomes remain distinct. The CRM's outcome fields and mapping need verification.
The specific offer, buyer audience, budget, outcome definitions, and operating owner still need confirmation.

Milestone A confirms those choices. An approved CSV can supply outcomes when its limits and age remain visible.

The workflow is: prepare, approve, create paused objects, verify, activate, monitor, reconcile, and learn.

Draft content supports the same offer. CMS writes apply only when the chosen workflow uses that CMS.

Existing-campaign edits, budget changes, lead follow-up, and outcome uploads have separate readiness gates. Broad publishing and automatic execution remain expansion work.

The first paid pilot needs execution, billing, support, recovery, and cancellation controls. It does not require several existing customers or automatic campaign decisions.

## Roles

| Agent or person | Responsibility | Boundary |
|---|---|---|
| Codex | Integration lead; shared contracts; security; data storage; jobs; provider execution; billing; release verification | Reviews Claude work. Integration does not authorize commits, pushes, merges, or deployment. |
| Claude | Development specifications; customer context experience; Director experience; specialist behavior; marketing evaluations; learning review | Reviews Codex work. Uses agreed contracts and proposes shared-file changes through notes. |
| Rob | Product choices; customer access; budget and data permissions; commercial terms; release authorization | AI agreement cannot replace owner authorization. |

Each task has one builder and one reviewer. The reviewer reads the actual changes and records findings independently.

The builder fixes findings. Codex accepts integration only after the task evidence and dependencies pass.

## Current documentation assignment

| ID | Builder | Reviewer | Deliverable | Allowed files |
|---|---|---|---|---|
| DOC-01 | Codex | Claude | Joint plan, progress document, notes process, startup pointers, update helper | This plan; collaboration directory; shared progress; root `AGENTS.md` and `CLAUDE.md`; collaboration helper and tests |
| DOC-02 | Claude | Codex | Reconciled development specifications from the final agreed product plan | Existing `docs/development/` specifications, excluding the progress document and collaboration directory |
| DOC-03 | Codex | Claude | Cross-document consistency review and completion evidence | Review notes; own progress section; coordination corrections |
| DOC-04 | Claude | Codex | Record owner acceptance of D-043–D-049 and reconcile current status wording | Existing development specifications; Codex owns coordination records and integration |

DOC-02 must preserve historical decisions and release evidence. New scope is planned behavior, not completed implementation.

Rob accepted the D-044 amendment to D-037 on 2026-10-04. Each action still requires its own implementation and readiness evidence.
No checkbox becomes complete because the owner accepts a design.

Both agents must resolve conflicts between old scope and the new design explicitly. The amendment status must remain clear in each affected specification.

## Specific build assignments

These assignments prepare later implementation. All product build tasks start in `planned` state.

Proposed module names below describe file ownership. They are not claims that those modules already exist.

| ID | Milestone | Builder | Reviewer | Work and owned area | Dependencies | Acceptance evidence |
|---|---|---|---|---|---|---|
| A-01 | A | Claude | Codex | Pilot Scope Record, offer, metric contract, action inventory, price test, and owner questions | DOC-02 | Rob confirms selected customer, sources, definitions, constraints, and commercial hypothesis. |
| A-02 | A | Codex | Claude | Current code inventory and unresolved foundation, access, recovery, and operating gates | DOC-02 | Each claim has a source or evidence link. Unverified gates remain open. |
| B-01 | B | Codex | Claude | Shared context, task, proposal, execution, outcome, and learning contracts; schema ownership | A-01 draft, A-02 | Versioned schemas, states, tenant rules, failures, fixtures, and compatibility review pass. |
| B-02 | B | Claude | Codex | Business memory service and customer correction experience | B-01 | Confirmed and inferred facts remain distinct. Corrections persist with history and tenant isolation. |
| B-03 | B | Codex | Claude | Selected ad reporting, approved outcome import, freshness, deduplication, and reconciliation | A-01, B-01 | Realistic fixtures prove source identity, corrections, stale states, and outcome definitions. |
| B-04 | B | Codex | Claude | Durable jobs, attempts, leases, cancellation, recovery, limits, and tool gateway | B-01 | Restart, duplicate, timeout, revoked access, and cancellation checks pass. |
| B-05 | B | Claude | Codex | Runtime comparison using mocked tools and an application-owned reference loop | B-01, B-04 contract | Within two weeks, record containment, hosting, recovery, quality, cost, and tested provider combinations. |
| B-06 | B | Codex | Claude | Usage ledger, incomplete price handling, allowances, and cost controls | B-01, B-04 | Usage reconciles. Unknown costs remain unknown. Limits stop new work as specified. |
| C-01 | C | Claude | Codex | Director orchestration, briefing, evidence view, and ranked decision inbox | B-02, B-03, B-04, B-05 | Useful decisions have evidence. No required decision produces a clear quiet state. |
| C-02 | C | Claude | Codex | Paid-search specialist and draft content or creative support | B-01, B-02, B-05 | Bounded tasks produce valid proposals, claim provenance, predictions, and insufficient-evidence states. |
| C-03 | C | Codex | Claude | Approval service, execution gateway, create, verify, activate, pause, resume, and reconciliation | B-03, B-04, B-06; approved mutation scope | Exact package binding, step-up, stale approval, account drift, uncertain results, and kill switches pass. |
| C-04 | C | Claude | Codex | Campaign preview, package approval UI, status, and failure explanations | C-01, C-02, C-03 contract | A novice can understand the account, action, spend exposure, limits, and current execution result. |
| C-05 | C | Codex | Claude | Complete workflow integration and adversarial verification | C-03, C-04; relevant foundation gates | End-to-end evidence covers success, partial failure, retries, cancellation, access loss, and audit reconstruction. |
| D-01 | D | Claude | Codex | Prediction and outcome review, held-out evaluations, improvement proposals, and creative history | B-01, C-01, C-02 | One controlled improvement passes. A harmful candidate fails. Outcome maturity and uncertainty remain explicit. |
| D-02 | D | Codex | Claude | Version promotion, operator approval, regression barriers, isolation, and restoration | B-04, D-01 contract | A critical failure blocks promotion. Previous prompt or skill versions can be restored. Permissions never self-expand. |
| E-01 | E | Codex | Claude | One billing package, entitlement lifecycle, cancellation, export, and offboarding | B-06, C-05; approved commercial choices | Billing matches agreed terms. Cancellation prevents new work and handles pending or uncertain work explicitly. |
| E-02 | E | Claude | Codex | Assisted setup, customer guidance, capability limits, and support material | A-01, C-04, E-01 contract | A novice completes the chosen workflow. Support and correction burden are measured. |
| E-03 | E | Codex | Claude | Monitoring, named responders, restore evidence, support readiness, and release record | A-02, C-05, E-01, E-02 | Relevant release gates pass. Rob accepts remaining limits and authorizes deployment separately. |
| E-04 | E | Claude | Codex | Pilot learning and repeatability review with three to five similar customers | First paid pilot, D-01, E-03 | Report mature outcomes, owner time, operator time, quality, cost, incidents, and renewal evidence. |
| F-01 | F | Claude | Codex | Demand-based proposal for the next channel or action | E-04 | A specific customer need, benefit hypothesis, scope, and acceptance contract exist. |
| F-02 | F | Codex | Claude | Approved expansion connector and action infrastructure | F-01, separate action approval | Access, quality, execution, reconciliation, recovery, cost, and customer value pass. |

## Parallel work order

1. Complete DOC-01 and DOC-02 in separate files.
2. Review both document sets through DOC-03.
3. Prepare A-01 and A-02 after product implementation is authorized.
4. Freeze the first B-01 contracts before dependent implementation starts.
5. Run B-02 with B-03 and B-04 after file ownership is recorded.
6. Run B-05 against a stable mocked gateway while B-06 progresses.
7. Run C-01 and C-02 against fixtures while C-03 implements approved execution.
8. Integrate C-04 and C-05 before enabling a paid pilot.
9. Capture learning during B and C, then evaluate it through D.
10. Complete minimum E controls before charging for live operation.

Dependencies reference contracts where full implementation is unnecessary. A mocked dependency must remain labeled until integration proves the real path.

Schema, migrations, authorization, shared types, package manifests, lockfiles, and CI have one designated writer per task. Codex coordinates that ownership.

Claude requests shared-file changes through a note. Codex either makes the change or explicitly transfers ownership before editing starts.

## Worktree and integration rules

For this documentation task, Codex uses the canonical checkout. Claude edits specifications in its existing `agentic-marketing-strategy-252a73` worktree.

Claude's session blocks canonical writes. Codex reviews and transfers only declared file changes after checking both baselines.
Claude-authored progress and notes use the relay procedure in the collaboration guide.
Both agents read the canonical tracker and notes. The worktree handoff folder is not a separate live record.

Future product work uses isolated worktrees and separately authorized branches from `develop`. Worktree isolation does not replace shared contract coordination.

The integration lead must inspect current dirty changes and target revisions before any transfer. Do not copy an entire stale worktree over the canonical checkout.

Commits, pushes, pull requests, merges, production actions, purchases, and access changes keep their separate approval requirements.

## Marketing learning contract

Capture evidence, hypothesis, predicted range, cost exposure, stopping rule, and observation window before approval.

Record edits, rejection reasons, receipts, outcomes, and data corrections. Preserve creative ancestry and the versions used for each task.

Review errors and opportunities weekly during operation. Use approved business material and current primary platform evidence for new ideas.

Keep customer facts, preferences, hypotheses, skills, model routing, and permissions separate. Silence never approves a change.

Compare candidates against held-out cases and regression checks. Require operator approval before release.

A critical failure blocks promotion regardless of average scores. Restore a previous version when monitoring shows a material regression.

Shadow proposals do not prove unobserved revenue. Keep observed results, platform attribution, and causal evidence separate.

Shared learning across customers remains deferred. The agent cannot change its own permissions, deployment rules, or approval policy.

## Validation and release evidence

Each handoff records changed files, revision, environment, commands, results, limits, and recovery steps. The other agent records review findings separately.

Run the smallest relevant checks first. Follow `AGENTS.md` and the current CI workflow for broader required checks.

Rendered changes require browser verification. Security, database, and provider changes need their additional checks and approved target procedures.

Do not report local tests as target-environment proof. Existing F0, F1, provider, restore, owner, and observation gates remain open without evidence.

An action may be irreversible after delivery. Stopping future work cannot undo spent funds or sent messages.

## Planning allowance

The prior estimate allowed 12–17 engineering weeks for the first complete workflow and 20–29 weeks for broader launch readiness.

Those ranges assumed one engineer and part-time marketing support. Two AI agents do not automatically halve the schedule.

Re-estimate after A and the runtime comparison. Access approvals, review capacity, customer data, and outcome maturity control the practical date.

## Open owner decisions

- Confirm the specific offer, booking definitions and outcome mapping, budget, CMS need, and operating owner. Customer, website, and channel are selected.
- Confirm the selected action inventory and satisfy each action's readiness gate before live use. D-044 design approval is recorded.
- Approve the commercial package and any required production dependency.
- Authorize each protected Git, environment, data, spending, and release action when its concrete result is ready.

These decisions do not block completion of the current documentation and coordination task.
