# Professional approval/rejection emails

Created: 2026-05-07
Author: belu.montoya@dialpad.com
Category: Feature
Status: Final
Research: Standard

## Problem Statement

Today, when a practitioner submits the registration form at `/profesionales/registro`, the only feedback is a confirmation page. After that, the admin receives `notifyNewProfessional` and reviews the submission at `/admin/professionals/[id]/review`, flipping `status` to `active` or `rejected` (with a `rejection_reason` admin note). **The pro is never told what happened.** Active pros don't know they're live. Rejected pros don't know they were rejected, and have no path back. This is a closed loop on the admin side, an open loop on the pro side — the most common cause of inbound "is anyone there?" support traffic, and the reason 80% of personalized-rejection candidates would reapply (vs. silent drop-off).

This PRD wires the pro side of the loop: a submission confirmation, an approval email, and a rejection email with a soft-no path back (60-day cooldown, per Item 5 decision 2026-05-07).

## Core User Flows

### Flow 1: Pro submits registration → submission confirmation

1. Pro completes the 4-step form at `/profesionales/registro` and submits.
2. `/api/professionals/register` inserts the row with `status='submitted'`.
3. Admin receives `notifyNewProfessional` (existing).
4. **New:** Pro receives `notifyRegistrationReceived` — *"Recibimos tu solicitud. Vamos a revisar tu perfil con calma y te escribimos cuando tengamos una respuesta."* Closes the silence between submit and admin decision. (Exact body in Draft email copy below — no specific SLA promised, since admin review timing varies with volume.)

### Flow 2: Admin approves → approval email

1. Admin reviews at `/admin/professionals/[id]/review`, clicks Approve.
2. `PATCH /api/admin/professionals/[id]` flips `status` to `active`.
3. **New:** Pro receives `notifyProfessionalApproved` — warm welcome + button to `/p/{slug}` + 2–3 short paragraphs answering the obvious next questions (where clients see them, how clients contact them via the ContactButton, how to update their profile = "escribinos por ahora").

### Flow 3: Admin rejects → rejection email + cooldown

1. Admin writes a `rejection_reason` text in the form (now relabeled — see Flow 6).
2. Admin clicks Reject.
3. `PATCH /api/admin/professionals/[id]` flips `status` to `rejected` AND sets `resubmit_after = NOW() + INTERVAL '60 days'`.
4. **New:** Pro receives `notifyProfessionalRejected` — warm framing + the admin's `rejection_reason` quoted **verbatim** in a styled block + *"Podés volver a aplicar a partir del [fecha resubmit_after]"*.

### Flow 4: Rejected pro tries to re-register within window

1. Pro fills out `/profesionales/registro` with the same email used in their rejected application.
2. `/api/professionals/register` looks up existing rows by email, finds one with `status='rejected'` and `resubmit_after > NOW()`.
3. **New:** Endpoint returns a structured error; form displays an inline friendly message: *"Ya aplicaste el [fecha de aplicación previa]. Podés volver a aplicar a partir del [fecha resubmit_after]. Si tenés preguntas, escribinos a centrovitalhara@gmail.com."*
4. No email is sent (avoids churn — the form already told them).

### Flow 5: Rejected pro re-registers after window

1. Same as Flow 4, but `resubmit_after <= NOW()`.
2. Endpoint allows the insert as a fresh `status='submitted'` row. (Old row stays in DB for admin history.)
3. Flow proceeds as a normal new registration → Flow 1.

### Flow 6: Admin form label change (supporting Flow 3)

1. The `rejection_reason` textarea on `/admin/professionals/[id]/review` is relabeled.
   - Today: probably "Razón de rechazo" or similar (admin-facing).
   - New: *"Razón de rechazo (este texto se le enviará al profesional con tus palabras exactas)"*.
2. Admin now writes the field knowing the pro will read it verbatim.

## Scope

### In Scope

- **3 new email functions** in `lib/email.ts`:
  - `notifyRegistrationReceived(professional)` — Flow 1
  - `notifyProfessionalApproved(professional)` — Flow 2
  - `notifyProfessionalRejected(professional, rejection_reason, resubmit_after)` — Flow 3
