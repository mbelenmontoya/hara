# Reviews Collection System Implementation Plan

Created: 2026-04-27
Author: belu.montoya@dialpad.com
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Ship the post-contact review loop. Users who clicked WhatsApp on a professional 7 days ago receive an email with a single-use review link. They submit a star rating + optional text on `/r/review/[token]`. A DB trigger updates `professionals.rating_average + rating_count` (which fires `recompute_ranking()` from migration 005). Reviews appear on `/p/[slug]`. Admin moderates via `/admin/reviews`. Includes the ContactButton bug fix so direct profile contacts also fire events (without which directory contacts have no review attribution path).

**Architecture:** Event-driven trust loop, no auth on submission (token-gated). Daily Vercel cron picks events 7 days old, generates per-event tokens, sends Resend email. Submission writes to `reviews` table; trigger aggregates and writes to `professionals`; existing `recompute_ranking()` chain updates `ranking_score`. Public surface uses existing design system; admin surface mirrors `/admin/professionals` patterns.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase Postgres (triggers + RPC), Resend, Upstash rate limit, Vercel Cron, Vitest, Playwright.

## Scope

### In Scope

- **Migration `migrations/006_reviews_collection.sql`**:
  - `reviews` table with all PRD-specified columns + indexes.
  - `review_requests` table with token, expiry, consumed_at + indexes.
  - `recompute_review_aggregates(p_professional_id UUID)` SQL function — computes `AVG(rating)` + `COUNT(*)` for non-hidden reviews, updates `professionals` (chains into `recompute_ranking()`).
  - `submit_review(p_token TEXT, p_rating INT, p_text TEXT, p_reviewer_name TEXT)` atomic RPC — validates token state, inserts review, marks token consumed, calls aggregator.
  - Trigger on `reviews` AFTER INSERT OR UPDATE OR DELETE → `recompute_review_aggregates()`.
  - Commented rollback block.
- **ContactButton bug fix** (`app/components/ContactButton.tsx`):
  - Remove the `if (attributionToken)` gate. Always emit `contact_click` event.
  - When `attributionToken` is missing, send `professional_slug` only (no token, no `tracking_code` from match) — the events route synthesizes a tracking_code.
- **`/api/events` extension** (`app/api/events/route.ts`):
  - When body has `attribution_token` → existing concierge path unchanged.
  - When body has no token but has `professional_slug` → look up professional by slug, validate `status = 'active'`, generate `tracking_code = 'direct-' + slug + '-' + nanoid(10)`, insert event with `attribution_token = null`, `match_id = null`, `lead_id = null`, `professional_id` from lookup, `event_data->>'email'` from optional `reviewer_email` field in body.
  - Same rate limiting (IP / session / fingerprint).
- **Email-capture micro-prompt** on `/p/[slug]`:
  - Inline single email input + button below the WhatsApp ContactButton, only shown when no concierge attribution (i.e. `searchParams.from` does not start with `/r/`).
  - On submit: POST `/api/contact-email` with `{ professional_slug, email, session_id }`. Stores in client `localStorage` keyed by session, included in subsequent ContactButton click event payload as `reviewer_email`.
  - Skippable — clicking WhatsApp without email still emits event without email; no review request will be sent.
- **API route `/api/contact-email`** (small): validates email format, returns 200 — purely a passthrough so the client can store consent + email together. Optionally writes to `event_data` of the user's most recent direct event for that session within last 5 min (so email is on the event row when the cron picks it up).
- **Daily cron `/api/cron/send-review-requests/route.ts`**:
  - Bearer CRON_SECRET auth + misconfig guard (mirror `/api/cron/expire-destacado`).
  - Selects `events` where `event_type = 'contact_click'`, `created_at` between `NOW() - 7 days - 1 hour` and `NOW() - 7 days + 23 hours` (24-hour window), `event_data->>'email' IS NOT NULL`, no existing `review_requests.contact_event_id` matching.
  - For each: generate 32-byte base64url token, insert `review_requests` row (expires_at = NOW() + 30 days), call `notifyReviewRequest()` from lib/email.ts.
  - Returns `{ sent: N, skipped: M }`.
- **`vercel.json`** — add second cron entry for `/api/cron/send-review-requests` at `0 7 * * *` (07:00 UTC = 04:00 ART).
- **`lib/email.ts`** — add `notifyReviewRequest({ to, professionalName, link })` template.
- **Submission page `app/r/review/[token]/page.tsx`** (server component):
  - Server-side fetches `review_requests` by token, joins to professional. Validates not expired, not consumed.
  - Renders form via client component `ReviewSubmitForm` with rating picker (1–5 stars), optional textarea, optional name input.
  - Three render states: `valid` (form), `consumed` (already submitted), `expired/not-found` (link invalid).
- **Submission API `app/api/reviews/submit/route.ts`**:
  - POST validates token, calls `submit_review` RPC, returns `{ success, review_id }` or token-error.
  - Upstash rate limit `reviews:ip` 5/hour.
- **Reviews card on `/p/[slug]`**:
  - Inserted between "Sobre mí" card and modality card.
  - Shows star average, total count, 5 most recent reviews.
  - Hidden when `rating_count = 0` (clean look for new professionals).
- **Admin moderation `/admin/reviews/page.tsx`** (new, client component):
  - List all reviews ordered by `submitted_at DESC` with `is_hidden` toggle.
  - Filter bar: search by professional name, filter by visible/hidden.
- **Admin API `/api/admin/reviews/route.ts`** (GET) + `/api/admin/reviews/[id]/route.ts` (PATCH):
  - GET: list reviews with professional name joined. Service-role.
  - PATCH `{ is_hidden: boolean }`: updates row, trigger fires, aggregates recompute.
