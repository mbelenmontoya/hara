---
description: Systematically hunt for bugs in a component or feature
argument-hint: "Component or feature to investigate - e.g., 'BottomSheet', 'card swipe', 'registration form'"
---

## Investigation Target

Target: $ARGUMENTS

Identify what to investigate:
1. Specific component or feature
2. Related files and dependencies
3. Common bug patterns to check

## Systematic Bug Investigation

### 1. React / Next.js Bug Patterns

#### State & Effect Issues

- [ ] **Stale closures** in event handlers or setTimeout callbacks
- [ ] **Missing cleanup** in useEffect (event listeners, timers, subscriptions)
- [ ] **Missing dependencies** in useEffect/useCallback/useMemo arrays
- [ ] **State updates after unmount** in async operations
- [ ] **Infinite re-render loops** from state updates in effects

```tsx
// ❌ Bug: Missing cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // No cleanup!
}, []);

// ✅ Fix
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

#### Props & Component Issues

- [ ] Missing key prop on list items
- [ ] Mutating props directly
- [ ] Missing error boundaries around risky components
- [ ] Hydration mismatches (client vs server rendering)

### 2. TypeScript Type Safety

- [ ] `any` type usage
- [ ] Type assertions without validation (`as Type`)
- [ ] Missing null checks on optional values
- [ ] Unsafe array access without bounds checking

### 3. Async & Network Bugs

- [ ] Race conditions in data fetching
- [ ] Missing loading states
- [ ] Missing error handling in fetch/API calls
- [ ] Unhandled promise rejections
- [ ] Network failures not handled gracefully

### 4. Supabase & Data Layer

- [ ] Missing error checks on Supabase responses
- [ ] Queries without proper filters (returning too much data)
- [ ] Missing `.single()` when expecting one row
- [ ] Service role client used where anon would suffice (or vice versa)

### 5. UI / UX Bugs

- [ ] Missing ARIA labels on interactive elements
- [ ] Keyboard navigation broken (tab order, enter/escape)
- [ ] Touch targets too small (< 44px)
- [ ] Overflow issues on small screens
- [ ] Z-index conflicts
- [ ] Missing loading/empty/error states
- [ ] Animations not respecting `prefers-reduced-motion`

### 6. Mobile-Specific Bugs

- [ ] Touch event conflicts with scroll
- [ ] Viewport issues (100vh vs dvh)
- [ ] Tap delay on iOS
- [ ] Safe area insets not handled
- [ ] Landscape orientation issues

### 7. Event Handling

- [ ] Event bubbling issues (missing `e.stopPropagation()`)
- [ ] Multiple handlers firing unexpectedly
- [ ] Missing `preventDefault()` on form submissions

## Bug Report

### Critical Bugs

1. **[Type]**: {Description}
   - Location: `{file}:{line}`
   - Impact: {How it affects users}
   - Fix: {Suggested solution}

### Moderate Issues

1. **[Type]**: {Description}
   - Severity: Medium
   - Affected areas: {Components}

### Code Smells

1. **[Pattern]**: {Description}
   - Risk: Low
   - Recommendation: {Improvement}

### Summary

```
Files analyzed: {count}
Critical bugs: {count}
Moderate issues: {count}
Code smells: {count}
```

### Fix Priority

1. **Immediate** — Breaking functionality
2. **High** — User-facing issues
3. **Medium** — Developer experience
4. **Low** — Nice to have
