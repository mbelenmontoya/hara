---
name: code-reuse-enforcer
description: Enforce checking existing code before creating new implementations (USE → IMPROVE → ADD). Triggers on "create component", "add feature", "build", "new component", "new hook".
---

# Code Reuse Enforcer

**Core Philosophy:** USE → IMPROVE → ADD

**Before creating ANYTHING new**, search the codebase for existing implementations.

## Search These Locations First

| Directory | Contains |
|-----------|---------|
| `app/components/ui/` | Design system: Alert, Badge, Button, Card, EmptyState, Input, Modal, Table |
| `app/components/` | Shared: ContactButton, PlacesAutocomplete, PublicLayout, AdminLayout |
| `app/r/[tracking_code]/components/` | Route-specific: BottomSheet, CardSkeleton, BackgroundPicker |
| `app/r/[tracking_code]/hooks/` | Custom hooks: useRecommendations, useSwipeGesture, useRevealTransition, useMediaQuery |
| `lib/` | Utilities: supabase-admin, attribution-tokens, rate-limit, env, monitoring, validation, crypto-utils, tracking-code, billing-month |
| `lib/translations/` | i18n: es.ts (Spanish strings) |
| `app/globals.css` | Design tokens, utility classes (.liquid-glass, .btn-press-glow) |

## Existing Hooks (Do Not Recreate)

| Hook | Purpose |
|------|---------|
| `useRecommendations()` | Fetch recommendations by tracking code |
| `useSwipeGesture()` | Horizontal swipe with drag offset |
| `useRevealTransition()` | Reveal → deck crossfade animation |
| `useIsDesktop()` | Media query for desktop breakpoint |

## Existing UI Components (Do Not Recreate)

| Component | Purpose |
|-----------|---------|
| `ContactButton` | WhatsApp CTA with sendBeacon event tracking |
| `BottomSheet` | iOS-style slide-up modal with liquid-glass |
| `CardSkeleton` / `LoadingSkeleton` | Loading placeholder |
| `PlacesAutocomplete` | Google Places location input |
| `PublicLayout` / `AdminLayout` | Page layout wrappers |

## Verification Steps

1. **Before creating**: Search with `Grep` for function names, class names, similar patterns
2. **Check related files**: Look in the same directory and parent directories
3. **Check globals.css**: Many effects are CSS utility classes, not components
4. **After creating**: Search for overlap and consolidate

## If Something Similar Exists

- Extend the existing component with optional props
- Add parameters to existing hooks
- Create a thin wrapper that delegates to the existing implementation
- **Do NOT create a parallel implementation with a different name**
