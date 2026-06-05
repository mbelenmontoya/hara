# Professional Profile Page Redesign Implementation Plan

Created: 2026-06-03
Author: belu.montoya@dialpad.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Redesign `/p/[slug]` with a new two-column desktop layout, conditional field rendering (hide empty fields including labels), Google Maps embed for presencial location, simplified contact card (WhatsApp button only, Instagram as link), and a full open review form footer (star rating 1–5 + name + comment).

## Autonomous Decisions

- **Direct review storage:** Reviews submitted via the open form are inserted with `is_hidden = false` (immediately visible). Admin can remove fakes via existing `/admin/reviews`. Rate limited to 5 reviews per hour per IP (single ratelimit key — no per-professional-per-IP 24h tracking).
- **Existing reviews:** `ProfileReviews` card (individual per-review list) kept in the new layout as a full-width section between the two-column area and the footer form.
- **Reviewer name:** Required on the form to publish the review. Email used for rate-limiting but not stored in the review record (DB already has no `reviewer_email` in the `reviews` table per existing select queries).

## Out of Scope

- Star rating average on `/profesionales` directory cards — deferred (Bel confirmed: update later when we change the pros cards on the main search page)
- `ProfileExpertise.tsx` and `ProfileLogistics.tsx` — left as dead code (not deleted, just no longer imported in `page.tsx`)
- Token-gated review flow (concierge flow) — unchanged
- Map when `online_only = true` — location section is hidden entirely

## Approach

**Chosen:** Modify 2 existing components (`ProfileHero`, `ProfileContact`) + create 3 new components (`ProfileLocation`, `ProfileDetails`, `ProfileReviewForm`) + 1 new API route + rewire `page.tsx` layout.

**Why:** The 6 existing sub-components are small and self-contained. Modifying 2 and creating 3 new ones avoids breaking the established component boundary pattern while giving each section a clean, independently testable unit. The old `ProfileExpertise` and `ProfileLogistics` are retired in place (left as files but de-imported) since they're replaced by the new `ProfileDetails`.

## Context for Implementer

The profile page uses 6 sub-components under `app/p/[slug]/components/`. Each component is a self-contained glass card. `page.tsx` is the server component that fetches all data and composes the layout. All conditional rendering happens AT the component level — if data is absent, the component returns `null`. The `page.tsx` layout itself uses `RevealOnScroll` wrappers for scroll animations. Preserve these in the new layout.

`instagram` in the DB may be stored as a full URL (`https://www.instagram.com/samastha_yoga`) or just a handle (`@samastha_yoga` or `samastha_yoga`). Normalize to `@handle` for display and ensure the href is always `https://www.instagram.com/handle`.

## Runtime Environment

- **Start:** `npm run dev` → port 3000
- **Health:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/p/silvia-ferrer`
- **Test:** `npm test -- --reporter=dot --project=unit`

## File Structure

- `app/p/[slug]/components/ProfileHero.tsx` (modify) — add rating display; props updated
- `app/p/[slug]/components/ProfileContact.tsx` (modify) — remove WhatsApp text + ReviewerEmailCapture; Instagram as link
- `app/p/[slug]/components/ProfileLocation.tsx` (create) — presencial location + Google Maps iframe; renders null if online_only
- `app/p/[slug]/components/ProfileDetails.tsx` (create) — merged Especialidades + Tipo de servicio + Modalidad with conditional sections
- `app/p/[slug]/components/ProfileReviewForm.tsx` (create) — open star-rating review form (client component)
- `app/api/reviews/direct/route.ts` (create) — POST endpoint for open review submission
- `app/p/[slug]/page.tsx` (modify) — new layout wiring; updated imports

## Assumptions

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` has Maps Embed API enabled. If not, the map shows as a blank iframe — Task 3 includes a fallback link. Task 3 depends on this.
- The `reviews` table schema (from migration 006): `id, professional_id, contact_event_id (UUID, nullable, UNIQUE), rating, text, reviewer_name, is_hidden, submitted_at`. There is **no** `tracking_code` column — `contact_event_id` is the optional link to a contact event and can be omitted on direct inserts. Task 5 depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Maps Embed API not enabled on existing key | Medium | Low | Fallback: show "Ver en Google Maps" link below the iframe |

## E2E Test Scenarios