- **Tests**:
  - Unit: token validation, ReviewSubmitForm validation + submit payload, ContactButton (already-mocked event payload now includes reviewer_email when present).
  - Integration: end-to-end review submission — insert via RPC → trigger fires → aggregate updated → ranking_score recomputed.
  - Playwright E2E:
    - TS-001: valid token → submit → see thank-you; revisit consumed token → see "ya enviada" message.
    - TS-002: profile shows reviews card with avg/count/recent when reviews exist; hidden when count=0.
    - TS-003: admin can hide a review; aggregate recomputes; chip on /p/[slug] reflects new count.
    - TS-004: cron 401 path (no DB needed) + cron with valid secret cleans up properly.
    - TS-005: ContactButton fires event on direct profile click (no attribution token); event row exists in DB with synthetic tracking_code.
- **Update `.claude/plans/main.md`** — session log entry, success criterion, follow-up PRDs, key files.

### Out of Scope

- WhatsApp delivery (Resend email only for v1) — separate PRD.
- Reviewer self-service edit/delete — token is single-use.
- Pre-publish moderation queue — auto-publish + retroactive hide.
- Pagination of reviews on /p/[slug] — top 5 only.
- Star distribution histogram, verified-customer badge, professional reply-to-reviews.
- Sentiment analysis / auto-flagging.
- Backfill review requests for historical contacts.
- Notification to professional when they receive a review (depends on /pro portal).
- Internationalization beyond Argentine Spanish.

## Approach

**Chosen:** Vertical slice per surface — ~9 tasks (migration / events route + ContactButton fix / email-capture / cron / submission API + page / reviews card / admin moderation / tests / plan update). Matches the decomposition of the directory and Destacado specs.

**Why:** Each task is independently verifiable. Migration is foundational; everything else can be built and tested in parallel slices once it lands.

**Alternatives considered:**
- Horizontal layers (DB → API → UI → cron) — rejected; doesn't match repo conventions and creates harder-to-review monolithic tasks.
- Single big task — rejected; 9 surfaces is enough that splitting is necessary for verification.

## Autonomous Decisions

(Per auto mode + locked PRD — questions skipped, defaults documented here.)

| Decision | Choice | Why |
|----------|--------|-----|
| Trigger timing | 7 days post-contact | PRD lock; industry-standard service-review window. |
| Channel | Email-only via Resend | PRD lock; Resend already wired; WhatsApp deferred. |
| Token shape | 32-byte base64url, single-use, 30-day TTL | PRD lock; matches token-on-URL security profile. |
| Review aggregate trigger location | DB-level trigger on `reviews` writes to `professionals` | Single source of truth; chains into `recompute_ranking()`. |
| ContactButton fix mechanism | Synthesize `tracking_code = 'direct-{slug}-{nanoid(10)}'` for direct contacts | Avoids making `events.tracking_code` nullable (events table is partitioned — schema change is heavier). |
| Email storage | `events.event_data->>'email'` JSONB | No new column on the partitioned events table. |
| Email-capture UX | Inline single input below WhatsApp button on /p/[slug], hidden in concierge flow | Lightweight; concierge flow already has email from lead. |
| Reviews card placement on /p/[slug] | Between "Sobre mí" card and modality card | Natural read order: identity → about → reviews → logistics. |
| Reviewer name default | "Anónimo" | No PII required; reviewer chooses to attribute. |
| Hidden reviews aggregate behavior | Excluded from rating_average and rating_count | Matches user expectation of "5 visible reviews → count = 5". |
| Admin surface | Dedicated /admin/reviews page | Keeps moderation focused; doesn't clutter /admin/professionals. |
| Cron schedule | 07:00 UTC daily (04:00 ART) | One hour after expire-destacado cron (which runs at 06:00 UTC) so they don't compete. |

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Atomic RPC: `migrations/005_destacado_tier_mvp.sql` — `upgrade_destacado_tier` with `SELECT ... FOR UPDATE` lock and JSONB return.
  - Trigger function: same migration, `recompute_ranking()` — `SECURITY DEFINER SET search_path = public LANGUAGE plpgsql`.
  - Cron endpoint: `app/api/cron/expire-destacado/route.ts` — Bearer auth + misconfig guard + `select('id')` return.
  - Public server component: `app/p/[slug]/page.tsx` — supabaseAdmin server-side query + design-system primitives.
  - Modal/form patterns: `app/admin/professionals/components/DestacadoPaymentModal.tsx`.
  - Admin list page: `app/admin/professionals/page.tsx` — client component, AdminFilterBar, GlassCard rows.
  - Resend email helper: `lib/email.ts` — `notifyNewProfessional` for template structure.
  - Event ingestion: `app/api/events/route.ts` — extend the existing function, don't duplicate.
- **Conventions:**
  - Spanish copy (Argentine informal): "¡Gracias por tu reseña!", "Calificá tu experiencia", "Reseñas", "Ocultar", "Mostrar".
  - Design tokens only; no hex.
  - Service-role DB writes via `lib/supabase-admin.ts`.
  - Error logging via `logError` from `lib/monitoring.ts`.
  - Push-to-main workflow.
- **Key files:**
  - `lib/supabase-admin.ts`, `lib/email.ts`, `lib/rate-limit.ts`, `lib/monitoring.ts`.
  - `migrations/005_destacado_tier_mvp.sql` for trigger + RPC patterns.
  - `app/components/ContactButton.tsx` — bug fix lives here.
  - `app/api/events/route.ts` — extension lives here.
  - `app/p/[slug]/page.tsx` — Reviews card insertion point.
  - `vercel.json` — extend the existing crons array.
