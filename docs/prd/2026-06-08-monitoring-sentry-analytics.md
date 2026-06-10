# Monitoring — Sentry + Vercel Analytics

Created: 2026-06-08
Author: belu.montoya@dialpad.com
Agent: Claude Code
Category: Infrastructure
Status: Final
Research: None

## Problem Statement

Hara is entering Phase 1 with real professionals and real users. Right now, every production error is invisible — `lib/monitoring.ts` stubs exist and are called in ~50+ places across the app, but they only `console.error` to nowhere. If a registration fails, a concierge match breaks, or a review submission crashes, nobody finds out until a user complains. Phase 1's definition of done explicitly requires monitoring to catch errors before users report them. This PRD wires the stubs into real services: Sentry for errors + event context, Vercel Analytics + Speed Insights for page-level usage and Core Web Vitals.

## Core User Flows

### Flow 1 — Error caught before user reports it

1. A professional hits an error on `/profesionales/registro` (e.g. image upload fails)
2. `logError()` fires — Sentry captures the exception with full stack trace + the `context` object passed by the caller
3. Any preceding `logEvent()` calls on that page session become Sentry breadcrumbs attached to the error
4. Sentry sends an alert email to the configured address
5. Admin (Bel) sees the error, reproduction steps are clear from the breadcrumb trail, fixes it

### Flow 2 — Page usage visible in Vercel dashboard

1. A user visits `/profesionales`, browses, clicks a professional
2. Vercel Analytics records the page view with Web Vitals automatically — no event firing required
3. Speed Insights records Core Web Vitals per route (LCP, INP, CLS)
4. Bel can see which routes get traffic, where performance degrades

## Scope

### In Scope

- Create Sentry project (manual step — Bel does this in sentry.io dashboard before implementation)
- Install `@sentry/nextjs`
- Create `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` at project root
- Create `instrumentation.ts` at project root (Next.js 14 App Router hook — registers Sentry on server startup)
- Wrap `next.config.mjs` export with `withSentryConfig()` (enables source map upload on Vercel build)
- Update `lib/monitoring.ts`:
  - `logError()` → `Sentry.captureException(error, { extra: context })`
  - `logEvent()` → `Sentry.addBreadcrumb({ message: eventName, data: properties, level: 'info' })`
- Add 4 env vars to Vercel: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- Install `@vercel/analytics` + `@vercel/speed-insights`
- Add `<Analytics />` and `<SpeedInsights />` to `app/layout.tsx`

### Explicitly Out of Scope

- Sentry performance tracing / APM — errors only; APM adds overhead and noise before there's traffic to measure
- Sentry alert rule configuration — done in Sentry dashboard by Bel after deploy, not in code
- User identification in Sentry (`Sentry.setUser`) — no public user auth exists yet
- Upstash or n8n monitoring — separate concern
- Sentry Session Replays — privacy-sensitive, revisit when there's a specific UX bug to diagnose
- Adding new `logEvent()` callsites — existing callsites already fire; breadcrumbs are automatic

## Technical Context

- **Integration point:** `lib/monitoring.ts` is the single file that changes. All ~50 callers already use `logError` / `logEvent` — zero callsite changes.
- **Next.js 14 App Router + Sentry:** requires `instrumentation.ts` at project root (not inside `app/`). This file registers `Sentry.init()` on server startup. Client config goes in `sentry.client.config.ts`, server in `sentry.server.config.ts`, edge runtime in `sentry.edge.config.ts`.
- **`next.config.mjs`:** currently `export default nextConfig`. Wrapping becomes `export default withSentryConfig(nextConfig, { org, project, authToken })`. Source maps are uploaded on each Vercel production build — stack traces in Sentry show original TypeScript lines, not minified JS.
- **`logEvent` → breadcrumbs:** Sentry breadcrumbs are attached to the next error that fires in the same session. This gives a "what happened before the crash" trail without pushing events to a separate analytics service or creating noise in the Sentry issues list.
- **Vercel Analytics:** `<Analytics />` is a single RSC import in `app/layout.tsx`. No config — Vercel detects the project automatically.
- **Speed Insights:** `<SpeedInsights />` next to `<Analytics />`. Also zero config — auto-groups Core Web Vitals by route.
- **Existing `Script` in layout:** `app/layout.tsx` already uses `next/script` for Google Analytics — `<Analytics />` and `<SpeedInsights />` sit alongside it with no conflicts.

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| `logEvent` destination | Sentry breadcrumbs (not separate event tracker) | Breadcrumbs give error context without adding a third service or creating an event firehose. Events are only useful when something goes wrong — that's exactly where breadcrumbs land. |
| Source maps | Yes, upload on build | Without source maps, Sentry shows minified stack traces — undebuggable in production. The `SENTRY_AUTH_TOKEN` is the only extra secret needed. |
| Sentry project creation | Manual step before implementation | Requires sentry.io login — can't be automated here. PRD documents what to create so /spec can reference the env var names. |
| Speed Insights | Included | Free on Vercel, two extra lines in layout. Per-route Core Web Vitals are directly actionable — no reason to skip. |
| Sentry replays | Out of scope | Records user sessions including form inputs — privacy-sensitive for a health/wellness platform. Add only when diagnosing a specific hard-to-reproduce UX bug. |
