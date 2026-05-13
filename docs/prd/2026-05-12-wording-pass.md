# Final Wording Pass — All User-Facing Surfaces

Created: 2026-05-12
Author: belu.montoya@dialpad.com
Category: UX
Status: Final
Research: Standard

## Problem Statement

Hara Vital's copy is **badly written** in many places. The framing issues (pre-pivot psychotherapy language, e.g., `/preview` hero) are real but secondary to the bigger problem: most strings were written like LLM marketing filler rather than how a thoughtful person actually communicates. Examples of the *quality* problem (not framing):

- `¿Querés saber cuando abramos?` (home) — rhetorical question with no clear ask; reads like a banner ad. A person would say "Dejanos tu email y te avisamos cuando abramos."
- `Recibí 3 recomendaciones personalizadas de profesionales verificados` (/preview) — every word is filler ("personalizadas", "verificados") and the sentence has no rhythm.
- `Elegí a quien querés contactar.` (/profesionales) — flat, generic, missing the privacy promise that should be RIGHT THERE.
- `Ocurrió un error inesperado. Por favor, intentá de nuevo.` (error.tsx) — clinical, formal, doesn't sound like the rest of the product.

Item 7 of the Soft Launch Push is the consolidated copy pass that fixes **both** problems: the framing drift (terapeuta → holistic) and the writing quality (filler → sentences that read like a real person wrote them). Quality is the higher priority — bad writing is worse than slightly-off framing.

This PRD produces per-surface before/after copy changes. The /spec phase applies them file by file. Voice + tone are anchored in `PRODUCT.md`; this PRD adds the operational checklist + concrete rewrites.

## Core User Flows

This is a content audit, not a new feature. The "flow" is the implementer's workflow:

### Flow 1: Implementer applies wording pass

1. Open this PRD's per-surface table.
2. For each surface (file): read current copy, compare to proposed copy, apply changes via `Edit`.
3. Verify in dev server — copy renders as expected, no layout breakage.
4. Move to next surface.

### Flow 2: User-side experience (target outcome)

1. User arrives on any surface — home, directory, profile, registration, recommendations, support.
2. Copy reads warm, calm, in Argentine informal Spanish.
3. Privacy promise visible at moments of friction (forms, contact, intake).
4. No psychotherapy-clinical framing anywhere.
5. Concierge stays present operationally but doesn't lead any surface.

## Voice — The Hara Brand Voice (canonical)

Bel-authored. This section is the contract — every rewrite must come *from this voice*. Anything that doesn't sound like it could live alongside these excerpts is wrong.

### Tono base

- **Hablamos en español argentino informal:** *vos, querés, escribís, podés.* Nunca *tú*, nunca *usted*.
- **Cálido, claro, nunca clínico.** *"Tus 3 opciones están listas"* en lugar de *"Recommendations available."* Acompañamiento, no tratamiento. Apoyo, no diagnóstico.
- **El encuadre es bienestar holístico** — reiki, masajes terapéuticos, constelaciones familiares, diseño humano, registros akáshicos, terapia floral, biodecodificación, sonoterapia, tarot terapéutico, astrología, coaching ontológico, aromaterapia, yoga terapéutico, meditación. Nunca encuadrar a Hara como app de salud mental, psicología clínica o terapia tradicional.
- **La búsqueda del usuario** (ansiedad, insomnio, duelo, estrés, claridad) es real; **la respuesta de Hara es energética y holística**.
- **Privacy-forward:** contale a la audiencia qué NO compartimos antes de que pregunte. *"Tu info se comparte recién cuando vos escribís."*
- **Cero urgencia growth-hacker.** Ni countdowns, ni *"QUEDAN 2"*, ni mecánicas de FOMO. El mercado de bienestar premium castiga ese tono.

### Lo que Hara hace que otras marcas no