- **Wiring into `/api/professionals/register`** to fire `notifyRegistrationReceived` on insert success.
- **Wiring into `/api/admin/professionals/[id]` PATCH branches** to fire approval/rejection emails based on the new status.
- **Migration 011** (`011_pro_resubmit_cooldown.sql`): adds `resubmit_after TIMESTAMPTZ NULL` to `professionals` table.
- **Cooldown enforcement** in `/api/professionals/register`: if email matches an existing row with `status='rejected'` AND `resubmit_after > NOW()`, return structured error; form shows inline message.
- **Admin form label change** on `/admin/professionals/[id]/review` for the `rejection_reason` field.
- **Tests:** unit tests for the 3 email functions + integration test for the cooldown enforcement path.

### Explicitly Out of Scope

- Multi-touch onboarding sequence (industry's "3–5 emails over a week" pattern) — separate feature, separate PRD.
- "Compartí tu perfil" promotional CTAs in the approval email — voice mismatch with calm/warm/trustworthy positioning.
- Self-edit `/pro` portal (pros editing their own profile) — Phase 3 (`/pro/*` portal).
- Category-based rejection reasons (dropdown of predefined categories) — admin keeps freeform control. Considered and rejected during PRD discussion.
- Auto-firing approval email when admin un-rejects (`rejected` → `active` manual flip) — admin can re-trigger manually if needed; auto-firing risks wrong-email-on-undo.
- Cleanup of `notifyNewProfessional`'s outdated `specialties: string[]` typing (post-migration 010, pros also have `practices`) — separate housekeeping.

## Technical Context

### Relevant architecture

- **Existing email pattern:** `lib/email.ts` uses Resend, fails gracefully (`sendEmail` returns `false` on error, never throws — keeps email failures from blocking main operations). The closest sibling is `notifyReviewRequest` (line 162): email *to* a non-admin recipient, branded CTA, Argentine voice, max-width 560px. New functions should mirror its structure, NOT the admin-facing table-driven layouts (`notifyNewLead`, `notifyNewProfessional`).
- **Brand HTML conventions:** system-ui font, `#4B2BBF` brand color, pillar buttons (`border-radius: 9999px`), padding `14px 28px`, color `#1F1A24` for primary text, `#6B6374` for muted.
- **Base URL pattern:** `process.env.NEXT_PUBLIC_SITE_URL || 'https://${VERCEL_URL}' || 'http://localhost:3000'` (mirrors `notifyNewProfessional`).
- **Admin PATCH route:** `app/api/admin/professionals/[id]/route.ts` already handles status flips; tests exist (`route.test.ts`, `route-practices.test.ts`). Email firing slots into the existing approve/reject branches.

### Files touched

- `lib/email.ts` — 3 new exported functions.
- `app/api/professionals/register/route.ts` — fire `notifyRegistrationReceived` post-insert; add cooldown check pre-insert.
- `app/api/admin/professionals/[id]/route.ts` — fire approval/rejection emails in respective PATCH branches; set `resubmit_after` on rejection.
- `migrations/011_pro_resubmit_cooldown.sql` — new migration.
- `app/admin/professionals/[id]/review/page.tsx` — relabel the `rejection_reason` field.
- `__tests__/integration/cooldown-enforcement.test.ts` — new integration test.
- `__tests__/lib/email.test.ts` — extend with unit tests for the 3 new functions (assert subject/body shape, fail-gracefully behavior).

### Constraints

- **Language:** All copy is Argentine Spanish (vos, querés, escribís).
- **Brand voice:** Calm, warm, trustworthy, premium. No exclamation points beyond "¡Tu perfil está activo!". No "Lamentamos comunicarte" — Spanish-Argentine warmth uses gratitude framing ("Gracias por aplicar a Hara") not apology framing.
- **Resend daily limits:** existing config is fine for current volume (low single-digits/day). No batching needed.
- **No new dependencies:** Resend is already wired. No React Email package, no template engine.

### Existing code references

- `lib/email.ts:104` — `notifyNewProfessional` (admin-facing pattern, do NOT mirror)
- `lib/email.ts:162` — `notifyReviewRequest` (pro-facing pattern, mirror this)
- `app/api/admin/professionals/[id]/route.ts` — existing PATCH branches
- `migrations/010_holistic_practices_catalog.sql` — most recent migration, naming pattern reference

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Confirmation email scope | Include submission confirmation (3 emails total, not 2) | Closes the silence between submit and admin decision; prevents "did the form work?" support traffic |
| Rejection reason rendering | Verbatim quote of `rejection_reason` in a styled block | Research: 80% of candidates would reapply if the rejection felt personalized. Verbatim quoting is the strongest personalization signal. Forces admin to write thoughtfully. |
| Cooldown duration | 60 days | Item 5 decision (2026-05-07). Industry default is 6–12 months (Google, Meta) — Hara is at the short end deliberately, because Argentine holistic-wellness is a small warm market where long cooldowns burn relationships faster than they filter spam |
| Cooldown UX | Inline friendly message on the registration form | Pro sees it instantly, no email churn. Slight info-leak risk if a random visitor types the same email by accident, but realistic risk is low |
| Rejection categories | Freeform `rejection_reason` text (no predefined dropdown) | Admin keeps flexibility; verbatim quoting only works if admin owns the wording |
| Cooldown enforcement | Hard block in registration handler | If we don't enforce, the rejection email's promise becomes a polite suggestion the system ignores |
| Re-rejection semantics | Each rejection resets `resubmit_after` to `NOW() + 60 days` | Simple rule, no escalation |
| Admin un-rejection (status flip back) | Does NOT auto-fire approval email | Admin manually re-triggers if needed; avoids wrong-email-on-undo |
| Approval email shape | Comprehensive (anticipates next-step questions), not lean single-CTA | Pros otherwise wonder how clients reach them, how to edit their profile — and email admin. 2 paragraphs prevents inbound support |
| Approval email promotional CTA | Excluded ("Compartí tu perfil") | Voice mismatch with calm/warm positioning. Mixes "you're approved" with "now go market" |

## Research Findings

### Key Findings

- **Approval email format:** Industry default is short with ONE clear CTA. But comprehensive welcome that pre-answers obvious next-step questions performs measurably better at preventing inbound support — especially when self-serve tooling (here: the `/pro` portal) doesn't exist yet.
- **Rejection email tone:** Empathetic, polite, *specific*. Vague rejections leave people guessing — the worst outcome. Verbatim quoting of the reason tests warmer than paraphrased templates.
- **Reapply encouragement:** 80% of candidates say they'd reapply if the rejection was personalized. Personalization here = the actual `rejection_reason` text the admin wrote.
- **Cooldown norms:** Google ~6 months, Meta ~12 months. Hara's 60-day choice is deliberately short — a brand position, not a mistake. Documenting WHY beats documenting WHAT for future-you.
- **Argentine-Spanish framing:** Gratitude + future-oriented reads warmer than apology framing. *"Gracias por aplicar a Hara"* > *"Lamentamos comunicarte que..."*

### Sources

- [Candidate Rejection Email Templates (Get Magical)](https://www.getmagical.com/blog/candidate-rejection-email-templates)
- [Applicant Auto-Rejection: Best Practices & Email Template (Eddy)](https://eddy.com/hr-encyclopedia/applicant-auto-rejection/)
- [8 Powerful Onboarding Email Examples (customer.io)](https://customer.io/learn/lifecycle-marketing/onboarding-email-examples)
- [How long is the cool-off period to reapply (Quora)](https://www.quora.com/How-long-is-the-cool-off-period-to-reapply-once-rejected-in-interview-by-Directi-and-walmart-labs)
- [Responde al email de rechazo laboral (curriculumytrabajo.com)](https://curriculumytrabajo.com/responder-email-rechazo/)

### Trade-offs Discovered

- **Personalized vs. templated rejection** — verbatim quoting wins on warmth but requires changing how admin writes (knowing it's pro-facing). Template-only is faster to build but reads cold. Decision: verbatim, with admin form label updated to make this explicit.
- **Lean vs. comprehensive approval email** — single CTA is industry default but assumes self-serve tooling exists. Hara doesn't have a `/pro` portal yet, so comprehensive is correct here. Will likely revert to lean once Phase 3 ships the portal.
- **Cooldown length** — short (60d) burns less goodwill but lets weak applicants spam. Long (12mo) filters but breaks small-market relationships. Hara's market size makes short the right call.

## Draft email copy

(Starting drafts — admin/Bel can refine. All Argentine Spanish, vos.)

### `notifyRegistrationReceived`

- **Subject:** *Recibimos tu solicitud en Hara*
- **Body:**
  > Hola [nombre],
  >
  > Recibimos tu solicitud para sumarte como profesional a Hara. Vamos a revisar tu perfil con calma — esto suele tomar unos pocos días.
  >
  > Te escribimos en cuanto tengamos una respuesta. Si necesitás cambiar algo en tu solicitud mientras tanto, escribinos a centrovitalhara@gmail.com.
  >
  > Gracias por confiar en Hara.

### `notifyProfessionalApproved`

- **Subject:** *¡Tu perfil en Hara está activo!*
- **Body:**
  > Hola [nombre],
  >
  > Tu perfil ya está activo en Hara. Las personas que entren al directorio o reciban tus recomendaciones a través de nuestro sistema concierge pueden ver tu información y contactarte.
  >
  > **Tu perfil:** [link a /p/{slug}]
  >
  > **¿Cómo te encuentran?** Tu perfil aparece en `/profesionales`. También podemos recomendarte cuando alguien que busca ayuda holística llene el formulario de solicitud y vos seas un buen match.
  >
  > **¿Cómo te contactan?** Cuando alguien hace click en el botón de contacto de tu perfil, se abre un chat de WhatsApp directo a tu número. No filtramos ni intermediamos — la conversación es entre vos y el cliente.
  >
  > **¿Querés actualizar algo?** Por ahora, escribinos a centrovitalhara@gmail.com y te lo cambiamos. Pronto vas a poder editarlo vos directamente.
  >
  > Bienvenida a Hara.

### `notifyProfessionalRejected`

- **Subject:** *Sobre tu solicitud en Hara*
- **Body:**
  > Hola [nombre],
  >
  > Gracias por aplicar a Hara. Después de revisar tu perfil, decidimos no avanzar con tu solicitud por ahora.
  >
  > **Razón:**
  > > [rejection_reason verbatim]
  >
  > Si querés volver a aplicar después de ajustar lo anterior, podés hacerlo a partir del **[resubmit_after fecha legible]**.
  >
  > Si tenés preguntas, escribinos a centrovitalhara@gmail.com.
  >
  > Gracias de nuevo por tu interés.

### Cooldown form error message

- *"Ya aplicaste a Hara el [fecha de aplicación previa]. Podés volver a aplicar a partir del [fecha resubmit_after]. Si tenés preguntas, escribinos a centrovitalhara@gmail.com."*

## Success Criteria

- 100% of submission events trigger a confirmation email (modulo Resend failures, which are silent).
- 100% of approve/reject status flips trigger their respective email.
- A pro who tries to re-register within the 60-day window sees the inline message — not a generic error, not a successful submission.
- A pro who tries to re-register *after* the window proceeds normally.
- Admin sees the relabeled `rejection_reason` field and writes their text knowing the pro will read it verbatim.
- All email functions follow the fail-gracefully pattern — no email error blocks the underlying status change.

## Resolved (2026-05-07)

- **Contact email for support fallback:** `centrovitalhara@gmail.com` (same as `ADMIN_EMAIL` and `REPLY_TO` constants in `lib/email.ts`).
- **Resubmit_after date format in user-facing copy:** Full Spanish (*"15 de julio de 2026"*), not numeric.
