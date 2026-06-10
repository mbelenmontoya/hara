# Monitoring — Sentry + Vercel Analytics Implementation Plan

Created: 2026-06-08
Author: belu.montoya@dialpad.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Wire `lib/monitoring.ts` stubs into Sentry (exceptions + breadcrumbs) and Vercel Analytics + Speed Insights, so production errors surface automatically before users report them.

## Out of Scope

- Sentry performance tracing / APM — errors only; adds noise before there's meaningful traffic
- Sentry alert rule / notification configuration — done in sentry.io dashboard after deploy
- User identification in Sentry (`Sentry.setUser`) — no public user auth exists yet
- Sentry Session Replays — privacy-sensitive for a health/wellness platform

## Approach

**Chosen:** Single-file integration point (`lib/monitoring.ts`) — Sentry config files handle init, monitoring.ts calls the SDK, all 50+ callers are untouched.
**Why:** The abstraction layer already exists and is mocked in every test — swapping the implementation is purely additive. The cost is a dependency on `@sentry/nextjs` build-time tooling (source map upload adds ~5s to Vercel builds).

## Context for Implementer

`@sentry/nextjs` requires four files: `sentry.client.config.ts` (browser init), `sentry.server.config.ts` (Node.js init), `sentry.edge.config.ts` (edge runtime init), and `instrumentation.ts` (Next.js 14 App Router hook that registers server/edge init). All four live at the project root, not inside `app/`. The `withSentryConfig()` wrapper in `next.config.mjs` enables automatic source map upload on each Vercel production build — without it, stack traces show minified JS. The `SENTRY_AUTH_TOKEN` env var is read automatically by the Sentry build plugin; it does not appear in the source files.

## Assumptions

- `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` are set in Vercel dashboard before the next production deploy — Task 1 depends on this for source map upload to work; the app itself runs fine without them (Sentry is a no-op when DSN is absent)

## Goal Verification

### Truths

1. After the first production deploy: (a) triggering `myUndefinedFunction()` from the browser console on any page causes a client-side issue in Sentry within 30s; (b) adding `throw new Error('server-test')` to any API route and calling it causes a server-side issue in Sentry within 30s — confirming both client and server error capture work end-to-end.
2. On the first Vercel production deploy, the build log shows the Sentry source map upload step completing with exit 0 and at least one artifact uploaded — confirming stack traces will show original TypeScript file:line references in Sentry issues (not verifiable locally without `SENTRY_AUTH_TOKEN`).
3. Vercel Analytics dashboard (vercel.com → project → Analytics tab) shows ≥ 1 page view within 1 minute of visiting any page on the deployed app.

## Progress Tracking

- [x] Task 1: Install @sentry/nextjs and create Sentry config files + next.config.mjs wrapper
- [x] Task 2: Wire lib/monitoring.ts to Sentry captureException + addBreadcrumb
- [x] Task 3: Add Vercel Analytics + Speed Insights to app/layout.tsx

## Implementation Tasks

---

### Task 1: Install @sentry/nextjs and create Sentry config files

**Objective:** Install the `@sentry/nextjs` package, create the four required Sentry config files at the project root, and wrap `next.config.mjs` with `withSentryConfig()` so source maps are uploaded on every Vercel production build. This is the foundation — Tasks 2 and 3 depend on the package being installed.

**Files:**

- Modify: `next.config.mjs`
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Create: `instrumentation.ts`

**Key Decisions / Notes:**