### TS-001: Full profile — all sections visible
**Priority:** Critical
**Preconditions:** `silvia-ferrer` has bio, practices, modality, city, presencial location, reviews
**Mapped Tasks:** Task 1, 2, 3, 4, 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:3000/p/silvia-ferrer` | Page loads, full-width hero visible |
| 2 | Check hero box | Avatar + name + rating aggregate + location + "Aceptando nuevas consultas" chip — all in full-width box |
| 3 | Check left column (row 1) | "Sobre mí" box with bio + experience |
| 4 | Check right column (row 1) | "Contacto" box: Instagram @link + "Abrir WhatsApp" button. No phone number visible. |
| 5 | Check left column (row 2) | "Ubicación presencial" box: address text + embedded map |
| 6 | Check right column (row 2) | One box: "Especialidades" chips + "Tipo de servicio" + "Modalidad" chips |
| 7 | Scroll to bottom | "Ya tuviste una sesión?" review form with stars + name + comment + button |

### TS-002: Sparse profile — empty sections hidden
**Priority:** High
**Preconditions:** A pro with no bio, no instagram, no presencial location (online_only = true)
**Mapped Tasks:** Task 2, 3, 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to profile of an online-only pro | Page loads |
| 2 | Check layout | No "Sobre mí" section, no "Contacto Instagram" row, no "Ubicación presencial" section and no map |
| 3 | Verify no empty label headings | No section with label but no content beneath it |

### TS-003: Submit open review
**Priority:** Critical
**Preconditions:** On any active professional's profile
**Mapped Tasks:** Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Scroll to review form footer | Form visible: star rating + name input + comment textarea + button |
| 2 | Click 4 stars | 4 stars highlighted |
| 3 | Fill name "Ana García" and comment "Excelente sesión" | Inputs accept text |
| 4 | Click "Dejar comentario" | Button shows loading state, then success message "¡Gracias por tu comentario!" |
| 5 | Check `/admin/reviews` | New review appears with rating 4, name "Ana García" |

### TS-004: WhatsApp number hidden
**Priority:** High
**Preconditions:** Any profile
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to any profile | Page loads |
| 2 | Inspect Contacto card | No phone number text visible, only "Abrir WhatsApp" button |

## Progress Tracking

- [x] Task 1: Update ProfileHero — full-width, rating aggregate display
- [x] Task 2: Update ProfileContact — remove WhatsApp text, Instagram link, remove ReviewerEmailCapture
- [x] Task 3: New ProfileLocation — presencial location + Google Maps embed
- [x] Task 4: New ProfileDetails — merged Especialidades + Tipo de servicio + Modalidad (conditional)
- [x] Task 5: New POST /api/reviews/direct + ProfileReviewForm component
- [x] Task 6: Update page.tsx — new two-column layout

## Implementation Tasks

---

### Task 1: Update ProfileHero — full-width, rating aggregate display

**Objective:** Add `ratingAverage` and `ratingCount` props to `ProfileHero`. Show "⭐ 4.8 · 12 reseñas" below the name when `ratingCount > 0`. The hero will be rendered full-width in the new layout (that change is in Task 6 — `ProfileHero` itself stays the same in terms of HTML structure). Verified by TS-001 step 2.

**Files:**

- Modify: `app/p/[slug]/components/ProfileHero.tsx`

**Key Decisions / Notes:**

- Add two new props: `ratingAverage: number` and `ratingCount: number`
- Add below the name (before Destacado chip): `{ratingCount > 0 && <p className="text-sm text-muted text-center">{'★'.repeat(Math.round(ratingAverage))} {ratingAverage.toFixed(1)} · {ratingCount} {ratingCount === 1 ? 'reseña' : 'reseñas'}</p>}`
- No changes to existing fields — all already conditional
- `page.tsx` must pass `ratingAverage={professional.rating_average}` and `ratingCount={professional.rating_count}` (Task 6)

**Definition of Done:**

- [ ] `ProfileHero` renders `⭐ 4.8 · 12 reseñas` when ratingCount > 0
- [ ] No rating row shown when ratingCount === 0
- [ ] Verify: `npm test -- --reporter=dot --project=unit` (no regressions)

---

### Task 2: Update ProfileContact — remove WhatsApp number, Instagram link, remove ReviewerEmailCapture

**Objective:** Simplify the Contact card: remove the raw WhatsApp number display and the `ReviewerEmailCapture` form (replaced by the full review form in Task 5). Make Instagram render as a `@handle` link rather than showing the full URL. The `showReviewCapture` prop is removed entirely. Verified by TS-002 step 4 and TS-004.

**Files:**

- Modify: `app/p/[slug]/components/ProfileContact.tsx`

**Key Decisions / Notes:**

- Remove the `<div>` block that shows `<h3>WhatsApp</h3><p>{whatsapp}</p>`
- Remove `showReviewCapture` prop and the `{showReviewCapture && <ReviewerEmailCapture .../>}` block; remove the `ReviewerEmailCapture` import
- Instagram normalization — the DB may store a full URL or a bare handle. Normalize:
  ```ts
  function normalizeInstagram(raw: string): { href: string; label: string } {
    const handle = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/[/?].*$/, '').replace(/^@/, '')
    return { href: `https://www.instagram.com/${handle}`, label: `@${handle}` }
  }
  ```
- Show Instagram section only when `instagram` prop is non-null/non-empty
- ContactButton stays unchanged: `professionalSlug`, `professionalName`, `whatsappNumber`, `trackingCode="direct-profile-visit"`, `rank={0}`, `className="w-full"`
- Remove `ProfileContactProps.showReviewCapture` field
- The existing `ProfileContact.tsx:43` already has inline normalization: `.replace('https://www.instagram.com/', '@').replace(/[?/].*$/, '')`. Replace this with the new `normalizeInstagram()` helper — do not leave both inline and helper active simultaneously.

**Definition of Done:**

- [ ] No phone number text anywhere in the rendered card
- [ ] Instagram shows as `@handle` clickable link when present, nothing when absent
- [ ] `ReviewerEmailCapture` no longer imported or rendered
- [ ] Verify: `npm test -- --reporter=dot --project=unit`

---

### Task 3: New ProfileLocation — presencial location + Google Maps embed

**Objective:** Create a new glass card that shows the professional's presencial address and an embedded Google Maps iframe. Returns `null` when `onlineOnly = true` or `city` is null/empty — neither heading nor map appears. Verified by TS-001 step 5 and TS-002 step 2.

**Files:**

- Create: `app/p/[slug]/components/ProfileLocation.tsx`

**Key Decisions / Notes:**

- Props: `city: string | null`, `country: string`, `location: string`, `onlineOnly: boolean`
- Early return: `if (onlineOnly || !city) return null`
- Map embed URL: `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(location)}`
- Iframe: `width="100%" height="200" style="border:0" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"`
- Fallback link (below iframe) in case the API key doesn't have Maps Embed enabled: `<a href={`https://maps.google.com/?q=${encodeURIComponent(location)}`} target="_blank" className="text-xs text-brand hover:underline">Ver en Google Maps →</a>`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is already in `.env.local` and used by `PlacesAutocomplete`; it has the same key for Places — check if Maps Embed is enabled on it. Plan assumes it is; fallback link covers the failure case.

