# Development document assignment

- Sender: Codex.
- Recipient: Claude.
- Task: DOC-02, with DOC-01 review.
- UTC time: 2026-10-04T20:02:32Z.
- Type: assignment.
- Reply to: none.

## Authorized work

Rob authorized the task split, development-document rewrite, persistent document pointers, shared progress, and shared notes in Codex on 2026-10-04.

The current task covers documentation and coordination. It does not authorize product implementation, Git changes, deployment, purchases, or provider writes.

Read the canonical root `AGENTS.md` first. Then read `.Codex/plans/plan-joint-marketing-director-delivery.md` and `docs/development/collaboration/README.md`.

The canonical checkout is `C:/Users/rob/Documents/Software/marketing/agent-ads`.
The existing Claude checkout is `.claude/worktrees/agentic-marketing-strategy-252a73` inside it.

## Requested agreement

Confirm the assigned builders and reviewers in the joint plan. Propose any specific ownership correction before changing those assignments.

Codex leads integration, shared contracts, storage, security, durable execution, provider executors, billing, and release verification.
Claude leads specifications, business-memory experience, Director experience, specialist logic, marketing evaluations, and learning review.

Both agents review the other's work. Each task has one writer for each affected file.

## Your document assignment

Rewrite the current `docs/development/` specifications to reflect the final agreement in the Claude conversation.
Exclude `delivery/shared-progress.md` and `collaboration/` from direct edits. Codex owns their setup.

Preserve historical decisions, stable requirement IDs, completed evidence, unresolved gates, and runbook facts.
Add explicit amendments where necessary. Keep the broader D-037 mutation amendment proposed until Rob approves it separately.

Reconcile these points across the document set:

- One selected customer type, offer, paid channel, website, and outcome source.
- Expert-led services and Google Ads as a starting hypothesis, confirmed in milestone A.
- Approved CSV outcomes without a forced CRM migration or invented stage history.
- A Director, bounded paid-search specialist, and draft content or creative support.
- Ranked decisions or a clear statement that no decision needs attention.
- A complete approved campaign package through creation, verification, activation, monitoring, and reconciliation.
- Separate definitions for pause, resume, budget decrease, and budget increase.
- Current account checks before every activation, with exact package and approval binding.
- Separate readiness gates for campaign edits, follow-up, conversion uploads, and optional integrations.
- Current official read APIs, quota-aware imports, source freshness, and canonical measurement records.
- Application-owned authority and a two-week runtime comparison before framework selection.
- Learning capture from the first task, followed by controlled review, evaluation, promotion, and restoration.
- Separate confirmed facts, preferences, hypotheses, skills, routing, and permissions.
- No approval by silence, automatic permission expansion, or hypothetical shadow revenue claims.
- Separate first paid pilot and later repeatability evidence from three to five customers.
- Reuse valid foundation evidence without closing unfinished target or recovery gates.

Update the relevant product, architecture, capability, quality, delivery, governance, and traceability documents.
Do not replace detailed operational safeguards with a short strategy summary.

## Shared progress and notes

Use `docs/development/delivery/shared-progress.md` in the canonical checkout.
Create a new note with a level-two Claude progress heading and level-three subheadings.
Use the update helper to publish only your section:

```powershell
node scripts/collaboration/update-progress.mjs claude --input docs/development/collaboration/notes/YOUR-NOTE.md
```

Run from the canonical checkout with Node 22. The installed Node 22 path is `C:/Users/rob/AppData/Local/nvm/v22.22.2/node.exe`.

Review the helper and collaboration guide. Record any defect in a separate note.
Do not directly edit the progress document or another agent's notes.

## Handoff evidence

Confirm your actual checkout and ability to write the canonical documents before editing.
If that write is unavailable, edit your own worktree and provide a precise changed-file manifest.

After the rewrite, provide the manifest, checks, remaining disagreements, and unresolved owner decisions.
Update your progress through the helper. Codex will review the actual changes before completing DOC-03.

## Communication state

The browser stored this assignment earlier, but no Claude response was visible at this note's creation.
The remote-control link reported disconnection. The local Claude process may still be active.

This note provides the same bounded assignment when the connection resumes. Do not repeat edits that already completed.
