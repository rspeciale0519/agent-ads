# Codex and Claude collaboration

This directory lets Codex and Claude coordinate work without editing the same files at the same time.

The canonical checkout is `C:/Users/rob/Documents/Software/marketing/agent-ads`.
Use that checkout for progress and notes, including while product code is in separate worktrees.

## Start every session here

1. Read the canonical root `AGENTS.md` and `CLAUDE.md`.
2. Read [the development index](../README.md).
3. Read [the joint action plan](../../../.Codex/plans/plan-joint-marketing-director-delivery.md).
4. Read [shared progress](../delivery/shared-progress.md).
5. Read new files in [notes](notes/README.md).
6. Verify the task, permissions, dependencies, checkout, and file ownership.
7. Update your progress section before editing assigned files.

Document paths provide durable instructions across sessions. They do not rely on either model remembering the conversation.

## Ownership and changes

Each task has one builder and one reviewer. The action plan names both.

Only the assigned builder edits task files. The reviewer sends findings through a new note.

For shared files, request a transfer of ownership. Wait for the current writer to acknowledge the transfer.

Record exact files before implementation. Directory ownership is allowed only when its limits are clear and no other task owns those files.

Do not change another agent's active files or discard its edits. Keep unknown edits until their owner explains them.

The current documentation task assigns existing development specifications to Claude. Codex owns the new coordination files and root startup pointers.

## One shared progress document

Both agents update `docs/development/delivery/shared-progress.md` in the canonical checkout.

Use `scripts/collaboration/update-progress.mjs`. Do not edit agent sections directly once the helper is active.

The helper locks the update, reads the latest document, changes one agent section, and replaces the file atomically.
It preserves the other section and rejects reserved markers in submitted text.

The lock is cooperative. It protects users of the helper, not manual edits or malicious processes.

Prepare a short Markdown update in a new retained note file. Include the task, state, files, evidence, blocker, and next step.
Use a level-two heading for your progress section. Use level-three headings inside it.

Use the canonical script. From the canonical checkout, run:

```powershell
node scripts/collaboration/update-progress.mjs codex --input docs/development/collaboration/notes/UPDATE-FILE.md
```

Claude uses `claude` as the agent argument. Replace `UPDATE-FILE.md` with the actual note filename.

From another working directory, use the canonical script's absolute path:

```powershell
node C:/Users/rob/Documents/Software/marketing/agent-ads/scripts/collaboration/update-progress.mjs codex --input docs/development/collaboration/notes/UPDATE-FILE.md
```

The script resolves the input against its own repository root. The shell's working directory does not change that root.
Use the project's required Node.js version. Do not run a worktree copy of the helper.

If the lock is busy, do other independent work and retry later. Never bypass the lock with a direct edit.

A crashed writer can leave a lock. Confirm its process has ended before recovery.
Record the recovery reason in a new note. Move the stale lock to the session scratch directory; never steal a live lock.

The helper uses Node standard libraries only. It installs nothing and sends no network requests.

### Relay when a session blocks canonical writes

Some worktree sessions can read the canonical checkout but cannot write there.
Do not change hooks or permissions to bypass that restriction.

1. Write a new note in the worktree's `docs/development/collaboration/notes/` directory.
2. Identify the author, task, source path, and intended canonical filename.
3. State whether the note is the author's progress update for relay.
4. Give Codex the exact handoff path through the active chat, or mark the note `Relay request: yes`.
5. Codex copies the note unchanged into the canonical notes directory.
6. Codex verifies that the source and destination bytes match.
7. Codex runs the canonical helper with the author's agent name when the author requests progress publication.
8. Codex records the source, checksum, destination, helper result, and review status in a separate receipt.
9. The author reads the canonical record during the next active session.

Only the author decides the content of their progress section. A relay publishes that content without rewriting or accepting its claims.
The reviewer records verification separately in their own section.
If a destination note already exists, compare it before transfer. Never overwrite a different note with the same filename.

Worktree notes are an outgoing handoff folder. They are not a second live tracker or an independent source of coordination status.
The canonical document remains the single progress authority.
A blocked writer must not report a queued relay as published.
`Relay request: yes` asks for unchanged publication of the author's note during active coordination. It grants no broader permission.
The flag does not start a session. An active agent must discover the note or receive its path.

## Notes and acknowledgments

Write one new Markdown file per message. Never append to another agent's file.

Use this filename pattern:

```text
YYYYMMDDTHHMMSSZ-agent-task-subject.md
```

Add a unique suffix when the timestamp and subject already exist. Create files without overwriting an existing note.

Each message includes:

- sender and recipient;
- task ID and UTC time;
- type: assignment, question, finding, handoff, acknowledgment, decision, or completion;
- requested response and any dependency;
- changed files and exact checks, when applicable;
- the prior message filename when replying.

Use the [note template](note-template.md). Keep secrets and private customer data out of all notes.

A reply is a new file that names the original. The recipient records its last processed note in its progress section.

Silence does not mean acceptance. An unacknowledged interface change cannot become a dependency for another active task.

## Review and integration

1. Finish the assigned change and relevant checks.
2. Write a handoff note with files, results, limits, and recovery steps.
3. Set the task state to `review`.
4. Have the other agent inspect the actual change.
5. Record findings in a separate review note.
6. Fix required findings before setting the task to `verified`.
7. Let Codex verify integration dependencies before marking `integrated`.

An integration status does not grant Git or deployment permission. Existing approval rules still apply.

## Simultaneous operation and limits

The agents can work simultaneously on distinct files after shared contracts stabilize.
Only one helper update can write shared progress at a time. Notes use separate files, so they do not share an append operation.

Both agents read notes at session start, task boundaries, and before shared-interface work.
During long active tasks, check notes at least every ten minutes when tools permit.

An urgent browser message may alert the other active agent. Record the resulting decision in a note.

This setup does not create a background scheduler or wake an idle agent. Either agent must have an active session to act.

Do not create duplicate coordination systems in worktrees. A remote machine without this filesystem needs an explicitly agreed transport before joint work continues.
