# Test Results Directory

This directory contains Playwright E2E test artifacts (screenshots, traces, error contexts).

## Quick Start Guide

### Prerequisites

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Install Playwright Browsers
```bash
npm run e2e:install
```

This installs Chromium for E2E testing (one-time setup).

#### 3. Configure Environment Variables

Create `.env.local` in project root with the following required variables:

```bash
# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Attribution tokens (required)
ATTRIBUTION_TOKEN_SECRET=your-base64-secret

# Upstash Redis (required for rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Clerk (optional - placeholders ok for testing)
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```

**Note:** Contact repo maintainer for actual credentials. Never commit `.env.local` to git.

### Running QA Suites

#### Option 1: Prod-Gated Mode (Security Validation)
```bash
npm run qa:week4
```

**What it does:**
- Runs integration tests (12 tests)
- Runs E2E with `REQUIRE_ADMIN_AUTH=true` (auth gating enabled)
- Validates that protected routes return 503

**Expected output:**
```
Test Files  2 passed (2)
     Tests  12 passed (12)        [Integration]

  3 skipped
  4 passed (E2E)

E2E tests executed:
  ✓ admin-auth-gating (3 tests)  - validates 503 responses
  ✓ ui-smoke (1 test)             - validates root route + CSS

E2E tests skipped:
  - admin-match-flow (2 tests)   - require admin access (not available when gated)
  - public-contact (1 test)      - requires admin access (not available when gated)
```

#### Option 2: Dev Mode (Functional Validation)
```bash
npm run qa:week4:dev
```

**What it does:**
- Runs integration tests (12 tests)
- Seeds deterministic E2E test data
- Runs E2E without auth gating (functional flows enabled)

**Expected output:**
```
Test Files  2 passed (2)
     Tests  12 passed (12)        [Integration]

  3 skipped
  4 passed (E2E)

E2E tests executed:
  ✓ admin-match-flow (2 tests)   - validates admin UI + match creation API
  ✓ public-contact (1 test)      - validates contact tracking + WhatsApp nav
  ✓ ui-smoke (1 test)             - validates root route + CSS

E2E tests skipped:
  - admin-auth-gating (3 tests)  - only run when REQUIRE_ADMIN_AUTH=true
```

## Test Isolation (Rate Limiting)

Both QA commands automatically set `RATE_LIMIT_NAMESPACE=test-$(timestamp)` to prevent Redis state collision between consecutive runs. This enables back-to-back testing without manual waiting.

**How it works:**
- Each test run gets a unique namespace
- Namespace is prepended to all Upstash Redis rate-limit keys
- Consecutive runs use separate buckets → no collision

**Production:** Namespace is NOT used in production (env var not set).

## Troubleshooting

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Tests failing intermittently:**
- Ensure no dev server is running before tests
- Run `rm -rf .next/` to clear Next.js cache
- Verify `.env.local` contains all required variables

**E2E tests skipping unexpectedly:**
- `qa:week4`: Auth gating tests run, functional tests skip (by design)
- `qa:week4:dev`: Functional tests run, auth gating tests skip (by design)
