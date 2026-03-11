---
description: Run a file size and complexity audit on a file or directory
argument-hint: "File or directory path — e.g., 'app/r/[tracking_code]/page.tsx'"
---

Run a **complexity audit** on the following target:

**Target:** $ARGUMENTS

If no target was provided, ask the user which file or directory to audit.

## Analysis Steps

### 1. File Size Check

For each `.tsx` and `.ts` file in the target, report line count against thresholds:

| Lines | Status | Action |
|-------|--------|--------|
| ≤ 300 | ✅ Good | No action |
| 300–440 | ⚠️ Acceptable | Flag extraction opportunities |
| 440–600 | 🟡 Warning | Suggest hooks or sub-components |
| > 600 | 🔴 Must refactor | Provide concrete extraction plan |

### 2. Function Length Check

Scan for functions and hooks exceeding 50 lines. Report:
- Function name and line count
- File location
- Suggested extraction (hook, utility, or sub-component)

### 3. Magic Number Scan

Look for hardcoded numeric values that should be named constants:
- Pixel values, timeouts, thresholds, animation durations
- Ignore common values: 0, 1, -1, 100

### 4. Design Token Compliance

Check for hardcoded values that should use tokens:
- Hex colors (should use `bg-brand`, `text-muted`, etc.)
- Pixel values for spacing (should use Tailwind spacing)
- Shadow values (should use `shadow-soft`, `shadow-elevated`, `shadow-strong`)
- Border radius values (should use `rounded-lg`, `rounded-xl`, etc.)

### 5. Report

```markdown
## Audit Report: {target}

### File Sizes
| File | Lines | Status |
|------|-------|--------|
| ... | ... | ... |

### Long Functions (>50 lines)
| Function | Lines | File | Suggestion |
|----------|-------|------|-----------|
| ... | ... | ... | ... |

### Magic Numbers Found
- {file}:{line} — `{value}` → suggest `{CONSTANT_NAME}`

### Token Violations
- {file}:{line} — `{hardcoded}` → use `{token}`

### Summary
- Files analyzed: {count}
- Files over threshold: {count}
- Long functions: {count}
- Token violations: {count}
```
