# Almanac Carta and Reseña Implementation Plan

Created: 2026-10-16
Author: mariabmontoya@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** The concierge Carta (`/r/[tracking_code]`, design 9c) and the Reseña (`/r/review/[token]`, design 9d) look and behave like Claude Design round 9, end to end, with real data only. That includes the Reseña's "¿Qué fue cierto?" tags, the anonymous switch, the thank-you preview and "Editar mi reseña".

## Out of Scope

- **Lucía (concierge name and photo).** There is no real concierge identity, so her note and photo are left out, as in the concierge form.
- **"Este enlace vence el…".** Carta links do not expire in the app, so the line is left out.
- **The session date on the Reseña ("Tu sesión del jueves 24").** The app does not know when the session happened, so the label shows without a date.
- **"La leemos y se publica en menos de 24 horas".** Reviews are published right away (no moderation queue), so that sentence is left out.
- **Showing the tags on the public profile.** The profile design does not show them. They are stored and shown on the Reseña thank-you preview.
- **The bottom nav.** The user asked to skip it.

## Approach

**Chosen:** Keep the existing data paths and restyle on top of them. The Carta stays a client page fed by `/api/public/recommendations` (rate limited, whitelisted fields), which now also returns the person's first name, the date and the display fields each card needs. The Reseña stays a server page plus a client form posting to `/api/reviews/submit`, whose `submit_review` RPC gains tags and an edit path (migration 024).
**Why:** Contact tracking (`ContactButton` → `/api/events`, which bills PQLs) and the token-gated review RPC keep working unchanged. The cost is one migration the user runs in the Supabase SQL editor.

## Context for Implementer

**Design source.** Saved at `/private/tmp/claude-501/-Users-belenmontoya-Desktop-repos-hara/9d3d9da2-baff-4569-ad2b-d6706267e489/scratchpad/design-full.html`: 9c is lines 2778 to 2823, 9d is lines 2825 to 2872, and the 9d behavior (`r9*` values) is at lines 6455 to 6507. If the file is gone, read `Hara Vital App.dc.html` again through the `claude_design` MCP (`read_file` with `offset`), project `d0e3236f-a77b-4d60-b083-b3dd4cdd9da2`. Never paste or read the design in Chrome.

**Rules.** Copy the layout, sizes and behavior. Text is a base only: use real data, Argentine vos, and never the design's placeholders ("Ana", "Lucía", "Mariana Ortiz", "Reiki usui", dates). Map colors to tokens only, as in `app/solicitar/ConciergeConfirmation.tsx`:

| Design | Token class |
|--------|-------------|
| `#F7EDE8` | `bg-background` |
| `#FBF6F2` | `bg-gray-50` (same as the home cards) |
| `#221E29` | `text-foreground` |
| `#3A3338`, `#5E5550` | `text-gray-700` |
| `#7B706B` | `text-muted` |
| `#B57261` | `text-brand` |
| `#7B4238` | `bg-brand-dark` / `text-brand-dark` |
| `#C4891E` (stars) | `text-warning-dark` (as in `app/HomeRowCard.tsx:45`) |

Fonts: `font-almanac`, `font-almanac-serif`, `almanac-label`. Headings need inline `lineHeight` and `letterSpacing` because the global `h1..h6` rule beats utilities. Global `p + p` adds a margin, so use spans in compact rows.

## Runtime Environment

- Start: `npx next dev -p 3002 & echo $! > /tmp/hara-dev-3002.pid` (ports 3000 and 3001 hold old servers this session did not start; leave them alone).
- Health: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/` returns 200.
- Stop: `kill "$(cat /tmp/hara-dev-3002.pid)"` only.

## Assumptions

- The user runs `migrations/024_review_tags_and_edit.sql` in the Supabase SQL editor before the Reseña browser check. Until then, sending a review with tags fails. Tasks 3 and 5 depend on this.
- There are no real matches or review requests yet (checked 2026-10-16: 0 and 0). The browser check creates one test match and one test review request with the service role, then deletes them, and the test lead. The user gave permission to delete test rows created by checks. Task 5 depends on this.

## E2E Test Scenarios

### TS-001: Reading the Carta
**Priority:** Critical
**Preconditions:** Dev server on 3002, a test lead whose note says "Nombre: Prueba Claude", and a test match with 3 recommendations whose reasons are filled
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/r/{tracking_code}` | Wordmark, "PARA PRUEBA" and the date line, then "Prueba, estas son tus tres." |
| 2 | Read the three cards | Each shows its number, practice and place, the name, rating only when it has reviews, price only when set, "Por qué pensé en {first name}" and the reasons |
| 3 | Click "Perfil" on card 2 | Opens `/p/{slug}` of that professional |
| 4 | Go back, click "Escribirle por WhatsApp" on card 1 | A `contact_click` event with the attribution token is sent to `/api/events` and a `wa.me` link opens |