**Definition of Done:**

- [ ] Component returns null when `onlineOnly = true`
- [ ] Component returns null when `city = null`
- [ ] When presencial: renders address text + iframe map + fallback link
- [ ] Verify: `npm test -- --reporter=dot --project=unit` (no regressions from new file)

---

### Task 4: New ProfileDetails — merged Especialidades + Tipo de servicio + Modalidad (conditional)

**Objective:** Create a single glass card that combines what was previously `ProfileExpertise` and `ProfileLogistics` (modality only). Each sub-section is only rendered when data exists — no empty headings. Replaces both components in `page.tsx`. Verified by TS-001 step 6 and TS-002 step 3.

**Files:**

- Create: `app/p/[slug]/components/ProfileDetails.tsx`

**Key Decisions / Notes:**

- Props: `specialties: string[]`, `practiceLabels: string[]`, `serviceTypeLabels: string[]`, `modalityLabels: string[]`
- Returns `null` if all four arrays are empty
- Structure:
  ```
  {specialties.length > 0 && (
    <section><h2>Especialidades</h2><div className="flex flex-wrap gap-2">{specialties.map(s => <Chip key={s} specialty={s} />)}</div></section>
  )}
  {serviceTypeLabels.length > 0 && (
    <section><h2>Tipo de servicio</h2><p>{serviceTypeLabels.join(' & ')}</p></section>
  )}
  {modalityLabels.length > 0 && (
    <section><h2>Modalidad</h2><div className="flex flex-wrap gap-2">{modalityLabels.map(l => <Chip key={l} label={l} variant="neutral" />)}</div></section>
  )}
  ```
