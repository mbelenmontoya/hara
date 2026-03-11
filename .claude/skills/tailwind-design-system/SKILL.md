---
name: tailwind-design-system
description: Hará Match design system knowledge — tokens, liquid-glass patterns, animation easings, and UI conventions. Triggers on "style", "design", "component", "card", "button", "animation", "glass", "token", "color", "shadow", "UI".
---

# Hará Match Design System

Wellness-focused design language. Think "therapy app designed by Apple" — calm, warm, trustworthy, premium.

## Color Palette (from `app/globals.css` `@theme`)

### Neutrals
| Token | Class | Hex | Usage |
|-------|-------|-----|-------|
| `--color-background` | `bg-background` | `#FBF7F2` | Page backgrounds (warm beige) |
| `--color-surface` | `bg-surface` | `#FFFFFF` | Cards, modals |
| `--color-surface-2` | `bg-surface-2` | `#F6F0E8` | Warm tinted surfaces |
| `--color-outline` | `border-outline` | `#E7DDCF` | Borders, dividers |
| `--color-foreground` | `text-foreground` | `#1F1A24` | Primary text |
| `--color-muted` | `text-muted` | `#6B6374` | Secondary text |

### Brand
| Token | Class | Hex | Usage |
|-------|-------|-----|-------|
| `--color-brand` | `bg-brand`, `text-brand` | `#4B2BBF` | Primary violet |
| `--color-brand-weak` | `bg-brand-weak` | `#EEE8FF` | Light brand tint |
| `--color-brand-hover` | `hover:bg-brand-hover` | `#3F24A4` | Hover state |

### Feedback States
| Token | Class | Hex | Usage |
|-------|-------|-----|-------|
| `--color-success` | `text-success`, `bg-success-weak` | `#2F8A73` / `#E7F6F1` | Positive (teal) |
| `--color-warning` | `text-warning`, `bg-warning-weak` | `#F2A43A` / `#FFF2DE` | Caution (apricot) |
| `--color-danger` | `text-danger`, `bg-danger-weak` | `#D6455D` / `#FDECEF` | Error (coral) |
| `--color-info` | `text-info`, `bg-info-weak` | `#7B61D9` / `#F0EDFF` | Info (lavender) |

## Shadows

```tsx
<div className="shadow-soft">      {/* 0 1px 3px — subtle */}
<div className="shadow-elevated">  {/* 0 4px 12px — cards, modals */}
<div className="shadow-strong">    {/* 0 8px 24px — sheets, popovers */}
```

## Border Radius

```tsx
<div className="rounded-lg">    {/* 8px */}
<div className="rounded-xl">    {/* 12px */}
<div className="rounded-2xl">   {/* 16px */}
<div className="rounded-3xl">   {/* 24px — large cards */}
<div className="rounded-full">  {/* pills, avatars */}
```

## Glass Effect

The `.liquid-glass` utility class creates a frosted glass effect. Defined in `app/globals.css`.

```tsx
// Standard glass card
<div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30">
  <div className="liquid-glass-content p-6">
    {children}
  </div>
</div>

// Glass works best when there's something behind it to blur through
// On solid backgrounds, it appears as a semi-transparent white card
```

## Button Patterns

```tsx
// Primary CTA (violet, full-width on mobile)
<button className="w-full bg-brand text-white px-6 py-4 rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all font-semibold">
  Contactar por WhatsApp
</button>

// Secondary link
<button className="text-brand font-medium hover:underline">
  Ver detalles
</button>

// Press feedback classes (from globals.css)
// .btn-press-glow  — scale + glow on active
// .btn-press-inset — inset shadow on active
```

## Animation Constants

Always use these established values, don't invent new curves:

```typescript
// iOS spring-like easing — for slides, sheets, cards
const EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';

// Smooth feel — for transitions, fades
const TRANSITION_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

// Timing
const SHEET_ANIMATION_MS = 250;      // Bottom sheet open/close
const REVEAL_EXIT_DURATION_MS = 320;  // Reveal screen fade out
const DECK_ENTER_DURATION_MS = 380;   // Card deck fade in
const CARD_SWIPE_DURATION_MS = 500;   // Card position change
```

## Chip/Badge Pattern

```tsx
// Success chip
<span className="px-3 py-1.5 bg-success-weak text-success text-xs font-medium rounded-full border border-success/20">
  Perfil revisado
</span>

// Warning chip
<span className="px-3 py-1.5 bg-warning-weak text-warning text-xs font-medium rounded-full border border-warning/20">
  Turnos esta semana
</span>

// Neutral chip
<span className="px-3 py-1.5 bg-surface-2 text-foreground text-xs font-medium rounded-full border border-outline">
  Online
</span>
```

## Card Pattern

```tsx
// Recommendation card (from /r/ route)
<div className="liquid-glass rounded-3xl shadow-elevated border border-brand/20 overflow-hidden flex flex-col">
  {/* Hero section */}
  <div className="pt-6 px-6 pb-4 flex items-center gap-4">
    <div className="w-16 h-16 bg-gradient-to-br from-brand-weak to-info-weak rounded-3xl shadow-soft" />
    <div className="flex-1">
      <h2 className="text-xl font-semibold text-foreground">{name}</h2>
      <p className="text-sm text-muted">{specialty}</p>
    </div>
  </div>

  {/* Body */}
  <div className="px-6 py-4 space-y-4">
    {/* chips, reasons, CTA */}
  </div>

  {/* Footer */}
  <div className="px-6 py-3 border-t border-outline/30 bg-subtle/10 text-center">
    <p className="text-xs text-muted">Privacy message</p>
  </div>
</div>
```

## Spacing Rhythm

4px base unit: `1` (4px), `2` (8px), `3` (12px), `4` (16px), `5` (20px), `6` (24px), `8` (32px), `10` (40px), `12` (48px), `16` (64px).

Use Tailwind spacing classes (`p-4`, `gap-6`, `mb-3`) — never hardcode pixel values.

## Typography

- **Display font**: `var(--font-display)` — Crimson Pro (serif, for headings)
- **Body font**: `var(--font-body)` — Manrope (sans, for everything else)
- Headings: `font-semibold`, `tracking-tight` (`-0.02em`)
- Body: `leading-relaxed` (1.6 line-height)

## Tailwind v4 Reminders

- Tokens defined with `@theme` directive, NOT `theme.extend`
- Use `@import "tailwindcss"` not `@tailwind base/components/utilities`
- Color tokens auto-generate utilities: `--color-brand` → `bg-brand`, `text-brand`, `border-brand`
- If cache corrupts: `rm -rf .next && npm run build`
