---
description: Begin implementing a new feature with analysis, planning, and reuse check
argument-hint: "Feature name and description - e.g., 'email confirmation on registration'"
---

## Feature Request

Feature: $ARGUMENTS

## Feature Implementation Planning

### 1. Feature Analysis

- **Core Purpose**: What problem does this solve?
- **User Impact**: Who uses this and how?
- **Scope**: Small addition or major feature?
- **Integration Points**: What existing systems does this touch?

### 2. Reuse Check (USE → IMPROVE → ADD)

**Before creating anything, search for existing implementations:**

| Location | Check for |
|----------|-----------|
| `app/components/ui/` | Alert, Badge, Button, Card, EmptyState, Input, Modal, Table |
| `app/components/` | ContactButton, PlacesAutocomplete, PublicLayout, AdminLayout |
| `app/r/[tracking_code]/hooks/` | useRecommendations, useSwipeGesture, useRevealTransition, useMediaQuery |
| `app/r/[tracking_code]/components/` | BottomSheet, CardSkeleton, BackgroundPicker |
| `lib/` | supabase-admin, attribution-tokens, monitoring, validation, env, translations |
| `app/globals.css` | Utility classes: .liquid-glass, .btn-press-glow, .btn-press-inset |

### 3. Technical Requirements

#### Data Layer
- [ ] Needs new Supabase queries?
- [ ] Needs new API route? (use service role pattern from `lib/supabase-admin.ts`)
- [ ] Modifies existing tables? (check `FINAL_SPEC.md` first)

#### UI Components
- [ ] New components needed?
- [ ] Can extend existing `app/components/ui/` components?
- [ ] Uses design tokens from `globals.css`?
- [ ] Follows liquid-glass pattern?

#### Business Logic
- [ ] New hooks needed? (keep ≤50 lines)
- [ ] Validation rules?
- [ ] Error states? (use error boundaries)
- [ ] Loading states? (use skeleton pattern from CardSkeleton)

### 4. Implementation Checklist

```markdown
## {Feature Name} — Tasks

### Phase 1: Foundation
- [ ] Create file structure
- [ ] Set up base components (≤440 lines each)
- [ ] Create hooks if needed (≤50 lines each)

### Phase 2: Core
- [ ] Implement main logic
- [ ] Add Supabase queries (service role)
- [ ] Build UI with design tokens
- [ ] Spanish copy for all user-facing text

### Phase 3: Integration
- [ ] Connect to existing systems
- [ ] Add to navigation/routing if needed
- [ ] Update related components

### Phase 4: Polish
- [ ] Loading states (skeleton loaders)
- [ ] Error handling (error boundaries)
- [ ] Animations (use established easing constants)
- [ ] Mobile testing

### Phase 5: Validation
- [ ] `npm run build` passes
- [ ] `npm run test:integration` passes
- [ ] Manual test on mobile viewport
- [ ] Update docs/TODO.md (mark done or add new items)
```

### 5. File Structure

For a new feature in hara:

```
app/
├── {feature}/
│   ├── page.tsx              # Page component (if route)
│   ├── hooks/                # Feature-specific hooks
│   │   └── use{Feature}.ts
│   └── components/           # Feature-specific components
│       └── {Component}.tsx
```

Or for shared additions:
```
app/components/
├── {NewComponent}.tsx        # If shared across routes
app/components/ui/
├── {NewUIComponent}.tsx      # If design system level
```

### 6. Risk Assessment

- **Performance**: Will this scale? Lazy loading needed?
- **Mobile**: Touch interactions? Viewport issues?
- **Accessibility**: ARIA labels? Keyboard nav? Focus management?
- **Security**: Does it touch locked files? Need rate limiting?

## Next Steps

1. Review and refine the plan
2. Start with Phase 1
3. Test after each phase (`npm run build`)
4. Update `docs/TODO.md` when complete