### TS-002: Carta errors
**Priority:** High
**Preconditions:** Dev server on 3002
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/r/M-0000000000000-XXXXXX` | The almanac "not found" state with a link to `/solicitar` |

### TS-003: Writing and editing a Reseña
**Priority:** Critical
**Preconditions:** Migration 024 run, a test review request token for a real professional
**Mapped Tasks:** Task 3, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/r/review/{token}` | Professional card (photo, name, practice), "¿Cómo te fue?", 5 stars, tags, text field, name field, anonymous switch, disabled "Publicar reseña" |
| 2 | Tap 4 stars, 2 tags, type text and "Prueba Claude", leave the switch off | The label reads "Muy bien", the switch line reads "Se mostrará como “Prueba C.”", the button turns dark |
| 3 | Tap "Publicar reseña" | Thank-you screen: "Gracias, Prueba.", the preview with ★★★★, the quote and "Prueba C. · tag1 · tag2" |
| 4 | Tap "Editar mi reseña", change to 5 stars and turn the switch on, publish | The preview shows ★★★★★ and "Anónimo"; the database has one review with rating 5 and `reviewer_name` null |
| 5 | Reload the page | The thank-you screen with the saved review and "Editar mi reseña" shows (not a dead "ya fue enviada" message) |

## Progress Tracking

- [x] Task 1: Carta data (API fields and helpers)
- [x] Task 2: Carta page (design 9c) and removal of the old deck
- [x] Task 3: Review tags and edit (migration 024, RPC, API)
- [x] Task 4: Reseña page (design 9d)
- [x] Task 5: Docs, e2e specs and browser check

## Implementation Tasks

### Task 1: Carta data (API fields and helpers)

**Objective:** `/api/public/recommendations` returns everything the 9c Carta shows: the person's first name, the date the Carta was sent, and per professional the photo, practice, specialty key for the dot color, place, rating, price and valid reasons. The helpers are pure and tested.

**Files:**

- Create: `lib/carta.ts`
- Create: `lib/carta.test.ts`
- Modify: `lib/home-arrival.ts`
- Modify: `app/api/public/recommendations/route.ts`

**Key Decisions / Notes:**

- In `lib/home-arrival.ts`, move the row mapping inside `buildHomeData` (lines 89 to 111) into an exported `toHomeRow(p: HomeProfessional, catalog: Practice[]): HomeRow` and call it from `buildHomeData`. The home's behavior must not change.
- `lib/carta.ts` exports:
  - `firstNameFromContext(note: string | null): string | null`: reads the line `Nombre: …` that `buildAdditionalContext` writes (`lib/concierge-request.ts:82`) and returns its first word, or null.
  - `toCartaPick(rec, catalog): CartaPick`: builds the card view from `toHomeRow`, with `firstName` (first word of the name), `specialtyKey` (first resolved key, for `SPECIALTY_COLORS`), `reasons` (only `isValidReason`, from `lib/design-constants.ts:151`), and keeps `slug`, `whatsapp`, `rank`, `attribution_token`.
- Route: select `sent_at, created_at, leads(additional_context)` on the match, and on the professional the same columns as `lib/active-professionals.ts:12` plus `whatsapp`. Load the catalog with `getAllPractices()`. Response: `{ tracking_code, carta: { first_name, sent_at }, recommendations: CartaPick[] }` where `sent_at` is `sent_at ?? created_at`. Never return the note itself.
- Keep the rate limit, the tracking code check and the 404 for an unknown code as they are. Replace the route's `any` with a typed row.

**Definition of Done:**

- [ ] `firstNameFromContext("Nombre: Prueba Claude\nHorario: Tarde")` returns `"Prueba"`; a note without a name line, an empty string and null return null
- [ ] `toCartaPick` returns the practice label, place, price string and rating exactly (rating null when `rating_count` is 0), drops reasons shorter than 10 characters, and returns null `specialtyKey` when nothing resolves
- [ ] The home renders the same rows as before (existing `home-arrival` tests pass untouched)
- [ ] Verify: `npx vitest run --project unit lib/carta lib/home-arrival && npx tsc --noEmit 2>&1 | grep -E "^(app|lib)/"`

### Task 2: Carta page (design 9c) and removal of the old deck