- **Hara invita y respeta el timing del usuario.** Frases que pertenecen: *"cuando estés lista, está acá"*, *"tomate el tiempo que necesites"*, *"a tu ritmo"*. La energía es de presencia disponible, de timing del lector — nunca de empuje.
- **Hara hace silencio donde otros gritan.** El llamado a la acción más fuerte puede ser *"guardá esto para más adelante"*. La invitación nunca empuja.
- **Significado del nombre como brújula.** *Hara* (腹) en japonés es el centro energético dos dedos debajo del ombligo, la sede de la energía vital y el equilibrio. *"Actuar desde el hara"* = desde el centro, con calma y presencia, desde el timing propio. Cada decisión de copy debería sentirse así: **presente, sin apuro, atendida.**

### Catálogo de modalidades (referencia para todo "el profesional")

Cada modalidad tiene su lógica propia. Cuando hablás de *"el profesional"*, pensás en alguien de esta lista — un reikista, una facilitadora de constelaciones, un coach ontológico, una terapeuta floral. La especificidad es parte de la voz.

Reiki · Constelaciones familiares · Registros akáshicos · Diseño humano · Terapia floral (Flores de Bach) · Masaje terapéutico · Meditación y mindfulness · Biodecodificación · Sonoterapia · Tarot terapéutico · Astrología · Coaching ontológico · Aromaterapia · Yoga terapéutico.

### Reglas operativas adicionales (mías, derivadas de Bel's voice doc + product constraints)

- **Marketplace leads, concierge is quiet.** Per la visibility constraint en `PRODUCT.md` §"How we make money" 2. Marketplace lidera CTAs. Concierge existe pero no encabeza nada.
- **WhatsApp = usuario ↔ profesional. Email + Instagram DM = usuario ↔ Hara.** Nunca describir el soporte de Hara como WhatsApp.
- **Género plural-inclusivo donde natural.** *"Te damos la bienvenida"* > *"Bienvenido/a"*. Cuando neutro es forzado, respetar el directorio mixto.

### Cómo aplicar esto a una rewrite

Antes de proponer una nueva frase, pasarla por estos tests:

1. **¿Suena como salida desde el hara — presente, sin apuro, atendida?** Si grita o empuja, no.
2. **¿Respeta el timing del usuario?** No pide ya; invita.
3. **¿Es cálida y clara, sin sonar clínica ni promocional?** Ni *"resultados garantizados"* ni *"experiencia personalizada"*.
4. **¿Cada palabra está ahí porque tiene que estar?** Cortar *"personalizadas"*, *"verificados"*, *"profesionales"* cuando son filler; mantener solo cuando concretan algo.
5. **¿Privacy está dicha donde el usuario la necesita escuchar?** No al final de la página — al lado del form o del botón de contacto.
6. **¿La frase la diría una persona real, o suena traducida del inglés?** Banner-speak rhetorical questions (*"¿Querés saber cuando abramos?"*) son traducción literal de patrones de marketing en inglés — no son español.

## Scope

### In Scope (surfaces to audit)

Public-facing pages (current copy review):
- `app/page.tsx` — Próximamente (pre-launch home)
- `app/preview/page.tsx` — Post-launch home (currently hidden, will become `/` at the Final Go-Live Gate)
- `app/profesionales/page.tsx` — Directory header + empty state
- `app/p/[slug]/page.tsx` — Professional profile page
- `app/profesionales/registro/RegistroForm.tsx` + `app/profesionales/registro/page.tsx` — 4-step registration form (labels, helper text, errors)
- `app/profesionales/registro/confirmacion/page.tsx` — Post-registration confirmation
- `app/solicitar/SolicitarForm.tsx` + `app/solicitar/page.tsx` — Concierge intake form
- `app/gracias/page.tsx` — Post-solicitar confirmation
- `app/ayuda/page.tsx` — FAQ + contact (just shipped; verify only)
- `app/r/[tracking_code]/page.tsx` — Recommendations card deck (intro line, error states)
- `app/r/review/[token]/page.tsx` — Review submission flow
- `app/terminosyprivacidad/page.tsx` + `app/components/TermsAndPrivacyPage.tsx` — Legal (light touch — legal language has different rules)
- `app/error.tsx` — Global error boundary
- `app/not-found.tsx` — Global 404

