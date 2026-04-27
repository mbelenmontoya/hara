# Manual Testing — Reviews Collection System

Created: 2026-04-27
Plan: `docs/plans/2026-04-27-reviews-collection-system.md`
PRD: `docs/prd/2026-04-27-reviews-collection-system.md`

This guide walks you through testing every user-visible piece of the reviews collection system by hand. Run sections in order — each section's prerequisites assume earlier sections passed.

If something looks wrong at any step, **stop and note which section + which check**. Don't continue past a broken step.

---

## 0. Prerequisites

### What you need
- Local repo with the Reviews Collection System commit applied.
- `.env.local` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`.
- Migrations 004, 005, and **006** applied to Supabase — **in that order**.
- Resend domain verified (or use test mode — emails will only go to the Resend account owner email).

### Steps

**0.1 — Apply migrations in order**
```bash
node scripts/apply-ranking-migration.mjs       # 004 (ranking columns)
node scripts/apply-destacado-migration.mjs     # 005 (tier + subscription_payments)
node scripts/apply-reviews-migration.mjs       # 006 (reviews + review_requests)
```

**0.2 — Verify schema (in Supabase SQL Editor)**

```sql
\d reviews
```
✅ **Check:** table exists with `id`, `professional_id`, `contact_event_id` (UNIQUE), `rating`, `text`, `reviewer_name`, `is_hidden`, `submitted_at`, `created_at`.

```sql
\d review_requests
```
✅ **Check:** table exists with `token` (UNIQUE), `contact_event_id` (UNIQUE), `email`, `expires_at`, `consumed_at`, `sent_at`.

```sql
SELECT proname FROM pg_proc WHERE proname IN ('recompute_review_aggregates', 'submit_review', 'select_pending_review_events');
```
✅ **Check:** three rows returned.

**0.3 — Start the dev server**
```bash
npm run dev
```
Open `http://localhost:3000/api/health` — must return 200.

---

## 1. ContactButton bug fix — direct contacts emit events

This verifies the core fix that makes the entire reviews system work: direct profile visits now emit `contact_click` events.

### Steps

**1.1** Navigate to an active professional's profile: `http://localhost:3000/p/<slug>` (directly, NOT from a recommendation link).

**1.2** Open browser DevTools → **Network** tab.

**1.3** Click the **"Abrir WhatsApp"** button. WhatsApp should open in a new tab.

**1.4 — Verify the event was fired**

In the Network tab, find a `POST /api/events` request. Inspect the request body.

✅ **Check:** Body has `professional_slug` field (not `attribution_token`). `tracking_code` field starts with `direct-`.

**1.5 — Verify in DB**

```sql
SELECT event_type, tracking_code, attribution_token, professional_id
FROM events
WHERE tracking_code LIKE 'direct-%'
ORDER BY created_at DESC
LIMIT 3;
```

✅ **Check:** Rows exist with `event_type = 'contact_click'`, `attribution_token = null`, `tracking_code` matching `direct-<slug>-<10 chars>`.

---

## 2. Email-capture on profile page

### Steps

**2.1** While viewing a profile (direct visit, not from `/r/...`), look below the WhatsApp button.

✅ **Check:** A small email capture prompt is visible ("¿Querés contarnos cómo te fue?").

**2.2** In concierge mode (navigate to `/p/<slug>?from=/r/<tracking_code>`), check the same area.

✅ **Check:** Email capture prompt is **NOT visible** (hidden in concierge flow — email is already known from the lead).

**2.3** Enter an invalid email format (e.g. "notanemail") and click "Avisame".

✅ **Check:** Inline error appears. No `POST /api/contact-email` request fires.

**2.4** Enter a valid email and click "Avisame".

✅ **Check:**
- `POST /api/contact-email` fires and returns 200.
- Prompt is replaced with "¡Gracias! Te avisamos cómo te fue."
- `localStorage.getItem('reviewer-email:<slug>')` returns the entered email (verify in DevTools → Application → Local Storage).

