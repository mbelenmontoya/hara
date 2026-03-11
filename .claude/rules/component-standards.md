---
description: Component size limits, extraction patterns, Spanish copy, and UI conventions
globs: app/**/*.tsx
---

# Component Standards

## File Size Thresholds

| Lines | Status | Action |
|-------|--------|--------|
| ≤ 300 | ✅ Good | Target for all components |
| 300–440 | ⚠️ Acceptable | Flag extraction opportunities |
| 440–600 | 🟡 Warning | Suggest hooks, sub-components |
| > 600 | 🔴 Must refactor | Stop and propose extraction plan before continuing |

**Function/hook limit:** ≤ 50 lines each.

## Extraction Patterns

When a file needs splitting, follow the patterns established in `app/r/[tracking_code]/`:

- **`hooks/`** — `use<Name>.ts` for extracted logic (data fetching, gestures, animations)
- **`components/`** — Sub-components by purpose (BottomSheet, CardSkeleton, BackgroundPicker)
- **Named constants** — Extract all magic numbers to constants at top of file with comments

```typescript
// ✅ Constants grouped by category
const CARD_SPACING_PERCENT = 88;    // Card peek effect
const CARD_HEIGHT_VH = 70;          // Maximum card height
const SHEET_ANIMATION_MS = 250;     // Bottom sheet timing
const EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
```

## Before Writing Any Component

**USE → IMPROVE → ADD:**

1. **USE** — Check these locations for existing solutions:
   - `app/components/ui/` — Alert, Badge, Button, Card, EmptyState, Input, Modal, Table
   - `app/components/` — ContactButton, PlacesAutocomplete, PublicLayout, AdminLayout
   - `app/r/[tracking_code]/components/` — BottomSheet, CardSkeleton, BackgroundPicker
   - `app/r/[tracking_code]/hooks/` — useRecommendations, useSwipeGesture, useRevealTransition, useMediaQuery
2. **IMPROVE** — If existing component is 80%+ there, extend it with optional props
3. **ADD** — Only create new if nothing exists

## Spanish Copy

All user-facing text must be in Spanish (Argentine informal):

```tsx
// ❌ WRONG
<h1>Your recommendations are ready</h1>
<button>Contact via WhatsApp</button>

// ✅ Correct
<h1>Tus 3 opciones están listas</h1>
<button>Contactar por WhatsApp</button>
```

**Conventions:**
- Use "vos" not "tú" (Argentine)
- Informal tone: "querés", "escribís", "podés"
- Privacy messaging: "Tu info se comparte recién cuando vos escribís"

## Error Logging

```typescript
// ❌ WRONG
console.log('data loaded:', data);
console.error('Failed:', error);

// ✅ Correct — use monitoring.ts
import { logError } from '@/lib/monitoring';
logError('Failed to load recommendations', error);
```

`console.error` is acceptable in catch blocks. `console.log` / `console.warn` / `console.info` are not — use `lib/monitoring.ts`.

## Accessibility Basics

- Add `role` and `aria-*` attributes to interactive regions
- Use `aria-modal="true"` and `aria-labelledby` on modals/sheets
- Add `aria-label` to icon-only buttons
- Use semantic HTML (`<button>` not `<div onClick>`)

## Component File Template

```tsx
// Brief description of what this component does
// One line explaining its role in the feature

'use client'

import { useState } from 'react'

// Named constants
const ANIMATION_MS = 250;

// Types
interface Props {
  // ...
}

/**
 * Brief JSDoc description
 */
export function ComponentName({ ...props }: Props) {
  // ...
}
```