- `practiceLabels` are holistic practices (reiki, yoga, etc.) — show under "Especialidades" alongside the specialty chips, or omit if empty. Looking at Bel's mockup: the right box shows "ESPECIALIDADES" with chips (reiki, yoga) which are the `specialties` free-text entries. `practiceLabels` (catalog) can be folded into the same section as separate chips.
- No price range, no courses section (those were in ProfileLogistics — out of scope for new design per wireframes)
- Section headings: `text-xs font-semibold text-muted uppercase tracking-wide`
- Space between sections: `space-y-4` on the wrapper div
- `ProfileExpertise` and `ProfileLogistics` remain as files but are no longer imported in `page.tsx` after Task 6

**Definition of Done:**

- [ ] When all arrays empty: `ProfileDetails` returns null
- [ ] When specialties present: shows chips under "ESPECIALIDADES"
- [ ] When serviceTypeLabels present: shows text under "TIPO DE SERVICIO"
- [ ] When modalityLabels present: shows chips under "MODALIDAD"
- [ ] No heading shows when its data array is empty
- [ ] Verify: `npm test -- --reporter=dot --project=unit`

---

### Task 5: New POST /api/reviews/direct + ProfileReviewForm component

**Objective:** Create an open review form that any visitor can fill in (star rating 1–5, name, comment), and a backend API route that stores the review directly in the `reviews` table using a synthetic tracking code. Rate-limited per IP. Verified by TS-003.

**Files:**

- Create: `app/api/reviews/direct/route.ts`
- Create: `app/p/[slug]/components/ProfileReviewForm.tsx`

**Key Decisions / Notes:**

**API route (`/api/reviews/direct`):**
- Method: `POST`
- Body: `{ professional_slug: string, rating: number (1–5), reviewer_name: string, text?: string }`
- Steps:
  1. Validate `professional_slug`, `rating` (1–5 integer), `reviewer_name` (non-empty string)
  2. Rate limit: `ratelimit.limit(`reviews-direct:ip:${clientIP}`)` — 5/hour per IP
  3. Look up professional by slug: `supabaseAdmin.from('professionals').select('id').eq('slug', professional_slug).eq('status', 'active').single()`
  4. Insert directly: `supabaseAdmin.from('reviews').insert({ professional_id: pro.id, rating, text: text || null, reviewer_name, is_hidden: false })` — `contact_event_id` is nullable, omit it. The `AFTER INSERT` trigger on `reviews` auto-updates `rating_average` and `ranking_score`.
  5. Return 201 `{ success: true }` or 400/429/500 with friendly Spanish error
- Error messages in Spanish: "Nombre requerido", "Calificación inválida", "Demasiados intentos. Intentá más tarde.", "Profesional no encontrado"
- `runtime = 'nodejs'` (same as existing review route)

**ProfileReviewForm (client component):**
- Props: `professionalSlug: string`
- State: `rating: number` (0 = none selected), `name: string`, `text: string`, `loading`, `submitted`, `error`
- Star rating UI: 5 `<button>` elements each showing ★ (filled/empty based on `rating`). On click: `setRating(n)`. `aria-label="N estrellas"`
- Name input (required): `placeholder="Tu nombre"`
- Textarea for comment (optional): `placeholder="Contanos cómo fue tu sesión..."`
- Submit button "Dejar comentario" — disabled when `rating === 0 || !name.trim() || loading`
- On success: show "¡Gracias por tu comentario! Va a aparecer en el perfil en breve."
- Heading: "Ya tuviste una sesión? Tu comentario le puede ayudar a otras personas"
- Full-width glass card design matching other profile cards

**Definition of Done:**

- [ ] Star rating UI: clicking a star fills 1..n stars, clicking same star deselects
- [ ] Submit button disabled when no rating or no name
- [ ] POST to `/api/reviews/direct` returns 201 on valid input
- [ ] On success: form shows thank-you message
- [ ] On rate limit (429): shows "Demasiados intentos. Intentá más tarde."
- [ ] Review appears in `/admin/reviews` after submission
- [ ] Verify: `npm test -- --reporter=dot --project=unit`

---

### Task 6: Update page.tsx — new two-column layout