Email templates in `lib/email.ts`:
- `notifyNewProfessional` — admin notification of new registration
- `notifyRegistrationReceived` — pro-facing submission confirmation
- `notifyProApproved` — pro-facing approval
- `notifyProRejected` — pro-facing rejection
- `sendReviewRequest` — 7-day post-contact review request
- (any other user-facing email template in the file)

Component-level user-facing strings:
- `app/components/WaitlistForm.tsx` — waitlist email capture (button, success/error states)
- `app/components/ContactButton.tsx` — WhatsApp contact CTA + privacy note

### Explicitly Out of Scope

- **Admin pages (`/admin/*`).** Internal tooling, different audience, not part of public-facing voice. Audit separately if/when admin gets a polish pass.
- **Legal long-form text in `/terminosyprivacidad`.** Legal accuracy outweighs voice consistency; only fix obvious tone violations (e.g., contradicting voice principles), don't rewrite legal substance.
- **Translation to other Spanish variants.** Argentine *voseo* stays. Other markets are a future call (PRODUCT.md "Open product questions" §"Voice across markets").
- **New copy for unbuilt features.** If a surface doesn't exist yet (e.g., `/admin/matches`, `/pro/*` portal), it's not in this pass.
- **CTA button labels that double as data values.** Some button labels are tied to backend state (`status='active'` etc.) — those don't change.
- **Image/illustration changes.** Visual content stays.
- **Voice changes for other markets (Spain *tú*, Mexico *tú*).** Locked to AR voseo per PRODUCT.md.

## Per-Surface Audit Table

> **Format:** "Before" = current copy on the page. "Problem" = what's wrong (which principle fails, what category of bad writing). "Direction" = the shape of the rewrite — kept brief on purpose.
>
> **Claude writes all final Spanish copy**, anchored on the Voice section above. The "Direction" column describes the structural fix; Claude produces the finished string during /spec, tested against the 6 voice checks (§ "Cómo aplicar esto a una rewrite"). Bel reviews the result at the Code Review Gate.
>
> **Note:** This table captures the *highest-impact* lines identified during the PRD audit. /spec implementation may surface additional small fixes (typos, missing privacy lines, gender phrasing) as Bel reads each file in full. Those count as in-scope additions.

### Surface 1: `app/preview/page.tsx` — post-launch home *(HIGH PRIORITY — pre-pivot framing + filler)*

| # | Before | Problem | Direction |
|---|--------|---------|-----------|
| 1.1 | `Te conectamos con tu terapeuta ideal` (H1 hero) | Wrong framing (P3 — psychotherapy) + banner-speak ("ideal" is filler) | Bel writes a hero that names what Hara actually is (holistic wellness) without filler. |
| 1.2 | `Recibí 3 recomendaciones personalizadas de profesionales verificados` (subtitle) | Three filler adjectives ("personalizadas", "verificados", "profesionales") + concierge-led framing | Bel writes a subtitle that ideally names concrete modalities (reiki / masajes / constelaciones / etc.) and keeps "verified" only as a trust word, not a filler word. |
| 1.3 | CTA order: `Solicitar recomendaciones` (primary) → `Ver profesionales` (secondary) → `Únete como profesional` | Concierge-led ordering violates P5 | Reorder so `Ver profesionales` is primary, `Solicitar recomendaciones` secondary, `Sumate como profesional` tertiary. CTA labels themselves: Bel decides — "Únete" feels formal; "Sumate" is more natural in voseo. |
| 1.4 | `Cómo funciona` section heading | (Keep — well-written) | No change. |

### Surface 2: `app/page.tsx` — Próximamente *(HIGH PRIORITY — multiple bad-writing examples)*