**Objective:** `/r/[tracking_code]` becomes the 9c Carta: wordmark, "PARA {NOMBRE}" date line, "{Nombre}, estas son tus tres." (or "Estas son tus tres." without a name), then one card per professional with the design's photo area, number badge, practice and place row, name, rating and price, "Por qué pensé en {first name}", the reasons, "Escribirle por WhatsApp" and "Perfil", then the closing block. The old deck, grid, reveal screen, bottom sheet and background picker are deleted. Verified by TS-001 and TS-002.

**Files:**

- Modify: `app/r/[tracking_code]/page.tsx`
- Create: `app/r/[tracking_code]/components/CartaPick.tsx`
- Create: `app/r/[tracking_code]/page.test.tsx`
- Modify: `app/r/[tracking_code]/hooks/useRecommendations.ts`
- Modify: `app/r/[tracking_code]/components/CardSkeleton.tsx`
- Delete: `app/r/[tracking_code]/components/DeckView.tsx`, `GridView.tsx`, `BottomSheet.tsx`, `BackgroundPicker.tsx`, `RecommendationCard.tsx`
- Delete: `app/r/[tracking_code]/hooks/useSwipeGesture.ts`, `useRevealTransition.ts`, `useMediaQuery.ts`
- Modify: `lib/design-constants.ts`
- Create: `public/assets/almanac/tres_puntos-primary.svg`

**Key Decisions / Notes:**

- Layout from design lines 2781 to 2820: page `bg-background`, max width like the other almanac pages (`max-w-md mx-auto`), wordmark `/assets/logo/logoreduccion.png` (as in `ConciergeConfirmation.tsx:61`), date with `formatAlmanacDate(new Date(carta.sent_at))` from `lib/moon-phase.ts:38`.
- `tres_puntos-primary.svg` is read from the design project with the `claude_design` MCP (`read_file` on `assets/tres_puntos-primary.svg`) and saved as is.
- Card photo area 190px: the professional's photo with `object-cover`, or a `bg-brand-weak` block with the initial when there is none. Number badge as in the design.
- "Escribirle por WhatsApp" is `ContactButton` with `unstyled` and the design's classes, passing `trackingCode`, `rank` and `attributionToken`, so `/api/events` keeps recording the PQL. "Perfil" links to `/p/{slug}?from=/r/{code}`.
- Closing block: "¿Ninguna te convence?" with a line inviting them to answer the WhatsApp message they got the link from. No expiry line.
- Loading: restyle `LoadingSkeleton` to the almanac background with 3 card placeholders. Errors: almanac card with a title, one line and a link to `/solicitar`.
- `lib/design-constants.ts`: delete the deck, swipe, sheet and reveal constants that nothing imports any more after the deletions (check each with grep before removing).

**Definition of Done:**

- [ ] With a mocked fetch returning a carta with a first name and 3 picks, the page shows "Prueba, estas son tus tres.", the uppercase "PARA PRUEBA", three cards in rank order with "Por qué pensé en {first name}" and their reasons, and each "Perfil" links to its `/p/{slug}`
- [ ] Without a first name the heading is "Estas son tus tres." and there is no "PARA" label
- [ ] A pick without rating shows no star, and a pick without price shows no price; a pick without valid reasons shows no "Por qué" section
- [ ] Clicking "Escribirle por WhatsApp" sends one beacon to `/api/events` whose body has the pick's `attribution_token`, `tracking_code` and `rank`
- [ ] A 404 response shows the not-found state with a link to `/solicitar`
- [ ] No file imports the deleted components or hooks
- [ ] Verify: `npx vitest run --project unit "app/r/\[tracking_code\]" app/components/ContactButton && npx tsc --noEmit 2>&1 | grep -E "^(app|lib)/"`

### Task 3: Review tags and edit (migration 024, RPC, API)

**Objective:** Reviews can store the "¿Qué fue cierto?" tags, and the same review link can update its review while the link has not expired. The API validates tags against a fixed list and shortens the name to "First L." before saving.

**Files:**

- Create: `migrations/024_review_tags_and_edit.sql`
- Create: `lib/review-form.ts`
- Create: `lib/review-form.test.ts`
- Modify: `app/api/reviews/submit/route.ts`
- Test: `app/api/reviews/submit/route.test.ts` (modify if it exists, otherwise create)

**Key Decisions / Notes:**

