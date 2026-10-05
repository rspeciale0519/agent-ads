@AGENTS.md

## Shared development memory

The canonical coordination checkout is `C:/Users/rob/Documents/Software/marketing/agent-ads`.

At session start, read these files there, even when this session runs in another worktree:

1. `AGENTS.md`
2. `docs/development/README.md`
3. `.Codex/plans/plan-joint-marketing-director-delivery.md`
4. `docs/development/delivery/shared-progress.md`
5. `docs/development/collaboration/README.md`
6. New messages under `docs/development/collaboration/notes/`

Use the shared helper to update the Claude progress section. Leave each note in a new file.
Follow task ownership and review rules before editing. A worktree copy of progress is not authoritative.
If this session blocks canonical writes, use the collaboration guide's relay procedure. Do not change hooks to bypass the restriction.
