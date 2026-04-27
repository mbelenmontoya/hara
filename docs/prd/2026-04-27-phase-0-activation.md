# Phase 0 — Activation

Created: 2026-04-27
Author: belu.montoya@dialpad.com
Category: Activation / Operational
Status: In Progress

## Problem Statement

The Hará Match codebase contains a complete MVP: a directory ranked by reputation, a concierge intake flow with admin matching, professional registration with admin approval, a reviews collection loop, and an admin-gated Destacado tier. **None of it actually works in production yet.**

Three migrations (`004_ranking_foundation`, `005_destacado_tier_mvp`, `006_reviews_collection`) are committed in the repository but not applied to the live Supabase database. The Resend email sender is still on the unverified `onboarding@resend.dev` domain, which only delivers to the account owner. Several flows (image upload, the rejected-profile path) have been coded but never tested end-to-end against a real user.

This PRD defines the work required to **activate** the existing MVP — to take the product from "compiled and pushed to Vercel" to "an actual professional can register, get approved, appear in the directory, receive a concierge match, get contacted, and trigger a review email that reaches the user."

Phase 0 ships nothing new. It's the gate that proves what we already built actually works.

## Definition of Done

The product works on prod for one real professional + one real user, end-to-end. Specifically:

- [ ] **Production site loads (currently 500ing on every route — see Task 0)**
- [ ] Directory `/profesionales` returns at least 1 row sorted by `ranking_score DESC`
- [ ] Admin can approve a registered professional and see them appear in the directory
- [ ] Admin can record a Destacado payment via the modal and see the chip appear on the professional's public profile
- [ ] User can submit a review via `/r/review/[token]` and the rating updates the professional's `rating_average` + `ranking_score`
- [ ] Review request emails reach a real (non-account-owner) inbox
- [ ] Image upload during registration produces a URL visible on the public profile
- [ ] All 3 flows (browse, concierge, onboarding) verified manually on prod

## Tasks

### Task 0 — Fix production: middleware is currently throwing on every route 🔴

**Discovered during PRD writing (2026-04-27):** `https://hara-weld.vercel.app` returns `MIDDLEWARE_INVOCATION_FAILED` (500) on every route — public AND admin. Verified via:

```
curl -I https://hara-weld.vercel.app          → Status 500
curl -I https://hara-weld.vercel.app/profesionales  → Status 500
curl -I https://hara-weld.vercel.app/solicitar       → Status 500
curl -I https://hara-weld.vercel.app/admin/leads     → Status 500
```

`middleware.ts` calls `updateSession(request)` from `lib/supabase/middleware.ts`, which calls `createServerClient(NEXT_PUBLIC_SUPABASE_URL!, NEXT_PUBLIC_SUPABASE_ANON_KEY!, ...)`. The `!` non-null assertion means missing/empty env vars hand `undefined` to `createServerClient` and the middleware throws.

**Most likely cause:** `NEXT_PUBLIC_SUPABASE_URL` and/or `NEXT_PUBLIC_SUPABASE_ANON_KEY` not set on the Vercel project. The plan's Deployment notes already flagged this: *"New env vars needed in Vercel for latest deploy: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, RESEND_API_KEY."*

**How:**

1. Open Vercel dashboard → `hara` project → Settings → Environment Variables
2. Verify these are set for the Production environment:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `RESEND_API_KEY`
   - `CRON_SECRET`
3. If any are missing, add them (mirror values from `.env.local`)
4. Trigger a fresh deploy: `vercel --prod` or push an empty commit
5. Verify `curl -I https://hara-weld.vercel.app` returns 200

**Why this is Task 0:** every other Phase 0 task (smoke tests, image upload, visual QA) requires the production site to load. None of them can start until this is resolved.

**Verification:**
- `curl -I https://hara-weld.vercel.app` returns 200
- `/profesionales` returns 200 (or shows expected empty-state UI)
- `/admin/login` loads
- `/solicitar` loads with form

