# Hará Match

> The Spanish-speaking wellness trust layer — verified professionals, real-interaction reputation, human-curated concierge fallback.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Overview

Hará Match is a curated wellness professional marketplace for Spanish-speaking markets (LATAM + Spain, Argentina home). It's a trust layer between people seeking wellness support (therapy, coaching, somatic practices) and the professionals who can provide it.

**📖 For the full product context — what we're building, who it's for, where, why, and how we measure success — read [`PRODUCT.md`](./PRODUCT.md).**

Two ways in:

- **Browse (Directory)** — `/profesionales`. Reputation-ranked discovery of verified professionals. Most users land here.
- **Concierge (Solicitar)** — `/solicitar`. User describes what they need, admin hand-picks 3 recommendations delivered via tracking link `/r/[code]`. The "we pick for you" differentiator.

Both paths end in a WhatsApp conversation between user and professional, on the user's terms.

### Key Capabilities

- **Verified-only directory** with reputation-based ranking (profile completeness + real-interaction reviews + paid Destacado boost)
- **Human-curated concierge flow** for users who want a recommendation made for them
- **Subscription tiers** for professional visibility (Básico free, Destacado paid)
- **Real-interaction reviews** — review links sent only to users who actually contacted a professional
- **Admin dashboard** for managing professionals, leads, matches, reviews, and Destacado tier payments
- **WhatsApp-first contact** with attribution tracking preserved for optional concierge billing

## Tech Stack

### Core
- **Framework:** Next.js 14.2 (App Router)
- **Language:** TypeScript 5.3
- **Styling:** Tailwind CSS v4 (`@theme` directive in `app/globals.css`, NOT `theme.extend`)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (admin only — professional `/pro/*` portal is Phase 3)
- **Email:** Resend (transactional)

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

# Resend (Transactional Email)
RESEND_API_KEY=your_resend_key

# Cron auth (for scheduled jobs)
CRON_SECRET=your_cron_secret

# Development Options
NODE_ENV=development
```

### 3. Database Setup

Run migrations in Supabase:

```sql
-- See complete schema in FINAL_SPEC.md (single source of truth)
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

Solo-dev workflow: work directly on `main`, push when ready. The pre-push hook runs unit tests; CI runs on Vercel preview/prod deploys.

1. **Make Changes** on `main`
   - Write code
   - Add tests (TDD preferred — see CLAUDE.md and `.claude/rules/`)
   - Update documentation if affected

2. **Test Locally**
   ```bash
   npm run qa:week4:dev  # Run full test suite
   npm run build         # Verify build succeeds
   ```

3. **Commit + Push**
   ```bash
   git add .
   git commit -m "feat(scope): your change"
   git push  # pre-push hook runs unit tests
   ```

For larger work, use the `/spec` workflow (see `.claude/skills/`) which produces a plan + PRD + manual-testing doc and runs verification gates.

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

### Data Flows

**Browse (Directory) — primary path:**

```
User → /profesionales
  → server-rendered list, sorted by ranking_score DESC
  → User opens /p/[slug]
  → User clicks WhatsApp button
    → ContactButton fires /api/events (direct contact, no token)
    → Opens WhatsApp (new tab)
  → 7 days later: cron sends review request → /r/review/[token]
```

**Concierge (Solicitar) — high-trust path:**

```
User → /solicitar
  → POST /api/leads (intake form)
  → Admin reviews lead at /admin/leads/[id]
  → Admin creates match with 3 ranked recommendations → tracking_code generated
  → User receives /r/[tracking_code] link via WhatsApp
  → GET /api/public/recommendations
    → Supabase (service role) → 3 ranked professionals
  → User clicks WhatsApp → /api/events (with attribution token)
  → 7 days later: cron sends review request
```

### Key Concepts

**Ranking Score:** Computed in `lib/ranking.ts` and mirrored in the `recompute_ranking()` SQL trigger. Inputs: profile completeness (0–100), rating average + count, subscription tier (Básico / Destacado), tier expiry. Directory sorts by `ranking_score DESC`.

**Tracking Code:** Identifies a concierge match. Format: `M-{timestamp}-{6-char-id}`. Direct (browse) contacts use `direct-{slug}-{nanoid(10)}`.

**Attribution Token:** JWT containing `match_id`, `professional_slug`, `rank`, `event_type`. Signs concierge contact events to prevent tampering. Direct (browse) contacts skip the token and pass `professional_slug` directly.

**Review Request:** After a contact event, a daily cron picks events 7 days old and emails the user a one-time `/r/review/[token]` link. Reviews are tied to a real interaction — no anonymous spam.

**PQL (Pay-per-Qualified-Lead):** Original billing system, preserved as optional infrastructure for the concierge flow. Credit-based ledger, partitioned by month. Not the primary revenue model post-pivot — see `PRODUCT.md`.

**Destacado Tier:** Paid visibility tier for professionals. Admin records payment via `/admin/professionals` modal → `upgrade_destacado_tier()` RPC → ranking trigger boosts the professional → public Destacado chip shows on `/profesionales` and `/p/[slug]`. Daily cron expires lapsed tiers.

### Security Model

**Public Routes:**
- `/profesionales` — directory
- `/p/[slug]` — professional profile
- `/solicitar` — concierge intake form
- `/r/[tracking_code]` — concierge recommendations
- `/r/review/[token]` — review submission (no login)
- Rate limited (30 req/5min on read paths, tighter on writes)

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
- [ ] Database migrations applied (currently 001 → 006)
- [ ] Rate limiting configured (Upstash Redis)
- [ ] Supabase Auth admin user provisioned
- [ ] Resend domain verified (so emails reach real users)
- [ ] Error monitoring setup (Sentry — Phase 1)

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

**POST `/api/admin/subscriptions`**
- Records a Destacado tier payment for a professional (admin-gated)
- Atomic via `upgrade_destacado_tier()` RPC

**POST `/api/admin/reviews/[id]`**
- Toggle `is_hidden` on a review (moderation)

See `FINAL_SPEC.md` for the database schema and `docs/prd/` for feature-level API specs.

## Contributing

### Code Standards

This project follows strict production quality standards:

- ✅ **Production Quality:** Code must compile, tests must pass
- ✅ **Maintainable:** Components ≤440 lines, functions ≤50 lines
- ✅ **Sustainable:** DRY principle, reusable components, type-safe
- ✅ **Scalable:** Optimized assets, efficient queries, proper caching
- ✅ **Not Over-Engineered:** Use platform features, avoid premature abstraction

See CLAUDE.md for detailed standards and DEVELOPMENT_HISTORY.md for context.

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
- Review `.claude/plans/main.md` for current work and session log
- Check `KNOWN_ISSUES.md` for documented issues

---

**Last Updated:** 2026-04-30
