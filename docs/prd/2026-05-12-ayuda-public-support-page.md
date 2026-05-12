# /ayuda — Public Support Page (Soft Launch Push Item 8)

Created: 2026-05-12
Author: belu.montoya@dialpad.com
Category: Feature
Status: Final
Research: Standard

## Problem Statement

Hara Vital has no self-serve support surface today. A lead who loses access to their `/r/[tracking_code]` link — closed WhatsApp, deleted email, no record of the code — has zero recovery path; their only option is to somehow reach the admin by other means and explain. Practitioners who submitted a registration and want to know when they'll hear back have no answer beyond the confirmation email. Users browsing the directory who have a privacy or process question (e.g., "is my info shared?") have no place to look.

`/ayuda` v1 closes that gap with the smallest viable surface: a single scrollable page with FAQ entries split by audience (Para usuarios / Para profesionales) and a contact section pointing to email + Instagram DM. No forms, no self-serve recovery, no admin tooling — those become later iterations if real usage justifies them. The motivating use case is lost-link recovery; everything else is a no-cost addition once we're building the page.

Linked into the site at the places where users actually need it: the public footer (always reachable), generic error pages (when something breaks), the `/r/[tracking_code]` error state (the lost-link rescue path specifically), and the current Próximamente homepage (catches anyone who landed there confused).

## Core User Flows

### Flow 1: Lost-link recovery (primary motivating use case)

1. User received a `/r/[tracking_code]` link from Hara (via WhatsApp, manually delivered by admin).
2. User loses access to that link (deleted WhatsApp message, closed phone, etc.).
3. User remembers the path and tries it again — sees the error/expired state at `/r/[tracking_code]`.
4. Error state shows a "¿No encontrás tu link? Visitá /ayuda" link.
5. User clicks through to `/ayuda` and scrolls to "Si recibiste un link de recomendaciones y lo perdiste, ¿cómo lo recupero?".
6. Answer: "Escribinos por email (`centrovitalhara@gmail.com`) o por Instagram (`@haravital`) con tu nombre y/o el email que usaste, y te reenviamos el link."
7. User clicks the email link → composes message → admin replies manually with the re-issued link.

### Flow 2: Privacy / process question (user)

1. User browses `/profesionales`, opens a professional's profile at `/p/[slug]`, considers contacting.
2. Hesitates because they're not sure what info gets shared with the professional.
3. Scrolls to footer → clicks `Ayuda`.
4. Scrolls to "¿Mi información se comparte sin mi permiso?" FAQ entry.
5. Reads the answer ("Tu info se comparte recién cuando vos escribís por WhatsApp...") → returns to the profile → contacts.

### Flow 3: Professional waiting for review

1. Practitioner submits `/profesionales/registro`, receives the submission-confirmation email.
2. Three days pass with no further news. They want to know if they should worry.
3. They navigate to `/ayuda` (via the footer of `/profesionales` or a direct search).
4. Scroll to "Para profesionales" → "¿Cuánto tarda la revisión de mi solicitud?" → "Revisamos cada solicitud en 3-5 días hábiles. Si pasó más tiempo, escribinos."
5. They wait, or they write — either way, expectation is set.

### Flow 4: Generic error rescue

1. Any user hits an error page in the app (404, server error, etc.).
2. Error page surfaces a "¿Necesitás ayuda?" link.
3. User clicks → lands on `/ayuda` → finds answer or contact channel.

## Scope

### In Scope

