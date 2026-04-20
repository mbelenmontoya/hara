---
name: start-session
description: Load the active Hará plan, summarize recent work, and identify the next steps before coding.
author: hara
arguments:
  - name: plan
    description: Optional plan filename (defaults to `.claude/plans/main.md`)
---

# Start Session Command

Use this at the beginning of every Codex session to sync with the existing plan and surface the next steps.

Codex does not auto-register this file as a literal slash command. The `tooling-registry` skill is responsible for detecting `/start-session`, `start session`, and `run start-session`, then executing this workflow.

## Steps

1. **Locate the plan**
   - Default: `.claude/plans/main.md`
   - If another plan is referenced (e.g., `docs/plans/*.md`), open that file too.

2. **Scan key sections**
   - `## Overview` and `## Success Criteria` for context
   - `## Next Steps` to know what remains
   - Latest entry under `## Session Log` to see what happened last time
   - `## Open Questions` or other notes if they impact today’s work

3. **Check git state**
   ```bash
   node scripts/codex/git-session-summary.mjs "2 days ago"
   ```
   - Shows working tree status, commits since the chosen date, committed diff stats across that window, plus any staged/unstaged diff stats in the current tree.

4. **Report back to the user**
   - Brief summary (2‑3 bullets) of last session’s accomplishments
   - Highlight the top 1‑3 next steps from the plan
   - Mention any deviations, blockers, or open questions
   - If the plan needs updating before continuing (e.g., tasks completed but not reflected), note that explicitly

5. **Planning reminder**
   - If new work is significant, use the `step-by-step-execution` skill and create/update a plan file in `docs/plans/`
   - Keep `update_plan` in sync as you progress

## Output Template

```
**Context**
- Summary of last session

**Next Steps**
- Item 1
- Item 2

**Notes**
- Blockers/questions if any
```
