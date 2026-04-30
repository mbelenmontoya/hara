# Hará Match — Development History (Pre-Pivot)

**Scope of this document:** The original PQL-only lead marketplace built Dec 2025 – Jan 2026. **The product pivoted on Apr 1, 2026** to a directory + concierge marketplace ("Spanish-speaking wellness trust layer"). For current product context see [`PRODUCT.md`](./PRODUCT.md); for current operational status see [`.claude/plans/main.md`](./.claude/plans/main.md).

**Timeline covered:** December 2025 – January 2026 (Weeks 1–4 + early code quality remediation)
**Status at end of period:** Production-ready PQL-only lead marketplace (Week 4 Complete)
**Post-pivot state:** PQL infrastructure preserved as optional layer for the concierge flow; primary flow is now Browse + Concierge.

---

## Purpose of This Document

This document captures the historical development of Hará Match through Week 4 (Jan 2026). It is **not** a current-state document — it explains the architecture choices that led to today's codebase, including the PQL system that was the original product.

**For AI Assistants:** Use this for context on *why* certain primitives exist (events table, attribution tokens, PQL ledger). For *what we're building now*, read `PRODUCT.md` and `.claude/plans/main.md` first.

**For Developers:** Quick reference to understand the system's evolution and the rationale for early architectural decisions.

---

## Week 1: Database Schema + RLS + Admin APIs

**Focus:** Core data model, security foundation, admin operations
**Duration:** ~1 week
**Deliverable:** Secure database with fail-closed RLS policies

### What Was Built

**Database Schema:**
- `professionals` - Professional directory with slug-based routing
- `leads` - User inquiries with intent tags and metadata
- `matches` - Connect leads with professionals (1-to-many)
- `match_recommendations` - Individual recommendations (rank 1-3)
- `events` - Contact tracking for billing attribution
- `pqls` - Credit ledger (partitioned by month for performance)
- `pql_adjustments` - Manual credit adjustments with audit trail

**Security Model:**
- Row-Level Security (RLS) on all tables
- Service role for admin operations only
- Anon role completely blocked (no public writes)
- PostgREST bypass prevention validated

**Key APIs:**
- `POST /api/admin/matches` - Create match (requires service role)
- Admin operations use `supabaseAdmin` (service role client)

### Architectural Decisions

1. **Partitioned PQL Table:** Monthly partitions for scalability (prevents unbounded table growth)
2. **Fail-Closed Security:** RLS blocks everything by default, explicit allow only
3. **Service Role Pattern:** Admin APIs use service role, never expose to client
4. **Slug-Based Routing:** `/p/[slug]` for SEO-friendly professional profiles

### Testing Established

- `scripts/qa-seed.ts` - Creates test data (3 professionals, 1 match)
- `scripts/qa-rls-bypass.test.ts` - Validates RLS blocks anon access
- `SELF_QA_RULES.md` - QA validation rules for ongoing work

---

## Week 2: Billing Engine + PQL Ledger

**Focus:** Performance-based billing system
**Duration:** ~1 week
**Deliverable:** Credit-based billing with adjustments

### What Was Built

**PQL (Pay-per-Qualified-Lead) System:**
- Credits automatically deducted when contact_click event occurs
- Ledger tracks all debits and credits
- Adjustments support manual corrections (refunds, bonuses)
- Partitioned by month (`billing_month` column)

**Partition Management:**
- Dynamic partition creation for future months
- Automatic routing to correct partition based on `billing_month`
- Prevents data from landing in wrong partition

**Billing Logic:**
- 1 contact_click event = 1 PQL debit
- Idempotency: Same tracking_code + professional = 1 PQL max
- Adjustments tracked separately with reason + admin_id

### Key Implementation Details

**Partition Format:**
```sql
CREATE TABLE pqls_2025_12 PARTITION OF pqls
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
```

**Credit Flow:**
```
Event ingested → Check idempotency → Create PQL → Deduct credit
```

### Testing

- Integration tests for billing logic
- Idempotency validation
- Partition insertion tests

---

## Week 3: Match Creation + Attribution Tokens

**Focus:** Atomic match creation, signed tokens for event attribution
**Duration:** ~1 week
**Deliverable:** End-to-end match workflow with billing attribution

### What Was Built

