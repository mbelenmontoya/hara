# Automations Admin App (v1)

Created: 2026-05-01
Author: belu.montoya@dialpad.com
Category: Feature
Status: Final
Research: Standard

## Problem Statement

The Monthly Social Strategist Workflow (separate PRD) generates structured content strategy in Supabase, but its output is currently only readable through Supabase Studio's raw table editor — unusable for non-technical clients and tedious even for the operator (Bel). Without a real UI for reviewing strategy, providing rejection feedback, and triggering regeneration, the strategist workflow can't be productized as the SaaS it's designed to become.

This PRD scopes a tight v1 of the admin app: the smallest UI that turns the strategist's output into a reviewable product surface. It is deliberately a single-user app with multi-tenant schema readiness — clients-can-log-in-themselves is a future feature, not v1. The job of v1 is to replace Bel's use of Supabase Studio for the *most common operational workflow* (review strategies, reject with feedback, regenerate). Everything else — brand context editing, pillar management, account creation, API key handling — stays in Supabase Studio for now.

The architecture is multi-tenant from day one because the long-term vision is a sellable SaaS. The schema, auth integration, and route structure all support multi-tenant; the UX only serves Bel for now.

## Core User Flows

### Flow 1: Login

1. Bel visits the admin app URL
2. Enters email, receives magic link via Supabase Auth
3. Clicks link, session established with JWT carrying `account_id` claim
4. Redirected to default account dashboard (Hará in v1)

### Flow 2: Review monthly strategies

1. Bel lands on dashboard
2. Sees a list of monthly strategies for the active account, most recent first
3. Each row shows: month, status (draft / archived / superseded), theme, post slot count, last updated
4. Bel clicks into a specific strategy
5. Strategy detail page shows: theme, narrative arc, format distribution, agent reasoning, list of post slots
6. Bel clicks a post slot to see all brief fields (pillar, format, theme angle, emotional tone, narrative role, visual direction, caption brief, scheduled datetime, cta_type, risk_flags)

### Flow 3: Reject + provide feedback

1. From a strategy detail page, Bel clicks "Reject"
2. Form opens: textarea for `rejection_reason` (required), optional categories (multi-select: too generic, off-brand, repetitive, wrong narrative, off-cadence)
3. Bel submits
4. Server action writes `rejection_reason` + `rejection_categories`, sets status to `archived`
5. UI confirms rejection, returns to strategy list

### Flow 4: Trigger regeneration

1. From a strategy detail page or list view, Bel clicks "Regenerate this month"
2. Confirmation dialog: "This will run the strategist again with your rejection feedback. Continue?"
3. On confirm, server action fires n8n webhook with `account_id` and `month_start` payload
4. UI shows pending state: "Regenerating... you'll get a Telegram notification when ready"
5. Bel returns to dashboard; new strategy appears when workflow completes (page refresh shows it)

## Scope

### In Scope

