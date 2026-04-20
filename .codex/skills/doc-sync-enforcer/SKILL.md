---
name: doc-sync-enforcer
description: Ensures documentation matches code when committing or pushing changes. Triggers on "commit", "push", "ready to commit".
---

# Documentation Sync Enforcer

Ensures code changes have corresponding documentation updates before committing.

## When This Activates

Auto-triggers when you:
- Say "commit", "push", or "ready to commit"
- Ask to create a commit message
- Request git operations

## What It Checks

### 1. API Route Changes
**Files:** `app/api/**/*.ts`

If API routes were modified:
- Check if `FINAL_SPEC.md` needs updating (it's the single source of truth)
- Check if `README.md` API documentation section needs updating
- Warn if a locked file was modified (see CLAUDE.md "Don't Touch" list)

### 2. Component Changes
**Files:** `app/components/**/*.tsx`, `app/r/**/components/**/*.tsx`

If components were added or significantly modified:
- Check if `CLAUDE.md` "Project Structure" section needs updating
- Check if component is listed in the reuse-enforcer skill's inventory

### 3. Design Token Changes
**Files:** `app/globals.css`

If design tokens were modified:
- Update `CLAUDE.md` "Design Tokens" table
- Update `.claude/rules/tailwind-tokens.md` token list
- Verify no hardcoded values were introduced

### 4. Hook/Utility Changes
**Files:** `app/**/hooks/*.ts`, `lib/**/*.ts`

If hooks or utilities were added:
- Update `CLAUDE.md` "Project Structure" section
- Update code-reuse-enforcer skill's hook/utility inventory

### 5. Test Changes
**Files:** `__tests__/**/*`

If tests were added or modified:
- Verify test count in `CLAUDE.md` and `README.md` is still accurate

## Decision Matrix

| Change Type | Doc Action |
|------------|-----------|
| Bug fix (behavior unchanged) | No doc update needed |
| Refactor (API unchanged) | No doc update needed |
| New component or hook | Update CLAUDE.md structure + reuse-enforcer inventory |
| Changed API route | Update FINAL_SPEC.md if schema/behavior changed |
| New design token | Update CLAUDE.md tokens table + tailwind-tokens rule |
| Deleted file or export | Search docs for stale references |
| New pending task discovered | Add to docs/TODO.md |
| Task completed | Move from docs/TODO.md to docs/DONE.md |

## Hara Documentation Files

| File | Update when... |
|------|---------------|
| `CLAUDE.md` | Project structure, tokens, patterns, or locked files change |
| `FINAL_SPEC.md` | Database schema, API specs, or core data flow changes |
| `PRODUCTION_READINESS.md` | Deployment requirements or checklist items change |
| `SELF_QA_RULES.md` | QA validation rules or test commands change |
| `KNOWN_ISSUES.md` | New bugs discovered or existing bugs resolved |
| `README.md` | Setup, commands, or architecture overview changes |
| `docs/TODO.md` | New tasks found or tasks completed |
| `docs/DONE.md` | Tasks completed |

## How It Works

When you're ready to commit:

1. Check staged/modified files
2. Categorize changes (API, component, token, hook, test)
3. Compare against documentation files
4. Report what docs need updating
5. Ask if you want to update before committing

**Non-blocking** — won't stop your commit, just reminds you.
