# Hará Match — Pending Tasks

**Last Updated:** 2026-04-01

> **Model pivot (Apr 1, 2026):** Moved from PQL-only billing to Directory + Concierge model.
> See PLAN-main.md "Business Model Decision Log" for full rationale.

---

## Phase 1: Foundation for Directory Model

### 1.1 Populate real professionals
- [ ] Get real professional data from owner (email/spreadsheet)
- [ ] Add them to Supabase `professionals` table with all fields filled

### 1.2 DB: Add ranking/tier fields
- [ ] Add `subscription_tier` to `professionals` — enum: `basico`, `destacado` (default: `basico`)
- [ ] Add `rating_average` — decimal, default 3.0
- [ ] Add `rating_count` — integer, default 0
- [ ] Add `profile_completeness_score` — integer 0-100
- [ ] Add `ranking_score` — decimal, computed from tier + rating + completeness
- [ ] Update FINAL_SPEC.md with new schema

### 1.3 `/profesionales` — Public directory page (new)
- [ ] List all approved professionals, sorted by `ranking_score` desc
- [ ] "Destacado" badge for paid tier
- [ ] Filter by specialty, location, modality (online/presencial)
- [ ] Search by name
- [ ] Links to `/p/[slug]`
- [ ] CTA: "¿Sos profesional? Registrate" → `/profesionales/registro`

### 1.4 `/` — Home page redesign
- [ ] Apply design system (liquid-glass, tokens)
- [ ] Two CTAs: "Buscar profesional" → `/profesionales` and "Que te recomendemos" → `/solicitar`
- [ ] Featured "Destacado" professionals section

---

## Phase 2: Reviews & Reputation

### 2.1 Review collection system
- [ ] After contact event, generate unique review link (no login needed)
- [ ] Review form: star rating (1-5) + optional text comment
- [ ] DB: `reviews` table (professional_id, rating, comment, review_token, created_at)
- [ ] Reviews update `rating_average` and `rating_count` on `professionals`
- [ ] Display reviews on `/p/[slug]` profile page

### 2.2 Profile completeness scoring
- [ ] Calculate score based on filled fields (photo, short_description, specialties, location, etc.)
- [ ] Auto-update on profile changes
- [ ] Show completeness indicator on admin dashboard

---

## Phase 3: Monetization & Polish

### 3.1 Subscription tier system
- [ ] Admin can set a professional's tier (manual for now)
- [ ] "Destacado" visual treatment in directory and profile
- [ ] Future: Stripe/MercadoPago integration for self-service

### 3.2 New pages
- [ ] `/ayuda` — Help page (link recovery, common errors, support contact)
- [ ] `/privacidad` — Privacy policy
- [ ] `/terminos` — Terms of service

### 3.3 Admin pages (new)
- [ ] `/admin/leads/[id]` — Lead detail
- [ ] `/admin/professionals/[id]` — Professional detail with reviews, rating, tier
- [ ] `/admin/analytics` — Funnel dashboard (directory views → profile views → contacts)
- [ ] `/admin/settings` — Operational config

---

## Phase 4: Professional Portal (Future)
- [ ] `/pro` — Authenticated professional home
- [ ] `/pro/leads` — Lead visibility for the professional
- [ ] `/pro/analytics` — Performance stats
- [ ] Profile editing
- [ ] Subscription management

---

## Pages & Workflows (Full App Map)

### Público (Lead)

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/` | Exists — redesign | Home page, needs design system + dual CTA |
| 2 | `/r/[tracking_code]` | Exists | Concierge recommendations (kept for concierge flow) |
| 3 | `/solicitar` | **Done** | Concierge intake form |
| 4 | `/gracias` | **Done** | Confirmation post-solicitud |
| 5 | `/profesionales` | **New — Phase 1** | Public directory ranked by reputation |
| 6 | `/ayuda` | **New — Phase 3** | Soporte / recuperación de link / errores comunes |

### Público (Profesional)

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/p/[slug]` | **Done** | Perfil público — 5 glass cards, design system |
| 2 | `/profesionales/registro` | **Done** | Registration form |
| 3 | `/profesionales/registro/confirmacion` | **Done** | Registration confirmation |

### Admin / Ops

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/admin/leads` | Exists — modify | Bandeja de solicitudes |
| 2 | `/admin/leads/[id]` | **New — Phase 3** | Detalle de solicitud |
| 3 | `/admin/leads/[id]/match` | Exists | Crear match (concierge flow) |
| 4 | `/admin/professionals` | Exists — modify | Listado profesionales + tier management |
| 5 | `/admin/professionals/[id]` | **New — Phase 3** | Detalle profesional: info + reviews + tier |
| 6 | `/admin/analytics` | **New — Phase 3** | Dashboard: funnel + directory metrics |
| 7 | `/admin/settings` | **New — Phase 3** | Configuración operativa |
| 8 | `/admin/pqls` | Exists | Ledger PQL (kept for concierge billing) |

### Legales / Confianza

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/privacidad` | **New — Phase 3** | |
| 2 | `/terminos` | **New — Phase 3** | |