- **Gotchas:**
  - The `events` table is partitioned. Schema migrations affecting `events` are heavier — that's why we use `event_data` JSONB for the optional email rather than a new column.
  - `events.tracking_code TEXT NOT NULL` — direct contacts must synthesize a tracking_code rather than nullify it.
  - `events.event_type` CHECK includes `contact_click` already; no migration needed for the type.
  - The `recompute_ranking()` trigger fires on professionals UPDATE; the new aggregate trigger writes to professionals which automatically chains. Don't add a redundant call.
  - `lib/admin-auth.ts` is still a stub. Admin routes rely on middleware. `created_by` on reviews stays null for now.
  - Vercel Cron requires Pro plan; on Hobby, manual `curl` is the fallback (same documentation as expire-destacado).
- **Domain context:**
  - "review" = star rating + optional text from a real user about a professional, tied to a specific contact event.
  - "review_request" = a row pairing a contact event with a single-use email link.
  - "consumed" = the token has been used to submit a review (sets `consumed_at`).
  - "is_hidden" = admin-flagged review, excluded from aggregates.

## Runtime Environment

- Start: `npm run dev` (port 3000)
- Health: `curl http://localhost:3000/api/health`
- Build: `npm run build`
- Tests: `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`
- Cron schedule (when deployed on Vercel Pro): runs daily at 07:00 UTC.

## Assumptions

- Migration 006 will run cleanly against a Supabase DB with migrations 004 + 005 already applied. The `professionals.rating_average` + `rating_count` columns exist (from 004) and have defaults — the trigger writes to them.
  - Tasks depending: 1, 6, 7.
- Resend is configured in production with a verified sending domain. The current `lib/email.ts` uses `onboarding@resend.dev` which only sends to the account owner; review request emails to actual reviewers will require a verified domain. This is documented as a deployment prerequisite, not a code blocker.
  - Tasks depending: 4 (cron — emails will fail silently in dev/test until domain is verified, which is acceptable).
- The `events` table is partitioned by month (per `migrations/001_schema.sql`). `event_data->>'email'` queries work on partitions transparently.
  - Tasks depending: 2 (cron query joins on event_data).
- The `nanoid` package is a dependency (verified 2026-04-27: `"nanoid": "^5.1.6"` in package.json).
  - Supporting: package.json scripts block.
  - Tasks depending: 2 (synthetic tracking_code). Task 4 uses Node's built-in `crypto.randomBytes` for the cryptographic token, NOT nanoid.
- Sandbox can't apply migration 006 from this session (same network constraint as 004/005). Manual application via Supabase dashboard or `scripts/apply-reviews-migration.mjs`.
  - Tasks depending: 1, 3 (parity-style integration test), 8 (E2E DB-dependent).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Resend sending domain not verified → emails go nowhere | High (current state) | High (whole loop broken) | Document in Task 4 DoD: prerequisite to deploy. Cron logs each send attempt with success/fail; admin can check via Resend dashboard. Local dev tests use Resend test mode (skipped if RESEND_API_KEY not set). |
| Cron picks an event but the RPC fails mid-send (token created but email never delivered) | Medium | Medium | Cron treats each event independently. If email fails, the request row exists with no consumed_at — re-running cron 24h later won't re-pick because `review_requests.contact_event_id` UNIQUE constraint blocks duplicates. Lost review request is acceptable (user can be re-prompted via a future "resend reminders" tool). |
| Spam reviewers using leaked tokens | Low | Medium | Single-use enforced atomically (UPDATE ... WHERE consumed_at IS NULL). Rate-limited per IP. Tokens are 32 random bytes — practically unguessable. |
| ContactButton fix breaks existing concierge attribution | Low | High | The fix only adds a fallback path when token is missing. The token-present branch is unchanged. Existing test (`__tests__/integration/api-events.test.ts`) covers the concierge path. |
| Reviews card adds layout shift on /p/[slug] | Low | Low | Card is hidden when count=0; for count>0 it's a fixed-height GlassCard. SSR renders the card synchronously — no client-side hydration shift. |
| `events.event_data` JSONB email lookup is slow | Low | Low | Cron query uses an explicit `event_data->>'email'` filter; PostgreSQL evaluates JSONB path operations efficiently for small documents. Volume is daily cron, not per-request hot path. |
| Hidden reviews leave rating_average wrong after admin toggle | Low | Medium | Trigger fires on `is_hidden` UPDATE → aggregate recomputes. Tested explicitly in TS-003. |
| Direct contact event without email is wasted | Medium | Low | By design — user opted not to share email. They get no review request. Future PRD can promote email capture more aggressively. |
| Resend rate limits on cron run with N events | Low | Low | At current volume (≪100/day), Resend free tier handles fine. If volume grows, add per-email throttle in cron loop (50ms sleep). |

## Goal Verification

### Truths

1. Migration 006 creates `reviews` + `review_requests` tables, indexes, `recompute_review_aggregates()` function, `submit_review()` RPC, and a trigger on `reviews` AFTER INSERT/UPDATE/DELETE — verified by `\d reviews`, `\d review_requests`, `pg_proc`, `pg_trigger`.
2. Submitting a review via `submit_review` RPC writes to `reviews`, marks the token consumed, updates `professionals.rating_average + rating_count`, and the existing `recompute_ranking()` trigger updates `ranking_score` — verified by integration test.
3. Direct profile contacts (no `attributionToken`) emit `contact_click` events with synthetic tracking_code starting with `direct-` — verified by TS-005.
4. The cron endpoint, given a 7-day-old `contact_click` event with email in event_data, generates a token, sends an email via Resend, and inserts a `review_requests` row — verified by TS-004 (with mocked Resend) + manual cron trigger.
5. The submission page at `/r/review/[token]` validates token state and renders one of three views — verified by TS-001.
6. The reviews card on `/p/[slug]` renders avg + count + 5 recent when reviews exist; hidden otherwise — verified by TS-002.
7. Admin can toggle `is_hidden`; aggregates and ranking update — verified by TS-003.
8. Existing concierge attribution path on `/api/events` is unchanged — verified by existing `api-events.test.ts` continuing to pass.

