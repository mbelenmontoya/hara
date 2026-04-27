# Manual Testing — Destacado Tier MVP

Created: 2026-04-27
Plan: `docs/plans/2026-04-24-destacado-tier-mvp.md`
PRD: `docs/prd/2026-04-24-destacado-tier-mvp.md`

This guide walks you through testing every user-visible piece of the Destacado tier MVP by hand. Run sections in order — each section's prerequisites assume earlier sections passed.

If something looks wrong at any step, **stop and note which section + which check**. Don't continue past a broken step — later sections may produce false negatives.

---

## 0. Prerequisites — environment + migrations

### What you need
- Local repo with the Destacado MVP commit applied (this branch).
- `.env.local` populated (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, etc.).
- Network access to Supabase (the sandbox doing the implementation didn't have it).
- Both migrations applied to Supabase **in this order**: 004 first, then 005.

### Steps

**0.1 — Apply migrations**

```bash
node scripts/apply-ranking-migration.mjs       # 004 (idempotent; safe to re-run)
node scripts/apply-destacado-migration.mjs     # 005
```

Both scripts auto-detect "already applied" and exit cleanly. If they print *"Apply the migration manually"*, paste the SQL file in the **Supabase Dashboard → SQL Editor** and click Run.

**0.2 — Verify schema (in Supabase SQL Editor)**

```sql
\d professionals
```

✅ **Check:** all five columns from migration 004 present (`profile_completeness_score`, `rating_average`, `rating_count`, `subscription_tier`, `ranking_score`) **plus** the new `tier_expires_at TIMESTAMPTZ` from migration 005.

```sql
\d subscription_payments
```

✅ **Check:** table exists with these columns: `id` (UUID), `professional_id`, `amount`, `currency`, `paid_at`, `period_start`, `period_end`, `payment_method`, `invoice_number`, `notes`, `created_at`, `created_by`.

```sql
SELECT proname FROM pg_proc WHERE proname IN ('recompute_ranking', 'upgrade_destacado_tier');
```

✅ **Check:** both function names appear.

```sql
SELECT tgname FROM pg_trigger WHERE tgname = 'professionals_recompute_ranking';
```

✅ **Check:** one row returned.

**0.3 — Verify backfill ran**

```sql
SELECT COUNT(*) AS unscored FROM professionals WHERE ranking_score = 0 AND profile_completeness_score > 0;
```

✅ **Check:** zero rows. If non-zero, the trigger didn't fire on the backfill UPDATE — re-apply migration 004.

**0.4 — Start the dev server**

```bash
npm run dev
```

Open `http://localhost:3000/api/health` — must return 200. If not, your Next.js build is broken; investigate before continuing.

---

## 1. Ranking trigger — expiry semantics

This section verifies the SQL trigger correctly handles tier expiry. We touch the DB directly.

### Steps

**1.1 — Pick an active professional with a non-trivial completeness score**

```sql
SELECT id, full_name, profile_completeness_score, subscription_tier, tier_expires_at, ranking_score
FROM professionals
WHERE status = 'active'
ORDER BY profile_completeness_score DESC
LIMIT 1;
```

✅ **Check:** row returned. Note the `id`, `profile_completeness_score`, and `ranking_score`. Call them `id_X`, `c_X`, and `r_X`.

For a basico row at launch, `r_X` should equal `round(0.7 * c_X, 2)`. Confirm.

**1.2 — Activate Destacado with future expiry**

```sql
UPDATE professionals
SET subscription_tier = 'destacado',
    tier_expires_at   = NOW() + INTERVAL '30 days'
WHERE id = '<id_X>';

SELECT ranking_score FROM professionals WHERE id = '<id_X>';
```

✅ **Check:** new `ranking_score` = `r_X + 10.00`. The +10 boost comes from `0.1 * 100` (tier contribution).

**1.3 — Backdate expiry to the past**

```sql
UPDATE professionals
SET tier_expires_at = NOW() - INTERVAL '1 day'
WHERE id = '<id_X>';

SELECT ranking_score FROM professionals WHERE id = '<id_X>';
```

✅ **Check:** `ranking_score` is back to `r_X` (no boost). The trigger's expiry check made the tier ineffective.

**1.4 — Reset the row**

```sql
UPDATE professionals
SET subscription_tier = 'basico', tier_expires_at = NULL
WHERE id = '<id_X>';
```

---

## 2. Admin login + access to the page

### Steps

**2.1** Navigate to `http://localhost:3000/admin/leads`. If you're not logged in, you'll be redirected to `/admin/login`.

**2.2** Log in with your admin Supabase Auth credentials.

**2.3** Navigate to `http://localhost:3000/admin/professionals`.

✅ **Check:** the page loads without errors. You see the list of all professionals grouped into "Pendientes de revisión" + "Revisados".

✅ **Check (regression):** the AdminFilterBar still works — search by name and filter by status. No console errors.

---

## 3. Admin upgrade flow — first-time Destacar

### Setup
Pick an `active` professional that is currently `basico` (no Destacado tier yet). Their row should show a **neutral chip** that reads "Básico".

### Steps

**3.1** Click the **"Destacar"** button on the row.

✅ **Check:** the modal opens with the title **"Destacar profesional"** (not "Extender Destacado" — that wording is for already-active rows).

✅ **Check (no info banner):** there's no "Este profesional ya es Destacado…" banner — that only shows for already-active subscriptions.

**3.2 — Validation: empty form**

Try clicking **"Guardar"** with the form empty.

✅ **Check:** an error appears under the **Monto** field reading "El monto debe ser mayor que 0". Form does NOT submit.

**3.3 — Validation: amount = 0**

Type `0` in **Monto**, leave everything else default.
Click **Guardar**.

✅ **Check:** same "El monto debe ser mayor que 0" error.

**3.4 — Validation: custom period inverted**

Type `5000` in Monto.
Click the **"Personalizado"** preset.
Set "Inicio del período" = today + 30 days.
Set "Fin del período" = today (i.e. end < start).
Click **Guardar**.

✅ **Check:** error appears reading "La fecha de fin debe ser posterior al inicio del período". No submit.

**3.5 — Happy path**

Reset the period to the **30 días** preset. Fill:
- Monto: `5000`
- Moneda: `ARS`
- Pagado el: today
- Periodo: 30 días
- Método de pago: `Mercado Pago link`
- Factura N°: `A-0001-00000001` (fake — for testing only)
- Notas: leave blank

Click **Guardar**.

✅ **Check:**
- Modal closes (no error alert).
- Within 1 second, the row's status chip updates from "Básico" to **"Destacado hasta DD MMM YYYY"** (date should be ~30 days from today, formatted in Spanish).

**3.6 — Verify DB state**

In Supabase SQL Editor:

```sql
SELECT id, subscription_tier, tier_expires_at, ranking_score
FROM professionals WHERE id = '<professional_id>';

SELECT * FROM subscription_payments WHERE professional_id = '<professional_id>';
```

✅ **Check:**
- `subscription_tier = 'destacado'`.
- `tier_expires_at` is ~30 days from now (TIMESTAMPTZ).
- `ranking_score` includes the +10 tier boost (compare to the value before upgrade).
- One `subscription_payments` row with the data you submitted (`amount=5000`, `currency='ARS'`, etc.).

---

## 4. Admin extend flow — silent extension preserves paid time

This is the most important correctness test for the RPC. **Set up carefully.**

### Setup
The same professional from section 3 is now Destacado with `tier_expires_at` = today + 30 days.

### Steps

**4.1** Note the current `tier_expires_at` in the DB. Call it `E0`.

**4.2** Click **"Extender"** on the row (button label changes from "Destacar" to "Extender" for already-active subscriptions).

✅ **Check:** modal title is now **"Extender Destacado"** (not "Destacar profesional").

✅ **Check (info banner):** a blue Alert reads *"Este profesional ya es Destacado hasta DD MMM YYYY. Al registrar un nuevo pago, el periodo se extiende automáticamente."*

**4.3** Submit another 30-day payment (same form values as 3.5, but invoice number `A-0001-00000002`).

**4.4 — Verify silent extension**

```sql
SELECT tier_expires_at FROM professionals WHERE id = '<professional_id>';
SELECT COUNT(*) FROM subscription_payments WHERE professional_id = '<professional_id>';
```

✅ **Check:**
- New `tier_expires_at` ≈ `E0 + 30 days` (NOT `today + 30` — paid time was preserved).
- 2 rows in `subscription_payments`.

✅ **Check (regression):** the row chip on the admin list now reads "Destacado hasta DD MMM YYYY" with the new (extended) date.

---

## 5. Admin payment history — expand chevron

### Steps

**5.1** On the same professional's row (now with 2 payments), click the **chevron** (▼ icon) on the right side of the row.

✅ **Check:** the row expands. Below the main content, you see a "Historial de pagos" section listing both payments — each row shows: amount + currency, date, payment method, period range, factura number.

**5.2** Click the chevron again.

✅ **Check:** the row collapses. Click again — expands instantly (cached, no second API call).

**5.3 — Verify lazy loading didn't break**

Open browser DevTools → Network tab. Refresh the page. Click chevron on a different professional you haven't expanded yet.

✅ **Check:** a `GET /api/admin/subscriptions?professional_id=...` request fires. Response has `{ payments: [...] }`. Re-clicking the same row does NOT fire another request (cache).

---

## 6. Public Destacado chip — `/profesionales`

### Setup
You have at least one `active + accepting_new_clients` professional with **`destacado` + future `tier_expires_at`** (the one you upgraded in section 3 still qualifies).

### Steps

**6.1** Navigate to `http://localhost:3000/profesionales` in a regular browser (no admin session needed).

✅ **Check:** the directory page renders. The professional you upgraded is at or near the top (ranking_score boosted by +10).

**6.2 — Inspect the card**

Find the upgraded professional's card. Look for a **brand-color chip** labeled **"Destacado"** placed beside (or after) the name.

✅ **Check:** in DevTools, the chip is wrapped in `<span data-testid="destacado-chip">`. Other (basico) cards do NOT have this attribute anywhere.

**6.3 — Verify ranking position**

Check that the destacado professional appears **higher in the list** than another professional with similar completeness but no tier (basico). The +10 boost should produce a visible reorder.

---

## 7. Public Destacado chip — `/p/[slug]`

### Steps

**7.1** Click the destacado professional's card on `/profesionales` (or navigate directly to `/p/<their-slug>`).

✅ **Check:** the profile page renders. Just below the name `<h1>` (and above the short description), a centered **brand-color "Destacado" chip** is visible.

**7.2 — Confirm via DevTools**

Inspect the page → find `[data-testid="destacado-chip"]`. Should be exactly one occurrence.

**7.3 — Negative case**

Navigate to a basico professional's profile (`/p/<basico-slug>`).

✅ **Check:** no Destacado chip appears. No `[data-testid="destacado-chip"]` in the DOM.

---

## 8. Cron endpoint — `/api/cron/expire-destacado`

This endpoint is NOT under `/api/admin/*`, so middleware doesn't gate it. Auth is via `Authorization: Bearer ${CRON_SECRET}` header only.

### Steps

**8.1 — 401: missing header**

```bash
curl -i http://localhost:3000/api/cron/expire-destacado
```

✅ **Check:** HTTP 401 with `{"error":"Unauthorized"}`.

**8.2 — 401: wrong token**

```bash
curl -i -H "Authorization: Bearer wrong-secret" http://localhost:3000/api/cron/expire-destacado
```

✅ **Check:** HTTP 401.

**8.3 — Setup: seed an expired Destacado row**

```sql
UPDATE professionals
SET subscription_tier = 'destacado',
    tier_expires_at   = NOW() - INTERVAL '1 day'
WHERE id = '<another-active-professional-id>';
```

(Choose a *different* professional from the section 3 one so we don't undo your testing setup.)

**8.4 — 200: valid token cleans up**

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/expire-destacado
```

(Use the actual CRON_SECRET value from `.env.local`.)

✅ **Check:** HTTP 200 with `{"updated":N,"ids":["<uuid1>",...]}`. The seeded professional's id should be in the `ids` array. `N >= 1`.

**8.5 — Verify DB cleanup**

```sql
SELECT subscription_tier, tier_expires_at, ranking_score
FROM professionals WHERE id = '<the-seeded-id>';
```

✅ **Check:**
- `subscription_tier = 'basico'`.
- `tier_expires_at = NULL`.
- `ranking_score` no longer includes the +10 tier boost.

**8.6 — Idempotency**

Re-run the same curl command immediately.

✅ **Check:** HTTP 200, `{"updated":0,"ids":[]}`. No row was double-touched.

---

## 9. Edge cases — regression scope

These should work but didn't have explicit before/after coverage. Spot-check.

### 9.1 — Existing legacy Destacado row (if any)

If your DB had any pre-migration-005 row with `subscription_tier='destacado'` set manually but no `tier_expires_at`, it should still get the +10 boost via the `IS NULL` backward-compat branch.

```sql
SELECT id, subscription_tier, tier_expires_at, ranking_score, profile_completeness_score
FROM professionals
WHERE subscription_tier = 'destacado' AND tier_expires_at IS NULL;
```

✅ **Check:** for each row, `ranking_score = round(0.7 * profile_completeness_score + 10, 2)`. (Cron will NOT touch these rows since `tier_expires_at < NOW()` is false on NULL.)

### 9.2 — Modal: switching professionals doesn't carry stale data

Open the modal on Professional A. Type `9999` in the amount field. Cancel.
Open the modal on Professional B.

✅ **Check:** the amount field is empty (form state was reset).

### 9.3 — `subscription_tier` filter still works on admin list

Search bar still searches by name/specialty. Status filter still filters by `submitted/active/paused/...`. Nothing broke from the page rewrite.

### 9.4 — Existing `/p/[slug]` for non-destacado profiles

Confirm that the WhatsApp ContactButton still works as before (no regression from adding the chip). Click it on a basico professional's profile.

✅ **Check:** WhatsApp opens in a new tab with the pre-filled message — same behavior as before.

### 9.5 — `/profesionales` ordering correctness

Make a basico professional's `profile_completeness_score` high enough to outrank a destacado one with low completeness. Confirm the high-completeness basico appears above the low-completeness destacado.

```sql
-- Pick two professionals A (basico, completeness=95) and B (destacado, completeness=20).
-- A's ranking_score = 66.50, B's ranking_score = 14.00 + 10.00 = 24.00.
-- A should rank above B.
```

✅ **Check:** A appears above B on `/profesionales`.

---

## 10. AFIP invoicing reminder

This MVP does **not** automate AFIP electronic invoices. Every payment you record via the modal still requires you to manually issue a Factura via AFIP's "Comprobantes en línea" portal and paste the invoice number into the modal's "Factura N°" field.

✅ **Check:** for any real (non-test) payment recorded in `subscription_payments`, the `invoice_number` column is populated with a real AFIP invoice ID.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Modal submits but DB doesn't update | RPC call failing — check Network tab for the POST response | Verify migration 005 applied; check Supabase logs for errors from `upgrade_destacado_tier` |
| Destacado chip doesn't appear on /profesionales | Either the row isn't actually destacado or `tier_expires_at` is in the past | `SELECT subscription_tier, tier_expires_at FROM professionals WHERE id=...` and compare to `NOW()` |
| Admin row chip shows "Destacado hasta Invalid Date" | `tier_expires_at` returned as a non-ISO string | Inspect the GET /api/admin/professionals response; should be ISO 8601 |
| Cron returns 500 instead of 401/200 | `CRON_SECRET` not set in env | `echo $CRON_SECRET` — must be non-empty before running the cron handler |
| Ranking trigger doesn't update on UPDATE | Trigger missing or function not replaced | Re-run migration 005 in Supabase SQL Editor |

---

## What's NOT covered by this guide

- **Self-serve checkout** — admin records payments out-of-band; there is no professional-initiated checkout flow yet (separate PRD).
- **Automated AFIP invoicing** — manual via AFIP portal (separate PRD).
- **Renewal reminders** — admin tracks renewal dates manually (separate PRD).
- **Multi-tier (Premium etc.)** — only `basico` and `destacado` are supported (binary CHECK constraint).
- **`/pro/*` portal** — professionals don't see their own tier status anywhere; admin notifies via WhatsApp (separate PRD).

If you find a bug not listed in Troubleshooting, capture: the section number, the exact step, the expected vs actual behavior, and any Network/Console errors. Hand it back for a follow-up `/spec` cycle.