| # | Before | Problem | Direction |
|---|--------|---------|-----------|
| 2.1 | `Estamos creando un espacio donde encontrar profesionales del bienestar sea simple, humano y confiable.` | LLM padding ("estamos creando un espacio donde X sea Y") + vague "bienestar" without "holístico" | Bel writes a shorter intro that names "bienestar holístico" specifically and drops the structural filler. |
| 2.2 | `¿Querés saber cuando abramos?` | Banner-speak rhetorical question. **Worst example in the product** per Bel 2026-05-12. | Bel writes a direct instruction (form prompt). Not a question. |
| 2.3 | `Dejanos tu email. Si sos profesional y querés sumarte, también es por acá.` | Two ideas crammed into one paragraph; first sentence overlaps with 2.2 once rewritten | Bel rewrites depending on 2.2 — likely keeping only the "sos profesional" line as a secondary prompt. |
| 2.4 | `Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.` | (Keep — well-written canonical privacy line) | No change. |

### Surface 3: `app/profesionales/page.tsx` — directory

| # | Before | After | Why |
|---|--------|-------|-----|
| 3.1 | `Profesionales` (H1) | `Profesionales verificados` | Principle 4 (trust signal upfront). |
| 3.2 | `Elegí a quien querés contactar.` | `Elegí con quién querés conectar. Tu info se comparte recién cuando vos escribís.` | Principle 4 (privacy promise inline at the moment of choice). |
| 3.3 | Empty state: `Todavía no hay profesionales disponibles. Volvé pronto.` | `Estamos sumando profesionales. Volvé pronto.` | Reframes from negative ("no hay") to positive ("estamos sumando"). |

### Surface 4: `app/p/[slug]/page.tsx` — professional profile

| # | Before | After | Why |
|---|--------|-------|-----|
| 4.1 | Section labels like "Sobre mí", "Especialidades", "Modalidades" (verify in /spec) | Confirm all in voseo + holistic framing; no "terapeuta" if it appears | Principle 3 + 1. /spec reads each label. |
| 4.2 | Contact CTA copy (ContactButton component) | Verify: "Escribir por WhatsApp" or similar, with privacy note "Tu info se comparte recién cuando vos escribís" near it | Principle 4 + 6. |
| 4.3 | Empty/missing-data states ("Sin reseñas todavía" etc.) | Confirm warm wording; reframe negatives to positives where possible | Voice consistency. |

### Surface 5: `app/profesionales/registro/RegistroForm.tsx` — 4-step registration

| # | Before | After | Why |
|---|--------|-------|-----|
| 5.1 | Step titles, field labels, helper text — full audit during /spec | Sweep for: voseo on all instructions, holistic framing (any "terapia" → "práctica" / "terapia alternativa"), gender-neutral confirmations | Principles 1, 3, 7. |
| 5.2 | Error messages (validation, submission) | Voseo + warm: "Necesitamos tu email" not "El email es requerido" | Principle 2. |
| 5.3 | Submit button + success state | "Enviar mi solicitud" → confirm post-submit copy is in voseo and references the email they'll receive | Aligns with Item 3 emails. |

### Surface 6: `app/profesionales/registro/confirmacion/page.tsx` — registration confirmation

| # | Before | After | Why |
|---|--------|-------|-----|
| 6.1 | Confirmation header + body — full audit during /spec | Mention: confirmation email sent, review timeframe ("lo más rápido que podamos" — match `/ayuda` FAQ phrasing) | Cross-surface consistency. |

### Surface 7: `app/solicitar/SolicitarForm.tsx` — concierge intake

| # | Before | After | Why |
|---|--------|-------|-----|
| 7.1 | Form intro / first-step prompt | Confirm wording is in voseo, doesn't over-promise (no "encontraremos al profesional perfecto"), references the manual-curation reality | Principle 2 (calm, not over-promising) + concierge visibility constraint (don't oversell). |
| 7.2 | Field labels for intent ("¿Qué te trae acá?" etc.) | Verify holistic framing in placeholders/examples | Principle 3. |
| 7.3 | Submit + success transition | Connects to /gracias; confirm /gracias copy still aligns after this pass | Cross-surface. |

### Surface 8: `app/gracias/page.tsx` — post-solicitud