### Futuro (Phase 4)

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/pro` | **New** | Home profesional autenticado |
| 2 | `/pro/leads` | **New** | Visibilidad de leads para el profesional |
| 3 | `/pro/analytics` | **New** | Performance por profesional |

---

## Known Bugs

- [x] `/p/[slug]` queries `specialty` (singular) but DB has `specialties` (array) — **fixed**
- [x] `/p/[slug]` uses Tailwind grays instead of design system tokens — **fixed (rebuilt with 5 glass cards)**
- [x] E2E seed script was generating invalid tracking codes — **fixed**
- [ ] Hardcoded `#FBF7F2` in 3 pages instead of using `var(--color-background)` or `bg-background`
- [x] Duplicate `SPECIALTY_MAP` and `isValidReason` — **fixed (moved to `lib/design-constants.ts`)**
- [x] liquid-glass backdrop-filter dropped in production build — **fixed (using @apply)**

---

## Design System Extraction (In Progress)

- [x] Phase 1: Shared constants file (`lib/design-constants.ts`)
- [x] Phase 2: Chip component
- [ ] Phase 3: AvatarPlaceholder component
- [ ] Phase 4: GlassCard component
- [ ] Phase 5: PrivacyNotice component
- [ ] Phase 6: SectionHeader component
- [ ] Phase 7: FormField component
- [ ] Phase 8: Sweep + document

---

## UI / UX — High Priority

- [ ] Fix BottomSheet backdrop animation (no dimming overlay behind sheet)
- [x] Polish professional profile page (`/p/[slug]`) — **done (5 glass cards, all fields)**
- [ ] Seed database with 3 real professionals
- [ ] WhatsApp button redesign (add icon, pulse animation)
- [ ] Backdrop-filter blur delay — decide on fix approach (Option B: remove scale recommended)

## UI / UX — Medium Priority

- [ ] Progress indicator dot animations (transitions between cards)
- [ ] Chips staggered entrance animation
- [ ] Avatar/photo placeholders with initials fallback
- [ ] Micro-animations (haptic feedback on buttons)
- [ ] Staggered element reveals
- [ ] Card deck depth shadows between cards
- [ ] Spring physics for swipe (momentum, bounce)
- [ ] Smoother drag resistance curve
- [ ] More delightful entrance animation for reveal screen
- [ ] Shimmer effect on loading elements
- [ ] Text reveal animations
- [ ] Better hierarchy on card typography

## UI / UX — Low Priority

- [ ] Dark mode (define tokens, toggle, respect system preference)
- [ ] Confetti on contact initiation
- [ ] Success animation after WhatsApp opens
- [ ] Document desktop-specific issues
- [ ] Moonly-style card redesign exploration (text over image, no card container)
- [ ] Design system component extraction (AnimatedIcon, enhanced GlassCard)
- [ ] Background may need adjustment (currently SVG illustration)
- [ ] Admin dashboard design polish
- [ ] Hover states for desktop

## Feature Work

- [x] Email notifications (`lib/email.ts`) — `notifyNewLead()` and `notifyNewProfessional()` — **done**
- [x] Resend installed and wired — **done**
- [ ] Email: send copy to person who submitted (requires Resend domain verification)
- [ ] Google Places Autocomplete refinement (feels "funky")
- [ ] Reconciliation API endpoint (`/api/admin/reconciliation`) — for concierge flow

## Deployment / Infrastructure

- [x] Supabase Auth replaces Clerk — **done**
- [x] Upstash Redis connected via Vercel Marketplace — **done**
- [ ] Set production environment variables (verify all are in Vercel)
- [ ] Rate limiting verified in production
- [ ] CORS configured (if needed)
- [ ] Enable Cloudflare proxy / DDoS protection

## Monitoring / Analytics

- [ ] Add Sentry DSN + integration
- [ ] Vercel Analytics integration
- [ ] Uptime monitoring configured
- [ ] Log aggregation set up
- [ ] Monitor post-deploy error rates (first 48 hours)
- [ ] Set up alerts for error spikes
- [ ] Monitor Supabase query performance
- [ ] Review user feedback channels
- [ ] Check for unexpected traffic patterns

## Performance Targets

- [ ] Lighthouse score > 90
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] TTFB < 800ms
- [ ] API response times < 500ms
- [ ] Page load < 3s on 3G
- [ ] Time to interactive < 5s
- [ ] Build size < 100KB first load JS

## Testing

- [ ] Add unit tests for custom hooks
- [ ] E2E tests for complete user journey
- [ ] Visual regression tests
- [ ] Contract tests for validation rules
- [ ] Core Web Vitals measurement

## CI/CD

- [ ] CI/CD workflow (GitHub Actions)
- [ ] Lockfile verification in CI (`npm ci`)

## Accessibility

- [ ] Focus trap for modals/bottom sheets
- [ ] Skip navigation links
- [ ] Screen reader announcements for swipe actions
- [ ] High contrast mode support
- [ ] WCAG AAA compliance (full)

## Content / SEO

- [ ] SEO meta tags verified in production
- [ ] Open Graph images set
- [ ] 404 page customized
- [ ] Spanish copy reviewed (full audit)

## Operations

- [ ] Schedule recurring reconciliation job (calls `check_pql_event_integrity()`)
- [ ] Schedule recurring event purge job (calls `purge_old_events()`)
- [ ] Pre-merge checklist: ensure all 7 QA rules pass
- [ ] Drift prevention: update FINAL_SPEC.md before architecture changes
- [ ] Lazy load BottomSheet if it grows >200 lines

## Documentation Cleanup

- [ ] README references `CODE_QUALITY_AUDIT_2026-01-06.md` (deleted) — fix reference
- [ ] README references week summary docs for DB setup (wrong path) — fix reference
