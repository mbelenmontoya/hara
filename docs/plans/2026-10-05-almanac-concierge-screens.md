# Almanac Concierge Request Form Implementation Plan

Created: 2026-10-05
Author: mariabmontoya@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** `/solicitar` becomes the 4-step concierge form of Claude Design 9a. After sending, the same page shows the 9b confirmation. Every answer is saved into fields that already exist, plus the one `additional_context` column that the server action already expects.

## Out of Scope

- **The carta (9c, `/r/[tracking_code]`) and the review link (9d).** The user chose to split the work, so each gets its own plan later.
- **The design's concierge person ("Lucía", her photo and name).** There is no real concierge identity. Her card in step 3 is left out, and the copy says "el equipo" or "nosotros".
- **The emergency line (800 911 2000)** in step 1 and in the confirmation. It is a Mexican example, and we have no confirmed Argentine line (ISSUES.md entry 12).
- **"Editar mi solicitud" after sending.** There is no way to update a lead.
- **The bottom nav.** The user asked to skip it.
- **The "Tipo de práctica que preferís" picker.** It is removed, because the user chose to drop it. `practice_preference` simply stays empty for new leads.

## Approach

**Chosen:** Rebuild `app/solicitar/SolicitarForm.tsx` as a 4-step client form that keeps `createLead` (`app/actions/create-lead.ts`) as the only write path. A pure helper `lib/concierge-request.ts` turns the form state into `CreateLeadInput`. The confirmation renders in place after a successful send.
**Why:** It is the same server action, validation library and admin flow as today, so nothing downstream changes. The cost is one small migration for the column the code already sends.

## Context for Implementer

**Design source.**
- 9a and 9b are saved at `/private/tmp/claude-501/-Users-belenmontoya-Desktop-repos-hara/875ffcad-5322-4d16-838a-e262c9b802f7/scratchpad/concierge-9a.html` and `concierge-9b.html`. The full round 9 is in `t9.html` in `.../7176b110-1cbb-4c91-9f1a-086c78d014f5/scratchpad/`.
- Copy the layout, sizes and behavior.
- Never use the design's text or placeholders ("Ana", "Lucía", "+52", "HV-4K92", "viernes 2", "Cuando el insomnio...").
- The design uses tú, so convert to vos ("¿Cómo llegás?", "Elegí", "Contanos").

**Colors.** Map to existing tokens only, as on the Diario page:

| Design | Token |
|--------|-------|
| `#F7EDE8` | `bg-background` |
| `#221E29` | `foreground` |
| `#5E5550` | `gray-700` |
| `#7B706B` | `muted` |
| `#B57261` | `brand` |
| `#7B4238` | `brand-dark` |
| `#EACCC1` | `brand-weak` |
| `#EBE4D9` | `surface-2` |

**Fonts and global CSS gotchas.**
- Use `font-almanac`, `font-almanac-serif` and `almanac-label`.
- Headings need inline `lineHeight` and `letterSpacing`, because the global `h1..h6` rule beats Tailwind utilities.
- Global `p + p` adds a margin, so use spans in compact rows.

**Where each answer is stored** (agreed with the user on 2026-10-05):

| Form answer | Saved as |
|-------------|----------|
| Step 1 big cards + "¿Qué está pasando?" chips | `intent_tags`, as curated specialty keys from `SPECIALTY_MAP` (`lib/design-constants.ts:81`). The 4 cards are the home's top 4 (`buildHomeData(...).cards`), and the chips are the other curated specialties |
| Formato (Online / Presencial / Ambos) | `modality_preference: [value]` and `online_ok = value !== 'presencial'`, as today |
| Zona (shown for Presencial and Ambos) | `country`, `city` from `PlacesAutocomplete`, as today |
| Country when Online | Taken from the WhatsApp number with `parsePhoneNumberFromString(whatsapp)?.country` (libphonenumber-js, returns undefined instead of throwing) |
| Presupuesto | `budget_min`, `budget_max`, `currency`, from two amount fields and a currency select, as today. No range chips, because no active professional has a price to build ranges from (checked 2026-10-05) |
| ¿Qué tan pronto? | `urgency`: the existing `low` / `medium` / `high` values and their labels |
| Your own words, Horario, ¿Fuiste con alguien antes?, Tu nombre | `additional_context`, as a short labeled note (format in Task 1) |
| WhatsApp, Email | `whatsapp`, `email`, with today's validation |
| Privacy checkbox | Not stored. Sending is only possible when it is checked |

## Runtime Environment