| # | Before | After | Why |
|---|--------|-------|-----|
| 8.1 | `¡Recibimos tu solicitud!` | (Keep) | Aligned. |
| 8.2 | `Vamos a buscar profesionales que se ajusten a lo que nos contaste. Te escribimos cuando tengamos tus 3 opciones.` | (Keep — already aligned per Item 2 fix on 2026-05-07) | Channel-agnostic, matches manual-delivery reality. |
| 8.3 | Steps list (Analizamos / Seleccionamos / Te escribimos / Vos elegís) | (Keep — well-paced) | Already follows voice. |
| 8.4 | `Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.` | (Keep) | Principle 4 — canonical privacy line. |

### Surface 9: `app/ayuda/page.tsx` — support page (just shipped)

| # | Before | After | Why |
|---|--------|-------|-----|
| 9.1 | All copy was written in this PRD process | (Verify only) | Just shipped 2026-05-12, follows voice. Confirm no drift introduced by Item 7 changes elsewhere. |

### Surface 10: `app/r/[tracking_code]/page.tsx` — recommendations card deck

| # | Before | After | Why |
|---|--------|-------|-----|
| 10.1 | Reveal screen / deck intro copy (verify in /spec) | Confirm voseo, warm; mention "elegidas a mano" or similar for the manual curation | Aligns with concierge-as-promise voice without over-promoting. |
| 10.2 | Error state `Este link venció` / `No pudimos cargar` | Already updated (Item 8 wording pass added /ayuda link) | Verify it landed correctly. |
| 10.3 | Bottom sheet professional details copy | Full audit during /spec | Voice consistency. |

### Surface 11: `app/r/review/[token]/page.tsx` — review submission

| # | Before | After | Why |
|---|--------|-------|-----|
| 11.1 | Review prompt copy | Verify voseo, warm, no "rate this professional" clinical framing | Principles 1, 2, 3. |
| 11.2 | Submit success / already-submitted states | Confirm warm closure: "Gracias por tu reseña" + privacy reassurance | Principle 4. |

### Surface 12: `app/terminosyprivacidad/page.tsx` — legal page (light touch)

| # | Before | After | Why |
|---|--------|-------|-----|
| 12.1 | Intro paragraph + section intros | Voseo where present; legal substance unchanged | Principle 1; respect legal-accuracy constraint. |
| 12.2 | Already says "Hara Vital" everywhere | Confirm — already swept in 2026-05-12 brand rename | No change expected. |

### Surface 13: `app/error.tsx` — global error boundary

| # | Before | After | Why |
|---|--------|-------|-----|
| 13.1 | `Algo salió mal` | (Keep — neutral, calm) | Aligned. |
| 13.2 | `Ocurrió un error inesperado. Por favor, intentá de nuevo.` | `Algo no funcionó como esperábamos. Intentá de nuevo en un momento.` | Principle 2 (calmer); less "inesperado" alarm. |
| 13.3 | Button labels: `Intentar de nuevo`, `Volver al inicio`, `¿Necesitás ayuda?` | (Keep) | All in voseo, all clear. |

### Surface 14: `app/not-found.tsx` — 404

| # | Before | After | Why |
|---|--------|-------|-----|
| 14.1 | `Página no encontrada` | (Keep) | Standard. |
| 14.2 | `No encontramos esta página. Puede que el link esté roto o que la dirección haya cambiado.` | (Keep — clear, calm) | Aligned. |

### Surface 15: `lib/email.ts` — user-facing email templates