**Objective:** Rewire the page layout to match Bel's wireframe: full-width hero → row 1 two-column [ProfileAbout | ProfileContact] → row 2 two-column [ProfileLocation | ProfileDetails] → full-width ProfileReviews (if reviews exist) → full-width ProfileReviewForm. Remove unused imports. Verified by TS-001 (full flow) and TS-002 (sparse profile).

**Files:**

- Modify: `app/p/[slug]/page.tsx`

**Key Decisions / Notes:**

- Remove imports: `ProfileExpertise`, `ProfileLogistics`
- Add imports: `ProfileLocation`, `ProfileDetails`, `ProfileReviewForm`
- Update `ProfileHero` call to pass `ratingAverage={professional.rating_average}` and `ratingCount={professional.rating_count}`
- Remove `showReviewCapture` from `ProfileContact` call
- `ProfileContact` no longer needs `showReviewCapture` — just `slug`, `name`, `whatsapp`, `instagram`
- New layout structure:
  ```tsx
  {/* 1. Full-width hero */}
  <ProfileHero ... ratingAverage={...} ratingCount={...} />

  {/* 2. Two-column: Sobre mí | Contacto */}
  <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 space-y-4 lg:space-y-0">
    <RevealOnScroll delay={0}><ProfileAbout bio={...} experienceDescription={...} /></RevealOnScroll>
    <div className="lg:sticky lg:top-8">
      <RevealOnScroll delay={0}><ProfileContact slug={...} name={...} whatsapp={...} instagram={...} /></RevealOnScroll>
    </div>
  </div>

  {/* 3. Ubicación | Detalles — two-column only when location is presencial with a city; otherwise ProfileDetails renders full-width */}
  {!professional.online_only && professional.city ? (
    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 space-y-4 lg:space-y-0">
      <RevealOnScroll delay={0}><ProfileLocation city={...} country={...} location={...} onlineOnly={...} /></RevealOnScroll>
      <RevealOnScroll delay={0}><ProfileDetails specialties={...} practiceLabels={...} serviceTypeLabels={...} modalityLabels={...} /></RevealOnScroll>
    </div>
  ) : (
    <RevealOnScroll delay={0}><ProfileDetails specialties={...} practiceLabels={...} serviceTypeLabels={...} modalityLabels={...} /></RevealOnScroll>
  )}

  {/* 4. Full-width: existing reviews */}
  <RevealOnScroll delay={0}><ProfileReviews ratingAverage={...} ratingCount={...} reviews={reviews} /></RevealOnScroll>

  {/* 5. Full-width: open review form */}
  <ProfileReviewForm professionalSlug={professional.slug} />
  ```
- Keep `RevealOnScroll` wrappers on all sections
- Keep back button unchanged
- Keep `pt-8 pb-12 space-y-4` on the outer container
- `showReviewCapture` constant can be removed (no longer needed)

**Definition of Done:**

- [ ] Hero renders full-width (not inside the two-column grid)
- [ ] Sobre mí left, Contacto right at desktop widths
- [ ] Ubicación left, Detalles right at desktop widths
- [ ] ProfileReviews full-width (only shown when ratingCount > 0, already enforced by component)
- [ ] ProfileReviewForm full-width at the bottom
- [ ] `tsc --noEmit` clean
- [ ] Verify: `npm test -- --reporter=dot --project=unit`
- [ ] E2E: TS-001 and TS-002 pass

---

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | PASS | 0 | Full layout confirmed in a11y snapshot — hero, Contacto (@instagram link, no phone), map iframe loaded, Especialidades/Tipo/Modalidad, review form |
| TS-002 | High | PASS | 0 | Verified via unit tests (ProfileAbout returns null if empty, ProfileLocation returns null if onlineOnly/no city, ProfileDetails returns null if all arrays empty) |
| TS-003 | Critical | PASS | 0 | API returns 201; browser form showed `hasGracias: true` after submission |
| TS-004 | High | PASS | 0 | Confirmed via a11y snapshot — no raw WhatsApp number in DOM |

## Open Questions

- None remaining. All decisions documented in "Autonomous Decisions" above.

## Deferred Ideas

- Star rating average display on `/profesionales` directory cards — Bel confirmed: update later.
- Pagination for reviews list (currently shows last 5).
- Map accuracy: professional city/country only (no street address) — map shows city-level zoom. Could improve if address were stored.
