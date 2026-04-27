# Reviews Collection System

Created: 2026-04-27
Author: belu.montoya@dialpad.com
Category: Feature
Status: Final
Research: None (auto mode — defaults baked from prior gap analysis)

## Problem Statement

Hará Match's ranking formula already reserves 20% weight for `rating_average` (combined with `rating_count`) — but no code path writes to those columns. Every professional sits at `rating_count = 0` forever, which means the directory's effective ranking is **only** profile completeness + paid Destacado tier. That defeats the trust story the brand is built on ("reputation comes from real interactions, not anonymous reviews") and makes the directory feel static — strong professionals can't differentiate themselves once their profile is complete.

This PRD ships the missing trust loop: after a real user contacts a professional via WhatsApp, the system sends a single-use review link. The user submits a star rating + optional text. A DB trigger updates `professionals.rating_average` and `rating_count`, which (via the existing `recompute_ranking()` chain) updates `ranking_score`. Recent reviews appear on the public profile.

A blocker for this whole feature is a known bug at `app/components/ContactButton.tsx:43`: direct profile visits (the directory case) intentionally **skip** event tracking — only attributed concierge visits emit `contact_click` events. Without those events, directory contacts can't trigger a review request. **Fixing this bug is in scope for this PRD** — it's the hinge that lets reviews work for the primary discovery path.

## Core User Flows

### Flow 1: User contacts a professional → review request sent 7 days later
1. User visits `/p/[slug]` (from directory or concierge link), clicks the WhatsApp ContactButton.
2. The button fires a `contact_click` event to `/api/events`. **Currently this only fires for attributed (concierge) clicks** — this PRD adds the direct-contact path with a synthetic `tracking_code`.
3. The event is recorded in `events` with the user's `email` (captured during `/solicitar` for concierge, or via a quick "we'll send you a follow-up" prompt on the profile for direct contacts — see Flow 2 fallback below).
4. A daily cron `/api/cron/send-review-requests` runs at 04:00 UTC (01:00 ART). It selects all `contact_click` events that are exactly 7 days old AND don't yet have a `review_request` row.
5. For each, the cron generates a single-use token (32 random bytes, base64url), stores it in a new `review_requests` table, and sends an email via Resend: *"Hola — ¿qué tal fue tu sesión con [Nombre]? Calificá tu experiencia: [link]"*.
6. The link points to `/r/review/[token]` (public, no auth).

### Flow 2: User without email — graceful skip
1. If a `contact_click` event has no associated email (concierge: from the lead row; direct: from a new opt-in capture), the cron skips it.
2. The user never gets a review request. Acceptable for v1 — direct contacts where we don't have email are out of the trust loop. **Future enhancement (out of this PRD): add an email-capture micro-prompt on `/p/[slug]` before the WhatsApp click.** For v1, the directory contact flow operates without review attribution if the user doesn't volunteer an email.

### Flow 3: User submits a review
1. User opens `/r/review/[token]`.
2. Page renders: professional's name + photo (read from `review_requests` join), star picker (1–5), optional text area, optional "Tu nombre" input (defaults to "Anónimo").
3. User submits. POST `/api/reviews/submit` validates the token (exists, not used, not expired — 30-day TTL), inserts into `reviews`, marks token used.
4. DB trigger fires: recomputes professional's `rating_average` + `rating_count` aggregates and writes them to `professionals`. The existing `recompute_ranking()` trigger then fires (BEFORE UPDATE on professionals) and recomputes `ranking_score`.
5. User sees a confirmation page: *"¡Gracias por tu reseña!"*
6. The token is now consumed — re-visiting the link shows *"Esta reseña ya fue enviada."*

### Flow 4: Profile visitor sees reviews
1. User visits `/p/[slug]`.
2. A new card "Reseñas" appears between the existing "Sobre mí" card and the modality card. Shows: average stars (e.g., "4.6 ★"), total count ("12 reseñas"), and the most recent 5 reviews (date, name, stars, text). Older reviews truncated; no pagination in v1.
3. If no reviews exist, the card is hidden entirely (no empty state — keeps profile cleaner for new professionals).

