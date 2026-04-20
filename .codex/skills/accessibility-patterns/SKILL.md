---
name: accessibility-patterns
description: Build accessible React components with WCAG 2.1 Level AA compliance for Hará Match. Use when creating interactive elements, forms, modals, bottom sheets, or any user-facing components. Triggers on "accessibility", "a11y", "ARIA", "keyboard", "focus", "screen reader", "WCAG".
---

# Accessibility Patterns for Hará Match

Build WCAG 2.1 Level AA compliant React components with Tailwind CSS.

## Existing Accessibility in Hara

The codebase already has:
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` on BottomSheet
- `role="region"` + `aria-label` on card deck
- `aria-label` on navigation buttons
- Semantic HTML throughout

## Quick Reference: Interactive Elements

### Buttons

```tsx
{/* ✅ Button with visible text */}
<button className="btn-press-glow bg-brand text-white rounded-full px-6 py-4">
  Contactar por WhatsApp
</button>

{/* ✅ Icon-only button with aria-label */}
<button aria-label="Anterior profesional" className="w-12 h-12 rounded-full">
  <svg>...</svg>
</button>

{/* ❌ Never: clickable div */}
<div onClick={handleClick} className="cursor-pointer">Click me</div>

{/* ❌ Never: button without accessible name */}
<button onClick={handleClose}><svg>...</svg></button>
```

### Links

```tsx
{/* ✅ Link with descriptive text */}
<a href={`/p/${slug}`}>Ver perfil completo</a>

{/* ✅ Link opening external — indicate */}
<a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
   aria-label="Contactar a María por WhatsApp (abre nueva pestaña)">
  Contactar
</a>

{/* ❌ Never: generic link text */}
<a href="/p/maria">Click aquí</a>
```

## Quick Reference: Forms

```tsx
{/* ✅ Label associated with input */}
<label htmlFor="email" className="text-sm font-medium text-foreground">
  Email
</label>
<input id="email" type="email" value={email} onChange={...}
  aria-required="true"
  aria-invalid={!!error}
  aria-describedby={error ? 'email-error' : undefined}
/>
{error && (
  <p id="email-error" role="alert" className="text-sm text-danger">
    {error}
  </p>
)}

{/* ❌ Never: input without label */}
<input placeholder="Email" />
```

## Quick Reference: Modals & Bottom Sheets

Hara's BottomSheet already implements most of this. Follow the same pattern for new modals:

```tsx
{/* ✅ Accessible modal/sheet */}
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  onKeyDown={(e) => e.key === 'Escape' && handleClose()}
>
  <h2 id="modal-title">{title}</h2>
  {/* content */}
</div>
```

### Focus Trap (pending implementation)

```tsx
// TODO: Implement focus trap for BottomSheet
// This is on the TODO list — when implementing:
import { useRef, useEffect } from 'react';

function useFocusTrap(ref: React.RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const element = ref.current;
    const focusable = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    first?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    element.addEventListener('keydown', handleTab);
    return () => element.removeEventListener('keydown', handleTab);
  }, [ref, isActive]);
}
```

## Quick Reference: Keyboard Navigation

### Tabindex Rules

| Value | Use Case |
|-------|---------|
| `0` | Element should be in tab order |
| `-1` | Focusable via JS only, not tab |
| `>0` | **NEVER USE** — breaks natural flow |

### Swipe Alternatives for Keyboard

The card deck uses swipe gestures. For keyboard users:

```tsx
{/* Desktop arrows already exist — ensure they're keyboard accessible */}
<button
  onClick={() => setCurrentIndex(i => i - 1)}
  aria-label="Anterior profesional"
  tabIndex={0}
>
  {/* Arrow icon */}
</button>
```

## Quick Reference: Live Regions

```tsx
{/* ✅ Announce card changes to screen readers */}
<div aria-live="polite" aria-atomic="true" className="sr-only">
  Mostrando profesional {currentIndex + 1} de {total}
</div>

{/* ✅ Announce errors */}
<div role="alert" className="text-danger">
  {errorMessage}
</div>

{/* ✅ Loading state */}
<div aria-busy={loading} aria-live="polite">
  {loading ? <LoadingSkeleton /> : content}
</div>
```

## Quick Reference: Images

```tsx
{/* ✅ Profile photo with alt text */}
<img src={photoUrl} alt={`Foto de ${professionalName}`} />

{/* ✅ Decorative image */}
<img src={illustration} alt="" aria-hidden="true" />

{/* ✅ Avatar placeholder (gradient div) — mark decorative */}
<div className="w-16 h-16 bg-gradient-to-br from-brand-weak to-info-weak rounded-3xl"
     role="img" aria-label={`Avatar de ${name}`} />
```

## Color Contrast

Hara's palette is designed for AA compliance:
- `text-foreground` (#1F1A24) on `bg-background` (#FBF7F2) = **12.3:1** ratio
- `text-muted` (#6B6374) on `bg-background` (#FBF7F2) = **4.8:1** ratio (passes AA)
- `text-brand` (#4B2BBF) on `bg-background` (#FBF7F2) = **7.2:1** ratio

If adding new colors, verify contrast at [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/).

## Testing Checklist

Before submitting accessible components:

- [ ] All interactive elements have accessible names
- [ ] Tab through — logical order?
- [ ] Keyboard-only operation works?
- [ ] Modals/sheets trap focus and return it on close
- [ ] Forms have labels + error messages linked
- [ ] Status changes announced via live regions
- [ ] Color is not the only means of conveying info
- [ ] Touch targets ≥ 44px
- [ ] `prefers-reduced-motion` respected for animations