- New route at `app/ayuda/page.tsx` — Spanish copy, design matches `TermsAndPrivacyPage.tsx` *exactly* (Bel's hard constraint).
- **Page shell (copy from `TermsAndPrivacyPage`):** `<div className="min-h-screen bg-background">` + `<PageBackground />` + inner container `max-w-md md:max-w-[960px] mx-auto px-4 pt-8 pb-12`. NOT wrapped in `PublicLayout` — the static-info pages use `PageBackground` directly.
- **Header block (same shape as `/terminosyprivacidad`):** `← Volver al inicio` back link → uppercase tracking-wide eyebrow label ("Ayuda") → `<h1>` title → muted intro paragraph. Omit the "Última actualización" line (not meaningful for a help page).
- **Anchor pill nav:** Same `flex flex-wrap gap-x-4 gap-y-2 mb-6` row, links to `#usuarios` and `#profesionales` with the same `text-sm text-muted hover:text-foreground transition-colors` styling.
- **Two sections, each wrapped in `<GlassCard>`:** `id="usuarios"` "Para usuarios" and `id="profesionales"` "Para profesionales". Each card has `<h2>` title + intro paragraph + a stack of accordion entries.
- **Accordion entries (reuse the existing `DisclosureItem` + `Chevron` pattern):** Each FAQ entry is a click-to-expand button using the exact same markup, ARIA (`aria-expanded`), animation (`rotate-90` chevron, `duration-200`), and typography (`text-sm font-semibold text-foreground` for the Q, `text-sm text-muted leading-relaxed` for the A paragraphs). Supports optional bullet lists with the same `text-brand` bullet color.
- **Contact card at the bottom:** Same `<GlassCard>` wrapper as the FAQ sections, contains `<h2>` "¿Necesitás escribirnos?" + intro + two prominent links: email (`mailto:centrovitalhara@gmail.com`) and Instagram (`https://instagram.com/haravital`). Visual treatment matches the existing card pattern — no new component invented.
- **Component reuse approach:** `DisclosureItem`, `Chevron`, the data-shape types (`LegalDisclosure`, `LegalGroup`) are currently private inside `TermsAndPrivacyPage.tsx`. `/spec` decides whether to (a) extract them to a shared module + rename to generic names (`AccordionItem` / `DisclosureGroup`), (b) duplicate the components into `app/ayuda/page.tsx`, or (c) make `TermsAndPrivacyPage` itself reusable with renamed prop types. Recommended: option (a) — extract once, reuse everywhere. Slightly larger PR, durable cleanup.
- Footer link to `/ayuda` added to `app/components/PublicLayout.tsx`.
- "¿Necesitás ayuda?" link added to `app/error.tsx` (and the 404 page if one exists; create one if not).
- "¿No encontrás tu link?" link added to the error/expired state of `app/r/[tracking_code]/page.tsx`.
- "¿Necesitás ayuda?" link added to the current Próximamente homepage at `app/page.tsx`.

### Explicitly Out of Scope

- **No contact form.** Adding a form means handling submissions, rate-limiting, spam protection, and validation — none of which serves a v1 page that can already point people to email and Instagram. Defer until volume justifies it.
- **No self-serve link recovery.** A form that looks up a lead by email and re-emails the tracking code is real infra (form + DB lookup + email send + rate limit + edge cases like "lead doesn't exist"). Manual recovery via email/IG covers the same problem with zero new code; revisit if recovery volume becomes painful.
- **No response-time promise.** "Respondemos en 24-48hs" or "horario laboral" creates an expectation the team may not be able to meet under load. Under-promise (silence) and over-deliver (fast manual reply).
- **No "Cómo funciona Hara" explainer.** That belongs on the home page; duplicating it on `/ayuda` invites drift between two copies of the same content.
- **No search / KB / multi-page help center.** Single page is correct for v1 content volume. If the page grows past ~20 entries, revisit then.
- **No new visual patterns.** The page reuses the exact `TermsAndPrivacyPage` design — same shell, same `GlassCard`, same accordion `DisclosureItem`, same anchor pill nav, same typography scale. *Do not invent a new layout or visual treatment.* (Replaces an earlier scope item that said "no accordion" — that was wrong: the canonical pattern in the codebase IS accordion. Bel's directive: match exactly.)
- **No admin tools for editing `/ayuda` content.** Static page; updates ship via PR. Don't build an admin CMS for one page.
- **No mention of "concierge" or `/solicitar` by name.** Per the *concierge-under-promoted-until-billing-model-lands* constraint in `PRODUCT.md` ("How we make money" §2). The lost-link recovery FAQ phrases the trigger passively: "Si recibiste un link de recomendaciones..." — never naming the path the user came through.
- **No new pro-facing flows.** "¿Cómo edito mi perfil?" FAQ entry points to the existing email path (no /pro portal yet); it does *not* introduce new edit infrastructure. That belongs in Phase 3 with the rest of `/pro/*`.

## Technical Context

- **Layout shell:** Copy the structural shell of `app/components/TermsAndPrivacyPage.tsx` — `<PageBackground />` + the `max-w-md md:max-w-[960px]` container, NOT `PublicLayout`. The static-info pages do not use `PublicLayout`; they render their own shell with `PageBackground`. Match this pattern.
- **Reusable components to lift from `TermsAndPrivacyPage`:** `DisclosureItem`, `Chevron`, and the `LegalDisclosure` / `LegalGroup` type shapes. These are currently private to the file. /spec should extract them to a shared module (e.g., `app/components/ui/Disclosure.tsx` + generic type names like `AccordionEntry` / `AccordionGroup`) and update `TermsAndPrivacyPage` to import from there. Avoid duplicating components — keep the codebase DRY.
- **Existing primitives to reuse:** `GlassCard` (`app/components/ui/GlassCard.tsx`), `PageBackground` (`app/components/ui/PageBackground.tsx`). Do not invent new card or background components.
- **Design tokens:** Spanish copy, Argentine informal (`vos`, `escribinos`, `querés`). Use existing tokens (`bg-background`, `text-foreground`, `text-muted`, `rounded-2xl`, etc.) — never hardcode colors or shadows. See `.claude/rules/tailwind-tokens.md`.
- **Component conventions:** Server component, no `'use client'`, no state. ≤300 lines target. Named constants for any animation/timing values (none expected here). See `.claude/rules/component-standards.md`.
- **Footer modification:** `PublicLayout.tsx` currently has just a copyright line in the footer. Adding the `/ayuda` link is a minor extension; keep it minimal (one inline link, not a multi-column nav).
- **Error state on `/r/[tracking_code]`:** The page uses `useRecommendations` hook which surfaces an `error` state. The current error UX may not have a visible message — the spec phase needs to verify the existing error rendering and add the help link there. If no error UI exists yet, that's a small additional task to surface before the spec phase.
- **Próximamente home link:** `app/page.tsx` is a server component with the `WaitlistForm`. Adding a small "¿Necesitás ayuda?" link below or near the privacy line at the bottom keeps it unobtrusive.
- **Instagram link target:** `https://instagram.com/haravital` (confirm the handle is registered before ship; otherwise drop the IG line and keep email-only).
- **Email link:** Use `mailto:centrovitalhara@gmail.com` with no subject pre-fill at v1; can add `?subject=...` later if useful.
- **Accessibility:** Semantic headings (`<h1>` page title, `<h2>` section, `<h3>` question), `<a>` for links (not `<button>` styled as link), `aria-label` only if a link's text isn't self-explanatory. Email/IG icons (if added) should have decorative `alt=""` or proper labels.
- **No new dependencies.** Static page, no client libraries needed.
- **Routing:** Standard Next.js App Router file. No middleware changes.
- **Tests:** Not required for static content at v1, but a smoke test (page renders, all key text appears, contact links have correct `href`) is a nice-to-have. The spec phase decides.

### Draft FAQ content (to refine in /spec)

These are starting drafts — the spec phase should finalize Spanish copy with Bel.

**Para usuarios:**

1. **¿Cómo contacto a un profesional?** — Elegís un profesional desde el directorio o desde tu link de recomendaciones y le escribís por WhatsApp con un toque del botón. Tu info no se comparte hasta que vos escribís.
2. **¿Mi información se comparte sin mi permiso?** — No. Tu nombre, teléfono y email se comparten *solamente* cuando vos abrís la conversación por WhatsApp. Hasta ese momento, nadie ve tus datos.
3. **¿Cómo se eligen los profesionales que aparecen?** — Cada profesional pasa por una revisión antes de aparecer. Los ordenamos por reputación, basada en reseñas reales de personas que efectivamente los contactaron.
4. **Si recibiste un link de recomendaciones y lo perdiste, ¿cómo lo recupero?** — Escribinos por email (`centrovitalhara@gmail.com`) o por Instagram (`@haravital`) con tu nombre y el email o teléfono que usaste, y te lo reenviamos.
5. **¿Cuánto cuesta usar Hara?** — Gratis. Los profesionales pagan por aparecer destacados; los usuarios no pagan nada.
6. **Tuve un problema con un profesional, ¿qué hago?** — Escribinos por email o Instagram con el nombre del profesional y qué pasó. Lo revisamos.

**Para profesionales:**

1. **¿Cómo me registro?** — En `/profesionales/registro`. El formulario tiene 4 pasos; te lleva 5-10 minutos.
2. **¿Cuánto tarda la revisión de mi solicitud?** — Revisamos cada solicitud en 3-5 días hábiles. Si pasó más tiempo, escribinos.
3. **Mi solicitud fue rechazada, ¿qué hago?** — Recibís un email con el motivo y la fecha desde la que podés volver a aplicar (60 días después del rechazo). Si necesitás más contexto, escribinos.
4. **¿Cómo edito mi perfil?** — Por ahora, escribinos por email con los cambios y los aplicamos. Estamos trabajando en un panel propio.
5. **¿Cuánto cuesta estar en Hara?** — El tier *Básico* es gratis. El tier *Destacado* es pago — aparece más arriba y con un distintivo. Escribinos para el detalle de precios.
6. **¿Cómo me llegan los clientes?** — Te contactan directamente por WhatsApp cuando eligen tu perfil. No hay intermediarios.

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Page shape | FAQ + contact section, no form | Smallest pattern that solves both the link-recovery and general-support use cases; rejected contact-form-only (over-builds for v1) and FAQ+form+WhatsApp (overcomplete). |
| Link recovery mechanism | Manual via email / Instagram DM | Zero new infra; matches how Hara support already operates. Self-serve recovery deferred until volume justifies a form + lookup + email pipeline. |
| Contact channels | Email + Instagram DM (NOT WhatsApp) | WhatsApp is reserved for user ↔ professional ("info-sharing moment" in the brand promise). Hara's *support* channel is email + IG. |
| Email + IG handle | `centrovitalhara@gmail.com` + `@haravital` | Gmail is the live `replyTo` in `lib/email.ts` — replies land in a real inbox. The `hola@haravital.app` From-line is a Resend alias, not a destination. |
| Audience split | User section + Professional section | Pros need timing / rejection-cooldown / edit-profile answers that don't belong in user FAQ. A user-only v1 would force pros back to email for trivial questions. |
| Layout | Match `TermsAndPrivacyPage.tsx` exactly — `PageBackground` + container + back link + eyebrow label + anchor pill nav + two `GlassCard` sections with accordion entries inside | Bel's hard constraint: match other static pages exactly, reuse components, no new visual direction. Replaces an earlier draft decision (single-scroll, no accordion) that conflicted with codebase reality. |
| Discoverability surfaces | Footer + `error.tsx` + `/r/[tracking_code]` error state + Próximamente home | All four — catch users at every realistic point of confusion. Each is a small, independent addition. |
| Concierge framing in copy | Don't name concierge or `/solicitar` | Visibility constraint in `PRODUCT.md` §"How we make money" 2: marketplace leads in product surfaces until concierge billing is solved. Lost-link copy uses passive phrasing ("Si recibiste un link de recomendaciones..."). |
| Response-time promise | None at v1 | Avoids over-committing under load; manual handling can be fast in practice without setting an expectation we have to meet. |
| Pro-portal teaser | One-liner "Estamos trabajando en un panel propio" | Sets expectation without committing to a date. Aligned with Phase 3 roadmap timing. |
| Tests | Optional smoke test in /spec | Static content; the value-add of full test coverage is low for v1. /spec decides. |

## Research Findings

Standard tier — 6 web searches across marketplace UX, FAQ pages, contact-page best practices, and LATAM benchmarks.

### Key findings

- **Minimalist FAQ + single contact channel** is the most-cited pattern for small-marketplace help pages (HubSpot, Shopify, htmlburger roundups). 3-7 entries grouped by user intent, one or two ways to reach a human. Hara's v1 sits comfortably in this size.
- **WhatsApp is the dominant LATAM support channel** for B2C marketplaces — but Hara deliberately reserves it for user ↔ professional contact (the privacy-promise moment). Email + Instagram DM is the correct substitute for Hara's support layer; Instagram in particular is a high-trust channel for wellness audiences in Argentina.
- **Categorize by user role at small scale**, not by topic. Each visitor to a small marketplace is in one role (user OR professional); topic-based grouping (Pricing / Privacy / Tech) forces them to re-classify their question every time. The "Para usuarios / Para profesionales" split mirrors how a small admin team actually answers questions internally.
- **Don't build a full help center for v1.** Sub-pages, articles, and search (Mercado Libre `/ayuda` scale) are overkill until support volume becomes a sustained problem. Single-page FAQ is the right default.
- **Under-promise on response time.** Most help-page UX guides recommend showing response-time expectations *only* when they're confidently met. For a 1-person ops team, leaving it implicit is safer than a stated SLA.

### Sources (selected)

- HubSpot — "24 best contact us pages you'll want to copy" — patterns for minimal contact surfaces.
- Shopify — "20 Best FAQ Pages (+ How To Create Your Own)" — structure, grouping, schema markup, anti-patterns.
- saaslandingpage.com — "15 Beautiful Examples of Help Center & Support Pages" — design references for clean, single-page support.
- htmlburger.com — "20 Excellent FAQ Page Examples" — entry length, visual hierarchy.
- Mercado Libre Argentina `/ayuda` — LATAM benchmark for a large-marketplace help center (informs what we are *not* building yet).

### Trade-offs surfaced

- **Single channel vs. multiple channels** — multiple channels (email + IG) give users choice but require maintaining both. Hara picks both because they're already in active use; reducing to one would create friction without saving real work.
- **Static FAQ vs. dynamic content** — a static page is simpler but goes stale when policies or hours change. Acceptable trade-off at v1; rebuild as needed.
- **Audience split vs. single FAQ** — single FAQ is shorter but forces users to skip irrelevant entries. Audience split is slightly longer overall but better targeted; better fit for Hara's two-sided marketplace.

## Open Questions for Implementation

- Is `@haravital` actually registered on Instagram? If the handle is taken by someone else or unregistered, the spec phase should fall back to email-only and surface a separate task for handle setup.
- Should the FAQ content live in a JSON/data file (`lib/ayuda-content.ts`) so it can be extended/reused, or inline in the page as JSX? Default: inline at v1; refactor only if a second consumer appears.
- Is there an existing 404 page in this codebase or just the generic Next.js default? `app/error.tsx` exists; a dedicated `not-found.tsx` may or may not. Check during /spec.
- Should the page be statically rendered (`force-static`) or default rendering? Static is cheaper and correct for content that doesn't change per request; confirm during spec.
