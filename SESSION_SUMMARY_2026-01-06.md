# Hará Match - Session Summary
**Date:** 2026-01-06
**Session Focus:** /r route UX improvements + gradient background experimentation
**Status:** 🔄 IN PROGRESS - Background approach pivoted, needs refinement

---

## What We Accomplished

### 1. /r Route UX Polish (Completed)
✅ **Reveal→Deck transition:**
- Implemented crossfade with movement (no hard cut)
- Reveal: opacity 1→0, translateY(-8px), scale(0.995) in 320ms
- Deck: opacity 0→1, translateY(8px→0), scale(1.005→1) in 380ms
- Easing: cubic-bezier(0.2, 0.8, 0.2, 1)
- Shared background stays constant

✅ **Card peek effect:**
- Reduced spacing from 100% to 88% for natural peek
- Next card: scale(0.985), opacity 0.65, no blur
- Previous card: subtle peek visible

✅ **Vertical scroll removed from cards:**
- Card body no longer has `overflow-y-auto`
- Content clamped: max 2 bullets with `line-clamp-2`
- Horizontal swipe is primary gesture (no conflicts)

✅ **CTA pattern changed to app-native:**
- Sticky floating CTA removed
- Primary CTA now inside each card
- Name/avatar clickable → `/p/[slug]` profile
- Bottom sheet for contextual details only

✅ **Copy improvements:**
- Reveal: "Tus 3 opciones están listas" + "Ver mis 3 opciones"
- Hint: "Deslizá para comparar. Tu info se comparte recién cuando vos escribís"
- Fallback text: "Recomendación basada en tu solicitud y disponibilidad"
- WhatsApp message: Dynamic with specialty or fallback

✅ **Card anatomy restructured:**
```
Header (clickable to profile)
├─ 3 Chips (Verified | Online | Esta semana)
├─ "Por qué te la recomendamos" (max 2 bullets, clamped)
├─ Primary CTA: "Abrir WhatsApp"
└─ Secondary links: "Ver perfil | Ver detalles"
```

✅ **Data quality improvements:**
- Removed regex heuristics for firstName/reasons (production-quality approach)
- Simple validation: `firstName` uses optional chaining, `isValidReason()` checks length >= 10
- Updated seed scripts (`qa-seed.ts`, `qa-seed-e2e.ts`) with realistic names and reasons
- Names: María González, Carlos Rodríguez, Ana Pérez, etc.
- Reasons: 40+ char realistic Spanish text

---

## What We Tried (Background Experimentation)

### Approach 1: Custom Aurora Blobs (Abandoned)
❌ **Initial attempt:** Custom CSS blobs with opacity + scale animations
- 3 layers: base gradient, aurora blobs, grain overlay
- Issues: Too engineered, not premium feel
- User feedback: "Letting GPT run like a designer was bad idea"

### Approach 2: Greenbit-Portal Gradient System (Partially Implemented)
✅ **Analyzed greenbit-portal background:**
- Structure: noise texture + goo filter + 5 animated radial gradients
- Animations: moveInCircle, moveVertical, moveHorizontal (20-60s durations)
- Works on dark background with white glass effect

⚠️ **Adapted for Hará (issues encountered):**
1. **Opacity confusion:**
   - Tried 0.12 (too low), 0.35 (too low), 0.7-0.95 (variable), 1.0 (final)
   - Root issue: rgba alpha is 0-1, not 0-100 (my initial confusion)

2. **Blob visibility problems:**
   - Desktop: Blobs appeared centered, worked well
   - Mobile: Blobs appeared off-screen initially, never all visible
   - Root cause: Fixed pixel offsets in `transform-origin` (e.g., `calc(50% - 400px)`) don't scale to mobile
   - On 375px screen: 50% - 400px = -212px (way off-screen)

3. **Size/positioning issues:**
   - Tried 80% → 120-140% → 180-220% → 150-170% (final)
   - Media queries were backwards (shrinking on mobile instead of growing)
   - Removed all media queries for consistency

4. **Accessibility (AAA compliance):**
   - Gray text not legible on moving gradient
   - Research: 90% of gradients fail WCAG, need 7:1 contrast for AAA
   - Solutions tried:
     - Glass card opacity: 0.25 → 0.80 (killed glass effect) → 0.35 (balanced)
     - Text shadow: Multiple iterations, all either too visible or invisible

5. **Glassmorphism on light background:**
   - Initially used dark tint `rgba(31, 26, 36, 0.15)` (wrong, looked black)
   - Research: Glass on light bg ALSO uses white + blur + saturate
   - Corrected: `rgba(255, 255, 255, 0.35)` + `blur(20px) saturate(180%)`
   - User feedback: Still not right

### Approach 3: Image Background (Current)
🔄 **Pivoted to using actual images:**
- Removed gradient blobs completely
- Removed text shadow
- Using: `harli-marten-n7a2OJDSZns-unsplash.jpg` (570K)
- Simple `background-size: cover`, `background-position: center`
- **Next:** Add layers on top to make it less raw

---

## Key Learnings Today

### Technical Lessons

1. **Don't change multiple variables at once:**
   - User feedback: "you really have no in between, stop changing all the values at once, that is not how you test things"
   - Need to isolate one variable per iteration for effective testing

2. **rgba alpha is 0-1, not 0-100:**
   - Initial confusion about opacity values
   - 0.35 = 35% opacity, 1.0 = 100% opacity

3. **Mobile-first means different constraints:**
   - Fixed pixel offsets (`calc(50% - 400px)`) break on narrow screens
   - Percentage-based positioning doesn't always scale properly
   - Transform-origin points need to scale with viewport