---

## 3. Review request cron — send-review-requests

This cron sends review-request emails to contacts from 7 days ago. To test it, you'll seed an eligible event.

### Steps

**3.1 — Seed an eligible contact_click event from 7 days ago**

In Supabase SQL Editor:
```sql
INSERT INTO events (event_type, tracking_code, professional_id, event_data, created_at)
SELECT
  'contact_click',
  'direct-test-manual-001',
  id AS professional_id,
  '{"email":"your-email@example.com","direct_contact":true}'::jsonb,
  NOW() - INTERVAL '7 days'
FROM professionals
WHERE status = 'active'
LIMIT 1
RETURNING id, professional_id;
```

Note the `professional_id`. Confirm no existing `review_requests` row for this event:
```sql
SELECT * FROM review_requests WHERE contact_event_id = '<event_id_from_insert>';
```
✅ **Check:** zero rows.

**3.2 — Trigger the cron manually**

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/send-review-requests
```

✅ **Check:** HTTP 200 with `{ "sent": 1, "skipped": 0, "skipped_ids": [] }`.

**3.3 — Verify DB state**

```sql
SELECT token, email, expires_at, consumed_at, sent_at
FROM review_requests
WHERE contact_event_id = '<event_id>';
```

✅ **Check:**
- One row exists.
- `token` is a 43-char base64url string.
- `expires_at` is ~30 days from now.
- `consumed_at` is NULL.
- `sent_at` is close to NOW().

**3.4 — Verify idempotency**

Run the curl command again:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/send-review-requests
```

✅ **Check:** Returns `{ "sent": 0 }` — the UNIQUE constraint on `contact_event_id` blocked the duplicate.

**3.5 — Check the email**

If Resend is in test mode, check the Resend dashboard. You should see a "¿Qué tal tu experiencia con...?" email with a link to `/r/review/<token>`.

Note the token from step 3.3 for use in section 4.

---

## 4. Review submission page — /r/review/[token]

### Steps

**4.1 — Valid token renders form**

Navigate to `http://localhost:3000/r/review/<token>` (from section 3.3).

✅ **Check:**
- Page renders with the professional's name.
- Star picker (1–5 stars) is visible.
- Optional text area and name field are present.
- Submit button is **disabled** (no star rating selected yet).

**4.2 — Invalid token shows error state**

Navigate to `http://localhost:3000/r/review/invalid-token-xyz`.

✅ **Check:** Page renders "Enlace inválido." message (no form, no star picker).

**4.3 — Submit a valid review**

On the valid token page:
1. Click **4 stars**.
2. Type something in the text area: "Excelente sesión, lo recomiendo."
3. Type a name: "María"
4. Click "Enviar reseña".

✅ **Check:**
- Thank-you message appears: "¡Gracias por tu reseña!"

**4.4 — Verify DB state after submission**

```sql
SELECT r.rating, r.text, r.reviewer_name, r.is_hidden
FROM reviews r
JOIN review_requests rr ON rr.contact_event_id = r.contact_event_id
WHERE rr.token = '<token>';
```
✅ **Check:** rating=4, text='Excelente sesión, lo recomiendo.', reviewer_name='María', is_hidden=false.

```sql
SELECT consumed_at FROM review_requests WHERE token = '<token>';
```
✅ **Check:** `consumed_at` is not NULL (token consumed).

**4.5 — Verify aggregates updated**

```sql
SELECT rating_average, rating_count, ranking_score
FROM professionals WHERE id = '<professional_id>';
```
✅ **Check:** `rating_count = 1`, `rating_average = 4.00`. `ranking_score` should include the rating contribution (slightly higher than before).

**4.6 — Revisit consumed token**

Navigate back to `http://localhost:3000/r/review/<token>`.

✅ **Check:** Shows "Esta reseña ya fue enviada." (consumed state, no form).

---

## 5. Reviews card on /p/[slug]

### Setup
The professional you seeded in section 3 now has 1 visible review from section 4.

