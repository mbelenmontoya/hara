---
name: bug-hunt
description: Systematically hunt for bugs in a component or feature
author: hara
arguments:
  - name: target
    description: Component or feature to investigate (e.g., "BottomSheet", "card swipe")
---

# Bug Hunt Command

Follow this structured checklist whenever you need to audit a component or feature for issues.

## Investigation Target

Target: `$ARGUMENTS`

Clarify:
1. Which component/feature is under review
2. Related files and dependencies
3. Known bug patterns to check first

## React / Next.js Patterns
- Stale closures, missing cleanup, missing dependencies in hooks
- Async state updates after unmount, infinite loops
- Missing keys, mutating props, hydration mismatches

## TypeScript Safety
- `any`, unsafe assertions, missing null checks, unchecked array bounds

## Async & Data Flow
- Race conditions, missing loading/error states, unhandled rejections
- Supabase: check errors, filters, `.single()`, right client (anon vs service role)

## UI / UX / Mobile
- ARIA labels, keyboard nav, touch targets, overflow, z-index, safe areas, orientation

## Event Handling
- Bubbling issues, duplicate handlers, missing `preventDefault`

## Reporting Template

```
### Critical Bugs
1. **[Type]**: description
   - Location: file:line
   - Impact
   - Fix proposal

### Moderate Issues
...

### Code Smells
...

### Summary
- Files analyzed: N
- Critical: N, Moderate: N, Smells: N
```
