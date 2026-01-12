# UI/UX Polish Roadmap

**Created:** 2026-01-08
**Focus:** Mobile-first (desktop pass scheduled after mobile completion)
**Status:** Planning

---

## Guiding Principles

- **Production quality** — Code must compile, tests must pass
- **Maintainable** — Components ≤300 lines, functions ≤50 lines
- **Sustainable** — DRY principle, reusable components, type-safe
- **Scalable** — Optimized assets, efficient architecture
- **Not over-engineered** — Use platform features, avoid premature abstraction

---

## Priority 1: High Impact (Do First)

### 1.1 Micro-interactions
- [ ] Button press feedback (scale + shadow change)
- [ ] Skeleton loaders instead of spinners
- [ ] Success states after actions
- [ ] Haptic feedback on mobile (where supported)

### 1.2 Card Deck Polish
- [ ] Add depth shadows between cards
- [ ] Spring physics for swipe (momentum, bounce)
- [ ] Smoother drag resistance curve

### 1.3 Reveal Transition Enhancement
- [ ] More delightful entrance animation
- [ ] Staggered element reveals
- [ ] Consider particle/confetti on reveal

### 1.4 Loading States
- [ ] Skeleton loaders for cards
- [ ] Shimmer effect on loading elements
- [ ] Progressive content reveal

### 1.5 WhatsApp Button Redesign
- [ ] Add WhatsApp icon
- [ ] Pulse animation for urgency
- [ ] Better visual hierarchy
- [ ] Clearer copy/CTA

---

## Priority 2: Medium Impact

### 2.1 Progress Indicator
- [ ] Animate dot transitions
- [ ] Consider progress bar alternative
- [ ] Add swipe hint animation

### 2.2 Bottom Sheet Polish
- [ ] Spring animation on open/close
- [ ] Gesture to dismiss (swipe down)
- [ ] Better backdrop treatment (see issue below)

### 2.3 Chips Animation
- [ ] Staggered entrance animation
- [ ] Hover/tap states
- [ ] Consider icon additions

### 2.4 Avatar/Photo Placeholders
- [ ] Better placeholder design
- [ ] Initials fallback
- [ ] Gradient variations per professional

### 2.5 Typography Enhancement
- [ ] Text reveal animations
- [ ] Staggered paragraph reveals
- [ ] Better hierarchy on cards

---

## Priority 3: Nice to Have

### 3.1 Dark Mode
- [ ] Define dark palette tokens
- [ ] Implement theme toggle
- [ ] Respect system preference

### 3.2 Celebration Moments
- [ ] Confetti on contact initiation
- [ ] Success animation after WhatsApp opens

### 3.3 Admin Dashboard Polish
- [ ] Apply same design system
- [ ] Add data visualizations
- [ ] Improve table interactions

---

## Missing Design System Components

| Component | Priority | Notes |
|-----------|----------|-------|
| Skeleton | High | For loading states |
| Avatar | Medium | For professional photos |
| Toast | Medium | For feedback messages |
| Icon set | Medium | Consistent iconography |
| Motion tokens | High | Spring curves, stagger timing |

---

## Known Issues to Address

### Issue: Backdrop-filter blur delay on card swipe
- **Location:** `/r/[tracking_code]` card deck
- **Cause:** Chrome bug with `backdrop-filter` + `transform: scale()`
- **Options:**
  - A) Wait for browser fix (0 effort)
  - B) Remove scale animation, keep blur (30 min)
  - C) Use static blur image (2 hours)
  - D) Remove backdrop-filter entirely (5 min)
- **Recommendation:** Option B (remove scale)

### Issue: Bottom sheet overlay treatment
- **Status:** Needs design decision
- **See:** Options documented separately

---

## Desktop-Specific Issues (For Later Pass)

_Document patterns that don't translate from mobile to desktop here_

### Navigation Arrows
- Currently functional but may need repositioning on wide screens
- Consider keyboard navigation (arrow keys)

### Card Sizing
- Max-width constraint works but may feel small on large monitors
- Consider side-by-side comparison view for desktop

### Hover States
- Mobile has tap states, desktop needs hover states throughout
- Consider hover previews on cards

---

## Implementation Notes

- Use CSS custom properties for motion tokens (easy to tune)
- Prefer CSS animations over JS where possible (performance)
- Test on real devices, not just browser DevTools
- Keep bundle size in mind — lazy load heavy animations

---

**Next Steps:**
1. Fix current bugs (WhatsApp button, bottom sheet overlay)
2. Implement skeleton loaders
3. Add motion tokens to design system
4. Polish card swipe physics

