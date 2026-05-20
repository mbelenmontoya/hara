# Desktop Responsive UI Pass

Created: 2026-05-14
Author: belu.montoya@dialpad.com
Category: UX
Status: Final
Research: Standard

## Problem Statement

Hara Vital is mobile-first in the literal sense: every public page caps at a 640px container width regardless of viewport. On a 1024px or wider screen, the entire app is a narrow column of content floating in a sea of beige, with no use of the available horizontal canvas. This directly contradicts the brand positioning — *"holistic-wellness app designed by Apple"* — and reads as either unfinished or mobile-beta to anyone visiting from a laptop or tablet in landscape.

The goal is a non-design-breaking responsive pass that keeps every visual choice (color tokens, typography, component shapes, liquid-glass effects, copy) and reorganizes layout so each page uses desktop canvas appropriately. Plus a layer of desktop-only affordances (button hover refinement, scroll-triggered reveals) that mobile cannot have because there is no cursor.

This is **not** a design refresh. It is a layout pass.

## Core User Flows

### Flow 1: Browse the directory on desktop (`/profesionales`)
1. User lands on `/profesionales` from a laptop (≥1024px)
2. Header shows logo + inline nav links (`Profesionales`, `Pedi recomendación`, `Ayuda`)
3. Filter bar sits at the top, full width inside the 1024px container
4. Below filters, professional cards render in a 2 or 3 column grid (responsive to card density)
5. User hovers a card — cursor changes to pointer (no scale/shadow change, calm aesthetic)
6. User clicks a card — navigates to `/p/[slug]`

### Flow 2: Review a professional profile on desktop (`/p/[slug]`)
1. Profile loads in two-column layout inside 1024px container
2. Left column: photo, name, headline, biografía, modalidades, experiencia, reviews
3. Right column: sticky contact card with WhatsApp CTA, location, price snapshot — stays visible as user scrolls the left column
4. As user scrolls, sections in the left column fade up into view (Intersection Observer, respects `prefers-reduced-motion`)
5. User clicks the WhatsApp CTA — same attribution flow as mobile (no behavior change in `/api/events`)

### Flow 3: View concierge recommendations on desktop (`/r/[tracking_code]`)
1. User opens the recommendation link from a laptop
2. Three professional cards render side-by-side as a grid (replaces mobile swipe deck)
3. User hovers a button (e.g., "Ver detalles") — button shows hover state (brightness shift, ~150ms transition)
4. User clicks a card — modal opens with full professional detail (replaces mobile bottom sheet)
5. Modal closes with escape or outside-click; user can open the next card
6. Mobile experience (swipe deck + bottom sheet) is unchanged

### Flow 4: Fill out a multi-step form on desktop (`/solicitar`, `/profesionales/registro`)
1. Form steps display inside the 1024px container instead of 640px
2. Fields stay single-column with reasonable max-width (~600px) for readability
3. Step indicators / progress sit at the top; primary CTA bottom-right
4. Side margins fill with the warm background — no awkward floating phone-sized column

## Scope

### In Scope