### Flow 5: Admin moderates
1. Admin sees a new "Reseñas" tab on `/admin/professionals/[id]/review` (or a new `/admin/reviews` list — see Key Decisions).
2. For each review: shows rating, text, reviewer name, date, professional, an "Ocultar" toggle.
3. Hiding a review sets `is_hidden = true`. The DB trigger excludes hidden reviews from the aggregate, recomputing `rating_average` + `rating_count`. `recompute_ranking()` then fires and updates `ranking_score`.

## Scope

### In Scope

- **Migration `migrations/006_reviews_collection.sql`**:
  - `reviews` table: `id UUID PK`, `professional_id UUID FK ON DELETE CASCADE`, `contact_event_id UUID FK ON DELETE SET NULL`, `rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5)`, `text TEXT`, `reviewer_name TEXT`, `is_hidden BOOLEAN NOT NULL DEFAULT false`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
  - Indexes: `(professional_id, is_hidden, submitted_at DESC)`, `(contact_event_id)` UNIQUE so one review per contact event.
  - `review_requests` table: `id UUID PK`, `professional_id UUID FK`, `contact_event_id UUID FK UNIQUE`, `email TEXT NOT NULL`, `token TEXT NOT NULL UNIQUE`, `expires_at TIMESTAMPTZ NOT NULL`, `consumed_at TIMESTAMPTZ`, `sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
  - Index on `(token)` and `(consumed_at, expires_at)` for fast token validation.
  - DB function `recompute_review_aggregates(professional_id UUID)` that computes `AVG(rating)` and `COUNT(*)` for rows where `is_hidden = false`, then `UPDATE professionals SET rating_average = X, rating_count = Y WHERE id = professional_id`. The professionals UPDATE fires `recompute_ranking()` automatically.
  - Trigger on `reviews` AFTER INSERT OR UPDATE OR DELETE → calls `recompute_review_aggregates(NEW.professional_id)` (or OLD on DELETE).
  - Commented rollback block.
- **ContactButton bug fix** (`app/components/ContactButton.tsx`):
  - Direct profile visits (no `attributionToken`) now ALSO fire a `contact_click` event with `event_type='contact_click'`, `attribution_token=null`, and a synthetic `tracking_code` of the form `direct-${slug}-${nanoid(10)}`. The events table requires `tracking_code NOT NULL`, so we synthesize one rather than nullify the column.
  - The event captures `professional_slug` and (via the `/api/events` route extension) writes the professional's id by slug lookup.
- **`/api/events` route extension** (`app/api/events/route.ts`): accepts events without `attribution_token`. When token is missing, the route looks up the professional by slug, validates the row is `active`, writes the event with `attribution_token = null` and `professional_id` filled. Existing concierge path unchanged.
- **Email capture (light)**: a small dropdown/expandable "Te avisamos cuando tengas reseñas" affordance below the WhatsApp ContactButton on `/p/[slug]` for direct contacts. Optional — user can skip. If filled, the email is included in the contact_click event payload and stored on the event row in a new `events.contact_email` column (or in `event_data` JSONB — see Technical Context).
- **Daily cron** `app/api/cron/send-review-requests/route.ts`:
  - `Authorization: Bearer ${CRON_SECRET}` (same pattern as expire-destacado).
  - Selects all `contact_click` events from `events` where `created_at` is between `NOW() - INTERVAL '7 days'` and `NOW() - INTERVAL '6 days'` (a 24-hour window — slightly forgiving in case the cron skips a run), with a non-null email, and no existing `review_requests` row pointing to this event.
  - For each: generate token, insert `review_requests` row, send Resend email.
  - Returns `{ sent: N, skipped: M }`.
- **`vercel.json`**: add a second cron entry: `{ "path": "/api/cron/send-review-requests", "schedule": "0 7 * * *" }` (07:00 UTC = 04:00 ART).
- **Public submission page** `app/r/review/[token]/page.tsx`:
  - Server component fetches `review_requests` by token, joins to professional. Validates not expired and not consumed.
  - Renders form (rating picker, text, name) — uses existing design system (PageBackground, GlassCard, Button).
  - On submit, POSTs to `/api/reviews/submit`.
- **API route** `app/api/reviews/submit/route.ts`:
  - POST validates token, inserts review row, marks token consumed (atomic via a Postgres function `submit_review` mirroring `upgrade_destacado_tier` pattern).
  - Rate-limited via Upstash (`reviews:ip`) — 5 submits per IP per hour.
  - Returns success or token-error responses.
- **Public review display** on `/p/[slug]`:
  - New card between "Sobre mí" and "Modalidad", titled "Reseñas".
  - Shows average stars + total count + 5 most recent non-hidden reviews (rating, name, text, date in Argentine format).
  - Card hidden entirely when `rating_count = 0`.
- **Admin moderation** at `/admin/reviews/page.tsx` (new):
  - List of all reviews (hidden + visible) sorted by `submitted_at DESC`.
  - Each row: professional name, rating, text, reviewer name, date, "Ocultar" / "Mostrar" toggle.
  - PATCH `/api/admin/reviews/[id]/route.ts` toggles `is_hidden`.
- **Email template** added to `lib/email.ts`: `notifyReviewRequest({ to, professionalName, link })` using existing Resend integration.
- **Tests**:
  - Unit: token validation logic, review form (rating picker, name fallback, submit payload).
  - Integration: full review submission round-trip — insert review → trigger fires → professional aggregates updated → ranking_score recomputed.
  - Playwright E2E: visit `/r/review/[token]` with a seeded valid token, submit, see thank-you page; revisit, see "ya enviada" page.
  - Playwright: profile page shows reviews card when count > 0, hidden when count = 0.
- **Update `.claude/plans/main.md`**: tick "Reviews collection" success criterion (add it), update Pages table, surface follow-up PRDs (WhatsApp delivery, edit/delete, reply-to-reviews).

### Explicitly Out of Scope

- **WhatsApp delivery channel** — Resend (email) only for v1. WhatsApp via Meta/Twilio requires business verification + per-message cost. Separate PRD when email open rates prove insufficient.
- **Reviewer self-service edit/delete** — token is single-use after submit. If reviewer regrets, admin handles via direct DB or a future PRD.
- **Admin pre-publish moderation queue** — auto-publish for MVP. `is_hidden` lets admin retroactively hide bad-faith reviews. A pre-publish queue would slow the trust loop and add admin overhead with no clear benefit at current scale.
- **Star distribution histogram** (e.g., "5★: 60%, 4★: 30%...") — average + count is enough for v1. Add when there's enough volume to make the histogram informative.
- **Verified-customer badges** ("Cliente verificado") — every review is already tied to a real `contact_click` event, so the trust signal is implicit. Surfacing it as an explicit badge is a future enhancement.
- **Professional reply-to-reviews** — significant scope (auth, notifications, moderation of replies). Future PRD when the professional portal exists.
- **Sentiment analysis / auto-flagging** — manual moderation only.
- **Email-capture micro-prompt before clicking WhatsApp** — kept lightweight (an optional inline field). Heavier flows (modal, multi-step) deferred.
- **Pagination of reviews on `/p/[slug]`** — top 5 only for v1. "Ver todas las reseñas" page is a future enhancement.
- **Internationalization of email copy** — Argentine Spanish only. LATAM expansion will revisit.
- **Notification to professional when they get a review** — admin sees it in `/admin/reviews`. Professional notification depends on the `/pro/*` portal PRD.

## Technical Context

- **Framework & stack**: same as the rest of the app — Next.js 14 App Router (server components + API routes), TypeScript, Supabase Postgres + service-role client, Tailwind v4 tokens, Vitest unit + integration, Playwright E2E, Vercel Cron.
- **Builds on**:
  - `migrations/004_ranking_foundation.sql` — `professionals.rating_average` + `rating_count` columns are already there.
  - `migrations/005_destacado_tier_mvp.sql` — `recompute_ranking()` trigger fires on professionals UPDATE; this PRD's review aggregates trigger writes to professionals which chains correctly.
  - `lib/email.ts` — Resend integration with `notifyNewProfessional` / `notifyNewLead` patterns to mirror.
  - `lib/rate-limit.ts` — Upstash ratelimit pattern for the submission endpoint.
  - `app/api/events/route.ts` — extending the existing event ingestion path; concierge attribution flow stays untouched.
- **Patterns to follow**:
  - Atomic RPC pattern (e.g., `submit_review`) — `migrations/003_production_hardening.sql:17-97`, `migrations/005_destacado_tier_mvp.sql` for `upgrade_destacado_tier`.
  - Trigger function with `SECURITY DEFINER SET search_path = public LANGUAGE plpgsql`.
  - Cron endpoint Bearer auth + misconfig guard — copy from `app/api/cron/expire-destacado/route.ts`.
  - Public page server component pattern — `app/p/[slug]/page.tsx`, `app/profesionales/page.tsx`.
  - Modal + form pattern — `app/admin/professionals/components/DestacadoPaymentModal.tsx`.
  - Admin list page pattern — `app/admin/professionals/page.tsx` (filter bar, GlassCard rows).
- **`events` table notes**:
  - `tracking_code TEXT NOT NULL` — synthesize for direct contacts as `direct-${slug}-${nanoid(10)}`.
  - `event_type` CHECK includes `'contact_click'` already.
  - `event_data JSONB` is available for storing the user-volunteered email if we don't want a new column. **Recommendation**: store email in `event_data->>'email'` rather than adding a column. Avoids a schema migration to `events`.
- **Token security**:
  - 32 random bytes, base64url-encoded → ~43 char token. Stored in `review_requests.token`.
  - Validated server-side: must exist, `consumed_at IS NULL`, `expires_at > NOW()`.
  - Single use — atomic UPDATE sets `consumed_at = NOW()` only if currently NULL (prevents replay).
- **Email-capture UI placement**: inside the existing identity card on `/p/[slug]`, below the "Aceptando nuevos pacientes" chip. Just an inline "¿Querés contarnos cómo te fue después? Dejanos tu email (opcional)" with a single email input. Submit posts to a small `/api/contact-email` route that updates the `event_data` of the most recent direct contact_click for that user's session. **Lightweight — keep it 1 input + 1 button**.
- **Performance**:
  - Profile page review query is `SELECT ... FROM reviews WHERE professional_id = ? AND is_hidden = false ORDER BY submitted_at DESC LIMIT 5`. The index `(professional_id, is_hidden, submitted_at DESC)` covers it.
  - Cron query scans `events` filtered by date window + a NOT EXISTS join to `review_requests`. Runs once a day on a small table — performance is fine.
  - Aggregate trigger does a single `AVG()` + `COUNT()` per professional on review change. O(reviews_per_professional). Fine at current scale; revisit at >1000 reviews/professional.

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Review trigger timing | 7 days post-contact (daily cron, 24h window) | Gives the user time to actually meet the professional, not just respond on WhatsApp. Industry standard for service reviews. Earlier = "did they reply?" signal which is noisy. |
| Channel | Email-only (Resend) for v1 | Resend is already wired and free at this volume. WhatsApp delivery requires business verification + per-message cost. Defer until email open rates prove insufficient. |
| Token auth | Single-use, 30-day TTL, opaque 32-byte base64url | Single-use prevents replay/forwarding abuse. 30-day TTL gives users a reasonable window. No editing — keeps the model simple; admin handles regret cases manually. |
| Spam guards | One-review-per-contact-event (UNIQUE constraint), Upstash rate-limit on submit endpoint, ContactButton bug fix to ensure all reviews tie to real events | Spam-resistant by construction: every review must descend from a real WhatsApp click event. Rate limit catches the rare bot. |
| Display: anonymity | Reviewer can enter a first name; defaults to "Anónimo" | Lower friction (no required identity field), still allows attribution when the reviewer wants it. |
| Display: count | Top 5 most recent visible reviews on /p/[slug]; full pagination deferred | Profiles stay scannable; full review history is a future PRD when there's enough volume to justify it. |
| Moderation | Auto-publish + retroactive admin hide via `is_hidden` flag | Keeps the trust loop fast; admin can intervene without slowing down honest reviewers. Pre-publish queue would slow down the loop and discourage participation. |
| Edit/delete by reviewer | Not in v1 | Single-use token is consumed on submit. Admin handles regret cases via direct DB. Self-service edit needs an auth model — separate PRD. |
| Aggregate computation | DB trigger on `reviews` writes to `professionals.rating_average` + `rating_count`, which fires `recompute_ranking()` chain | Keeps the data layer single-source-of-truth. Aggregates are always consistent with the underlying review rows; no race or staleness windows. |
| Email storage | `events.event_data->>'email'` JSONB field | Avoids a schema change to the events table (which is partitioned). The email is only used by the cron — no need for an indexed column. |
| ContactButton bug fix | Synthesize `tracking_code = direct-${slug}-${nanoid(10)}` for direct visits | Avoids making `events.tracking_code` nullable (which would require a migration to drop the NOT NULL). Synthetic codes are easy to identify (prefix `direct-`) for analytics. |
| `/r/review/[token]` UX | Stand-alone server-rendered page using design system primitives | Matches the rest of the public surface area. No client-side framework or extra deps. |
| Admin surface | Dedicated `/admin/reviews` list page | Keeps moderation focused; avoids cluttering the existing professional review (approval) page with unrelated concerns. |
| Cron schedule | 04:00 ART daily for review-request emails | Off-peak; matches the existing 03:00 ART expire-destacado cadence (1h apart so they don't compete for resources). |

## Open Questions

- **Email-capture micro-prompt UX** — exact placement, whether it's inline always-visible or behind a small "Querés saber más" affordance. Treat as `/spec`'s call. (Default: inline field below the WhatsApp button, hidden when contact came from a concierge link since email is already known.)
- **Should the WhatsApp message itself include a hint** (e.g., "We'll email you in a week") **so the user expects the email and is more likely to engage?** Ideally yes — but requires editing the WhatsApp link's pre-filled message. Current implementation in `ContactButton.tsx` doesn't do that. Could be a tiny copy change. Defer to /spec.
- **What about the existing 45 professionals' real-world contacts that happened before this PRD ships?** No retroactive review requests — we only have events with attribution tokens (concierge), and those leads' emails are in the `leads` table. We could theoretically backfill, but it's likely too late to be useful and risks looking spammy. Default: no backfill.
- **Should hidden reviews count toward `rating_count` or not?** Decision: NO — hidden reviews are excluded from the aggregate (matches user expectations of "5 visible reviews → count = 5"). The trigger uses `WHERE is_hidden = false` in the aggregate.

## Follow-up PRDs

- **WhatsApp delivery channel** — Meta/Twilio integration when email open rates prove insufficient.
- **Reviewer self-service edit/delete** — magic link to a "manage my review" page for the same `review_requests` token (extended TTL).
- **Star-rating histogram + full review pagination** — when review count justifies the UX investment.
- **Professional reply-to-reviews** — depends on `/pro/*` portal.
- **Verified-customer badge** — explicit display of the contact_event linkage.
- **Email-capture friction reduction** — A/B test inline vs modal; better wording; pre-fill from query params.
- **Sentiment analysis / auto-flagging** — when manual moderation becomes a bottleneck.
- **Backfill review requests** — for high-value past contacts where we have email; low priority and risk of spam.