| # | Before | After | Why |
|---|--------|-------|-----|
| 15.1 | `notifyRegistrationReceived` subject + body | Verify voseo, warm tone, sets expectation ("Te respondemos lo antes que podamos") matching /ayuda | Cross-surface (/ayuda FAQ #2 references review timing). |
| 15.2 | `notifyProApproved` subject + body | "Te damos la bienvenida" (gender-neutral, already applied per Item 3 review). Confirm no "psicólogo/a" or "terapeuta" language. | Principles 3 + 7. |
| 15.3 | `notifyProRejected` subject + body | Warm tone retained; verify the rejection reason interpolation is grammatically correct in Spanish and the resubmit-after date phrasing is natural. | Principle 2. |
| 15.4 | `sendReviewRequest` (7-day post-contact) | Verify voseo ("Hace una semana contactaste a..." → already in this form, confirm); confirm the review CTA copy is warm not transactional. | Principles 1, 2. |
| 15.5 | `notifyNewProfessional` (admin-only) | Out of scope (admin-facing). Skip. | Admin pages out of scope. |

### Surface 16: `app/components/WaitlistForm.tsx` — waitlist capture

| # | Before | After | Why |
|---|--------|-------|-----|
| 16.1 | Submit button text + success/error states | Verify voseo + warm. If button says "Suscribir" → "Avisame cuando abran" or similar | Principles 1, 2. /spec audits the file. |

### Surface 17: `app/components/ContactButton.tsx` — WhatsApp CTA

| # | Before | After | Why |
|---|--------|-------|-----|
| 17.1 | Button label + privacy note | Confirm: "Escribir por WhatsApp" + "Tu info se comparte recién cuando vos escribís." inline | Principles 4, 6. |

## Technical Context

- **Files to edit:** ~18 files (listed above). Most are minor string changes; some (`/preview`, `RegistroForm`, `SolicitarForm`) have many strings and may exceed 10 edits each.
- **No new components, no new routes.** Pure copy edits via `Edit` tool on existing files.
- **No tests need to change** — page-level unit tests don't exist for these surfaces (matches established pattern). E2E specs that assert on copy strings will need updating; the implementer must `grep` for hardcoded Spanish strings in `__tests__/e2e/*.spec.ts` and update assertions to match the new copy.
- **Cross-surface dependencies:** /gracias references "3 opciones"; /ayuda references review timing; /preview references concierge in a CTA. After changes land, do a final read-through of the user flow (home → form → submit → confirmation → recommendations) to catch any wording that breaks the journey.
- **No DB changes, no schema changes, no migration.**
- **No new dependencies.**
- **Order of edits:** Suggest /spec apply changes per surface (one PR-able commit per surface or per related group), not all at once, so issues are easy to bisect.
- **Verification:** After each surface edit, the implementer visits the page in dev (`npm run dev`) and confirms the copy renders correctly + the layout isn't broken (Spanish strings are typically longer than English; a button label change can wrap differently). Browser automation smoke covers the high-visibility surfaces.

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| One PRD vs. multiple | One PRD covering all surfaces | Homogeneous work (all copy, all one language, all one brand voice). Splitting by surface fragments the voice contract. |
| Output shape | Per-surface before/after table | Bel's pick. Most concrete; /spec applies edits mechanically without re-deciding wording. |
| Voice anchor | PRODUCT.md + this PRD's 8 voice principles | Avoids inventing a separate "style guide" doc; the principles list IS the operational style guide. |
| Concierge framing | Marketplace leads, concierge present but never lead | Per PRODUCT.md visibility constraint. /preview CTA reorder (3.1.3) is the most visible expression of this. |
| Highest-priority surfaces | Surfaces 1 (/preview), 2 (Próximamente), 3 (/profesionales), 7 (/solicitar), 13 (error.tsx) | These have the most concentrated bad-writing examples — banner-speak, filler, rhetorical questions, formal tone. Fixing them is the biggest user-visible win. |
| Priority lens | Bad writing > framing drift | Bel's directive 2026-05-12: rewriting filler ("¿Querés saber cuando abramos?") matters more than fixing framing-correct-but-flat copy. Both get fixed, but quality is the lens. |
| /gracias copy | Keep as-is | Already aligned 2026-05-07 (Item 2). Don't re-fiddle. |
| Legal page | Light touch only | Legal accuracy > voice consistency. Sweep voseo, leave substance alone. |
| Admin emails | Out of scope | Internal audience; not the user-facing wording pass. |
| Test assertions | Implementer updates E2E specs as copy changes land | If a test asserts a string that the wording pass changes, the test must update. /spec will grep for these. |
| Implementation order | Per-surface, ~1 surface per commit during /spec | Keeps PRs reviewable; easy to bisect if a change breaks something. |

## Research Findings

**Tier: Standard** — 6 web searches across Spanish UX copywriting, LATAM wellness branding, voseo in interfaces, and meditation/wellness app voice references.

### Key findings

- **Voice + tone are distinct.** Voice is the stable brand personality; tone adapts to context (form vs. error vs. confirmation). The 8 voice principles in this PRD lock the voice; tone naturally varies by surface (e.g., error pages can be more terse than the home page) without breaking voice.
- **Argentine voseo is normalized in Argentine UX.** No special accommodation needed for an Argentina-first audience; *voseo* reads as natural, not stylized. Cross-market deployment to Spain/Mexico would need a separate audit (locked out of scope per PRODUCT.md "Open product questions" §"Voice across markets").
- **Wellness brand voice trends "calm + warm + present."** Calm/Headspace's Spanish copy mirrors this: short sentences, present tense, low-density emoji use, no urgency mechanics. Hara Vital's existing copy already trends this way; this pass tightens it.
- **Privacy-forward language is a wellness app pattern.** "Your data is yours" framing converts better than "We protect your privacy" — agency to the user, not vague reassurance. Hara's *"Tu info se comparte recién cuando vos escribís"* is the right shape; the pass propagates it more consistently.
- **Inclusivity in Spanish is harder than in English.** Gender-neutral phrasing requires intentional choices (e.g., "Te damos la bienvenida" vs. "Bienvenido/a"). Default to neutral where natural; accept gendered phrasing where neutral is awkward and the audience is mixed.
- **Avoid clinical terminology by default.** Wellness audiences in LATAM increasingly reject "paciente / sesión / diagnóstico" framing — even practitioners with clinical training use it sparingly in marketing. Hara's holistic positioning reinforces this.

### Sources

- HubSpot/Shopify FAQ + contact-page roundups (carried over from /ayuda research)
- Calm.com Spanish app pages (calm + warm voice benchmark)
- Spanish UX copywriting guides (voice/tone/inclusivity)
- Argentine voseo Wikipedia + voice-tech references (voseo normalization)
- LATAM holistic-wellness marketplaces (Portal Alternativo, Mercado Libre's terapias alternativas vertical)

### Trade-offs surfaced

- **Per-surface table vs. principles document.** Bel chose the table — more concrete, mechanical to apply, less judgment in /spec. The trade-off: when the implementer hits a string not in the table, they fall back to the 8 voice principles. The PRD explicitly allows this ("/spec implementation may surface additional small fixes...").
- **Marketplace-first CTA on `/preview` vs. dual-CTA original.** Reordering CTAs subtly shifts conversion (likely toward marketplace at the cost of concierge submissions). Acceptable trade — matches the visibility constraint. Concierge is preserved as a secondary option, not eliminated.
- **"Acompañante" vs. "profesional".** Considered using *acompañante* throughout for the holistic-warmth signal. Rejected: too unfamiliar; first-time visitors may not understand what's being offered. *Profesional* with the modality list (reiki, masaje, etc.) does the warm-framing work without confusing the literal meaning. Future copy iterations can experiment.
- **Reframing /preview hero in one cycle vs. A/B test.** No A/B infra exists; one cycle is the only option. Choose the rewrite that aligns with voice; iterate based on real usage signal after launch.

## Open Questions for /spec

- **Final hero copy for `/preview`.** Read the file, derive the string from the voice contract (holistic framing, no filler, no concierge-led). Claude writes it; no consultation needed.
- **WaitlistForm exact button label.** Read the file in /spec to see what's there; rewrite from voice principles directly.
- **`/r/review/[token]` review-prompt phrasing.** Read the file in /spec; apply voice principles directly.
- **E2E test string assertions.** /spec greps `__tests__/e2e/*.spec.ts` for hardcoded Spanish strings being changed and updates assertions in lockstep with copy changes. If any test asserts a string this PRD doesn't change, it stays as-is.
- **WhatsApp CTA copy on `ContactButton`.** Read the file in /spec; confirm label + ensure privacy note is inline.