**Atomic Match Creation API:**
- `POST /api/admin/matches` - Creates match + 3 recommendations in single transaction
- Generates tracking code (`M-{timestamp}-{6-char-id}`)
- Generates attribution tokens (JWT) for each recommendation
- Returns tokens to admin for link distribution

**Attribution Token System:**
- JWT tokens sign events to prevent tampering
- Claims: `match_id`, `professional_slug`, `rank`, `event_type`, `exp`
- Verified by `/api/events` endpoint
- Prevents:
  - Fake events (must have valid signature)
  - Replay attacks (expiration)
  - Rank manipulation (signed into token)

**Tracking Code:**
- Format: `M-1704067200000-A1B2C3` (M-timestamp-randomId)
- Used in public URLs: `/r/{tracking_code}`
- Links match to events for billing

### Key Architectural Decisions

1. **Signed Tokens:** Prevents billing fraud (events must be signed)
2. **Atomic Operations:** Match + recommendations + tokens created together
3. **Controlled Public Endpoint:** `/api/public/recommendations` prevents data leaks
4. **Service Role for Reads:** Avoids broad anon RLS policies

### Testing

- **Integration Tests (12 total):**
  - Admin matching API (7 tests)
  - Event ingestion API (5 tests)
- Validates atomicity, token generation, billing logic

---

## Week 4: UI + E2E Tests + Middleware

**Focus:** User-facing pages, end-to-end testing, production security
**Duration:** ~1 week
**Deliverable:** Complete UI with E2E validation

### What Was Built

**Public Pages:**
- `/` - Home page (value prop, CTAs)
- `/r/[tracking_code]` - Recommendations page (mobile-first card deck)
- `/p/[slug]` - Professional profile pages

**Admin Pages:**
- `/admin/leads` - Lead management inbox
- `/admin/leads/[id]/match` - Match creation form
- `/admin/professionals` - Professional directory
- `/admin/pqls` - PQL ledger management

**Components:**
- `ContactButton` - WhatsApp navigation with event tracking
  - Uses `navigator.sendBeacon()` (non-blocking)
  - Falls back to `fetch(..., {keepalive: true})`
  - Never blocks navigation

**Security - Middleware:**
- Gates `/admin/*` and `/api/admin/*` routes
- Fail-closed in production (503 without Clerk)
- `REQUIRE_ADMIN_AUTH=true` flag for testing

**E2E Tests (Playwright):**
- `admin-auth-gating.spec.ts` - Validates middleware protection
- `admin-match-flow.spec.ts` - Tests match creation workflow
- `public-contact.spec.ts` - Tests contact tracking
- `ui-smoke.spec.ts` - Prevents routing/styling regressions

### Test Modes

**Development Mode (`npm run qa:week4:dev`):**
- Admin routes accessible (no auth)
- Functional tests run
- Best for feature development

**Production Mode (`npm run qa:week4`):**
- Admin routes gated
- Security tests run
- Simulates production

### Key Lessons

1. **Tailwind v4 Differences:**
   - Must use `@theme` directive in CSS
   - Different color token naming
   - `.next/` cache corruption requires `rm -rf .next`

2. **Validation Must Match Generators:**
   - Tracking code regex must match actual format
   - Don't hardcode divergent patterns

3. **Test Coverage Gaps:**
   - Integration tests don't cover all endpoints
   - E2E depends on seed data availability

---

## Session 2026-01-02: Design System Implementation

**Focus:** Consistent UI design language across app
**Outcome:** Design tokens, typography, component library

### What Was Implemented

