---
name: tooling-registry
description: Map Hará Match's Codex commands, including start-session/end-session, audits, bug hunts, feature starts, PR prep, and test scaffolding, so they trigger automatically from chat requests.
---

# Hará Codex Tooling Registry

Use this skill whenever a request matches any of the command phrases below or when a plan is required. It links natural-language triggers to the scripts/command docs we added under `.codex/` so Codex can respond like Claude.

Session workflows are part of the primary trigger surface. If the user asks to start or end a session, run those workflows before falling back to a generic repo bootstrap.

## Command Triggers → Actions

| Trigger phrases | Action |
|-----------------|--------|
| `/start-session`, "start session", "run start-session" | Follow `.codex/commands/start-session/COMMAND.md`: read the active plan (default `.claude/plans/main.md`), run `node scripts/codex/git-session-summary.mjs "2 days ago"`, then brief context + next steps + blockers. |
| `/end-session`, "end session", "run end-session" | Follow `.codex/commands/end-session/COMMAND.md`: run `node scripts/codex/git-session-summary.mjs "today 00:00"`, append the new `### Session — YYYY-MM-DD` block to the active plan, and report carryover items. |
| `/audit`, "run audit on <path>", "complexity report" | Run `node scripts/codex/audit.mjs <path>`; include Markdown report from `.codex/commands/audit/COMMAND.md`. |
| `/bug-hunt`, "find bugs in <component>" | Follow `.codex/commands/bug-hunt/COMMAND.md` checklist, covering React/TS/Supabase patterns. |
| `/feature-start`, "kick off feature", "plan feature" | Run through `.codex/commands/feature-start/COMMAND.md` (analysis, reuse check, checklist). |
| `/pr-prep`, "prepare PR" | Execute `node scripts/codex/pr-prep.mjs` (build/lint/test + scans) and finish the manual checklist. |
| `/test-create`, "add tests for <file>" | Use `.codex/commands/test-create/COMMAND.md` templates for components/hooks/utils/API routes. |

When a trigger is detected, explicitly mention which command is running and summarize the results/output.

## Planning Workflow

- Default planning skill remains `step-by-step-execution`. Always save plans under `docs/plans/` with descriptive filenames (e.g., `docs/plans/feature-name.md`).
- Plan file template:
  ```markdown
  ## Execution Plan
  **Goal:** ...
  **Steps:**
  1. ...
     - Action: ...
     - Test: ...
  ```
- After each significant change, update the plan (using `update_plan` in Codex CLI) so context stays current.

## How to Use
1. Detect whether the user’s request matches a trigger phrase or requires planning.
2. Load the corresponding command instructions and run the script if one exists.
3. Share outputs (audit table, scan findings, plan summary, etc.) back to the user.
4. When multiple commands are requested, execute them sequentially, reporting after each.