4. **Glassmorphism is consistent across backgrounds:**
   - White + blur + saturate works on both dark and light backgrounds
   - Don't invert to dark on light backgrounds
   - The blur makes underlying colors show through

5. **Accessibility is non-negotiable:**
   - Animated gradients create constantly changing contrast
   - Must test worst-case (darkest blob combo)
   - AAA requires 7:1 for normal text, 4.5:1 for large text

### Process Lessons

1. **Research before implementing:**
   - User: "you do not ask me, you ask google about it, you analice and search the right approach"
   - Should use WebSearch to investigate before jumping to code

2. **Incremental testing matters:**
   - Changing opacity, blur, shadow, and positioning simultaneously = impossible to debug
   - One variable at a time

3. **Production-quality over quick fixes:**
   - User rejected regex heuristics for detecting test data (firstName, reasons)
   - Better to fix data at source than censor/patch in UI
   - "If viene 'Admin' desde DB, prefiero verlo durante dev y arreglarlo donde corresponde"

4. **Design systems need reference:**
   - Greenbit-portal gradient system worked for its dark theme
   - Couldn't directly port to light theme without adaptation
   - Images might be better approach for warm/wellness aesthetic

---

## Current State

### /r Route Status:

**✅ Working:**
- Reveal→deck crossfade transition
- Card peek effect (88% spacing)
- No vertical scroll in cards
- CTA inside cards (app pattern)
- Name/avatar links to profile
- Bottom sheet for details
- Responsive sizing (70vh max-height)
- Clean copy (Spanish, dynamic)
- Seed data realistic

**🔄 In Progress:**
- Background approach (currently raw image)
- Text accessibility/legibility solution

**⚠️ Known Issues:**
- Background image is raw (needs layers/treatment)
- Text shadow removed (accessibility concern unresolved)
- Glass effect might need adjustment
- Inline CSS used for background (should be in CSS file)

### Files Modified Today:

**Core experience:**
- `app/r/[tracking_code]/page.tsx` - Multiple iterations on UX/background
- `app/globals.css` - Gradient blobs, glass effect, image background experiments

**Data quality:**
- `scripts/qa-seed-e2e.ts` - Realistic names + reasons
- `scripts/qa-seed.ts` - Realistic names + reasons

**Reusable components:**
- `app/components/GradientBackground.tsx` - Saved gradient system as asset (not currently used)

---

## What Wasn't Completed

### HIGH PRIORITY: Background Treatment
**Current:** Raw image (`harli-marten-n7a2OJDSZns-unsplash.jpg`) with no layers

**Needs:**
- Overlay layers to make it less raw
- Ensure it works on mobile + desktop
- Maintain premium feel
- Solve accessibility (text legibility)

**Blocked by:** Need to define visual treatment approach

### MEDIUM PRIORITY: Accessibility Solution
**Problem:** Text needs to be AAA compliant on any background

**Options to explore:**
1. Increase glass card opacity (more opaque white)
2. Add subtle scrim/overlay specifically where text sits
3. Use gradient overlay on image background
4. Combination approach

**Blocked by:** Need to test image background first, then determine solution

### Design System Rollout (Deferred)
- Admin pages (`/admin/leads/[id]/match`, `/admin/professionals`, `/admin/pqls`)
- Not started - focusing on /r route first

---

## Open Questions for Next Session

1. **Background image treatment:**
   - What layers/overlays should be added on top of raw image?
   - Should we use gradient overlay, color tint, or other treatment?
   - How to ensure it works across all viewports?

2. **Accessibility solution:**
   - Once background is finalized, how to ensure AAA compliance?
   - Text shadow, card opacity, or overlay approach?

3. **Image selection:**
   - Is `harli-marten` the right image, or try others?
   - Should we test multiple images?

4. **CSS organization:**
   - Background currently inline - should be in CSS classes
   - How to structure for reusability (also needed for `/p/[slug]`)?

5. **Gradient blobs - keep as option?**
   - GradientBackground.tsx saved as reusable asset
   - Might be useful for other pages
   - Or abandon completely?

---

## Technical Debt Introduced

1. **Inline CSS for background** - Should be refactored to CSS classes
2. **Glass effect not optimized** - Currently generic, needs tuning for final background
3. **Accessibility unresolved** - Text legibility on image background TBD
4. **No image optimization** - Using raw 570K JPG, should optimize for web

---

## Next Steps

### Immediate (Next Session Start):

1. **Move background to CSS classes** (fix inline style)
2. **Add layers on image** per user direction
3. **Test on mobile** to ensure image looks good
4. **Solve accessibility** once background finalized

### After Background Complete:

1. Apply glass effect to deck cards
2. Apply to bottom sheet
3. Export as reusable component for `/p` route
4. Run QA tests to ensure nothing broke

---

## Resources & References

**Research conducted:**
- [Glassmorphism on light backgrounds](https://css.glass/)
- [Next-level frosted glass with backdrop-filter](https://www.joshwcomeau.com/css/backdrop-filter/)
- [WCAG AAA gradient accessibility](https://instantgradient.com/blog/accessible_gradient_guide)
- [Text legibility on images](https://www.smashingmagazine.com/2023/08/designing-accessible-text-over-images-part2/)

**Code references:**
- Greenbit-portal: `/Users/belumontoya/Desktop/greenbit/greenbit-portal/src/app/globals.css`
- Glass effect pattern analyzed and partially adapted

**Assets:**
- Images: `/Users/belumontoya/Desktop/greenbit/hara/assets/` (5 unsplash photos)
- Currently using: `harli-marten-n7a2OJDSZns-unsplash.jpg`

---

**Session End Time:** Morning
**Next Session:** Finalize background treatment with layers, solve accessibility, complete /r route premium experience
