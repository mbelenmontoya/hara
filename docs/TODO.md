# Hará Match — Pending Tasks

**Last Updated:** 2026-03-11

---

## UI / UX — High Priority

- [ ] Fix BottomSheet backdrop animation (no dimming overlay behind sheet)
- [ ] Polish professional profile page (`/p/[slug]`)
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

- [ ] Email confirmation to professional on registration (Resend recommended)
- [ ] Notification email to admin on new professional registration
- [ ] Install Resend and configure `RESEND_API_KEY`
- [ ] Create `lib/email.ts` for reusable email functions
- [ ] Handle email failures gracefully (don't fail registration)
- [ ] Google Places Autocomplete refinement (feels "funky")
- [ ] Reconciliation API endpoint (`/api/admin/reconciliation`)

## Deployment / Infrastructure

- [ ] Configure Clerk authentication keys
- [ ] Set production environment variables
- [ ] All environment variables set in Vercel
- [ ] `NODE_ENV=production` configured
- [ ] Upstash Redis connected (production)
- [ ] Supabase production database ready
- [ ] Admin routes gated — test with `REQUIRE_ADMIN_AUTH=true`
- [ ] Rate limiting verified in production
- [ ] CORS configured (if needed)
- [ ] Enable Cloudflare proxy / DDoS protection
- [ ] Advanced DDoS protection (Cloudflare WAF rules)

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