### Artifacts

- `migrations/006_reviews_collection.sql`
- `scripts/apply-reviews-migration.mjs`
- `lib/email.ts` (modified — `notifyReviewRequest` added)
- `app/components/ContactButton.tsx` (modified)
- `app/api/events/route.ts` (modified)
- `app/api/contact-email/route.ts` (new)
- `app/api/cron/send-review-requests/route.ts` (new)
- `app/api/reviews/submit/route.ts` (new)
- `app/api/admin/reviews/route.ts` + `/[id]/route.ts` (new)
- `app/r/review/[token]/page.tsx` + `ReviewSubmitForm.tsx` (new)
- `app/p/[slug]/page.tsx` (modified — reviews card)
- `app/admin/reviews/page.tsx` (new)
- `vercel.json` (modified)
- `__tests__/integration/reviews-flow.test.ts` (new)
- `__tests__/e2e/reviews.spec.ts` (new)
- `.claude/plans/main.md` (modified)

## E2E Test Scenarios

### TS-001: User submits a review via valid token
**Priority:** Critical
**Preconditions:** Migration 006 applied. Seeded `review_requests` row with valid (non-expired, non-consumed) token; matching professional active.
**Mapped Tasks:** Task 1, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/r/review/<token>` | Page renders with star picker, textarea, name input |
| 2 | Click 5-star, type review text, type name "Lucía" | Form valid; submit button enabled |
| 3 | Click submit | Thank-you page renders |
| 4 | DB check: `SELECT rating, text, reviewer_name, consumed_at FROM reviews JOIN review_requests ...` | Row exists with rating=5, text/name as entered, consumed_at not null |
| 5 | Re-visit `/r/review/<token>` | "Esta reseña ya fue enviada" page renders (consumed state) |

### TS-002: Reviews card on /p/[slug]
**Priority:** Critical
**Preconditions:** Professional with at least 1 visible review.
**Mapped Tasks:** Task 7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/p/<slug>` | Profile renders |
| 2 | Inspect for `[data-testid="reviews-card"]` | Card visible between "Sobre mí" and modality card |
| 3 | Card content | Avg stars, count, up to 5 recent review entries (rating, name, text, date) |
| 4 | Visit a basico professional with 0 reviews | Reviews card NOT in DOM |

