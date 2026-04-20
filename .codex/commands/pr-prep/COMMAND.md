---
name: pr-prep
description: Prepare a change-set for pull request with build, lint, tests, and summary
author: hara
arguments:
  - name: summary
    description: Brief description of the changes (e.g., "Added bottom sheet backdrop animation")
---

# PR Prep Command

Use this checklist before opening a PR. For deterministic steps, run the associated scripts or npm tasks directly.

## Quick Run (Deterministic Script)
```bash
node scripts/codex/pr-prep.mjs
# set SKIP_PR_PREP_STEPS=true to skip build/lint/test (not recommended)
```
The script runs build → lint → integration tests (unless skipped) and then performs the code-quality scans described below, exiting non-zero if anything fails.

## Manual Checklist (if running steps individually)
1. **Build** — `npm run build`
2. **Lint** — `npm run lint`
3. **Integration Tests** — `npm run test:integration`

## 4. Code Quality Scan
Search for:
- `console.log` (use `lib/monitoring.ts`)
- `any` usage without guards
- Hardcoded hex colors or px values
- Commented-out blocks, TODO/FIXME to resolve
- Magic numbers → constants
- English copy → Spanish
- Files over 440 lines

## 5. Locked Files
Ensure none of the protected files were modified (`app/api/events/route.ts`, `app/api/admin/**`, `lib/attribution-tokens.ts`, `lib/rate-limit.ts`, `lib/supabase-admin.ts`, `middleware.ts`).

## 6. Documentation Sync
Update `CLAUDE.md`, `FINAL_SPEC.md`, `docs/TODO.md` if scope changed.

## 7. Git History
```bash
git log --oneline -10
```
Confirm conventional commits, no accidental files.

## 8. Generate PR Description
```
## Summary
- key bullets

## Changes
- details

## Test Plan
- [ ] Build passes
- [ ] Integration tests pass (12/12)
- [ ] Manual mobile test
- [ ] Feature-specific steps

🤖 Generated with Codex CLI tooling
```

## 9. PR Title
Follow `<type>(scope): subject`, ≤70 chars.