### Task 1 — Apply migrations 004, 005, 006

**What:** Apply the three SQL migrations to the live Supabase database, in order.

**Why:** Without these, every feature shipped in the last 4 sessions is dead code. Specifically:
- `/profesionales` query references `ranking_score` (column doesn't exist → 500)
- Admin Destacado modal calls `upgrade_destacado_tier()` RPC (doesn't exist → 500)
- Review submission calls `submit_review()` RPC (doesn't exist → 500)
- Review email cron calls `select_pending_review_events()` RPC (doesn't exist → 500)

**How:**

The apply scripts at `scripts/apply-*-migration.mjs` try an `exec_sql` RPC first, but that RPC isn't enabled by default on Supabase. They will fall back to printing manual instructions. **Use the Supabase SQL Editor directly** — paste each migration file in order:

1. `migrations/004_ranking_foundation.sql` — adds 5 columns (`profile_completeness_score`, `rating_average`, `rating_count`, `subscription_tier`, `ranking_score`), creates `recompute_ranking()` trigger, backfills via `UPDATE professionals SET updated_at = NOW()`.
2. `migrations/005_destacado_tier_mvp.sql` — adds `tier_expires_at` column, creates `subscription_payments` table, updates `recompute_ranking()` to be expiry-aware, adds `upgrade_destacado_tier()` RPC.
3. `migrations/006_reviews_collection.sql` — creates `reviews` + `review_requests` tables, `submit_review()` RPC, `recompute_review_aggregates()` function + trigger, `select_pending_review_events()` cron helper.

All three are idempotent (`IF NOT EXISTS` everywhere) — re-running is safe.

**Verification:**
- Run `node scripts/apply-ranking-migration.mjs` — script reports `✓ Migration already applied (columns exist)`
- Run `node scripts/apply-destacado-migration.mjs` — script reports `✓ Migration already applied (columns + table exist)`
- Run `node scripts/apply-reviews-migration.mjs` — script reports `✓ Migration already applied (reviews table exists)`
- Visit `https://hara-weld.vercel.app/profesionales` — does not 500, returns at least the empty-state UI
- Run integration test: `npm run test:integration` (or equivalent for ranking-parity + reviews-flow specs) — DB-dependent tests should now run instead of skipping

### Task 2 — Verify Resend domain

**What:** Verify the production sending domain in the Resend dashboard, then update `lib/email.ts` to use the verified address.

**Why:** Currently `FROM_EMAIL = 'onboarding@resend.dev'` (a Resend test domain) which **only delivers to the account owner's inbox** (`mariabmontoya@gmail.com`). Every other recipient gets the email silently dropped. This means:
- New-lead notifications: only the account owner sees them
- Review-request emails to real users: dropped
- Professional-approval notifications: dropped

The reviews loop is structurally broken until this is fixed.

**How:**

1. In Resend dashboard, add the production sending domain (e.g., `mail.hara.app` or whatever the registered domain is). Add the DNS records (DKIM, SPF, MX) to the domain registrar. Wait for verification.
2. Update `lib/email.ts`: change `FROM_EMAIL` from `onboarding@resend.dev` to a verified address (e.g., `Hará Match <hola@mail.hara.app>`).
3. Add a Vercel env var if needed (`RESEND_FROM_EMAIL`) so the address can change without a deploy.
4. Test by triggering a real `notifyNewLead`, `notifyNewProfessional`, and `notifyReviewRequest` to a non-owner email address and confirming arrival.

**Verification:**
- Resend dashboard shows domain status `Verified`
- Test email to a non-owner inbox arrives within 60 seconds
- Email shows correct `From:` header with verified domain

### Task 3 — Smoke test the 3 user flows on prod

**What:** Manually walk each of the 3 user-facing flows on `https://hara-weld.vercel.app` and confirm every step works.

**Why:** Unit + integration + E2E tests cover most paths but they all run against mocked or seeded data. Production has real DNS, real Resend, real Supabase, real Vercel cron timing. The first time the full chain runs against real infra, surprises surface (env vars missing, cron not fired, image upload bucket misconfigured, etc.). One smoke pass per flow surfaces those before a real user does.

**Flows:**

#### 3a — Browse → Profile → Contact → Review (the directory flow)
1. Open `/profesionales` — directory loads with at least 1 active professional
2. Click a professional's card → land on `/p/[slug]`
3. (If reviewer email capture is enabled) enter email in the optional capture field
4. Click `Contactar por WhatsApp` → WhatsApp opens with a pre-filled message
5. Confirm a `contact_click` event was written to `events` table (admin → events list, or query Supabase directly)
6. Wait 7+ days, OR manually backdate a test event to 7 days ago, OR trigger the cron manually via authenticated curl: `curl -H "Authorization: Bearer $CRON_SECRET" https://hara-weld.vercel.app/api/cron/send-review-requests`
7. Confirm a row was inserted into `review_requests` with a token + email + expiry
8. Confirm the review email arrives in the user's inbox
9. Click the link → `/r/review/[token]` loads with star picker
10. Submit 5 stars + text → confirmation page
11. Re-visit the link → "Esta reseña ya fue enviada"
12. Re-visit `/p/[slug]` → reviews card now shows 1 review + 5.0★ badge
13. Confirm `professionals.rating_average`, `rating_count`, and `ranking_score` updated

#### 3b — Concierge: Solicitar → Match → Recommendations → Contact
1. Open `/solicitar` — form loads
2. Submit a real lead (your name, email, location, what you need)
3. Confirm `notifyNewLead` email arrives in admin inbox
4. As admin, log in to `/admin/leads` → see the new lead at the top
5. Open the lead detail → click `Crear match`
6. Pick 3 professionals, confirm — match is created with a tracking code
7. Open the recommendations link `https://hara-weld.vercel.app/r/[tracking_code]` in an incognito window
8. Confirm 3 recommendations render correctly
9. Click `Contactar` on one → WhatsApp opens
10. Confirm `contact_click` event fired with the tracking code attribution
11. Confirm a PQL was created (admin → `/admin/pqls`)

#### 3c — Onboarding: Registration → Approval → Directory
1. Open `/profesionales/registro` — Step 0 loads
2. Complete all 4 steps with real data, including a profile image
3. On submit, confirm:
   - Confirmation page renders
   - `notifyNewProfessional` email arrives in admin inbox
   - Row in `professionals` table with `status = 'submitted'`
   - Image uploaded to `profile-images` Supabase Storage bucket
4. As admin, open `/admin/professionals/[id]/review`
5. Confirm score breakdown displays correctly + image renders
6. Click `Aprobar` → professional status changes to `active`
7. Open `/profesionales` → new professional appears (sorted by ranking_score)
8. Open `/p/[slug]` → public profile renders with all fields + image

**Verification:** Every step in 3a, 3b, 3c executes successfully with no 500 errors or missing data. Document any friction in `docs/manual-testing/2026-04-27-phase-0-smoke.md` (created during this task).

### Task 4 — Visual QA pass

**What:** Open every public + admin route on a phone-sized viewport (375×812) and verify the design system renders consistently.

**Why:** The 2026-04-07 design system sweep made structural changes to many pages (PageBackground, GlassCard, pill buttons, identical DOM shells). Unit tests verify components in isolation. Playwright visual regression covers 4 baselines. **Neither catches layout drift, font loading delays, or token regressions across all routes.** A 30-minute manual sweep with a phone-sized viewport surfaces these.

**Routes to check:**

Public:
- `/` — home (glass card, dual CTA, pill buttons, privacy footer)
- `/profesionales` — directory list
- `/p/[slug]` — public profile (5 cards: header, sobre mí, especialidades, modalidades, contacto, [reviews if any])
- `/solicitar` — concierge intake (4 steps)
- `/gracias` — confirmation
- `/profesionales/registro` — 4-step form
- `/profesionales/registro/confirmacion` — registration confirmation
- `/r/[tracking_code]` — recommendations card deck (rare path; verify still functional)
- `/r/review/[token]` — public review form
- `/terminosyprivacidad` — legal page (collapsible sections)

Admin (requires login):
- `/admin/leads` — list with filters
- `/admin/leads/[id]` — detail
- `/admin/leads/[id]/match` — match creation
- `/admin/professionals` — grouped list with Destacado modal
- `/admin/professionals/[id]/review` — review page with score breakdown
- `/admin/pqls` — ledger with filters
- `/admin/reviews` — moderation list

**Look for:**
- Inconsistent backgrounds (some pages on `bg-background`, some on white)
- Pill buttons vs square buttons mixed
- GlassCard borders missing on some pages
- Title hierarchy drift (h1/h2 sizing)
- Spacing inconsistencies (gaps, padding)
- Backdrop-filter blur glitches (Chrome bug — known)
- Tap targets below 44px (accessibility)

**Verification:** A markdown report of findings at `docs/manual-testing/2026-04-27-phase-0-visual-qa.md`. For each finding, capture: route, viewport, what's wrong, screenshot. Fix high-impact items immediately. Defer cosmetic items to "Deferred" in the plan.

### Task 5 — Image upload end-to-end verification

**What:** Test the registration image upload from form → Supabase Storage → DB → public profile rendering.

**Why:** The code path exists (`lib/storage.ts`, FormData handling in registration submit) but has not been tested against a real registration on prod. Common failure modes:
- Bucket not public, image URLs return 401
- File size limit exceeded (5MB max — does the form enforce?)
- Extension validation rejects valid types
- DB stores filename but URL construction is wrong
- Race condition (DB insert before upload finishes)

**How:**

1. Use the smoke-test registration from Task 3c
2. Upload a typical profile image (~1–3MB JPEG)
3. After form submit, confirm:
   - File exists in Supabase Storage `profile-images` bucket as `{professional_id}.{ext}`
   - File is publicly accessible (open URL in incognito)
   - `professionals.profile_image_url` column has the correct URL
   - Image renders on `/admin/professionals/[id]/review` (admin view)
   - Image renders on `/p/[slug]` (public view) after approval
4. Repeat with edge cases: 5MB+ image (should reject with friendly error), PNG, WebP, image with transparency

**Verification:** All 4 confirmations pass for at least JPEG + PNG. Document edge cases that fail in `docs/manual-testing/2026-04-27-phase-0-image-upload.md`.

### Task 6 — Decide rejected profile flow

**What:** Make a product decision for what happens when an admin rejects a professional registration. Document the decision and implement it.

**Why:** The DB stores `status = 'rejected'` and `rejection_reason` on the row, but **nothing happens after rejection**:
- Professional is not notified
- Professional cannot resubmit (no flow)
- Data is kept indefinitely (no cleanup policy)

This is an open product question that's been pinned for weeks. Phase 0 is the right time to close it because:
- It directly affects the onboarding flow (Task 3c)
- It's a small, contained decision (no new infrastructure required)
- Without a decision, real rejections will pile up unactioned

**Options to choose between:**

1. **Hard reject** — set status=rejected, keep data 30 days, no notification, no resubmit. Cleanest, least empathetic.
2. **Notify only** — send a Spanish email with the rejection reason; no resubmit flow. Same data lifecycle.
3. **Notify + resubmit** — email includes a unique link to edit + resubmit. Tracks `resubmission_count`. Hardest to build but best for borderline cases (missing field, blurry photo).

**Decision criteria:**
- For Phase 0, we want minimum viable. Option 2 is the smallest step that closes the loop without leaving the professional in the dark.
- Option 3 is real Phase 2/3 work (it touches `/pro/*` portal territory).

**Recommended decision:** Option 2 — send rejection email with reason, keep data 90 days, no resubmit flow in v1. If a rejected professional emails back asking to fix and resubmit, admin can manually flip status back to `submitted`.

**How (if Option 2):**
1. Add `notifyProfessionalRejected({ to, name, reason })` to `lib/email.ts`
2. Update admin reject endpoint to send the email after status update
3. Document in `docs/manual-testing/2026-04-27-phase-0-rejection-flow.md`: what admin should do for resubmit requests (manual flip)
4. Add a 90-day cleanup cron later (deferred to Phase 1+)

**Verification:**
- Decision documented in plan's Open Questions section (resolved → moved to Notes)
- If Option 2 chosen and built: rejecting a test professional sends the email, admin can verify it arrives at the test address

## Out of Scope

Explicitly **not** part of Phase 0:
- Sentry / Vercel Analytics integration *(Phase 1)*
- Recurring cron job verification beyond reviews + Destacado *(Phase 1)*
- Onboarding 10 real professionals *(Phase 1)*
- Self-serve Destacado checkout *(Phase 2)*
- `/pro/*` portal *(Phase 3)*
- Animation polish, dark mode, performance budgets *(Deferred)*
- Migration apply scripts being made non-interactive *(infra polish, defer)*
- Resubmit flow for rejected professionals *(Phase 2/3, only if Option 3 ever chosen)*

## Risks

1. **Migration apply blocked.** If `exec_sql` RPC is not available and the user can't paste in SQL Editor, Phase 0 is fully blocked. *Mitigation:* the SQL Editor path is the standard Supabase workflow; this is unlikely to fail.
2. **Resend domain verification delays.** DNS propagation can take 1–48 hours. *Mitigation:* start Task 2 before Task 3 — the domain can be verifying in the background while smoke tests run.
3. **Smoke test reveals integration gap.** A real flow on prod might fail in a way unit tests didn't catch. *Mitigation:* this is the entire point of Phase 0 — surface gaps early. Each gap becomes a small bugfix; Phase 0 doesn't complete until all 3 flows work.
4. **Visual QA reveals significant design drift.** *Mitigation:* fix high-impact issues inline, defer cosmetic to Deferred. Don't let visual polish block Phase 1.
5. **Image upload fails on prod but worked locally.** Common cause: Supabase Storage bucket not configured public, or RLS blocks anon reads. *Mitigation:* check bucket config early, before Task 3c.

## Verification Plan

Phase 0 is complete when:

- [ ] **Production site loads (Task 0)** — `curl -I https://hara-weld.vercel.app` returns 200
- [ ] All three migrations report `✓ already applied` when re-run
- [ ] Resend dashboard shows verified domain; `FROM_EMAIL` updated
- [ ] All 3 smoke test flows execute end-to-end with no 500s
- [ ] Visual QA report exists with findings categorized fix-now / defer
- [ ] Image upload verified for at least JPEG + PNG
- [ ] Rejected profile decision documented and (if Option 2) email implemented + tested
- [ ] Plan's `Phase 0` checklist is fully checked

When all 6 boxes are checked, Phase 0 closes and Phase 1 begins.

## Manual Testing Documentation

Each task produces a manual testing document under `docs/manual-testing/`:

- `2026-04-27-phase-0-migrations.md` — verification queries, before/after row counts
- `2026-04-27-phase-0-resend.md` — domain config screenshot, test email proof
- `2026-04-27-phase-0-smoke.md` — full walkthrough of flows 3a, 3b, 3c with screenshots
- `2026-04-27-phase-0-visual-qa.md` — findings per route with screenshots
- `2026-04-27-phase-0-image-upload.md` — file types tested, edge case behavior
- `2026-04-27-phase-0-rejection-flow.md` — decision rationale + email proof if implemented