**Shared foundation:**
- New 1024px container utility (or extend `container-public` to scale with breakpoint — implementer's call)
- Adopt Tailwind v4 `lg:` breakpoint (1024px) as the single desktop tier
- Desktop nav links added to `PublicLayout` header (visible only at `lg:` and up); mobile header unchanged
- Convention: every page-level layout component reads cleanly at both `<1024px` and `≥1024px`

**Per-surface layouts (desktop ≥1024px only):**
- `/profesionales` directory — top filter bar + card grid (2 or 3 columns)
- `/p/[slug]` profile — two-column with sticky right-side contact card
- `/r/[tracking_code]` concierge — 3-card grid; bottom sheet becomes modal
- `/solicitar`, `/profesionales/registro` — widen container, single-column fields
- Home, `/ayuda`, `/terminos`, `/privacidad`, `/terminosyprivacidad` — widen container, typography breathes
- `/admin/*` — polish only (already at 1024px)

**Desktop-only interaction layer:**
- Button hover refinement — brightness/color shift on hover with smooth 150ms transition (extends existing `btn-press-glow` / `btn-press-inset`)
- Scroll-triggered fade-up reveals on home and profile pages (Intersection Observer; `prefers-reduced-motion` respected; max 500ms per animation per existing standard)

### Explicitly Out of Scope

- **Card hover states** — intentional, matches calm/quiet brand aesthetic. Cards rely on `cursor: pointer` only.
- **Image zoom on hover** — out; minimal animation budget.
- **Mobile hamburger menu** — current minimal mobile header (logo only) is preserved. Mobile navigation behaviour does not change in this PRD.
- **Tablet-specific layout (768–1023px)** — tablets get the mobile layout. Confirmed by user as the simplest tier model for this pass.
- **Fluid typography via `clamp()`** — out; existing type scale stays.
- **Any visual design changes** — colors, typography, component shapes, liquid-glass effects, copy all unchanged. If a change feels like "redesign," it belongs in a different PRD.
- **New navigation routes / IA changes** — desktop nav links go to existing routes only.
- **Page transitions between routes** — only scroll-triggered reveals within a page are in scope.

## Technical Context

This is a Next.js 14 App Router + Tailwind v4 + TypeScript codebase. The implementer should expect to:

- **Existing container utilities:** `app/globals.css` already defines `.container-public` (max-width 640px) and `.container-admin` (max-width 1024px). Either extend `.container-public` to grow at `lg:` or introduce a new utility — implementer's design call during `/spec`.
- **Tailwind v4 specifics:** Tokens are defined under `@theme` in `globals.css`. Use `lg:` prefix (1024px breakpoint, built-in). The codebase currently uses very few responsive utilities (~5 `md:grid-cols-*` instances across the app) — this is not a "tweak what exists," it is "introduce the pattern."
- **Largest impacted pages:** `app/r/[tracking_code]/page.tsx` (402 lines), `app/p/[slug]/page.tsx` (397 lines). Both are near the 440-line component cap from `component-standards.md` — the responsive pass will likely push them over. Extraction into hooks/sub-components during implementation is expected.
- **Hover detection for desktop-only affordances:** use `@media (hover: hover)` (or Tailwind `hover:` only triggers on devices with hover support by default in Tailwind v4) to prevent hover states sticking on touch devices.
- **Scroll reveals:** Intersection Observer with `useEffect` hook; cap total animated elements per page; respect `prefers-reduced-motion` via media query check.
- **Concierge modal:** the existing `BottomSheet` component (`app/r/[tracking_code]/components/BottomSheet.tsx`) probably needs a sibling `Modal` variant for desktop, or a single component that switches behaviour at `lg:`. Implementer decides which.
- **PublicLayout nav:** `app/components/PublicLayout.tsx` is 41 lines today. Add a `<nav>` element visible at `lg:` only.
- **Performance:** scroll reveals must respect the polling-safe / cache rules in `frontend.md` standards — observer callbacks should not trigger re-renders of unrelated subtrees.
- **Accessibility:** sticky sidebar must remain keyboard-reachable. Modals (replacing bottom sheets on desktop) must follow the project's existing `aria-modal` + `aria-labelledby` patterns. Touch targets must remain ≥44px even when hover states are added.

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| **Breakpoint tiers** | Mobile + Desktop only (single 1024px breakpoint) | Matches user's "1024px container" framing. Tablets get mobile layout — keeps implementation simple. Three tiers would add work disproportionate to the LATAM tablet usage share. |
| **Container width** | 1024px everywhere | User's explicit framing. Avoids the cognitive overhead of per-surface widths. Future PRD can widen the directory specifically if 3-column cards feel tight. |
| **Directory layout** | Top filter bar + card grid | Minimal structural change (filters already inline). Premium feel (Airbnb-style). Avoids the heavier sidebar-filters pattern. |
| **Profile layout** | Two-column with sticky contact card | The contact CTA is the conversion event for the entire product. Sticky sidebar keeps it visible during browsing — booking-conversion pattern from LinkedIn, Airbnb, Booking. |
| **Concierge desktop** | 3-card grid + modal | Swipe-deck gestures don't translate to cursor. A 3-card grid reveals the curation at a glance, which is the concierge value proposition. Modal replaces bottom sheet for desktop ergonomics. |
| **Card hover** | Skip entirely (cursor only) | User's explicit choice; matches the calm/quiet wellness brand. Industry-uncommon but valid for this aesthetic. |
| **Scroll reveals** | In scope | Acknowledged risk: closest thing in this PRD to "new design." Constrained to home + profile pages, respects reduced-motion, capped duration. If implementation reveals scope creep, drop them. |
| **Image zoom on hover** | Out of scope | Minimal animation budget; cards don't have hover state, image zoom would be inconsistent. |
| **Mobile nav** | Unchanged (no hamburger) | Current minimal header (logo only) preserved. Adding a hamburger is a separate UX decision worth its own PRD. |
| **Phasing** | Approach B — phased per-surface | Validate the foundation (container, nav, hover utilities) on highest-impact surfaces (directory + profile) before rolling to lower-impact ones. Each ship bounded and reversible. |

## Research Findings

### Mobile vs Desktop UX (industry consensus)
Desktop and mobile aren't just sizes — they're different interaction models. Desktop allows multi-column layouts, hover states, denser information, mouse precision; mobile uses stacked layouts, 44px touch targets, gestures. "Just stretching mobile to desktop" is the documented anti-pattern — it produces exactly the "unfinished" feeling described in this PRD's problem statement. ([newform.community](https://www.newform.community/post/mobile-vs-desktop-design-complete-analysis), [theeditorsuite.com](https://www.theeditorsuite.com/blog/mobile-ux-vs-desktop-ux-what-to-consider))

### Directory layout patterns
Three dominant patterns for marketplace/listing pages: (1) **left sidebar filters + grid** — Booking, Yelp, Etsy; most common but heavier structural change; (2) **top filter bar + grid** — Airbnb (current implementation closer to this); (3) **single wide list view** — eBay/old Etsy. We chose (2) because filters are already inline on mobile and the brand reads more "Airbnb-premium" than "Booking-utility." ([directorist.com](https://directorist.com/docs/all-listing-settings/), [businessdirectoryplugin.com](https://businessdirectoryplugin.com/smarter-directories-with-tables-two-column-layouts/))

### Profile page patterns
Two-column with sticky right-side contact CTA is the consensus pattern for marketplaces where contact is the conversion event — LinkedIn, Airbnb listings, Booking properties. The sticky element keeps the action visible as users review information, reducing the "scroll back to top" friction. ([eleken.co](https://www.eleken.co/blog-posts/profile-page-design), [muz.li](https://muz.li/inspiration/profile-page/))

### Hover and animation
Hover states are a *signal* of interactivity, not just decoration. Standard pattern is `@media (hover: hover)` (or Tailwind `hover:` which Tailwind v4 makes hover-aware by default) to prevent hover-stuck behaviour on touch. Animation budget for premium UIs: max 500ms per animation, always respect `prefers-reduced-motion` (this is also encoded in `frontend.md` standards in this repo). ([newform.community](https://www.newform.community/post/mobile-vs-desktop-design-complete-analysis), [tailwindcss.com](https://tailwindcss.com/docs/responsive-design))

### Tailwind v4 breakpoints
Built-in: `sm: 640`, `md: 768`, `lg: 1024`, `xl: 1280`, `2xl: 1536`. The codebase uses ~5 responsive utilities total — the responsive pass is not "improve what's there," it is "introduce the pattern." ([tailwindcss.com/docs/responsive-design](https://tailwindcss.com/docs/responsive-design))
