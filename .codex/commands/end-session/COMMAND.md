---
name: end-session
description: Wrap up the day by summarizing work, capturing git history, and updating the active plan file.
author: hara
arguments:
  - name: plan
    description: Optional plan filename (defaults to `.claude/plans/main.md`)
---

# End Session Command

Run this before logging off so future sessions (Claude or Codex) have a consistent record.

Codex does not auto-register this file as a literal slash command. The `tooling-registry` skill is responsible for detecting `/end-session`, `end session`, and `run end-session`, then executing this workflow.

## Steps

1. **Capture git activity**
   ```bash
   node scripts/codex/git-session-summary.mjs "today 00:00"
   ```
   - Review git status, commits, committed diff stats for today’s work, and any staged/unstaged carryover.
   - Note any staged but uncommitted changes or failing tasks.

2. **Summarize accomplishments**
   Answer:
   - What features/fixes/tests landed?
   - Any refactors or tooling updates?
   - Did you deviate from the plan? Why?

3. **Update the plan file** (default `.claude/plans/main.md`)
   Append a new block under `## Session Log` using:
   ```markdown
   ### Session — YYYY-MM-DD
   **Completed:**
   - ...
   - ...

   **Deviations:**
   - ... (or `None`)

   **Next Steps:**
   - ...
   ```
   - If major roadmap items finished, update `## Next Steps`, `## Success Criteria`, or `## Open Questions`.

4. **Call out follow-ups**
   - Mention tests that still need to run, PRs to open, or reviews pending.
   - Flag any blockers or questions for the next session.

5. **Share the recap**
   - In the Codex reply, include the high-level summary and note that the plan file was updated.

## Tips
- Use `git diff --stat` and `git log --patch` for detail when writing the summary.
- Keep the plan log concise but informative so start-session can brief the next developer quickly.
