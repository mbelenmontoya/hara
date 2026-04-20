---
description: Use design tokens from globals.css — no hardcoded colors, spacing, or shadows
globs: app/**/*.tsx, app/globals.css
---

# Tailwind Token Rules

## Core Rule

Always use design tokens defined in `app/globals.css` under `@theme`. Never hardcode colors, spacing, shadows, or radii.

## Colors — Use Token Classes

```tsx
// ❌ WRONG — hardcoded hex values
<div style={{ color: '#4B2BBF' }}>
<div className="text-[#4B2BBF]">
<div className="bg-[#FBF7F2]">

// ✅ Correct — token classes
<div className="text-brand">
<div className="bg-background">
<div className="text-muted">
```

| Token Class | Hex | Usage |
|-------------|-----|-------|
| `bg-background` | `#FBF7F2` | Page backgrounds |
| `bg-surface` | `#FFFFFF` | Cards, modals |
| `bg-surface-2` | `#F6F0E8` | Warm tinted areas |
| `text-foreground` | `#1F1A24` | Primary text |
| `text-muted` | `#6B6374` | Secondary text |
| `text-brand` / `bg-brand` | `#4B2BBF` | Brand violet |
| `bg-brand-weak` | `#EEE8FF` | Light brand tint |
| `text-success` / `bg-success-weak` | `#2F8A73` / `#E7F6F1` | Positive states |
| `text-warning` / `bg-warning-weak` | `#F2A43A` / `#FFF2DE` | Caution states |
| `text-danger` / `bg-danger-weak` | `#D6455D` / `#FDECEF` | Error states |
| `text-info` / `bg-info-weak` | `#7B61D9` / `#F0EDFF` | Informational |
| `border-outline` | `#E7DDCF` | Borders |

## Shadows — Use Token Classes

```tsx
// ❌ WRONG
<div className="shadow-md">
<div style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>

// ✅ Correct
<div className="shadow-soft">      {/* Subtle elevation */}
<div className="shadow-elevated">  {/* Cards, modals */}
<div className="shadow-strong">    {/* Bottom sheets, popovers */}
```

## Border Radius — Use Token Classes

```tsx
// ❌ WRONG
<div className="rounded-[12px]">
<div style={{ borderRadius: '16px' }}>

// ✅ Correct
<div className="rounded-lg">    {/* 8px — radius-sm */}
<div className="rounded-xl">    {/* 12px — radius */}
<div className="rounded-2xl">   {/* 16px — radius-lg */}
<div className="rounded-3xl">   {/* 24px — large cards */}
<div className="rounded-full">  {/* Pills, avatars */}
```

## Glass Effect

Use the `.liquid-glass` utility class from `globals.css`. Don't recreate it:

```tsx
// ✅ Correct
<div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30">
  <div className="liquid-glass-content p-6">
    {children}
  </div>
</div>
```

## Button Feedback

Use the `.btn-press-glow` or `.btn-press-inset` classes:

```tsx
// ✅ Correct
<button className="btn-press-glow bg-brand text-white rounded-full px-6 py-4">
  Click me
</button>
```

## Animation Easing

Use the established constants, don't invent new curves:

```typescript
const EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';           // iOS spring-like
const TRANSITION_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'; // Smooth feel
```

## Tailwind v4 Specifics

- Tokens are defined with `@theme` directive, NOT `theme.extend`
- Use `@import "tailwindcss"` not `@tailwind base/components/utilities`
- Color tokens auto-generate utility classes (e.g., `--color-brand` → `bg-brand`, `text-brand`)
- If `.next/` cache corrupts: `rm -rf .next && npm run build`