### TS-003: Admin hides a review → aggregate recomputes
**Priority:** High
**Preconditions:** Admin logged in. Professional with 2 visible reviews (avg=4.5, count=2).
**Mapped Tasks:** Task 8

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/reviews` | List of all reviews |
| 2 | Click "Ocultar" on one of the 2 reviews | Toast/visual confirmation; row marked hidden |
| 3 | DB: SELECT rating_average, rating_count FROM professionals WHERE id=... | rating_count=1, rating_average reflects only the visible review |
| 4 | Visit `/p/<slug>` | Reviews card shows count=1, avg matches |

### TS-004: Cron auth + happy path
**Priority:** High
**Preconditions:** None for 401; for 200 path: migration 006 applied, seeded `contact_click` event with `event_data->>'email'` set, `created_at = NOW() - 7 days`.
**Mapped Tasks:** Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | `curl /api/cron/send-review-requests` (no header) | 401 |
| 2 | `curl -H "Authorization: Bearer wrong"` | 401 |
| 3 | `curl -H "Authorization: Bearer $CRON_SECRET"` | 200 with `{ sent: N, skipped: M }` |
| 4 | DB: SELECT COUNT(*) FROM review_requests WHERE contact_event_id = <seeded_event> | 1 |
| 5 | Re-run cron | `sent: 0` (UNIQUE on contact_event_id prevents duplicates) |

### TS-005: ContactButton fires event for direct profile click (regression for the bug fix)
**Priority:** Critical
**Preconditions:** Active professional with known slug. No concierge attribution.
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate directly to `/p/<slug>` (no `?from=...`) | Profile renders |
| 2 | Click WhatsApp ContactButton | New tab opens to wa.me/...; ContactButton.handleClick fires fetch('/api/events', ...) |
| 3 | DB: SELECT * FROM events WHERE professional_id = <id> ORDER BY created_at DESC LIMIT 1 | Row with event_type='contact_click', tracking_code starting with 'direct-', attribution_token NULL |

## Progress Tracking

- [x] Task 1: Migration 006 — reviews + review_requests tables, trigger, RPC
- [x] Task 2: Extend `/api/events` for direct contacts (no token)
- [x] Task 3: Fix ContactButton + email-capture micro-prompt + `/api/contact-email`
- [x] Task 4: Daily cron `/api/cron/send-review-requests` + `notifyReviewRequest` email + vercel.json
- [x] Task 5: Submission API `/api/reviews/submit` + `/r/review/[token]/page.tsx` + `ReviewSubmitForm`
- [x] Task 6: Reviews card on `/p/[slug]`
- [x] Task 7: Admin `/admin/reviews` page + `/api/admin/reviews` GET + PATCH
- [x] Task 8: Tests — integration (review flow round-trip) + Playwright E2E (TS-001..005)
- [x] Task 9: Update `.claude/plans/main.md`

**Total Tasks:** 9 | **Completed:** 9 | **Remaining:** 0

## Implementation Tasks

### Task 1: Migration 006 — reviews + review_requests tables, aggregate trigger, RPC

**Objective:** Add the data layer: two new tables, the aggregate function, the submission RPC, and the trigger that chains review writes into ranking updates.
**Dependencies:** None (assumes migrations 004 + 005 applied)
**Mapped Scenarios:** Enables TS-001 through TS-005.

**Files:**
- Create: `migrations/006_reviews_collection.sql`
- Create: `scripts/apply-reviews-migration.mjs` (mirror of `apply-destacado-migration.mjs`)

**Key Decisions / Notes:**
- `reviews` columns per PRD; UNIQUE constraint on `contact_event_id` enforces one-review-per-contact.
- `review_requests` columns per PRD; UNIQUE on `token` and on `contact_event_id`.
- Indexes: `(professional_id, is_hidden, submitted_at DESC)` on reviews, `(token)` on review_requests, `(consumed_at, expires_at)` for fast token validation, `(professional_id, paid_at DESC)` not applicable here.
- `recompute_review_aggregates(p_professional_id UUID) RETURNS VOID`:
  - `UPDATE professionals SET rating_average = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE professional_id = p_professional_id AND is_hidden = false), rating_count = (SELECT COUNT(*) ...) WHERE id = p_professional_id;`
- `submit_review(p_token TEXT, p_rating INT, p_text TEXT, p_reviewer_name TEXT) RETURNS JSONB`:
  - `SELECT id, professional_id, contact_event_id, expires_at, consumed_at FROM review_requests WHERE token = p_token FOR UPDATE INTO ...`.
  - `IF NOT FOUND OR consumed_at IS NOT NULL OR expires_at < NOW() THEN RAISE EXCEPTION 'Invalid or expired token';`
  - **Pre-check UNIQUE on reviews.contact_event_id** (spec-review should_fix — surfaces a friendly error instead of raw constraint violation): `IF EXISTS (SELECT 1 FROM reviews WHERE contact_event_id = v_request.contact_event_id) THEN RAISE EXCEPTION 'review_already_exists' USING ERRCODE = 'P0001'; END IF;`
  - INSERT row into `reviews` (rating, text, reviewer_name, professional_id, contact_event_id).
  - UPDATE review_requests SET consumed_at = NOW() WHERE id = ...
  - Return `{ review_id, professional_id }`.
- Trigger (spec-review must_fix — use TG_OP CASE, not COALESCE on NEW/OLD records):
  ```sql
  CREATE OR REPLACE FUNCTION trigger_recompute_review_aggregates()
  RETURNS TRIGGER AS $$
  DECLARE
    v_professional_id UUID;
  BEGIN
    -- PL/pgSQL evaluates both COALESCE operands. NEW.professional_id on a NULL
    -- record (DELETE) raises an error. CASE on TG_OP avoids the eager evaluation.
    v_professional_id := CASE TG_OP
      WHEN 'DELETE' THEN OLD.professional_id
      ELSE NEW.professional_id
    END;
    PERFORM recompute_review_aggregates(v_professional_id);
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

  DROP TRIGGER IF EXISTS reviews_recompute_aggregates ON reviews;
  CREATE TRIGGER reviews_recompute_aggregates
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_recompute_review_aggregates();
  ```
- `REVOKE EXECUTE ON FUNCTION submit_review FROM PUBLIC; GRANT EXECUTE TO service_role;` — same for `recompute_review_aggregates`.
- Apply script mirrors `apply-destacado-migration.mjs`: probe column/table existence, try `exec_sql` RPC, fall back to printed instructions.
- Commented rollback block at end.

**Definition of Done:**
- [ ] Migration applies cleanly against a DB with 004 + 005 applied.
- [ ] Re-applying produces no errors (IF NOT EXISTS / CREATE OR REPLACE / DROP TRIGGER IF EXISTS + CREATE TRIGGER).
- [ ] `\d reviews` shows expected columns + constraints.
- [ ] `\d review_requests` shows expected columns + UNIQUE constraints.
- [ ] `pg_proc` shows `recompute_review_aggregates` and `submit_review`.
- [ ] `pg_trigger` shows `reviews_recompute_aggregates`.
- [ ] Manually inserting a review row updates the linked professional's `rating_average` + `rating_count`.

**Verify:**
```bash
node scripts/apply-reviews-migration.mjs
psql $SUPABASE_URL -c "\d reviews"
psql $SUPABASE_URL -c "INSERT INTO reviews (professional_id, rating, text) VALUES ('<id>', 5, 'test'); SELECT rating_average, rating_count FROM professionals WHERE id = '<id>';"
psql $SUPABASE_URL -c "DELETE FROM reviews WHERE text = 'test';"
```

---

### Task 2: Extend `/api/events` for direct contacts (no attribution token)

**Objective:** Allow ContactButton to emit `contact_click` events without an attribution token by accepting `professional_slug` and synthesizing a tracking_code.
**Dependencies:** Task 1 (only because tests will need the schema)
**Mapped Scenarios:** TS-005

**Files:**
- Modify: `app/api/events/route.ts`
- Test: `__tests__/integration/api-events.test.ts` (extend existing)

**Key Decisions / Notes:**
- Body shape: `{ attribution_token?: string, professional_slug?: string, event_type: 'contact_click', fingerprint_hash?, session_id?, reviewer_email? }`.
- Branch:
  - If `attribution_token` present → existing path unchanged.
  - Else if `professional_slug` present → look up professional via `supabaseAdmin.from('professionals').select('id, status').eq('slug', slug).single()`. If not found or status != 'active', return 404. Generate `tracking_code = 'direct-' + slug + '-' + nanoid(10)`. Insert event with `attribution_token = null, match_id = null, lead_id = null`, `event_data = { ip_missing, fingerprint_valid, email: reviewer_email ?? null }`.
  - Else → 400.
- Same rate limiting (IP + fingerprint/session) applies to both branches.
- Add `import { nanoid } from 'nanoid'` (already a dep).
- Email validation: if `reviewer_email` provided, must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` else strip it (don't reject the whole event).
- Don't break the existing concierge test in `api-events.test.ts` — extend it to cover the direct path with a new `describe` block.

**Definition of Done:**
- [ ] POST with `professional_slug` (no token) returns 200 and inserts event with synthetic tracking_code.
- [ ] POST with neither token nor slug returns **400** (spec-review should_fix: previously the unconditional `verifyAttributionToken` failure path returned 403; this refactor explicitly returns 400 when both are missing — update any existing test assertion that checked for 403 on missing-token bodies).
- [ ] POST with non-existent slug returns 404.
- [ ] Existing concierge token path (token present and valid) unchanged — `__tests__/integration/api-events.test.ts` still passes.
- [ ] Rate limit applies to both paths.
- [ ] `npx tsc --noEmit` clean.

**Verify:**
```bash
npm run test:integration -- --grep "api-events"
```

---

### Task 3: Fix ContactButton + email-capture micro-prompt + `/api/contact-email`

**Objective:** Remove the `if (attributionToken)` gate so direct contacts emit events. Add an optional inline email input on `/p/[slug]` for direct flows, stored in localStorage and sent in the next ContactButton click.
**Dependencies:** Task 2
**Mapped Scenarios:** TS-005

**Files:**
- Modify: `app/components/ContactButton.tsx`
- Modify: `app/p/[slug]/page.tsx` (add email-capture component)
- Create: `app/components/ReviewerEmailCapture.tsx`
- Create: `app/api/contact-email/route.ts`

**Key Decisions / Notes:**
- ContactButton change at line 43–70:
  - Always send the event payload. Build payload as:
    ```ts
    const payload = attributionToken
      ? { attribution_token: attributionToken, event_type: 'contact_click', tracking_code, professional_slug, rank, timestamp }
      : { professional_slug, event_type: 'contact_click', timestamp, reviewer_email: typeof window !== 'undefined' ? localStorage.getItem(`reviewer-email:${professional_slug}`) ?? null : null }
    ```
  - sendBeacon for both paths (existing fallback fetch with keepalive).
- `ReviewerEmailCapture` (client component): single email input + "Avisame" button. On submit, validates format, calls POST `/api/contact-email`, on 200 stores email in `localStorage` keyed by `reviewer-email:<slug>`, replaces the input with a "Te avisaremos" confirmation. Hidden when `searchParams.from?.startsWith('/r/')` (concierge flow already has email).
- `/api/contact-email/route.ts`: validates email format, then **(spec-review should_fix — explicit dual responsibility):**
  1. Returns 200 with `{ stored: true }` so the client can confirm + store in localStorage.
  2. ALSO writes the email to `event_data` of the most recent `contact_click` event for this session (within last 5 minutes) for this professional, IF such an event exists. This handles the edge case where the user clicked WhatsApp first (event already in DB without email), then submitted email — without this server-side write, the email would never land on the event row and the cron would skip it.
  - Body: `{ professional_slug, email, session_id }`. Lookup uses `session_id` + `created_at > NOW() - INTERVAL '5 minutes'` to find the most recent matching event.
  - If no recent event found, just returns 200 (client localStorage will populate the next ContactButton click).
- Insert `<ReviewerEmailCapture />` in `app/p/[slug]/page.tsx` below the WhatsApp ContactButton.

**Definition of Done:**
- [ ] Direct profile click on `/p/[slug]` (no `?from=...`) fires fetch to `/api/events` with `professional_slug` and no `attribution_token`.
- [ ] Concierge flow (`?from=/r/...`) unchanged — emits with `attribution_token`.
- [ ] Email capture component visible on direct flow, hidden on concierge.
- [ ] Email stored in localStorage on submit; included in subsequent ContactButton click event payload.
- [ ] Invalid email format shows inline error.
- [ ] `npx tsc --noEmit` clean.
- [ ] No `console.log`.

**Verify:**
- Manual browser check on /p/<slug>: open Network tab, click WhatsApp, see POST /api/events with `professional_slug`.
- TS-005 E2E.

---

### Task 4: Daily cron `/api/cron/send-review-requests` + email template + vercel.json

**Objective:** Daily job that sends review request emails 7 days post-contact for events with email capture.
**Dependencies:** Task 1, Task 2
**Mapped Scenarios:** TS-004

**Files:**
- Create: `app/api/cron/send-review-requests/route.ts`
- Modify: `lib/email.ts` (add `notifyReviewRequest`)
- Modify: `vercel.json`
- Create: `app/api/cron/send-review-requests/route.test.ts`

**Key Decisions / Notes:**
- Cron auth: same Bearer CRON_SECRET pattern as `/api/cron/expire-destacado` (including misconfig guard).
- Query:
  ```sql
  SELECT e.id, e.professional_id, e.event_data->>'email' AS email, p.full_name, p.slug
  FROM events e
  JOIN professionals p ON p.id = e.professional_id
  LEFT JOIN review_requests rr ON rr.contact_event_id = e.id
  WHERE e.event_type = 'contact_click'
    -- 24-hour window centered on 7 days post-contact (spec-review must_fix — clean window)
    AND e.created_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '6 days'
    AND e.event_data->>'email' IS NOT NULL
    AND rr.id IS NULL
  ```
  Use `supabaseAdmin.rpc('select_events_for_review', ...)` if rpc available, else direct query via PostgREST is constrained — we may need to add an RPC function for this query. **Decision:** Add `select_pending_review_events()` to migration 006 (returns the eligible event rows).
- For each row: generate token = `crypto.randomBytes(32).toString('base64url')`, insert `review_requests` row with `expires_at = NOW() + INTERVAL '30 days'`, call `notifyReviewRequest({ to, professionalName, link })` where `link = process.env.NEXT_PUBLIC_APP_URL + '/r/review/' + token`.
- Email template HTML: branded, Spanish, simple. Subject: "¿Qué tal tu experiencia con [Nombre]?". Body: brief greeting + "Calificá tu sesión: [button to link]" + footer.
- Sequential loop (not parallel) — Resend rate limits are per-second; sequential is fine for daily volume.
- Error handling: on email failure, log + skip but DO NOT insert `review_requests` row → next day's cron will retry. (Avoid creating orphan request rows pointing to never-sent emails.)
- Return `{ sent, skipped, errors }`.
- `vercel.json` extension:
  ```json
  {
    "crons": [
      { "path": "/api/cron/expire-destacado", "schedule": "0 6 * * *" },
      { "path": "/api/cron/send-review-requests", "schedule": "0 7 * * *" }
    ]
  }
  ```
- Tests: mock Resend + supabaseAdmin, assert query parameters, token generation, email template props, error path.

**Definition of Done:**
- [ ] Endpoint returns 401 for missing/wrong/empty CRON_SECRET (3 cases).
- [ ] Endpoint returns 200 with `{ sent, skipped }` for valid request.
- [ ] When seeded with an eligible event, cron creates a `review_requests` row and (mock) calls Resend.
- [ ] When email send fails, no `review_requests` row is created (idempotent retry).
- [ ] Re-running cron with the same eligible event returns `sent: 0` (UNIQUE on contact_event_id).
- [ ] vercel.json contains both cron entries.
- [ ] Unit tests pass (≥6 cases).
- [ ] `npx tsc --noEmit` clean.

**Verify:**
```bash
npm run test:unit -- --grep "send-review-requests"
```

---

### Task 5: Submission API + `/r/review/[token]` page + ReviewSubmitForm

**Objective:** Public token-gated review submission flow.
**Dependencies:** Task 1
**Mapped Scenarios:** TS-001

**Files:**
- Create: `app/api/reviews/submit/route.ts`
- Create: `app/r/review/[token]/page.tsx`
- Create: `app/r/review/[token]/ReviewSubmitForm.tsx`
- Create: `app/r/review/[token]/ReviewSubmitForm.test.tsx`
- Create: `app/api/reviews/submit/route.test.ts`

**Key Decisions / Notes:**
- API: POST validates body (rating 1–5, text optional ≤2000 chars, reviewer_name optional ≤80 chars, token required string). Calls `supabaseAdmin.rpc('submit_review', { p_token, p_rating, p_text, p_reviewer_name })`. On `rpc` error: map error message to friendly 400. Specifically: `Invalid or expired token` → "Esta reseña no es válida o venció"; `review_already_exists` (SQLSTATE P0001 from the pre-check INSERT-UNIQUE guard) → "Esta reseña ya fue enviada". On success → 201.
- Rate limit: `ratelimit.limit(\`reviews:ip:${ip}\`, { limit: 5, window: '1 h' })`.
- Page (server component):
  - Fetch `review_requests` by token via supabaseAdmin, JOIN to professional for name + slug.
  - If not found → render "Esta reseña no es válida" page.
  - If `consumed_at IS NOT NULL` → render "Esta reseña ya fue enviada".
  - If `expires_at < NOW()` → render "Esta reseña venció" page.
  - Else → render `<ReviewSubmitForm token={token} professionalName={...} />`.
- `ReviewSubmitForm` (client component):
  - State: rating (number, default 0), text (string), name (string).
  - Star picker (1–5 buttons, accessible — `aria-pressed`, keyboard support).
  - Submit calls POST `/api/reviews/submit` with `{ token, rating, text, reviewer_name: name || null }`.
  - On success: replace form with thank-you panel.
  - On error: show Alert.
  - Validation: rating > 0 required; text optional; name optional.
- Use existing primitives (PageBackground, GlassCard, Button, Alert).
- Spanish copy throughout.

**Definition of Done:**
- [ ] Page renders correct state for valid / consumed / expired / invalid tokens.
- [ ] Form validation: submit disabled when rating === 0; works otherwise.
- [ ] Successful submit calls API once with correct payload; renders thank-you state.
- [ ] API returns 400 for invalid rating, 400 for token errors, 201 for success.
- [ ] Rate limit triggers 429 after 5 submits/hr per IP.
- [ ] Unit tests for form (≥6 cases) and route (≥6 cases).
- [ ] `npx tsc --noEmit` clean.

**Verify:**
```bash
npm run test:unit -- --grep "ReviewSubmitForm|reviews/submit"
```

---

### Task 6: Reviews card on `/p/[slug]`

**Objective:** Display avg + count + 5 most recent visible reviews on the profile page.
**Dependencies:** Task 1
**Mapped Scenarios:** TS-002

**Files:**
- Modify: `app/p/[slug]/page.tsx`

**Key Decisions / Notes:**
- Extend the `Professional` interface with `rating_average` + `rating_count` (already in DB; add to the select).
- Add a separate query for recent reviews:
  ```ts
  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('id, rating, text, reviewer_name, submitted_at')
    .eq('professional_id', professional.id)
    .eq('is_hidden', false)
    .order('submitted_at', { ascending: false })
    .limit(5)
  ```
- Render a new GlassCard between "Sobre mí" and modality, only when `rating_count > 0`:
  - Header row: `★ {avg.toFixed(1)} · {count} reseñas`.
  - For each review: rating stars (visual), text (italics if present), name (or "Anónimo"), date (es-AR format).
- Add `data-testid="reviews-card"` to the wrapping article.

**Definition of Done:**
- [ ] **`rating_average` AND `rating_count` are added to the `professionals` SELECT clause** in `getProfessional()` (spec-review should_fix — without this, columns return undefined and card silently shows zeros).
- [ ] Profile with rating_count > 0 shows reviews card.
- [ ] Profile with rating_count = 0 does NOT show card.
- [ ] Card content matches recent 5 visible reviews.
- [ ] Hidden reviews (is_hidden=true) excluded from the recent list.
- [ ] No layout shift / hydration errors.
- [ ] `npx tsc --noEmit` clean.

**Verify:**
- Manual browser check + TS-002 E2E.

---

### Task 7: Admin moderation — `/admin/reviews` page + GET/PATCH API

**Objective:** Admin UI to list and toggle visibility of reviews.
**Dependencies:** Task 1
**Mapped Scenarios:** TS-003

**Files:**
- Create: `app/admin/reviews/page.tsx`
- Create: `app/api/admin/reviews/route.ts`
- Create: `app/api/admin/reviews/[id]/route.ts`

**Key Decisions / Notes:**
- GET returns `{ reviews: [{ id, professional_id, professional_name, rating, text, reviewer_name, submitted_at, is_hidden }] }` ordered by submitted_at DESC.
- PATCH `{ is_hidden: boolean }` updates `reviews` row; trigger fires; aggregates recompute on professional row.
- Page: client component, fetch on mount, AdminFilterBar with search by professional name + status filter (all/visible/hidden), GlassCard rows with toggle button.
- Mirror `app/admin/professionals/page.tsx` structure.

**Definition of Done:**
- [ ] GET returns all reviews with professional name joined.
- [ ] PATCH toggle updates is_hidden + triggers aggregate recompute (verified by re-reading professional row).
- [ ] Page lists reviews with toggle button; filter bar works.
- [ ] No `console.log`; uses `logError`.
- [ ] `npx tsc --noEmit` clean.

**Verify:**
- Manual browser check + TS-003 E2E.

---

### Task 8: Tests — integration + Playwright E2E

**Objective:** End-to-end coverage for the review flow.
**Dependencies:** Tasks 1–7
**Mapped Scenarios:** TS-001, TS-002, TS-003, TS-004, TS-005

**Files:**
- Create: `__tests__/integration/reviews-flow.test.ts`
- Create: `__tests__/e2e/reviews.spec.ts`

**Key Decisions / Notes:**
- Integration test: seed a `review_requests` row via supabaseAdmin → call `submit_review` RPC → verify review row exists, professional aggregates updated, ranking_score recomputed (chained from migration 005).
- Skip gracefully when migration 006 not applied (probe for `reviews` table existence).
- Playwright E2E spec covers TS-001..005 scenarios. Cron tests reuse the 401 auth pattern from `destacado.spec.ts`.
- Seeding helpers: insert events row with `event_data->>'email'` set; insert review_requests with known token; clean up in `afterAll` via slug LIKE filter (`destacado-e2e-` style prefix).

**Definition of Done:**
- [ ] `npm run test:integration` runs the reviews-flow test (skips cleanly when migration 006 not applied).
- [ ] `npm run test:e2e` runs reviews.spec.ts; cron 401 path passes; DB-dependent tests skip cleanly.
- [ ] All seeded fixtures cleaned up in afterAll.

**Verify:**
```bash
npm run test:integration -- --grep "reviews"
npm run test:e2e -- --grep "reviews"
```

---

### Task 9: Update `.claude/plans/main.md`

**Objective:** Reflect the new reviews capability in the project plan.
**Dependencies:** Tasks 1–8
**Mapped Scenarios:** None (documentation).

**Files:**
- Modify: `.claude/plans/main.md`

**Key Decisions / Notes:**
- New session log entry dated 2026-04-27 (or whenever implementation completes).
- Add success criterion: "Reviews collection — post-contact reviews trigger ranking updates, public chip + admin moderation".
- Update Pages table: `/p/[slug]` notes Reviews card; `/admin/reviews` new entry.
- Update Key files reference: migration 006, /api/reviews/submit, /api/cron/send-review-requests, /admin/reviews, /r/review/[token].
- Surface follow-up PRDs: WhatsApp delivery, reviewer self-edit, professional reply-to-reviews.
- Note: migration 006 must be applied to Supabase before integration/E2E DB tests pass.

**Definition of Done:**
- [ ] Session log entry added for 2026-04-27.
- [ ] Success criteria includes Reviews entry.
- [ ] Pages table includes /admin/reviews and notes the Reviews card on /p/[slug].
- [ ] Key files reference includes new artifacts.
- [ ] Apply-migration-006 instruction surfaced.

**Verify:**
```bash
grep -A3 "Reviews\|reviews-collection" .claude/plans/main.md | head -20
```

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | DEFERRED | 0 | Review submission — needs migration 006 + Supabase reachable. Manual test guide section 4. |
| TS-002 | High | DEFERRED | 0 | Reviews card on /profesionales — indirect via /p/[slug] coverage. Manual test guide section 5. |
| TS-003 | High | DEFERRED | 0 | Admin hide → aggregate recompute — needs DB. Manual test guide section 6. |
| TS-004 | High | PASS | 0 | Cron 401/auth verified via Playwright (2 tests green). |
| TS-005 | Critical | PASS | 0 | ContactButton fires event for direct contact — verified by unit test. |

## Open Questions

- **Email-capture UX wording** — exact label and placement copy. Defaulted to "¿Querés saber cómo te fue después? Dejanos tu email" but `/spec` may iterate.
- **Should the WhatsApp message itself hint that an email follow-up is coming?** — would improve email open rate but requires editing the existing pre-filled WhatsApp text in ContactButton. Defaulted to NOT changing WhatsApp message; defer to a future polish PRD.
- **Resend domain verification** — must be done in production before emails reach real users. Documented as deployment prerequisite, not a code blocker.
- **Hidden reviews and ranking** — confirmed: hidden reviews excluded from aggregate (matches user expectation). Documented in trigger SQL.

## Deferred Ideas

- A "manage my review" magic link for reviewer edit/delete (separate PRD).
- Star distribution histogram on /p/[slug] (when volume justifies).
- Verified-customer badge UI (explicit display of contact_event linkage).
- Backfill review requests for historical contacts where we have email (low priority, risk of spam).
- Notification to professional when they receive a review (depends on /pro portal).