### Steps

**5.1** Navigate to `http://localhost:3000/p/<professional-slug>`.

✅ **Check:**
- A "Reseñas" card is visible (between "Sobre mí" and "Modalidad").
- Shows "4.0 ★ · 1 reseña".
- Shows the recent review: 4 stars, "Excelente sesión, lo recomiendo.", "María", date.

**5.2 — Verify with browser DevTools**

Inspect the DOM and confirm `[data-testid="reviews-card"]` exists in the page HTML.

**5.3 — Profile with no reviews (0 count)**

Visit a different active professional's profile who has no reviews.

✅ **Check:** No "Reseñas" card in the DOM for that profile.

---

## 6. Admin moderation — /admin/reviews

### Steps

**6.1** Navigate to `http://localhost:3000/admin/reviews` (must be logged in as admin).

✅ **Check:** The list shows the review from section 4 (professional name, 4 stars, text, "Visible" chip, "Ocultar" button).

**6.2 — Hide a review**

Click "Ocultar" on the review.

✅ **Check:**
- The chip changes from "Visible" to "Oculta".
- The button changes to "Mostrar".

**6.3 — Verify aggregate recalculation**

```sql
SELECT rating_average, rating_count FROM professionals WHERE id = '<professional_id>';
```
✅ **Check:** `rating_count = 0`, `rating_average = 0` (hidden review excluded from aggregate).

**6.4 — Verify profile hides reviews card**

Refresh `http://localhost:3000/p/<slug>` (may need a server restart or wait for Next.js revalidation).

✅ **Check:** "Reseñas" card is now absent (rating_count = 0 → hidden).

**6.5 — Restore**

Click "Mostrar" on the hidden review in `/admin/reviews`.

✅ **Check:** Review becomes visible again, aggregate restores to count=1, avg=4.0.

---

## 7. Cron auth checks

```bash
curl -i http://localhost:3000/api/cron/send-review-requests
```
✅ **Check:** 401.

```bash
curl -i -H "Authorization: Bearer wrong-secret" http://localhost:3000/api/cron/send-review-requests
```
✅ **Check:** 401.

---

## 8. AFIP and email deployment notes

**Resend domain verification** — before sending review emails to real users, verify a sending domain in the Resend dashboard and update `FROM_EMAIL` in `lib/email.ts` from `onboarding@resend.dev` to your verified domain address. Until then, emails only reach the Resend account owner.

**Migration order** — always apply 004 → 005 → 006 in order. Migration 006 assumes `professionals.rating_average` and `rating_count` exist (from 004) and that `recompute_ranking()` exists (from 005).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| ContactButton doesn't fire event for direct visit | Bug fix wasn't committed | Verify `app/components/ContactButton.tsx` — should NOT have `if (attributionToken)` gate |
| Cron returns `sent: 0` when events exist | Events are not in the 6-7 day window, or email not in event_data | Check `SELECT event_data->>'email', created_at FROM events WHERE event_type='contact_click' AND created_at BETWEEN NOW()-7d AND NOW()-6d` |
| Review page shows "Enlace inválido" for valid token | Migration 006 not applied | Re-run `apply-reviews-migration.mjs` |
| Reviews card doesn't appear after submission | DB trigger didn't fire | `SELECT rating_count FROM professionals WHERE id=...` — if still 0, check `pg_trigger` for `reviews_recompute_aggregates` |
| Admin reviews 404 | Not logged in | Go to `/admin/login` first |
| Aggregate not recomputing when hiding review | Trigger not installed | `SELECT tgname FROM pg_trigger WHERE tgname = 'reviews_recompute_aggregates'` |

---

## What's NOT covered here

- WhatsApp delivery channel for review requests (deferred PRD)
- Reviewer self-service edit/delete (deferred PRD)
- Pagination of reviews on /p/[slug] (deferred)
- Professional notification when they receive a review (depends on /pro portal)
- Automated AFIP invoicing (separate from this feature)
