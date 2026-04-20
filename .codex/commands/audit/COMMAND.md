---
name: audit
description: Run a file size and complexity audit on a file or directory
author: hara
arguments:
  - name: target
    description: File or directory path to audit (e.g., app/r/[tracking_code]/page.tsx)
---

# Audit Command

Use this command to produce the same complexity report defined in `.claude/commands/audit.md`, now runnable directly inside Codex CLI.

## How to Run

```bash
node scripts/codex/audit.mjs <target>
# example
node scripts/codex/audit.mjs app/r/[tracking_code]/page.tsx
```

The script scans `.ts` and `.tsx` files (excluding tests) and prints:
- File size table with status tiers (≤300 good, 300–440 acceptable, 440–600 warning, >600 must refactor)
- Functions exceeding 50 lines (naive brace matching)
- Magic numbers (anything not 0,1,-1,100)
- Token violations (hex colors, `px` spacing)

## Manual Checklist

If more context is needed beyond the script output, follow the original workflow:

1. **File Size Check** – Confirm high-line files need extraction.
2. **Function Length Check** – Plan hooks/components/utilities for >50 line functions.
3. **Magic Number Scan** – Replace hardcoded values with named constants.
4. **Design Token Compliance** – Use Tailwind tokens for color/spacing/shadows.
5. **Report Back** – Share the Markdown table with findings and recommended actions.