- Next.js 16 App Router app deployed on Vercel free tier
- TypeScript, Tailwind v4, shadcn/ui (matches Hará's stack)
- Supabase Auth with magic-link email login
- Single user (Bel) in v1; schema and JWT structure ready for additional users
- Path-based routing: `/account/[account_id]/...` (multi-tenant ready, single account hardcoded in UI)
- Connection to Supabase `automations` project via JS client
- Service role key used in server actions / API routes only, never exposed to client
- RLS enabled on all tables, `account_id`-based policies driven by JWT claim
- Strategy list view (filter by account, sort by month_start desc)
- Strategy detail view (all fields, post slot drill-down)
- Post slot detail view (read-only)
- Read-only brand context display (so Bel can see what the strategist used as input)
- Rejection feedback form (writes `rejection_reason`, `rejection_categories`, archives strategy)
- Regen trigger button (fires n8n webhook with payload)
- Loading and error states for all async operations
- Sidebar navigation (shadcn/ui Sidebar component)

### Explicitly Out of Scope

- **Brand context editing** — use Supabase Studio for v1; full editor is a future PRD
- **Content pillars CRUD** — use Supabase Studio for v1
- **Account creation flow** — manual rows added in Supabase Studio
- **API key entry / encrypted storage UI** — n8n credentials hold keys for v1; Supabase Vault pattern when multi-tenant clients arrive
- **Logo upload** — Supabase Storage manual upload for v1
- **Multi-user login** — single-user only; invitations, roles, org switching deferred
- **Billing, signup, onboarding flows** — no client-facing UX in v1
- **Mobile-optimized UI** — desktop-only; responsive layout is a future feature
- **Analytics dashboards** — no metrics views in v1
- **Notification preferences** — Telegram notification config stays in n8n
- **Internationalization** — Spanish-only UI strings (Argentine voice, matches Hará)
- **Admin app for clients to log in themselves** — future PRD when first paying client signs up
- **Visual brand preview** — "see how AI would use your brand" preview is post-MVP

## Technical Context

- **Framework:** Next.js 16 App Router, React 19, TypeScript
- **Styling:** Tailwind v4 (`@theme` directive), shadcn/ui components
- **Auth:** Supabase Auth (magic link), JWT custom claim `account_id` set via Auth Hook
- **Database:** Same Supabase `automations` project as the strategist workflow (separate from Hará's app)
- **Database client:** `@supabase/ssr` for server components, `@supabase/supabase-js` for client where needed
- **Service role:** stored in `SUPABASE_SERVICE_ROLE_KEY` env var, used only in server actions and Route Handlers
- **n8n webhook:** URL stored in `N8N_REGEN_WEBHOOK_URL` env var
- **Hosting:** Vercel free tier
- **Domain:** TBD in /spec — subdomain on owned domain or default `*.vercel.app`
- **Local dev:** Connects to same Supabase `automations` project (no separate dev DB for MVP); convention: use a `dev_` prefix or `bel-dev` account for local testing

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Auth provider | Supabase Auth (magic link) | Free up to 50K MAU, deep RLS integration, no extra service to manage, JWT custom claims drive multi-tenant isolation |
| Routing strategy | Path-based (`/account/[id]/...`) | Vercel-friendly out of the box, no DNS/SSL config, simpler local dev, multi-tenant ready |
| V1 scope | Review + rejection + regen only | Smallest valuable UI surface; Supabase Studio handles brand/pillar editing for now |
| Component library | shadcn/ui + Tailwind v4 | 2026 default for Next.js admin dashboards; matches Hará stack so mental model carries over |
| Account creation | Manual via Supabase Studio | Defers signup UX until real second client; saves weeks of UI work |
| API key storage | n8n credentials (no UI) | Multi-tenant Vault pattern is real work; deferred until needed |
| Multi-tenant model | Schema-ready, UI single-user | Sellable later (no migration), simple now |
| Hosting | Vercel free tier | One user, modest traffic — well within limits |
| Service role usage | Server-only, never exposed to client | Standard Supabase security pattern; bypasses RLS for admin ops |
| Database for dev/staging | Same `automations` project, separate account row | Avoids cost/complexity of separate Supabase project; risk: dev work touches prod data, mitigated by `account_id` scoping |
| UI language | Spanish (Argentine voice) | Matches Hará's positioning; future clients in same market |

## Success Criteria

- Bel can log in with magic link in under 30 seconds
- Bel can see all monthly strategies for Hará in a sortable list
- Bel can drill into a strategy and read every brief field without copy-pasting from Supabase Studio
- Rejection form writes `rejection_reason` correctly to the database (verified by reading row back)
- Regen trigger fires n8n webhook successfully (verified by Telegram notification arriving)
- Page load times under 1.5s for list view, under 2s for detail views (Vercel edge + Supabase RLS)
- Zero RLS leaks: a hypothetical second account's data is never visible (verified manually with a test account)
- App is keyboard-navigable (sidebar, list, detail views all accessible without mouse)

## Research Findings

Standard tier research surfaced:

- **Multi-tenant Next.js + Supabase is a mature stack.** Multiple production-grade templates (Supastarter, Makerkit, Kiranism's starter). Pattern: Next.js + Supabase Auth + RLS + path-based routing.
- **Path routing beats subdomain for MVP.** Simpler hosting (no DNS/wildcard SSL), Vercel-friendly, simpler local dev. Subdomain is a future "premium" feel feature.
- **Supabase RLS via JWT custom claims** is the standard multi-tenant isolation mechanism. JWT carries `account_id`, RLS policies match column against claim. Service role bypasses for server-side admin ops.
- **Always index `account_id` columns referenced in RLS policies.** Top performance killer in Supabase RLS apps. Schema must include these indexes.
- **Auth choice is real**: Clerk faster for multi-tenant org UX (saves 60-100h of org-management UI work), Supabase Auth deeper RLS integration. For single-user MVP that grows into multi-tenant, Supabase Auth is fine; Clerk's advantages emerge when client invitations/billing arrive.
- **shadcn/ui Sidebar component** (added Nov 2024) is production-ready: collapsible, mobile sheet fallback, keyboard shortcuts, persistent state via cookies. Don't build admin chrome from scratch.
- **Supabase Vault is the answer for encrypted API key storage** when needed (multi-tenant per-account keys). Postgres extension, libsodium-based, key separate from data. Deferred to v2.

Sources:
- [Vercel: Next.js + shadcn/ui Admin Dashboard Template](https://vercel.com/templates/next.js/next-js-and-shadcn-ui-admin-dashboard)
- [Next.js Multi-tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant)
- [Makerkit: Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Clerk vs Supabase Auth — Better Dev](https://medium.com/better-dev-nextjs-react/clerk-vs-supabase-auth-vs-nextauth-js-the-production-reality-nobody-tells-you-a4b8f0993e1b)
- [Supabase Vault Docs](https://supabase.com/docs/guides/database/vault)
- [Kiranism Next.js + shadcn Dashboard Starter](https://github.com/Kiranism/next-shadcn-dashboard-starter)
- [Subdomain Routing in Next.js](https://medium.com/@sheharyarishfaq/subdomain-based-routing-in-next-js-a-complete-guide-for-multi-tenant-applications-1576244e799a)

## Open Questions for /spec

These are spec-level details, not PRD-blocking:

- Domain choice: subdomain on owned domain (e.g., `app.automations.tld`) or default `*.vercel.app`
- Starter approach: clone Kiranism's shadcn dashboard starter or build minimal from scratch
- Local dev: separate Supabase project (free, but pause issue) or shared `automations` with `dev_` account row
- Telegram notification format: link directly to admin app strategy detail (deep link)
- Pagination strategy for strategy list (most accounts will have ≤12 strategies/year — flat list fine for now)
- Error tracking: Sentry, or rely on Vercel logs initially
- JWT Auth Hook for `account_id` claim: Edge Function vs Database Function
- RLS policy structure: per-table vs shared function
- Empty state copy when no strategies exist yet (first-run UX)

## Dependencies

- The Monthly Social Strategist Workflow (PRD: `2026-05-01-monthly-social-strategist.md`) must be implemented first or in parallel — this admin app reads its outputs and triggers its regeneration webhook.
- The Supabase `automations` project must be created and seeded with the schema from the strategist PRD (accounts, brand_context, content_pillars, monthly_strategies, post_slots, agent_runs, posting_benchmarks).
- Hará account row must exist before this app is useful.
