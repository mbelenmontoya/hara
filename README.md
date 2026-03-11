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
- Review session summaries for context
- Check CODE_QUALITY_AUDIT for known issues

---

**Last Updated:** 2026-01-06
**Version:** 1.0.0