- Migration: `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'`. Drop the 4-argument `submit_review` and create `submit_review(p_token, p_rating, p_text, p_reviewer_name, p_tags TEXT[] DEFAULT '{}')`. Same checks and locking as `migrations/006_reviews_collection.sql`, except when `consumed_at` is set: if the link has not expired and a review exists for its `contact_event_id`, update that review's rating, text, name and tags and return its id; otherwise raise `token_consumed`. Include rollback notes like migration 023. The aggregates trigger already fires on update (`006:154`).
- `lib/review-form.ts`: `REVIEW_TAGS` (the design's six labels as `{ key, label }`), `STAR_LABELS` (design line 6499, in vos: "Tocá para calificar", "No me ayudó", "Poco", "Bien", "Muy bien", "Me cambió algo"), `publicReviewerName(name)` ("Prueba Claude" → "Prueba C.", one word stays as is, blank → null), `isValidTagList(tags)`.
- API: accept `tags` (array of known keys, max 6, duplicates removed); unknown keys → 400. Save `publicReviewerName(reviewer_name)`. Pass `p_tags`. Keep the rate limit and error mapping.

**Definition of Done:**

- [ ] `publicReviewerName` returns "Prueba C." for "  prueba claude ", "Ana" for "Ana", and null for "" and spaces (exact strings asserted)
- [ ] The API calls the RPC with `p_tags` equal to the sent keys and `p_reviewer_name` "Prueba C."; an unknown tag returns 400 without calling the RPC (mocked `supabaseAdmin.rpc`, payload asserted)
- [ ] The migration file has the column, the new function with the edit branch, and rollback notes
- [ ] Verify: `npx vitest run --project unit lib/review-form app/api/reviews`

### Task 4: Reseña page (design 9d)

**Objective:** `/r/review/[token]` becomes the 9d Reseña: isotipo, professional card, "¿Cómo te fue?" with 5 stars and a label, tag chips, "En tus palabras", a name field, the anonymous switch with "Se mostrará como “…”", and the sticky "Publicar reseña" bar. After sending, the thank-you screen shows the preview and "Editar mi reseña", which goes back to the form with everything filled and updates the same review. Verified by TS-003.

**Files:**

- Modify: `app/r/review/[token]/page.tsx`
- Modify: `app/r/review/[token]/ReviewSubmitForm.tsx`
- Create: `app/r/review/[token]/ReviewThanks.tsx`
- Modify: `app/r/review/[token]/ReviewSubmitForm.test.tsx`

**Key Decisions / Notes:**

- Page (server): load the request with the professional's `full_name, slug, profile_image_url, practices, specialties` and the catalog, and build the practice label and dot key with `toHomeRow` from Task 1. When the request is consumed and not expired, also load its review (`rating, text, reviewer_name, tags` by `contact_event_id`) and open the form component in the thank-you state. Expired and invalid links keep their messages, restyled to the almanac look.
- Form layout from design lines 2828 to 2855. The name field uses `ALMANAC_INPUT_CLASS` from `app/solicitar/ConciergeSteps.tsx`. The switch is a `button` with `role="switch"` and `aria-checked`. Stars are buttons with `aria-label` "N estrellas" and `aria-pressed`. The button is disabled until a star is picked.
- The text field placeholder is in vos. Anonymous shows "Anónimo" to match the profile (`ProfileReviews.tsx:37`).
- Thank-you (design lines 2857 to 2868): sparkle from `app/HomeCardParts.tsx` (`Sparkle`), "Gracias, {first name}." or "Gracias.", the preview (stars, quote when there is text, "{who} · {tags}"), and "Editar mi reseña".
- Split into `ReviewThanks.tsx` so each file stays under 300 lines.

**Definition of Done:**

- [ ] The button is disabled with no stars; tapping 4 stars shows "Muy bien" and enables it
- [ ] Sending posts `{ token, rating, text, reviewer_name, tags }` with the chosen tag keys, and with `reviewer_name` null when the switch is on (fetch mocked, body asserted)
- [ ] After a 201 the preview shows the right number of stars, the quote, and "Prueba C. · {labels}" (or "Anónimo · …"); "Editar mi reseña" shows the form again with the same values
- [ ] A failed send shows the API's error message and keeps the form filled
- [ ] Verify: `npx vitest run --project unit "app/r/review" && npx tsc --noEmit 2>&1 | grep -E "^(app|lib)/"`

### Task 5: Docs, e2e specs and browser check

**Objective:** Docs and tests no longer point to the deleted Carta parts, the copy inventory matches the new pages, and both pages are checked in Chrome with real data. Verified by TS-001 to TS-003.

**Files:**

- Modify: `CLAUDE.md`, `.claude/rules/component-standards.md`, `.codex/rules/component-standards/RULE.md`, `.claude/skills/code-reuse-enforcer/SKILL.md`, `.codex/skills/code-reuse-enforcer/SKILL.md`, `.claude/commands/feature-start.md`, `.codex/commands/feature-start/COMMAND.md`, `.claude/commands/test-create.md`, `.codex/commands/test-create/COMMAND.md`, `.claude/skills/accessibility-patterns/SKILL.md`, `.codex/skills/accessibility-patterns/SKILL.md`, `.claude/agents/complexity-watchdog.md`, `.codex/agents/complexity-watchdog/AGENT.md`, `.claude/skills/commit-message-helper/SKILL.md`, `.codex/skills/commit-message-helper/SKILL.md`, `.claude/commands/bug-hunt.md`, `.codex/commands/bug-hunt/COMMAND.md`, `.claude/skills/supabase-patterns/SKILL.md`, `.codex/skills/supabase-patterns/SKILL.md`
- Modify: `content/recomendaciones.json`, `content/resena.json`
- Modify: `__tests__/e2e/public-contact.spec.ts`, `__tests__/e2e/reviews.spec.ts`
- Modify: `ISSUES.md`, `.claude/plans/hara.md`

**Key Decisions / Notes:**

- Replace references to `BottomSheet`, `CardSkeleton`, `BackgroundPicker`, `useSwipeGesture`, `useRevealTransition`, `useMediaQuery` and `useRecommendations` as reusable examples with existing almanac files (`app/HomeRowCard.tsx`, `app/solicitar/ConciergeSteps.tsx`). Historical files (`DEVELOPMENT_HISTORY.md`, `PRODUCTION_READINESS.md`, `.claude/plans/main.md`) stay as they are.
- E2E specs: keep the `recommendations-page` test id on the new page, and update the review spec's selectors to the new form.
- Browser check: start the dev server on 3002 (PID file). Create the test data with the service role: a lead with the note "Nombre: Prueba Claude", a match through `create_match_with_recommendations_atomic` with 3 active professionals and reasons, and a review request with a random `contact_event_id`. Run TS-001 to TS-003, then delete the review, the review request, the match (recommendations cascade) and the lead, and confirm they are gone.
- ISSUES.md: one entry saying reviews now store tags and can be edited through their link, and that the tags are not shown on the profile yet.

**Definition of Done:**

- [ ] `grep -rn "BottomSheet\|useSwipeGesture\|useRevealTransition\|BackgroundPicker" CLAUDE.md .claude .codex app lib` finds nothing outside historical plan files
- [ ] TS-001, TS-002 and TS-003 pass in Chrome on port 3002, and every test row is deleted afterwards
- [ ] Verify: `npm run test:unit && npx tsc --noEmit 2>&1 | grep -E "^(app|lib)/" ; npm run build`

## E2E Results

Checked in Chrome on a dev server started for this check (port 3002), with test rows created by a seed script and deleted afterwards (0 rows left, 0 events, 0 PQLs).

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | PASS | 1 | Fixed: two professionals had an empty WhatsApp number, so the card now hides the WhatsApp button and "Perfil" takes the full width (test added). The contact beacon was captured in the page so no real PQL was created; it carried the tracking code, rank 1, the slug and the signed token |
| TS-002 | High | PASS | 0 | Unknown code shows "No encontramos esta carta", and its button opens `/solicitar` |
| TS-003 | Critical | PASS | 0 | Saved rating 4 with "Prueba C." and two tags; the edit updated the same row to rating 5, no name; a reload reopens the saved review. An invalid token shows "Link inválido" |

### Not verified

| Not verified | Reason |
|--------------|--------|
| A card with a photo, a price and a rating | No active professional has a photo, price or reviews right now; covered by unit tests (`app/r/[tracking_code]/page.test.tsx`, `lib/carta.test.ts`) |
| The expired review link screen in the browser | Would need a test row with a past expiry; the branch is a date comparison in `app/r/review/[token]/page.tsx` |
| Playwright specs (`public-contact.spec.ts`, `reviews.spec.ts`) | They write to the real Supabase project; the same flows were checked by hand in Chrome above |
| A real billing event from the Carta WhatsApp button | Deliberately intercepted to avoid a real PQL charge; the server path (`/api/events`) did not change |

## Code Review

Reviewed by the project `code-reviewer` agent (the Pilot `changes-review` agent is no longer installed). No must_fix findings.

- Fixed: em dashes in the review API test titles, `aria-label` on plain spans (the stars now have `role="img"`, and the card number has visually hidden "Opción" text).
- Checked: migration 024 is already applied, and the 4-argument call that production still makes reaches the new function (a fake token returns `invalid_token`), so live reviews keep working until the push.
- Not changed: exact radii such as `rounded-[26px]`. They copy the design, like the approved almanac pages (`app/HomeRowCard.tsx`, `app/solicitar/ConciergeConfirmation.tsx`).
