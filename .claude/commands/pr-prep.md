---
description: Prepare changes for pull request with build, lint, test, and PR description
argument-hint: "Brief description of changes - e.g., 'Added bottom sheet backdrop animation'"
---

## Feature Description

Changes: $ARGUMENTS

## Pre-Pull Request Checklist

### 1. Build Check

Run production build:

```bash
npm run build
```

Build must succeed with zero errors.

### 2. Linting

```bash
npm run lint
```

Report any errors or warnings.

### 3. Integration Tests

```bash
npm run test:integration
```

All 12 tests must pass.

### 4. Code Quality Scan

Search for and flag:

- [ ] `console.log` statements (use `lib/monitoring.ts` instead)
- [ ] `any` type usage (use `unknown` + type guards)
- [ ] Hardcoded hex colors or px values (use Tailwind tokens from `globals.css`)
- [ ] Commented-out code blocks
- [ ] `TODO` or `FIXME` that should be resolved
- [ ] Magic numbers (extract to named constants)
- [ ] English user-facing text (must be Spanish)
- [ ] Files exceeding 440 lines

### 5. Locked Files Check

Verify none of these were modified without explicit approval:

- `app/api/events/route.ts`
- `app/api/admin/**`
- `lib/attribution-tokens.ts`
- `lib/rate-limit.ts`
- `lib/supabase-admin.ts`
- `middleware.ts`

### 6. Documentation Sync

Check if any docs need updating:

- [ ] `CLAUDE.md` — if project structure, tokens, or patterns changed
- [ ] `FINAL_SPEC.md` — if API or schema changed
- [ ] `docs/TODO.md` — if tasks were completed or discovered

### 7. Git History

```bash
git log --oneline -10
```

Verify:
- [ ] Commits have clear conventional commit messages
- [ ] No accidental files (`.env`, `node_modules/`, `.next/`)

### 8. Generate PR Description

Based on the analysis, generate:

```markdown
## Summary

- {1-3 bullet points describing changes}

## Changes

- {List specific changes}

## Test Plan

- [ ] Build passes (`npm run build`)
- [ ] Integration tests pass (12/12)
- [ ] Manual testing on mobile viewport
- [ ] {Feature-specific test steps}

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### 9. PR Title

Follow conventional commits, ≤70 characters:
- `feat(recommendations): add swipe hint animation`
- `fix(registration): validate WhatsApp + prefix`

## Summary Report

### Ready for PR:
- List what's passing

### Needs Attention:
- List issues found

### Action Items:
1. Fix critical issues
2. Update docs if needed
3. Create PR