- Install command: `npm install @sentry/nextjs`
- `tracesSampleRate: 0` in all three Sentry init files — errors only, no performance tracing
- `NEXT_PUBLIC_SENTRY_DSN` is the single env var for the DSN across all runtimes (it's safe to expose — Sentry DSNs are designed to be public)
- `withSentryConfig` options: `org: 'greenbit-g2'`, `project: 'javascript-nextjs'`, `silent: true` (suppresses verbose build output), `hideSourceMaps: true` (strips source maps from client bundles — they're uploaded to Sentry, not shipped to browsers), `disableLogger: true` (removes Sentry's tree-shaken logger from bundles)
- `next.config.mjs` currently uses ESM (`export default`) — the Sentry import must use `import { withSentryConfig } from '@sentry/nextjs'` at the top
- `instrumentation.ts` at project root (NOT inside `app/`) — Next.js 14.2 picks it up automatically, no experimental flag needed
- Do NOT create a `sentry-example-page` — that's a wizard artifact for manual testing, not needed here

**Content of files to create:**

`sentry.client.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  environment: process.env.NODE_ENV,
})
```

`sentry.server.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  environment: process.env.NODE_ENV,
  // captureUnhandledRejections removed — not a valid option in @sentry/nextjs v10; captured automatically by default
})
```

`sentry.edge.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  environment: process.env.NODE_ENV,
})
```

`instrumentation.ts`:
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
```

`next.config.mjs` (full replacement):
```javascript
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default withSentryConfig(nextConfig, {
  org: 'greenbit-g2',
  project: 'javascript-nextjs',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
})
```

**Definition of Done:**

- [ ] `npm install` succeeds and `@sentry/nextjs` appears in `package.json` dependencies
- [ ] All five files exist at project root with the exact content above
- [ ] Next.js version is ≥ 14.2.0 (no `experimentalInstrumentationHook` flag needed): `node -e "console.log(require('./node_modules/next/package.json').version)"`
- [ ] `npm run build` completes without errors (source map upload step may warn locally without `SENTRY_AUTH_TOKEN` — expected; confirmed by non-zero exit only)
- [ ] Verify: `npm run build 2>&1 | tail -5` — exit 0

---

### Task 2: Wire lib/monitoring.ts to Sentry

**Objective:** Replace the stub implementations in `lib/monitoring.ts` so `logError` calls `Sentry.captureException` and `logEvent` calls `Sentry.addBreadcrumb`. Add a unit test that verifies both calls are made. All existing callers and their tests are unchanged — they already mock this module.

**Files:**

- Modify: `lib/monitoring.ts`
- Create: `lib/monitoring.test.ts`

**Key Decisions / Notes:**

- `logError`: keep `console.error` for development visibility, but always call `Sentry.captureException` (no-op when DSN not set — safe in dev/test)
- `logEvent`: remove the `console.log` dev branch entirely (project hook forbids `console.log`; Sentry breadcrumbs replace it; they're a no-op in dev without a DSN anyway)
- `Sentry.captureException` signature: `(error, { extra: context })` — the `extra` field maps directly to the existing `context` parameter type `Record<string, unknown>`
- `Sentry.addBreadcrumb` signature: `({ message: eventName, data: properties, level: 'info' })`
- Test uses `vi.mock('@sentry/nextjs')` to prevent real network calls — mock `captureException` and `addBreadcrumb` as `vi.fn()`
- `lib/monitoring.test.ts` is correctly placed — `vitest.workspace.ts` unit project already includes `lib/**/*.test.ts` (confirmed)

**Content of lib/monitoring.ts:**
```typescript
import * as Sentry from '@sentry/nextjs'

export function logError(error: unknown, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', error, context)
  }
  Sentry.captureException(error, { extra: context })
}

export function logEvent(eventName: string, properties?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    message: eventName,
    data: properties,
    level: 'info',
  })
}
```

**Definition of Done:**

- [ ] `logError(new Error('test'), { route: '/test' })` calls `Sentry.captureException` with the error and `{ extra: { route: '/test' } }`; signature accepts `unknown` so raw catch values compile without casting
- [ ] `logEvent('contact_click', { slug: 'ana' })` calls `Sentry.addBreadcrumb` with `{ message: 'contact_click', data: { slug: 'ana' }, level: 'info' }`
- [ ] Full test suite passes — existing tests that mock `@/lib/monitoring` are unaffected
- [ ] Verify: `npm test -- --silent 2>&1 | tail -3`

---

### Task 3: Add Vercel Analytics and Speed Insights to app/layout.tsx

**Objective:** Install `@vercel/analytics` and `@vercel/speed-insights`, then add `<Analytics />` and `<SpeedInsights />` to the root layout body. These components self-configure using Vercel's deployment environment — zero config needed in code.

**Files:**

- Modify: `app/layout.tsx`

**Key Decisions / Notes:**

- Install command: `npm install @vercel/analytics @vercel/speed-insights`
- Import: `import { Analytics } from '@vercel/analytics/react'` and `import { SpeedInsights } from '@vercel/speed-insights/next'`
- Both components go inside `<body>`, after the existing Google Analytics `<Script>` tags and before `</body>` — they render as `<script>` tags at runtime, order doesn't matter
- Both are no-ops outside Vercel deployments (local dev shows nothing in the dashboard, but no errors)
- `Trivial:` Two import lines + two JSX elements added to layout. No logic, no branches, no new public symbols. Covered by build success + `npm test -- --silent`.

**Definition of Done:**

- [ ] `<Analytics />` and `<SpeedInsights />` are present in the `<body>` of `app/layout.tsx`
- [ ] `npm run build` succeeds — no TypeScript errors from the new imports
- [ ] Verify: `npm run build 2>&1 | tail -3` exit 0, then `grep -n "Analytics\|SpeedInsights" app/layout.tsx`