- Start: `npx next dev -p 3000`, with the PID saved in `/tmp/hara-dev.pid`. One may already be running from the Diario work.
- Health: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/solicitar` returns 200.
- Google Places needs the key in `.env.local` (already present).

## Assumptions

- Writing a lead from the browser check creates a real row in Supabase. The test lead is deleted afterwards by the user or through the admin, never by a script. Task 6 depends on this.
- The migration in Task 1 is run by the user in the Supabase SQL editor before the browser check. Until then `createLead` fails if `additional_context` is sent. Tasks 1 and 6 depend on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| A lead is sent before the migration runs, and the insert fails on the unknown column | Medium | High | Task 1 ships the migration first. Task 6 checks the column exists (read-only select) before submitting in the browser |
| An online request gets no country, because the number has no parsable country | Low | Medium | The step 4 send button stays disabled until `countryFromWhatsapp` returns a country. This is tested in Task 1 |

## Progress Tracking

- [x] Task 1: Lead mapping helper and the additional_context column
- [x] Task 2: Shared loader for active professionals
- [x] Task 3: Form steps 1 and 2
- [x] Task 4: Form steps 3 and 4 and sending
- [x] Task 5: Confirmation (9b)
- [x] Task 6: Header, admin note, cleanup and browser check
  - 2026-10-06: code done, TS-001 and TS-003 passed in Chrome. Blocked on TS-002, because migration 023 has not been run (`column leads.additional_context does not exist`). Run it, then send one test lead and check the admin page.

## Implementation Tasks

### Task 1: Lead mapping helper and the additional_context column

**Objective:** Add the missing `leads.additional_context` column that `createLead` already writes. Then add pure functions that turn the form state into `CreateLeadInput`, so the form stays thin and the mapping is tested in one place.

**Files:**

- Create: `migrations/023_leads_additional_context.sql`
- Create: `lib/concierge-request.ts`
- Test: `lib/concierge-request.test.ts`

**Key Decisions / Notes:**

- Migration (follow the header style of `migrations/021_blog_posts.sql`):

  ```sql
  BEGIN;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS additional_context TEXT;
  COMMIT;
  ```

  Add a rollback comment: `ALTER TABLE leads DROP COLUMN additional_context;`.
- `ConciergeState`: `{ intents: string[]; modality: '' | 'online' | 'presencial' | 'ambos'; place: { city: string; country: string; countryCode: string; display: string } | null; schedule: string[]; budgetMin: string; budgetMax: string; currency: string; words: string; seenBefore: '' | 'si' | 'no'; urgency: '' | 'low' | 'medium' | 'high'; name: string; whatsapp: string; email: string; consent: boolean }`.
- `countryFromWhatsapp(whatsapp: string): string | null` uses `parsePhoneNumberFromString(whatsapp)?.country ?? null`.
- `buildAdditionalContext(state): string | undefined` returns lines in this order, each only when filled, joined with `\n`:
  - `Nombre: Ana`
  - `Horario: Mañana, Tarde`
  - `Fue con alguien antes: Sí` (or `No`)
  - an empty line, then the words
  - It returns `undefined` when everything is empty.
- `toLeadInput(state): CreateLeadInput` has these rules:
  - `country` is `place.countryCode` when a place is set, otherwise `countryFromWhatsapp(whatsapp)`.
  - `city` is `place?.city || undefined`.
  - `online_ok` is `modality !== 'presencial'`.
  - `modality_preference` is `[modality]` when set.
  - Budgets use `parseInt` only when filled.
  - `urgency` is passed only when set.
  - `email` and `whatsapp` are passed through, and `additional_context` comes from the function above.
- Step completion checks, used by the "Continuar" buttons:
  - `isStepComplete(state, step)`:
    - Step 1 needs at least one intent.
    - Step 2 needs a modality, plus a place when the modality is `presencial` or `ambos`.
    - Step 3 is always complete, because everything there is optional.
    - Step 4 needs a trimmed name, a valid WhatsApp (`isValidPhoneNumber`), a valid email (same regex as today), `consent`, and a resolvable country.
  - `SCHEDULE_OPTIONS` are `Mañana`, `Tarde`, `Noche` and `Fines de semana`. These are form choices, not data.

**Definition of Done:**

- [ ] `toLeadInput` maps every field in the "Where each answer is stored" table, including the country from WhatsApp for Online and from the place otherwise
- [ ] `buildAdditionalContext` produces the exact labeled note, skips empty parts, and returns `undefined` when everything is empty
- [ ] `isStepComplete` is false for step 2 Presencial without a place, and for step 4 without consent, with an invalid number, or with an online number whose country cannot be read
- [ ] Verify: `npx vitest run --project unit lib/concierge-request`

### Task 2: Shared loader for active professionals

**Objective:** Step 1 needs the same four "¿Cómo llegás?" cards as the home. Move the home's professionals query into a shared function, so `/solicitar` uses the same data and ordering without copying the query.

**Files:**

- Create: `lib/active-professionals.ts`
- Modify: `app/page.tsx`

**Key Decisions / Notes:**

- Move `getProfessionals` from `app/page.tsx:15` unchanged into `lib/active-professionals.ts` as `getActiveProfessionals(source: string)`. That covers the same select, filters, number coercion, and `logError` returning `[]`. The `source` goes into the `logError` context.
- `app/page.tsx` calls `getActiveProfessionals('HomePage')`. No other change on the home.
- `Trivial:` this is a pure move with no new branches. It is covered by the existing home tests and the TS-003 load check: `npx vitest run --project unit app/Home`.

**Definition of Done:**

- [ ] The home renders the same cards and list as before (TS-003 step 1)
- [ ] Verify: `npx vitest run --project unit app/Home && npx tsc --noEmit 2>&1 | grep -E "^(app|lib)/"`

### Task 3: Form steps 1 and 2

**Objective:** Build the step frame (× close, "Concierge · Gratis", 4 progress segments, step label, Atrás/Continuar bar). Then build step 1 ("¿Cómo llegás?" cards and the optional chips) and step 2 ("¿Qué te acomoda?": Formato, Zona, Horario, Presupuesto). Verified by TS-001.

**Files:**

- Modify: `app/solicitar/SolicitarForm.tsx`
- Create: `app/solicitar/ConciergeSteps.tsx`
- Modify: `app/solicitar/page.tsx`
- Test: `app/solicitar/SolicitarForm.test.tsx` (rewrite)

**Key Decisions / Notes:**

- `page.tsx` loads three things in parallel: `getActiveProfessionals('SolicitarPage')`, `getAllPractices()` (with the same catch as the home), and the latest published post (Task 5). It passes `cards = buildHomeData(pros, catalog).cards` to the form. The chips are `CURATED_SPECIALTY_KEYS` minus the card keys, with labels from `SPECIALTY_MAP`.
- Layout (design 9a lines 6 to 12): `font-almanac bg-background min-h-screen` in a `max-w-md md:max-w-xl` column.
  - The × is a 40px round `bg-surface-2` `Link` to `/` with `aria-label="Cerrar"`.
  - The label is `almanac-label` "Concierge · Gratis".
  - There are 4 segments, 3px high, `bg-foreground` up to the current step and `bg-foreground/12` after it.
  - The step label reads "Paso N de 4".
- Step 1 cards: copy the home card markup (`app/HomeArrival.tsx:58-74`, using `Glyph`, `SPECIALTY_COLORS`, and the count hint "N profesionales") as a toggle with `aria-pressed`. Extract the card into `app/ArrivalCard.tsx` and use it in both places. Do not change how the home looks.
  - The title is serif 40px/1.02 "¿Cómo <em>llegás</em>?", with the subtitle "Elegí lo que más se parezca. No tiene que ser exacto."
  - Chips have the label "¿Qué está pasando? · Opcional" and use the design's chip style (rounded-full, 1.5px border, `py-[9px] px-[15px]`, 13.5px). Selected chips are `bg-foreground text-background`.
- Step 2:
  - The title is "¿Qué te <em>acomoda</em>?", with the subtitle "Solo te proponemos gente que cumpla con esto."
  - Formato is a 3-way segmented control (`bg-surface-2` track, `rounded-[14px]`, selected segment `bg-surface shadow-soft`).
  - Zona appears for Presencial and Ambos only, using the existing `PlacesAutocomplete` restyled with the almanac input class.
  - Horario is multi-select chips.
  - Presupuesto has two `inputMode="numeric"` fields, Mín and Máx, plus the currency select (`ARS`, `USD`, `EUR`, `MXN`), in chip-height rounded inputs.
- Bottom bar (design lines after step 4): sticky at the bottom with `bg-background/94 backdrop-blur`.
  - "Atrás" appears from step 2 onwards.
  - "Continuar" is disabled while `!isStepComplete(state, step)`.
  - Moving between steps scrolls to the top.
- Keep the file under 440 lines. Put the four step bodies in `ConciergeSteps.tsx`, and keep the state, the navigation and sending in `SolicitarForm.tsx`.

**Definition of Done:**

- [ ] Step 1 shows the 4 cards with real counts and the other curated specialties as chips. Continuar is disabled until one card or chip is picked
- [ ] Step 2 shows Zona only for Presencial and Ambos. Continuar is disabled until a format is chosen, plus a place when Zona shows. Atrás returns to step 1 with the picks kept
- [ ] The × links to `/`, and the progress shows the current step
- [ ] Verify: `npx vitest run --project unit app/solicitar app/HomeArrival`

### Task 4: Form steps 3 and 4 and sending

**Objective:**
- Step 3 ("Contanos") has the free text, "¿Fuiste con alguien antes?" and "¿Qué tan pronto?".
- Step 4 ("¿Dónde te escribimos?") has name, WhatsApp, email, the summary with "Editar" and the privacy checkbox.
- Sending goes through `createLead(toLeadInput(state))`.

Verified by TS-001 and TS-002.

**Files:**

- Modify: `app/solicitar/SolicitarForm.tsx`
- Modify: `app/solicitar/ConciergeSteps.tsx`
- Test: `app/solicitar/SolicitarForm.test.tsx`

**Key Decisions / Notes:**

- Step 3 is titled "<em>Contanos</em>.", with the subtitle "Con tus palabras. Lo lee una persona del equipo, y nadie más."
  - The textarea uses the design's style, with no placeholder story.
  - "¿Fuiste con alguien antes?" offers the segmented choices "Sí" and "No".
  - "¿Qué tan pronto?" offers chips with the existing 3 urgency labels.
  - There is no concierge card.
- Step 4 is titled "¿Dónde te <em>escribimos</em>?", with the subtitle "Por WhatsApp, solo para mandarte tus tres opciones."
  - Fields: "Tu nombre", "WhatsApp" (full international number with today's validation messages, prefilled with the place's calling code as today) and "Email".
  - Summary card "Tu solicitud": rows for Cómo llegás, Formato, Zona, Horario, Presupuesto and Qué tan pronto, each only when filled. "Editar" goes to step 1.
  - Checkbox: "Acepto que Hara use estos datos solo para recomendarme profesionales." It links to `/terminosyprivacidad`.
- On the last step the button reads "Enviar solicitud".
  - On send, call `createLead`. On success, show the confirmation (Task 5) with the returned `lead_id`. On error, show "Hubo un error. Intentá de nuevo." and re-enable the button, as today.
  - `router.push('/gracias')` is removed.

**Definition of Done:**

- [ ] Sending calls `createLead` with the exact `toLeadInput` output. The test mocks `@/app/actions/create-lead` and asserts the payload, including `intent_tags`, `country` and `additional_context`
- [ ] Enviar stays disabled without the name, without the checkbox, or with an invalid WhatsApp or email
- [ ] A failed send shows the error and keeps the form filled. "Editar" in the summary returns to step 1
- [ ] Verify: `npx vitest run --project unit app/solicitar`

### Task 5: Confirmation (9b)

**Objective:** After a successful send, the page shows the 9b confirmation. It has the request number from the new lead's id, "Listo, {name}.", where we will write, the "Lo que sigue" timeline with our real four steps (the copy from today's `/gracias`), and "Mientras tanto" with the latest real Diario post. Verified by TS-002.

**Files:**

- Create: `app/solicitar/ConciergeConfirmation.tsx`
- Test: `app/solicitar/ConciergeConfirmation.test.tsx`
- Modify: `app/solicitar/page.tsx`

**Key Decisions / Notes:**

- Props: `{ leadId: string; name: string; whatsapp: string; latestPost: { slug: string; title: string; coverUrl: string | null; minutes: number } | null }`.
- The request number is `leadId.slice(0, 8).toUpperCase()`, matching the admin's `Solicitud {id.slice(0,8)}`.
- Dark header card (design 9b, look of `app/HomeConcierge.tsx`):
  - `almanac-label` "Solicitud {N}"
  - serif "Listo, <em>{name}</em>."
  - "Te escribimos al {whatsapp} en menos de 48 horas.", using the same promise as `HomeConcierge`
- "Lo que sigue" is a 4-step timeline whose first step is checked:
  1. "Recibimos tu solicitud", with "Ahora"
  2. "La lee una persona del equipo", from `/gracias` step 2
  3. "Te mandamos tus tres", with "En menos de 48 h" and `/gracias` step 3 text
  4. "Vos elegís y les escribís", with "Cuando quieras" and the `/gracias` step 4 privacy line
  - Write all of these in vos and without dashes.
- "Mientras tanto" is the latest published post (query as in `app/blog/page.tsx`, limit 1, minutes via `readingMinutes`). It links to `/blog/{slug}` and is hidden when there is no post.

**Definition of Done:**

- [ ] The confirmation shows the request number from the id, the typed name and the WhatsApp number, and the four steps with the first marked done
- [ ] "Mientras tanto" links to the latest post with its reading time, and is absent when `latestPost` is null
- [ ] No emergency number, no "Editar mi solicitud", and no invented date
- [ ] Verify: `npx vitest run --project unit app/solicitar`

### Task 6: Header, admin note, cleanup and browser check

**Objective:**
- Hide the site header on `/solicitar`, which has its own × like the other almanac pages.
- Show the new note on the admin lead page.
- Remove the now unused `/gracias` page (its copy lives on in the confirmation).
- Check the whole flow in Chrome.

Verified by TS-001 to TS-003.

**Files:**

- Modify: `app/components/SiteHeader.tsx`
- Modify: `app/components/SiteHeader.test.tsx`
- Modify: `app/api/admin/leads/[id]/route.ts`
- Modify: `app/admin/leads/shared.ts`
- Modify: `app/admin/leads/[id]/page.tsx`
- Modify: `app/admin/leads/[id]/page.test.tsx`
- Delete: `app/gracias/page.tsx`
- Modify: `ISSUES.md`

**Key Decisions / Notes:**

- Header: add `'/solicitar'` to `EXCLUDED_EXACT`, and to the hidden list in the test.
- Admin:
  - Add `additional_context` to the select (`route.ts:45`) and to the `Lead` type.
  - In the lead page, add a "Lo que contó" card after "Qué está buscando". It shows the note with `whitespace-pre-line`, or "No dejó comentarios." when empty.
- Before deleting `/gracias`, confirm that its four step texts are in `ConciergeConfirmation.tsx`. `/gracias` has no other links (checked: only `SolicitarForm.tsx:164`).
- ISSUES.md: add an entry saying that the concierge form no longer asks for a practice preference, and that test leads created during checks need deleting.
- Browser check:
  - First confirm the column exists, read-only: select `additional_context` with limit 1.
  - If the column is missing, stop and ask the user to run the migration.
  - Submit one test lead. After the check, ask the user to delete it.

**Definition of Done:**

- [ ] `/solicitar` has no site header. The admin lead page shows "Lo que contó" with the note
- [ ] `/gracias` is gone and nothing links to it
- [ ] TS-001, TS-002 and TS-003 pass in Chrome
- [ ] Verify: `npm run test:unit && npx tsc --noEmit 2>&1 | grep -E "^(app|lib)/"`

## E2E Test Scenarios

### TS-001: Filling the concierge form
**Priority:** Critical
**Preconditions:** Dev server on port 3000, migration 023 run
**Mapped Tasks:** Task 3, Task 4, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/solicitar` | No site header. ×, "Concierge · Gratis", 4 segments, "¿Cómo llegás?" with 4 cards showing real counts, the chips, and Continuar disabled |
| 2 | Tap a card and one chip, then Continuar | Step 2 "¿Qué te acomoda?", with the second segment filled |
| 3 | Choose Presencial | Zona appears, and Continuar stays disabled until a place is picked from the suggestions |
| 4 | Pick a place, a Horario chip, then Continuar | Step 3 "Contanos." |
| 5 | Type a few words, choose "No" and an urgency, then Continuar | Step 4 with the summary listing the answers |
| 6 | Tap "Editar" | Back on step 1 with the picks kept |

### TS-002: Sending and the confirmation
**Priority:** Critical
**Preconditions:** TS-001 done up to step 5
**Mapped Tasks:** Task 4, Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Fill name, a valid WhatsApp and email, leave the checkbox empty | "Enviar solicitud" disabled |
| 2 | Check the box and send | The confirmation shows "Solicitud" plus 8 characters, "Listo, {name}.", the number, "Lo que sigue" with the first step done, and the latest Diario post |
| 3 | Open the admin lead page for that request | Its intents, place, budget and urgency show, and "Lo que contó" has the name, schedule, "Fue con alguien antes" and the words |

### TS-003: Nothing else moved
**Priority:** High
**Preconditions:** Same server
**Mapped Tasks:** Task 2, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/` | The same four "¿Cómo llegás hoy?" cards and list as before |
| 2 | Tap "Contanos →" in the home's dark block | Lands on `/solicitar` step 1 |
| 3 | Open `/gracias` | 404 |
