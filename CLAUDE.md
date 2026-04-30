# Hará Match — Claude Code Guide

## What Is This

Curated wellness professional marketplace for Spanish-speaking markets (LATAM + Spain, Argentina home base). Two ways in: **Browse** (`/profesionales` — directory ranked by reputation, primary path) and **Concierge** (`/solicitar` — admin hand-picks 3 recommendations delivered via `/r/{tracking_code}`). Professionals register at `/profesionales/registro`. Revenue is supply-funded via subscription tiers (Básico free, Destacado paid). Concierge leads (PQL infra) are preserved as an optional premium layer after the Apr 2026 pivot away from PQL-only billing.

**📖 Read [`PRODUCT.md`](./PRODUCT.md) for the full product context — what we're building, who it's for, why it exists, and how we measure success.** This file (CLAUDE.md) is engineering context only; PRODUCT.md is the canonical answer to "what is this product?"

**Personality:** Calm, warm, trustworthy, premium. Think "therapy app designed by Apple."

**Language:** All user-facing copy is in **Spanish** (Argentine informal: vos, querés, escribís).

## Stack

- **Next.js 14.2** (App Router) + **TypeScript**
- **Tailwind CSS v4** (`@theme` directive in `globals.css`, NOT `theme.extend`)
- **Supabase** (PostgreSQL) + **Upstash Redis** (rate limiting)
- **Clerk** (auth — pending config, don't implement)
- **Vitest** (integration tests) + **Playwright** (E2E)

## Project Structure

```
app/
├── r/[tracking_code]/        # Recommendations (card deck, swipe, bottom sheet)
│   ├── hooks/                # useRecommendations, useSwipeGesture, useRevealTransition, useMediaQuery
│   └── components/           # BottomSheet, BackgroundPicker, CardSkeleton
├── p/[slug]/                 # Professional public profile (needs polish)
├── profesionales/registro/   # 4-step registration form + confirmacion page
├── admin/                    # Admin dashboard (leads, professionals, PQLs)
├── api/                      # API routes (see "Don't Touch" below)
├── components/               # ContactButton, PlacesAutocomplete, PublicLayout, AdminLayout
│   └── ui/                   # Alert, Badge, Button, Card, EmptyState, Input, Modal, Table
└── globals.css               # Design tokens (@theme block)

lib/
├── supabase-admin.ts         # Service role client
├── attribution-tokens.ts     # JWT generation/verification
├── rate-limit.ts             # Upstash config
├── env.ts                    # Environment validation
├── monitoring.ts             # Error logging (Sentry-ready) — use this, NOT console.log
├── validation.ts             # IP, fingerprint, session validators
├── tracking-code.ts          # Tracking code utilities
├── crypto-utils.ts           # SHA-256 hashing
├── billing-month.ts          # Billing period utilities
└── translations/             # i18n structure (es.ts)
```

## Design Tokens

Defined in `app/globals.css` under `@theme`. Always use these — never hardcode colors, spacing, or shadows.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-background` | `#FBF7F2` | Warm beige base |
| `--color-surface` | `#FFFFFF` | Cards |
| `--color-surface-2` | `#F6F0E8` | Warm tinted surface |
| `--color-foreground` | `#1F1A24` | Primary text |
| `--color-muted` | `#6B6374` | Secondary text |
| `--color-brand` | `#4B2BBF` | Primary violet |
| `--color-brand-weak` | `#EEE8FF` | Light brand tint |
| `--color-success` | `#2F8A73` | Teal |
| `--color-warning` | `#F2A43A` | Apricot |
| `--color-danger` | `#D6455D` | Coral |
| `--color-info` | `#7B61D9` | Lavender |

**Shadows:** `shadow-soft`, `shadow-elevated`, `shadow-strong`
**Radii:** `rounded-lg` (8px), `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-full`
**Glass Effect:** Use `.liquid-glass` class for frosted glass cards.

## UI Patterns

```tsx
// Button press feedback
<button className="btn-press-glow ...">Click me</button>

// Glass card
<div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30">
  <div className="liquid-glass-content p-6">{children}</div>
</div>

// Animation easing
const EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'           // iOS spring-like
const TRANSITION_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)' // Smooth feel
```

## Working Rules

These are non-negotiable process rules. Follow them always.

1. **Never delete information without preserving it first.** Before removing any file, every piece of content (done, not done, decisions, context) must exist in another file. Verify by reading both files.
2. **Do not assume — verify.** Before claiming something works, test it. Before running a script, read its code. Before saying a page loads, hit the URL. Before saying Supabase is down, check connectivity.
3. **Discuss before executing.** Do not jump to fix bugs, refactor code, or make changes without discussing the approach with the user first. Present the problem, propose options, wait for direction.
4. **Do not take shortcuts.** No flags, workarounds, hardcoded values, or hacks to make things pass. Understand how the system works and work within it.
5. **One thing at a time.** Complete what was agreed upon before starting something new. Test after every change.
6. **Check the dev server before sending URLs.** Verify the port, verify the page returns 200, verify the content renders.
7. **Read before writing.** Always read the file, the docs, the schema, and the related code before making changes. Understand the full context.
8. **Track everything in PLAN-main.md.** Any new task discovered, any bug found, any pending item — add it immediately. Never lose track of work.

## Code Quality Standards

- Components ≤ **440 lines**, functions ≤ **50 lines**
- No magic numbers — use named constants
- Type-safe throughout — proper type guards, no `any`
- Use `lib/monitoring.ts` for error logging, never `console.log`
- Spanish copy for all user-facing content
- Follow existing patterns in codebase (check before creating)

## Commands

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm run test:integration # API tests (12 tests)
npm run qa:week4         # Full QA suite (prod mode)
npm run qa:week4:dev     # Full QA suite (dev mode)
```

## Key Documentation

| File | Purpose |
|------|---------|
| `FINAL_SPEC.md` | Database schema, API specs — **single source of truth** |
| `DEVELOPMENT_HISTORY.md` | Full dev timeline, architectural decisions |
| `PRODUCTION_READINESS.md` | Deployment checklist |
| `SELF_QA_RULES.md` | 7 QA validation rules |
| `KNOWN_ISSUES.md` | Chrome backdrop-filter bug |
| `PLAN-main.md` | Plan, roadmap, and all pending tasks |
| `docs/DONE.md` | All completed work |

## Full Tooling Reference

See `.claude/README.md` for all available commands, agents, skills, rules, and hooks.
