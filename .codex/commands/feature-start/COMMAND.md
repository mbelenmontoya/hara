---
name: feature-start
description: Begin implementing a new feature with analysis, planning, and reuse checks
author: hara
arguments:
  - name: request
    description: Feature name/description (e.g., "email confirmation on registration")
---

# Feature Start Command

Run this workflow before shipping a new feature.

## Feature Analysis
- **Purpose** – what problem does it solve?
- **User impact** – who uses it and how?
- **Scope** – small addition vs major feature
- **Integration points** – API, DB, UI dependencies

## Reuse Check (USE → IMPROVE → ADD)
Search existing assets before building new ones:

| Location | Look for |
|----------|----------|
| `app/components/ui/` | Alert, Badge, Button, Card, EmptyState, Input, Modal, Table |
| `app/components/` | Layouts, shared components |
| `app/r/[tracking_code]/hooks/` | useRecommendations, useSwipeGesture, etc. |
| `app/r/[tracking_code]/components/` | BottomSheet, CardSkeleton, BackgroundPicker |
| `lib/` | Supabase clients, monitoring, validation, env helpers |
| `app/globals.css` | Liquid-glass utilities |

## Technical Requirements
- Data layer: new Supabase queries? API routes? Schema updates (check `FINAL_SPEC.md`)
- UI: reuse tokens, honor Spanish copy, enforce ≤440 file / ≤50 function lines
- Business logic: validation, error/loading states, accessibility

## Implementation Checklist Template

```
## {Feature} — Tasks

### Phase 1: Foundation
- [ ] Structure files, hooks, components

### Phase 2: Core
- [ ] Implement logic, Supabase queries, UI tokens, Spanish copy

### Phase 3: Integration
- [ ] Connect to navigation/routes, update related systems

### Phase 4: Polish
- [ ] Loading/error states, animations, mobile test

### Phase 5: Validation
- [ ] npm run build
- [ ] npm run test:integration
- [ ] Manual mobile test
- [ ] Docs updated
```

## Risk Assessment
Evaluate performance, mobile, accessibility, security before coding.
