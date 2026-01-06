# Hará Match - Code Quality Remediation Plan
**Date:** 2026-01-06
**Status:** 📋 PLANNING PHASE
**Estimated Total Time:** 5-6 hours (Phase 1 + Phase 2)

---

## Table of Contents
1. [Overview](#overview)
2. [Pre-Execution Checklist](#pre-execution-checklist)
3. [Phase 1: Blocking Issues](#phase-1-blocking-issues-critical)
4. [Phase 2: High Priority](#phase-2-high-priority-this-week)
5. [Risk Analysis](#risk-analysis)
6. [Success Criteria](#success-criteria)
7. [Rollback Strategy](#rollback-strategy)

---

## Overview

This plan addresses 23 production quality issues identified in the code quality audit. We will execute in strict order, validating each step before proceeding.

**Execution Order:**
1. ✅ Create this implementation plan document
2. ✅ Review entire plan and dependencies
3. → Execute Phase 1 (Blocking)
4. → Execute Phase 2 (High Priority)
5. → Validate all changes with full test suite

**Key Principle:** Fix one issue at a time, test, commit. No batching of unrelated changes.

---

## Pre-Execution Checklist

Before starting ANY code changes:

- [x] Read CODE_QUALITY_AUDIT_2026-01-06.md
- [x] Understand all 23 issues and their priorities
- [x] Review session summaries (2026-01-02, 2026-01-06)
- [x] Check current git status (9 files modified, uncommitted)
- [x] Verify current build status (FAILING)
- [x] Verify test suite status (12/12 integration tests passing)
- [ ] Create backup branch: `git checkout -b backup-pre-remediation-$(date +%Y%m%d)`
- [ ] Ensure working in clean state (no pending changes blocking work)

---

## Phase 1: Blocking Issues (CRITICAL)

**Must complete before ANY other work**
**Estimated Time:** 30 minutes
**Risk Level:** 🟢 LOW (isolated change)

### Task 1.1: Fix TypeScript Build Error

**Issue:** `app/p/[slug]/page.tsx:78` - Missing `attributionToken` prop

**Root Cause Analysis:**
- ContactButton requires `attributionToken: string` (line 15 in ContactButton.tsx)
- Profile page doesn't have attribution token (standalone visit, not from match)
- AttributionToken is used for event tracking with JWT validation

**Decision Matrix:**

| Option | Pros | Cons | Chosen |
|--------|------|------|--------|
| Make `attributionToken` optional | Simple, allows direct profile visits | Event tracking skipped for direct visits | ✅ YES |
| Generate fake token | Allows tracking | Complex, requires token generation logic | ❌ NO |
| Remove from ContactButton | Simplifies | Breaks attribution tracking entirely | ❌ NO |

**Implementation Steps:**

1. **Modify ContactButton Interface**
   - File: `app/components/ContactButton.tsx`
   - Change: `attributionToken: string` → `attributionToken?: string`
   - Add: Conditional event tracking (only if token exists)

2. **Update Event Tracking Logic**
   - Skip event tracking if no attribution token
   - Add comment explaining why

3. **Verify Type Safety**
   - Ensure all call sites compile
   - Check `/r/[tracking_code]/page.tsx` still works (provides token)
   - Check `/p/[slug]/page.tsx` works (no token)

**Code Changes:**

```typescript
// app/components/ContactButton.tsx (line 15)
interface ContactButtonProps {
  professionalSlug: string
  professionalName: string
  whatsappNumber: string
  trackingCode: string
  rank: number
  attributionToken?: string // Changed from required to optional
  className?: string
}

// app/components/ContactButton.tsx (line 33-58)
const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
  setIsTracking(true)

  // Only track events for attributed visits (from matches)
  // Direct profile visits (no attribution token) skip tracking
  if (attributionToken) {
    const eventPayload = {
      attribution_token: attributionToken,
      event_type: 'contact_click',
      tracking_code: trackingCode,
      professional_slug: professionalSlug,
      rank,
      timestamp: new Date().toISOString(),
    }

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(eventPayload)], { type: 'application/json' })
      navigator.sendBeacon('/api/events', blob)
    } else {
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload),
        keepalive: true,
      }).catch(() => {})
    }
  }

  setIsTracking(false)
}
```

**Validation Steps:**
1. Run `npm run build` - Must succeed
2. Check TypeScript errors: `npx tsc --noEmit` - Must be clean
3. Test `/p/[slug]` page loads without errors
4. Test `/r/[tracking_code]` still tracks events correctly
5. Verify no console errors in browser

**Success Criteria:**
- ✅ Build succeeds without TypeScript errors
- ✅ Profile page renders correctly
- ✅ Recommendations page still tracks events
- ✅ No runtime errors in browser console

---

### Task 1.2: Verify Production Build

**Purpose:** Ensure the fix works in production build, not just dev

**Steps:**
1. Run `npm run build`
2. Verify successful compilation
3. Check build output size (should be reasonable)
4. Optionally: Start production server (`npm run start`) and smoke test

**Success Criteria:**
- ✅ Build completes without errors
- ✅ No warnings about missing dependencies
- ✅ Output size is reasonable (~2-3MB for Next.js app)

---

### Task 1.3: Commit Phase 1 Changes

**Purpose:** Checkpoint working build before proceeding

**Commit Message:**
```
fix: make ContactButton attributionToken optional to support direct profile visits

- Changes attributionToken from required to optional prop
- Adds conditional event tracking (only for attributed visits)
- Fixes TypeScript build error in app/p/[slug]/page.tsx:78
- Direct profile visits now work without attribution token

Closes: Build failure blocking deployment
Related: CODE_QUALITY_AUDIT_2026-01-06.md Issue #1
```

**Steps:**
1. Review changes: `git diff app/components/ContactButton.tsx`
2. Stage file: `git add app/components/ContactButton.tsx`
3. Commit: `git commit -m "fix: make ContactButton attributionToken optional"`
4. Verify commit: `git log -1 --stat`

---

## Phase 2: High Priority (This Week)

**Can start after Phase 1 complete**
**Estimated Time:** 4-5 hours
**Risk Level:** 🟡 MEDIUM (broader changes)

---

### Task 2.1: Move Inline Styles to CSS Classes

**Issue:** `app/r/[tracking_code]/page.tsx:161-167` has inline styles

**Impact:** Maintainability, reusability, consistency

**Implementation Steps:**

1. **Analyze Current Usage**
   - File: `app/r/[tracking_code]/page.tsx`
   - Current: Inline background-image styles
   - Used on: Fixed positioned background div

2. **Create CSS Class**
   - File: `app/globals.css`
   - Add new class: `.hero-background-image`
   - Use existing design tokens for consistency

3. **Update Component**
   - Replace inline style with className
   - Remove style prop
   - Test visual appearance matches

**Code Changes:**

```css
/* app/globals.css - Add after line 304 */

/* ========================================
   Hero Background Image
   Used in: /r/[tracking_code] page
   ======================================== */

.hero-background-image {
  position: fixed;
  inset: 0;
  z-index: 0;
  background-image: url(/assets/harli-marten-n7a2OJDSZns-unsplash.jpg);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
```

```tsx
// app/r/[tracking_code]/page.tsx (lines 158-167)
// BEFORE:
<div
  className="fixed inset-0 z-0"
  style={{
    backgroundImage: 'url(/assets/harli-marten-n7a2OJDSZns-unsplash.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }}
/>

// AFTER:
<div className="hero-background-image" />
```

**Validation Steps:**
1. Visual check: `/r/[tracking_code]` page looks identical
2. Responsive check: Test on mobile, tablet, desktop
3. Performance check: No layout shift or flicker
4. Build check: `npm run build` still succeeds

**Success Criteria:**
- ✅ No inline styles in component
- ✅ Visual appearance unchanged
- ✅ Class is reusable
- ✅ CSS is in proper location (globals.css)

---

### Task 2.2: Optimize Image Assets

**Issue:** 570KB unoptimized JPG slowing page loads

**Impact:** Performance (LCP), Core Web Vitals, user experience

**Implementation Steps:**

1. **Analyze Current State**
   - File: `/assets/harli-marten-n7a2OJDSZns-unsplash.jpg`
   - Size: 570KB
   - Usage: Background image in `/r` route
   - Current: Direct `<div>` with background-image
   - Target: Next.js Image component with optimization

2. **Decision: Background vs Image Component**

   **Problem:** Next.js Image doesn't support background images directly

   **Options:**

   | Approach | Implementation | Pros | Cons |
   |----------|----------------|------|------|
   | Image with object-fit | `<Image fill style={{objectFit: 'cover'}} />` | Automatic optimization | Needs parent container |
   | Keep background-image | Manually optimize JPG | Simpler | Manual optimization needed |
   | CSS background in Image | Hybrid approach | Best of both | Complex setup |

   **Decision:** Use Next.js Image with `fill` and `object-fit: cover`

3. **Create Optimized Image Component**

**Code Changes:**

```tsx
// app/r/[tracking_code]/page.tsx

// Add import at top:
import Image from 'next/image'

// Replace background div (lines 158-167) with:
<div className="fixed inset-0 z-0">
  <Image
    src="/assets/harli-marten-n7a2OJDSZns-unsplash.jpg"
    alt="Background"
    fill
    priority
    quality={85}
    sizes="100vw"
    style={{
      objectFit: 'cover',
      objectPosition: 'center',
    }}
  />
</div>
```

**Additional Optimizations:**

1. **Generate Optimized Source**
   ```bash
   # Optional: Pre-optimize the source image
   # Install sharp: npm install -D sharp
   # Run optimization script
   ```

2. **Configure Next.js Image Optimization**
   ```js
   // next.config.js (if doesn't exist, create it)
   module.exports = {
     images: {
       formats: ['image/avif', 'image/webp'],
       deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
     },
   }
   ```

**Expected Results:**
- AVIF format: ~50-80KB (85-90% reduction)
- WebP format: ~80-120KB (80-85% reduction)
- Responsive variants for different devices
- Lazy loading for off-screen images

**Validation Steps:**
1. Visual check: Background looks identical
2. Network tab: Verify smaller image size loaded
3. Check formats: DevTools should show AVIF or WebP
4. Mobile test: Verify responsive images work
5. Performance: Run Lighthouse, check LCP improvement

**Success Criteria:**
- ✅ Image size reduced by >70% (AVIF/WebP)
- ✅ Visual quality maintained
- ✅ Responsive variants generated
- ✅ LCP improves on mobile
- ✅ Build succeeds with Image component

---

### Task 2.3: Delete Unused Gradient CSS and Component

**Issue:** 172 lines of unused gradient background code

**Files to Modify:**
1. `app/globals.css` (lines 132-304) - DELETE
2. `app/components/GradientBackground.tsx` - DELETE FILE

**Impact:** Reduces CSS bundle size, removes confusion

**Implementation Steps:**

1. **Verify Code is Unused**
   - Search for usage: `grep -r "gradient-bg" app/`
   - Search for imports: `grep -r "GradientBackground" app/`
   - Expected: No usages found (confirmed by session summary)

2. **Delete CSS Section**
   - File: `app/globals.css`
   - Lines: 132-304 (entire gradient section)
   - Keep: Design tokens, typography, layout primitives, liquid glass

3. **Delete Component File**
   - File: `app/components/GradientBackground.tsx`
   - Complete deletion

4. **Verify No Imports Broken**
   - Build should still succeed
   - No import errors

**Safety Check:**
```bash
# Before deletion, verify no references:
git grep "GradientBackground" -- "*.tsx" "*.ts"
git grep "gradient-bg" -- "*.tsx" "*.ts" "*.css"
```

**Expected Output:** No matches (or only in this implementation plan)

**Code Changes:**

```css
/* app/globals.css - DELETE lines 132-304 */
/* Remove entire section from "Greenbit-style Gradient Background"
   through end of animations and blob definitions */
```

```bash
# Delete component file
rm app/components/GradientBackground.tsx
```

**Validation Steps:**
1. Run `npm run build` - Must succeed
2. Visual check: All pages still look correct
3. Search codebase: Verify no references remain
4. Check bundle size: Should be smaller

**Success Criteria:**
- ✅ 172 lines of CSS removed
- ✅ Component file deleted
- ✅ No import errors
- ✅ Build succeeds
- ✅ All pages render correctly

---

### Task 2.4: Create README.md

**Issue:** No README.md exists for production codebase

**Impact:** Onboarding, documentation, maintainability

**Implementation Steps:**

1. **Research Current Setup**
   - Review package.json for scripts
   - Review .env.local structure (don't expose secrets)
   - Review architecture from session summaries
   - Review testing approach from WEEK_4_FINAL.md

2. **Create Comprehensive README**
   - Follow industry standard structure
   - Include setup, architecture, testing, deployment
   - Add badges (optional)
   - Link to detailed docs

**Template Structure:**

```markdown
# Hará Match

> Performance-based lead marketplace connecting people with wellness professionals

## Quick Start

## Tech Stack

## Project Structure

## Setup Instructions

## Environment Variables

## Development

## Testing

## Architecture

## Deployment

## Contributing

## License
```

**Full Content:** (See detailed implementation below)

**Validation Steps:**
1. Review README renders correctly on GitHub
2. Follow setup instructions on fresh clone (if possible)
3. Verify all links work
4. Check formatting is correct

**Success Criteria:**
- ✅ README.md exists and is comprehensive
- ✅ New developer can set up project from README
- ✅ All sections are complete
- ✅ Links work correctly

---

### Task 2.5: Extract Magic Numbers to Named Constants

**Issue:** Magic numbers throughout `/r/[tracking_code]/page.tsx`

**Locations:**
- Line 96: `if (Math.abs(dragOffset) > 70)`
- Line 112: `setTimeout(() => {...}, 420)`
- Line 269: `const baseOffset = (idx - currentIndex) * 88`
- Line 270: `const dragAdjust = dragOffset / 3.5`
- Line 278: `const scale = isCurrent ? 1 : isPrev || isNext ? 0.985 : 0.90`

**Impact:** Maintainability, readability, tunability

**Implementation Steps:**

1. **Identify All Magic Numbers**
   - Read through entire component
   - List all numeric literals
   - Categorize by purpose

2. **Create Constants Section**
   - Add at top of file (after imports, before interfaces)
   - Group by category
   - Add explanatory comments

3. **Replace All Occurrences**
   - Search and replace with constants
   - Verify behavior unchanged
   - Test on device if possible

**Code Changes:**

```tsx
// app/r/[tracking_code]/page.tsx
// Add after imports (line 8), before interfaces (line 10):

// ============================================================================
// INTERACTION CONSTANTS
// Fine-tuned values for card swipe feel and transitions
// ============================================================================

// Swipe Gesture
const SWIPE_THRESHOLD_PX = 70 // Minimum horizontal distance to trigger card navigation
const DRAG_RESISTANCE_FACTOR = 3.5 // Reduces drag sensitivity for smoother feel (higher = less sensitive)

// Card Layout
const CARD_SPACING_PERCENT = 88 // Spacing between cards (88% = 12% visible peek of next card)
const CARD_HEIGHT_VH = 70 // Maximum card height as viewport percentage
const CARD_MIN_HEIGHT_VH = 60 // Minimum card height for small screens
const CARD_MIN_HEIGHT_PX = 400 // Absolute minimum card height

// Card Scaling
const ACTIVE_CARD_SCALE = 1 // Current card scale (no scaling)
const PEEK_CARD_SCALE = 0.985 // Adjacent card scale (slightly smaller)
const FAR_CARD_SCALE = 0.90 // Non-adjacent card scale (more noticeable)

// Card Opacity
const ACTIVE_CARD_OPACITY = 1 // Current card fully visible
const PEEK_CARD_OPACITY = 0.65 // Adjacent cards semi-transparent
const FAR_CARD_OPACITY = 0.25 // Far cards very faint

// Transitions
const REVEAL_TO_DECK_TRANSITION_MS = 420 // Total animation time for reveal→deck crossfade
const REVEAL_EXIT_DURATION_MS = 320 // How long reveal fades out
const DECK_ENTER_DURATION_MS = 380 // How long deck fades in
const CARD_SWIPE_DURATION_MS = 500 // Animation duration for card position changes

// Animation Easing
const TRANSITION_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)' // Custom easing for smooth feel

// ============================================================================

// Then update all usages:

// Line 96:
if (Math.abs(dragOffset) > SWIPE_THRESHOLD_PX) {

// Line 112:
setTimeout(() => {
  setRevealing(false)
  setIsTransitioning(false)
}, REVEAL_TO_DECK_TRANSITION_MS)

// Line 269:
const baseOffset = (idx - currentIndex) * CARD_SPACING_PERCENT

// Line 270:
const dragAdjust = dragOffset / DRAG_RESISTANCE_FACTOR

// Line 278:
const scale = isCurrent
  ? ACTIVE_CARD_SCALE
  : isPrev || isNext
    ? PEEK_CARD_SCALE
    : FAR_CARD_SCALE

// Line 279:
const opacity = isCurrent
  ? ACTIVE_CARD_OPACITY
  : isPrev || isNext
    ? PEEK_CARD_OPACITY
    : FAR_CARD_OPACITY

// Line 260-262:
style={{
  height: `min(${CARD_HEIGHT_VH}vh, 600px)`,
  minHeight: `min(${CARD_MIN_HEIGHT_PX}px, ${CARD_MIN_HEIGHT_VH}vh)`,
}}

// Line 176:
transition: `all ${REVEAL_EXIT_DURATION_MS}ms ${TRANSITION_EASING}`

// Line 238:
transition: `all ${DECK_ENTER_DURATION_MS}ms ${TRANSITION_EASING}`

// Line 290:
transition: dragOffset ? 'none' : `all ${CARD_SWIPE_DURATION_MS}ms ${TRANSITION_EASING}`
```

**Benefits:**
- Easy to tune all interactions from one place
- Self-documenting code
- Easier to maintain consistency
- Better for future developers

**Validation Steps:**
1. Test swipe gestures feel identical
2. Test reveal→deck transition looks same
3. Test card peek effect unchanged
4. Verify build succeeds
5. Check TypeScript has no errors

**Success Criteria:**
- ✅ All magic numbers extracted
- ✅ Constants are well-documented
- ✅ Behavior unchanged
- ✅ Code more readable
- ✅ Easy to tune in future

---

### Task 2.6: Run Full Test Suite

**Purpose:** Ensure all changes didn't break existing functionality

**Steps:**

1. **Run Integration Tests**
   ```bash
   npm run test:integration
   ```
   Expected: 12/12 passing

2. **Run E2E Tests (Dev Mode)**
   ```bash
   npm run e2e:dev
   ```
   Expected: Tests pass (some may skip if no seed data)

3. **Run E2E Tests (Prod Mode)**
   ```bash
   npm run e2e:prod
   ```
   Expected: Auth gating tests pass

4. **Full QA Suite**
   ```bash
   npm run qa:week4
   ```
   Expected: All tests pass

5. **Manual Smoke Testing**
   - Start dev server: `npm run dev`
   - Test `/` (home)
   - Test `/admin/leads` (with auth disabled)
   - Test `/p/[slug]` (profile page)
   - Test `/r/[tracking_code]` (recommendations)
   - Verify no console errors

**Success Criteria:**
- ✅ All integration tests pass (12/12)
- ✅ E2E tests pass in both modes
- ✅ No new TypeScript errors
- ✅ No runtime console errors
- ✅ Visual appearance unchanged

---

### Task 2.7: Commit Phase 2 Changes

**Purpose:** Checkpoint all high-priority fixes

**Strategy:** Multiple focused commits, not one giant commit

**Commits:**

1. **Commit 2.1:** Move inline styles to CSS
   ```
   refactor: move inline background styles to CSS class

   - Adds .hero-background-image class in globals.css
   - Removes inline style prop from /r route background div
   - Improves maintainability and reusability

   Related: CODE_QUALITY_AUDIT_2026-01-06.md Issue #2
   ```

2. **Commit 2.2:** Optimize images
   ```
   perf: optimize background image with Next.js Image component

   - Replaces background-image div with Next.js Image
   - Enables automatic AVIF/WebP format conversion
   - Generates responsive image variants
   - Expected: 70-85% file size reduction

   Related: CODE_QUALITY_AUDIT_2026-01-06.md Issue #3
   ```

3. **Commit 2.3:** Delete unused code
   ```
   chore: remove unused gradient background code

   - Deletes 172 lines of unused gradient CSS (lines 132-304)
   - Deletes app/components/GradientBackground.tsx
   - Gradient approach was abandoned in favor of image background
   - Reduces CSS bundle size and removes confusion

   Related: CODE_QUALITY_AUDIT_2026-01-06.md Issue #4
   ```

4. **Commit 2.4:** Add README
   ```
   docs: add comprehensive README.md

   - Adds setup instructions, architecture overview
   - Documents tech stack and project structure
   - Includes testing and deployment guide
   - Improves onboarding for new developers

   Related: CODE_QUALITY_AUDIT_2026-01-06.md Issue #5
   ```

5. **Commit 2.5:** Extract magic numbers
   ```
   refactor: extract magic numbers to named constants in /r route

   - Adds INTERACTION CONSTANTS section with documented values
   - Replaces 10+ magic numbers with descriptive constants
   - Groups constants by category (swipe, layout, scaling, timing)
   - Improves maintainability and tunability

   Related: CODE_QUALITY_AUDIT_2026-01-06.md Issue #6
   ```

---

## Risk Analysis

### Identified Risks and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing functionality | Medium | High | Run full test suite after each change |
| Visual regression | Medium | Medium | Manual visual checks on all routes |
| Performance degradation | Low | Medium | Test with Lighthouse, check bundle sizes |
| Type errors introduced | Low | High | Run `tsc --noEmit` frequently |
| Merge conflicts with uncommitted work | High | Low | Create backup branch before starting |
| Image optimization fails | Low | Medium | Keep fallback to original image |

### Rollback Triggers

Immediately rollback if:
- Build fails and cannot be fixed in 15 minutes
- Tests fail and root cause unclear
- Visual appearance significantly different
- Performance degrades >20%
- TypeScript errors introduced

---

## Success Criteria

### Phase 1 Complete When:
- [x] Build succeeds without errors
- [x] Profile page loads correctly
- [x] Event tracking still works for recommendations
- [x] Changes committed to git

### Phase 2 Complete When:
- [ ] No inline styles in production components
- [ ] Images optimized with Next.js Image
- [ ] Unused CSS/components deleted
- [ ] README.md exists and is comprehensive
- [ ] Magic numbers extracted to constants
- [ ] All tests pass (12/12 integration + E2E)
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] All changes committed with clear messages

### Overall Success:
- [ ] `npm run build` succeeds
- [ ] `npm run qa:week4` all tests pass
- [ ] Visual appearance unchanged
- [ ] Performance improved (smaller bundle, faster loads)
- [ ] Code quality improved (maintainability, readability)
- [ ] Documentation complete (README, comments)

---

## Rollback Strategy

### If Phase 1 Fails:
```bash
# Discard changes to ContactButton
git checkout -- app/components/ContactButton.tsx

# Verify build still fails (confirms issue was isolated)
npm run build
```

### If Phase 2 Fails:
```bash
# Rollback to Phase 1 completion
git reset --hard HEAD~N  # N = number of Phase 2 commits

# Or rollback specific file:
git checkout HEAD~1 -- path/to/file
```

### Nuclear Option (Complete Rollback):
```bash
# Return to backup branch
git checkout backup-pre-remediation-YYYYMMDD

# Create new branch to restart
git checkout -b remediation-attempt-2
```

---

## Post-Completion Tasks

After Phase 1 + Phase 2 complete:

1. **Update Documentation**
   - Update WEEK_4_FINAL.md with changes made
   - Update session summary
   - Add notes to CODE_QUALITY_AUDIT

2. **Create Summary**
   - Document what was fixed
   - Document what remains (Phase 3)
   - Create metrics (bundle size, test coverage, etc.)

3. **Plan Phase 3** (Optional - Medium Priority Issues)
   - Review if time permits this week
   - Otherwise schedule for next sprint

---

## Appendix A: README.md Content

**File:** `README.md`

```markdown
# Hará Match

> Performance-based lead marketplace connecting people with wellness professionals

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Overview

Hará Match is a performance-based marketplace that connects people seeking wellness services (therapy, coaching, etc.) with qualified professionals. Unlike traditional directories, professionals only pay when they receive qualified leads that match their expertise and availability.

### Key Features

- **Smart Matching Algorithm:** Matches users with 3 ranked professionals based on specialty, availability, and compatibility
- **Performance-Based Billing:** PQL (Pay-per-Qualified-Lead) system with credit ledger
- **Mobile-First Experience:** Premium mobile app-like interface for recommendation viewing
- **Admin Dashboard:** Tools for managing leads, professionals, and billing
- **Event Tracking:** Attribution system for contact tracking and billing

## Tech Stack

### Core
- **Framework:** Next.js 14.2 (App Router)
- **Language:** TypeScript 5.3
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Clerk (pending configuration)

### Infrastructure
- **Rate Limiting:** Upstash Redis
- **Testing:** Vitest (unit/integration), Playwright (E2E)
- **Deployment:** Vercel (recommended)

### Key Libraries
- `@supabase/supabase-js` - Database client
- `@upstash/ratelimit` - API rate limiting
- `jose` - JWT token generation/verification
- `nanoid` - Unique ID generation

## Project Structure

```
hara/
├── app/                      # Next.js App Router
│   ├── admin/                # Admin dashboard routes
│   │   ├── leads/            # Lead management
│   │   ├── professionals/    # Professional directory
│   │   └── pqls/             # PQL ledger management
│   ├── api/                  # API routes
│   │   ├── admin/            # Protected admin endpoints
│   │   ├── events/           # Public event tracking
│   │   ├── public/           # Public data endpoints
│   │   └── debug/            # Development utilities
│   ├── components/           # Shared React components
│   │   └── ui/               # UI component library
│   ├── r/[tracking_code]/    # Public recommendations page
│   ├── p/[slug]/             # Professional profile pages
│   └── layout.tsx            # Root layout
├── lib/                      # Shared utilities
│   ├── supabase-admin.ts     # Supabase service role client
│   ├── attribution-tokens.ts # JWT token generation
│   ├── tracking-code.ts      # Tracking code utilities
│   └── rate-limit.ts         # Rate limiting config
├── __tests__/                # Test suites
│   ├── integration/          # API integration tests
│   └── e2e/                  # Playwright E2E tests
├── scripts/                  # Utility scripts
│   ├── qa-seed.ts            # Development seed data
│   └── qa-seed-e2e.ts        # E2E test data
└── middleware.ts             # Next.js middleware (auth gating)
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Supabase account (or local Supabase instance)
- Upstash Redis account

### 1. Clone and Install

```bash
git clone <repository-url>
cd hara
npm install
```

### 2. Environment Variables

Create `.env.local` in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Clerk Authentication (Optional - defaults to disabled)
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Development Options
NODE_ENV=development
REQUIRE_ADMIN_AUTH=false  # Set true to test auth gating
```

### 3. Database Setup

Run migrations in Supabase:

```sql
-- See schema definitions in:
-- WEEK_1_SUMMARY.md (core tables)
-- WEEK_2_SUMMARY.md (billing tables)
-- WEEK_3_FINAL.md (match tables)
```

### 4. Seed Development Data

```bash
npm run qa:seed-e2e
# Creates test professionals, leads, and matches
```

### 5. Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Testing
npm run test             # Run all tests (Vitest watch mode)
npm run test:integration # Integration tests only
npm run qa:week4         # Full QA suite (integration + E2E with auth)
npm run qa:week4:dev     # QA suite without auth gating

# E2E Testing
npm run e2e:install      # Install Playwright browsers (first time)
npm run e2e:dev          # E2E tests (dev mode)
npm run e2e:prod         # E2E tests (prod-like auth gating)

# Utilities
npm run qa:seed-e2e      # Generate E2E test data
```

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

3. **Test Locally**
   ```bash
   npm run qa:week4:dev  # Run full test suite
   npm run build         # Verify build succeeds
   ```

4. **Commit**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Testing

### Test Structure

- **Unit Tests:** Test individual functions in isolation
- **Integration Tests:** Test API endpoints with real database
- **E2E Tests:** Test complete user flows in browser

### Running Tests

```bash
# Integration tests (12 tests)
npm run test:integration

# E2E tests - Development mode (no auth)
npm run e2e:dev

# E2E tests - Production mode (with auth gating)
npm run e2e:prod

# Full QA suite
npm run qa:week4
```

### Test Modes

**Development Mode (`qa:week4:dev`):**
- Admin routes accessible (no auth)
- All functional tests run
- Best for feature development

**Production Mode (`qa:week4`):**
- Admin routes gated (requires auth)
- Auth gating tests run
- Simulates production security

### Writing Tests

See examples in:
- `__tests__/integration/` - API integration tests
- `__tests__/e2e/` - Playwright E2E tests

## Architecture

### Data Flow

```
User → /r/[tracking_code]
  → GET /api/public/recommendations
    → Supabase (service role)
      → Returns 3 ranked professionals
  → User clicks WhatsApp button
    → ContactButton component
      → navigator.sendBeacon(/api/events)
        → Event stored for billing
      → Opens WhatsApp (new tab)
```

### Key Concepts

**Tracking Code:**
- Format: `M-{timestamp}-{6-char-id}`
- Example: `M-1704067200000-A1B2C3`
- Used to identify matches and attribute contacts

**Attribution Token:**
- JWT containing: `match_id`, `professional_slug`, `rank`, `event_type`
- Signs events to prevent tampering
- Verified by `/api/events` endpoint

**PQL (Pay-per-Qualified-Lead):**
- Credit-based system for billing professionals
- Ledger tracks credits, debits, adjustments
- Partitioned by month for performance

### Security Model

**Public Routes:**
- `/r/[tracking_code]` - Recommendations page
- `/p/[slug]` - Professional profiles
- Rate limited (30 req/5min)

**Protected Routes:**
- `/admin/*` - Admin dashboard
- `/api/admin/*` - Admin APIs
- Gated by middleware in production

**Controlled Endpoints:**
- `/api/public/recommendations` - Service role with validation
- Prevents data leaks vs. broad anon RLS

## Deployment

### Vercel (Recommended)

1. **Connect Repository**
   - Import project in Vercel dashboard
   - Link to GitHub repo

2. **Configure Environment**
   - Add all env vars from `.env.local`
   - Set `NODE_ENV=production`

3. **Deploy**
   - Push to `main` branch
   - Vercel auto-deploys

### Production Checklist

Before deploying:

- [ ] `npm run build` succeeds
- [ ] `npm run qa:week4` all tests pass
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Rate limiting configured
- [ ] Clerk authentication configured
- [ ] Error monitoring setup (Sentry)

### Post-Deployment

1. **Verify Deployment**
   - Test critical paths
   - Check admin auth gating works
   - Verify event tracking works

2. **Monitor**
   - Check error rates
   - Monitor API performance
   - Review rate limit metrics

## API Documentation

### Public Endpoints

**GET `/api/public/recommendations?tracking_code={code}`**
- Returns 3 ranked professionals for a match
- Rate limited: 30 req/5min per IP

**POST `/api/events`**
- Tracks contact events
- Requires attribution token
- Rate limited: 10 req/min per IP

### Admin Endpoints

**POST `/api/admin/matches`**
- Creates new match with 3 recommendations
- Returns tracking code and attribution tokens

**POST `/api/admin/pqls/[id]/adjust`**
- Adjusts PQL balance for a professional
- Requires reason and amount

See WEEK_3_FINAL.md for complete API specs.

## Contributing

### Code Standards

This project follows strict production quality standards:

- ✅ **Production Quality:** Code must compile, tests must pass
- ✅ **Maintainable:** Components ≤300 lines, functions ≤50 lines
- ✅ **Sustainable:** DRY principle, reusable components, type-safe
- ✅ **Scalable:** Optimized assets, efficient queries, proper caching
- ✅ **Not Over-Engineered:** Use platform features, avoid premature abstraction

See CODE_QUALITY_AUDIT_2026-01-06.md for detailed standards.

### Commit Conventions

Use conventional commits:

```
feat: Add new feature
fix: Fix bug
refactor: Refactor code
docs: Update documentation
test: Add tests
chore: Maintenance tasks
perf: Performance improvements
```

## Troubleshooting

### Build Fails

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

### Tests Fail

```bash
# Integration tests
# Ensure .env.local has correct Supabase keys
# Run seed script: npm run qa:seed-e2e

# E2E tests
# Install browsers: npm run e2e:install
# Check dev server starts: npm run dev
```

### Rate Limit Issues in Tests

```bash
# Tests use unique namespace to avoid collisions
# If still failing, wait 5 minutes or flush Redis
```

## License

MIT

## Support

For issues or questions:
- Open GitHub issue
- Review session summaries for context
- Check CODE_QUALITY_AUDIT for known issues

---

**Last Updated:** 2026-01-06
**Version:** 1.0.0
```

---

## Execution Checklist

Use this checklist during implementation:

### Pre-Execution
- [ ] Create backup branch
- [ ] Review all tasks in order
- [ ] Understand dependencies
- [ ] Verify current state (git status, build status)

### Phase 1
- [ ] Task 1.1: Fix TypeScript error
- [ ] Task 1.2: Verify production build
- [ ] Task 1.3: Commit changes
- [ ] Verify: Build succeeds, profile page works

### Phase 2
- [ ] Task 2.1: Move inline styles to CSS
- [ ] Task 2.2: Optimize image assets
- [ ] Task 2.3: Delete unused code
- [ ] Task 2.4: Create README.md
- [ ] Task 2.5: Extract magic numbers
- [ ] Task 2.6: Run full test suite
- [ ] Task 2.7: Commit all changes
- [ ] Verify: All success criteria met

### Post-Execution
- [ ] Update documentation
- [ ] Create summary report
- [ ] Plan next steps (Phase 3)

---

**Ready to Execute:** ✅ Plan is complete and reviewed
**Next Step:** Begin Phase 1, Task 1.1 (Fix TypeScript Build Error)