**Design Tokens (app/globals.css):**
- Warm neutrals (#FBF7F2 background, #1F1A24 foreground)
- Brand violet (#4B2BBF), teal success, apricot warning, coral danger
- Spacing scale (4px base → 12/16/24/32/48)
- Layout primitives (container, section, stack)

**Typography:**
- Crimson Pro (display serif) + Manrope (body sans)
- Defined heading hierarchy

**UI Component Library (app/components/ui/):**
- Button, Card, Input, Textarea, Select
- Badge, Alert, EmptyState, Modal, Table
- Glass surface effects, soft shadows

**Layouts:**
- `PublicLayout` - Warm background, minimal chrome
- `AdminLayout` - Admin navigation, tighter spacing

**Pages Updated:**
- `/` - Home with value prop and CTAs
- `/ui` - Component showcase (kitchen sink)
- `/admin/leads` - Card list with design system

### Critical Bug Fixed

**Problem:** `/r/[tracking_code]` returning 404

**Root Cause:** API validation regex wrong
- Expected: `/^[a-zA-Z0-9]{8,16}$/`
- Actual: `M-{timestamp}-{6-char}` (contains hyphens, 21 chars)

**Fix:** Updated validation to `/^M-\d{13}-[A-Z0-9]{6}$/`

---

## Session 2026-01-06: /r Route UX Polish

**Focus:** Premium mobile experience for recommendations page
**Outcome:** Card deck with gestures, reveal transition

### What Was Implemented

**UX Improvements:**
- Reveal → Deck crossfade transition (320ms exit, 380ms enter)
- Card peek effect (88% spacing shows 12% of next card)
- Horizontal swipe navigation (70px threshold)
- No vertical scroll in cards (content clamped)
- CTA inside each card (app-native pattern)

**Copy Improvements:**
- "Tus 3 opciones están listas"
- "Ver mis 3 opciones"
- "Deslizá para comparar"
- Dynamic WhatsApp messages with specialty

**Data Quality:**
- Removed regex heuristics
- Improved seed data with realistic Spanish names
- Production-quality validation approach

### Background Experiments (Abandoned)

**Tried:**
1. Custom aurora blobs (too engineered)
2. Greenbit-portal gradient system (accessibility issues)
3. **Final:** Image background (simple, effective)

**Lesson:** "Letting GPT run like a designer was bad idea" - stick to clear direction, delete experiments immediately

---

## Code Quality Remediation (2026-01-06)

**Focus:** Production-grade code quality and maintainability
**Duration:** ~6 hours
**Outcome:** All 23 identified issues resolved

### Issues Resolved

**🔴 Blocking (1):**
- TypeScript build failure → Fixed

**🟠 High Priority (6):**
- Inline styles → CSS classes
- 570KB unoptimized image → Next.js Image (70-85% reduction)
- 150+ lines unused CSS → Deleted
- No README → Comprehensive documentation
- 15+ magic numbers → Named constants
- Image 404 errors → Fixed (moved to /public)

**🟡 Medium Priority (7):**
- 600-line component → Refactored (440 lines + 3 hooks + BottomSheet)
- Hardcoded strings → i18n translation structure
- No error boundaries → Root + route-level boundaries
- Type safety issues → Proper guards
- Inconsistent comments → JSDoc throughout
- No environment validation → Startup validation
- Deprecation warnings → Fixed

**🟢 Low Priority (9):**
- Accessibility ARIA labels → Added
- SEO meta tags → Complete (Open Graph, Twitter Card)
- Error monitoring → Sentry-ready infrastructure
- Documentation → 6 comprehensive guides
- .gitignore → Comprehensive coverage

### Architectural Improvements

**Custom Hooks Created:**
- `useRecommendations` - Data fetching logic
- `useSwipeGesture` - Touch gesture handling
- `useRevealTransition` - Animation state management

**Components Extracted:**
- `BottomSheet` - Professional details modal (195 lines, reusable)

**Infrastructure Added:**
- Error boundaries (graceful failure handling)
- Environment validation (fail-fast on misconfiguration)
- Monitoring utilities (ready for Sentry)
- Translation structure (i18n-ready)

### Code Quality Standards Established

All code must now follow:
- ✅ **Production Quality:** Compiles, tests pass, type-safe
- ✅ **Maintainable:** Components ≤440 lines, functions ≤50 lines
- ✅ **Sustainable:** DRY principle, reusable components
- ✅ **Scalable:** Optimized assets, efficient architecture
- ✅ **Not Over-Engineered:** Platform features, simple solutions

---

## Current System Architecture

### Tech Stack

**Core:**
- Next.js 14.2 (App Router)
- TypeScript 5.3
- Tailwind CSS v4
- Supabase (PostgreSQL)
- Clerk (pending configuration)

**Infrastructure:**
- Upstash Redis (rate limiting)
- Vitest (integration tests)
- Playwright (E2E tests)

### Data Flow

```
User submits inquiry
  → Admin creates match (selects 3 professionals)
    → System generates tracking code + attribution tokens
      → Admin sends link: /r/{tracking_code}
        → User views 3 recommendations
          → User clicks WhatsApp button
            → ContactButton tracks event (sendBeacon)
              → Event creates PQL (billing)
                → WhatsApp opens (new tab)
```

### Security Model

**Public Routes:**
- `/r/[tracking_code]` - Recommendations (controlled endpoint)
- `/p/[slug]` - Professional profiles
- Rate limited: 30 req/5min

**Protected Routes:**
- `/admin/*` - Admin dashboard
- `/api/admin/*` - Admin APIs
- Gated by middleware in production
- Returns 503 if no Clerk auth configured

**Controlled Reads:**
- `/api/public/recommendations` uses service role with validation
- Prevents data leaks vs. broad anon RLS policies
- Returns only whitelisted fields

### Key Concepts

**Tracking Code:**
- Format: `M-1704067200000-A1B2C3`
- Links public URLs to matches
- Used for event attribution

**Attribution Token:**
- JWT with claims: `match_id`, `professional_slug`, `rank`
- Prevents billing fraud (events must be signed)
- Verified by `/api/events` endpoint

**PQL Ledger:**
- Credit-based billing system
- Partitioned by month for performance
- Tracks debits (contact events) and credits (adjustments)

---

## Testing Strategy

### Integration Tests (12 tests)
- Admin matching API (7 tests)
- Event ingestion API (5 tests)
- Run with: `npm run test:integration`

### E2E Tests (7 test cases)
- Admin auth gating (3 tests)
- UI smoke test (1 test)
- Admin match flow (2 tests)
- Public contact tracking (1 test)
- Run with: `npm run qa:week4` or `npm run qa:week4:dev`

### Test Modes

**Development (`qa:week4:dev`):**
- No auth gating
- All functional tests run
- Requires seed data: `npm run qa:seed-e2e`

**Production (`qa:week4`):**
- Auth gating enabled (`REQUIRE_ADMIN_AUTH=true`)
- Security tests run
- Simulates production environment

### Critical Test Rules (SELF_QA_RULES.md)

1. **RLS Bypass Must Fail** - Anon role blocked on all tables
2. **Service Role Works** - Admin operations succeed
3. **Seed Creates Distinct Professionals** - No constraint violations
4. **Partitions Accept Data** - Dynamic month partitioning works

---

## Key Architectural Patterns

### 1. Controlled Public Endpoints

**Problem:** Broad anon RLS policies risk data leaks
**Solution:** Service role endpoints with explicit validation

```typescript
// app/api/public/recommendations/route.ts
// Uses supabaseAdmin (service role)
// Validates tracking_code format
// Returns only whitelisted fields
```

### 2. Attribution Token Security

**Problem:** Events could be faked or manipulated
**Solution:** JWT-signed attribution tokens

```typescript
// lib/attribution-tokens.ts
// Creates: JWT with match_id, professional_slug, rank
// Verifies: Signature, expiration, claims
// Prevents: Fake events, rank manipulation
```

### 3. Non-Blocking Event Tracking

**Problem:** Tracking shouldn't delay navigation
**Solution:** sendBeacon + keepalive fetch

```typescript
// ContactButton component
// Uses navigator.sendBeacon() (preferred)
// Fallback: fetch with keepalive: true
// Never awaits, never blocks WhatsApp navigation
```

### 4. Fail-Closed Security

**Problem:** Accidentally exposing admin routes in production
**Solution:** Middleware gates by default

```typescript
// middleware.ts
// Gates if: REQUIRE_ADMIN_AUTH=true OR (production AND no Clerk)
// Returns 503 (not 401) - service unavailable
```

---

## Component Architecture (Current)

### /r/[tracking_code] Route

**Refactored Structure:**
```
page.tsx (440 lines) - Orchestration
├── hooks/
│   ├── useRecommendations.ts - Data fetching
│   ├── useSwipeGesture.ts - Touch handling
│   └── useRevealTransition.ts - Animation state
└── components/
    └── BottomSheet.tsx - Details modal
```

**Interaction Constants:**
- All magic numbers extracted to named constants
- Documented for easy tuning
- Includes: swipe thresholds, card spacing, timing, easing

**Design:**
- Mobile-first card deck (horizontal swipe)
- Reveal screen → Deck crossfade transition
- Card peek effect (12% of next card visible)
- Glass morphism with warm color palette

### Design System

**Tokens:**
- Warm neutrals (wellness-focused)
- Brand violet (#4B2BBF)
- Semantic colors (success, warning, danger, info)
- 4px spacing scale

**Components (app/components/ui/):**
- Button, Card, Input, Badge, Alert, Table, Modal, EmptyState
- All follow design tokens
- Consistent spacing and shadows

**Layouts:**
- PublicLayout - Warm background, minimal chrome
- AdminLayout - Admin nav, tighter spacing

---

## Lessons Learned

### Technical Lessons

1. **Validation Must Match Generators**
   - Tracking code regex must match actual format
   - Import validation from source of truth, don't duplicate

2. **Test Coverage Gaps Exist**
   - Integration tests don't cover all endpoints
   - E2E tests depend on seed data
   - Need explicit contract tests for validation rules

3. **Tailwind v4 Specifics**
   - Use `@theme` directive, not `theme.extend`
   - Color tokens must be properly prefixed
   - Cache corruption requires manual `.next/` deletion

4. **Mobile-First ≠ Responsive Web**
   - Fixed pixel offsets break on narrow screens
   - Percentage-based positioning needs careful tuning
   - App-like experiences require different thinking

5. **TypeScript Strict Mode**
   - Optional chaining (`?.`) needed for env vars
   - Proper type guards better than assertions
   - Prevents runtime errors

### Process Lessons

1. **Design Systems Take Time**
   - Tokens + typography + 8 components + pages = multi-hour work
   - Validate incrementally, don't implement everything then test

2. **Don't Change Multiple Variables at Once**
   - Test one thing at a time for effective debugging
   - Extracted constants make this easier

3. **Production Quality Over Quick Fixes**
   - Fix data at source, not in UI with heuristics
   - Proper validation beats regex pattern matching

4. **Delete Unused Code Immediately**
   - "Letting GPT run like a designer was bad idea"
   - 150+ lines of gradient CSS abandoned but left in codebase
   - Fixed in code quality remediation

5. **Communication is Critical**
   - Clarify requirements before implementing major changes
   - Document decisions and trade-offs
   - Session summaries help track context

---

## Testing Infrastructure

### Global Setup (Vitest)

**File:** `__tests__/setup/global-setup.ts`

**Purpose:**
- Starts Next.js dev server before tests
- Stops server after tests complete
- Clears `.next/` cache to prevent corruption

**Key Details:**
- Single worker (sequential tests)
- 60s timeout for server startup
- Graceful shutdown with SIGTERM

### Rate Limiting in Tests

**Problem:** Redis collision when running tests back-to-back
**Solution:** `RATE_LIMIT_NAMESPACE=test-$(date +%s)`

Each test run uses unique namespace, preventing interference.

### Seed Data

**Development:** `scripts/qa-seed.ts`
- Creates realistic test data
- Uses Spanish names (María González, Carlos Rodríguez)
- Realistic reasons (40+ characters)

**E2E:** `scripts/qa-seed-e2e.ts`
- Deterministic test data
- Idempotent (safe to run multiple times)
- Only touches `e2e-*` prefixed data

---

## Known Issues & Workarounds

### 1. E2E Tests Never All Pass in One Run

**Issue:** No single mode executes all 7 E2E tests
**Reason:** Security vs functional tests require different configs

**Modes:**
- `qa:week4` (prod): Runs auth-gating (3) + ui-smoke (1) = 4 tests, skips 3
- `qa:week4:dev` (dev): Runs functional (3) + ui-smoke (1) = 4 tests, skips 3

**Workaround:** This is intentional - validates both security and functionality

### 2. Next.js Cache Corruption

**Issue:** `.next/` directory occasionally corrupts during development
**Symptom:** JSON parsing errors, manifest issues

**Fix:** `rm -rf .next && npm run build`

### 3. Clerk Placeholder

**Issue:** Clerk auth configured but not implemented
**Current:** Middleware checks for Clerk keys, gates if missing

**Production:** Set `CLERK_SECRET_KEY` to enable admin access

---

## Current File Structure

```
hara/
├── app/
│   ├── admin/              # Admin dashboard
│   ├── api/                # API routes
│   ├── components/         # Shared components
│   │   └── ui/             # Design system
│   ├── r/[tracking_code]/  # Recommendations (refactored)
│   │   ├── hooks/          # Custom hooks
│   │   └── components/     # Route-specific components
│   ├── p/[slug]/           # Professional profiles
│   ├── error.tsx           # Root error boundary
│   └── layout.tsx          # Root layout + SEO meta
├── lib/
│   ├── supabase-admin.ts   # Service role client
│   ├── attribution-tokens.ts # JWT generation
│   ├── rate-limit.ts       # Upstash configuration
│   ├── env.ts              # Environment validation
│   ├── monitoring.ts       # Error logging (Sentry-ready)
│   └── translations/       # i18n structure
├── __tests__/
│   ├── integration/        # API tests (12)
│   ├── e2e/                # Playwright tests (7)
│   └── setup/              # Test configuration
├── scripts/
│   ├── qa-seed.ts          # Dev seed data
│   └── qa-seed-e2e.ts      # E2E seed data
├── public/
│   └── assets/             # Images (optimized with Next.js Image)
├── middleware.ts           # Auth gating (fail-closed)
└── [docs]                  # README, specs, guides
```

---

## Development Workflow

### Standard Development

```bash
# 1. Start dev server
npm run dev

# 2. Make changes

# 3. Test
npm run test:integration  # API tests
npm run build             # Verify compiles

# 4. Commit
git add .
git commit -m "feat: description"
git push origin main
```

### QA Before Deploy

```bash
# Full QA suite
npm run qa:week4

# Or with functional tests:
npm run qa:seed-e2e  # Generate test data
npm run qa:week4:dev
```

---

## Production Readiness Status

**Current State:** 98% Ready

### ✅ Complete
- Database schema with RLS
- Admin APIs (match creation, PQL adjustments)
- Public pages (/r, /p, /)
- Event tracking with attribution
- Rate limiting (Upstash)
- E2E test coverage
- Error boundaries
- Environment validation
- Optimized images
- Comprehensive documentation
- Type-safe codebase
- i18n infrastructure

### ⚠️ Before Production Deploy
- Configure Clerk authentication keys
- Optional: Add Sentry DSN
- Optional: Enable Cloudflare proxy (DDoS protection)
- Review PRODUCTION_READINESS.md checklist

### 📊 Metrics Targets (Production)
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1
- Uptime > 99.9%
- Error rate < 0.1%

---

## Useful Commands Reference

### Development
```bash
npm run dev              # Start dev server
npm run build            # Production build
```

### Testing
```bash
npm run test:integration # API tests (12)
npm run qa:week4         # Full QA (prod mode)
npm run qa:week4:dev     # Full QA (dev mode)
npm run qa:seed-e2e      # Generate E2E seed data
```

### QA Rules
```bash
npm run qa:rls-bypass    # Validate RLS blocking
npm run qa:service-smoke # Validate service role works
```

---

## Key Takeaways for Future Development

### Do ✅
- Test after every change
- Extract constants before they become magic numbers
- Delete unused code immediately
- Use platform features (Next.js Image, Error Boundaries)
- Document architectural decisions
- Follow established code quality standards

### Don't ❌
- Change multiple variables at once (hard to debug)
- Leave abandoned experiments in codebase
- Use inline styles in production code
- Skip environment validation
- Over-engineer solutions
- Let "GPT run like a designer" without clear direction

### Patterns to Follow
- Use custom hooks for separation of concerns
- Extract components when >200 lines or reusable
- Centralize strings in translations
- Add error boundaries to critical paths
- Use proper type guards, not assertions
- Document complex logic with JSDoc

---

## Reference Documentation

**Essential Docs:**
- **README.md** - Setup, architecture, testing
- **FINAL_SPEC.md** - System design source of truth
- **PRODUCTION_READINESS.md** - Deployment checklist
- **SELF_QA_RULES.md** - QA validation rules
- **This file (DEVELOPMENT_HISTORY.md)** - Context and history

**For Deployment:**
- PRODUCTION_READINESS.md has complete checklist
- Includes monitoring, security, and performance guidelines

**For Development:**
- README.md has all commands and workflows
- SELF_QA_RULES.md has validation commands

---

**Last Updated:** 2026-01-06
**Current Status:** Production-ready, awaiting Clerk configuration for deployment
