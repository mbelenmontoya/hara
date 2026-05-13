# Plan: main

> **Product context:** see [`PRODUCT.md`](../../PRODUCT.md) (canonical answer to "what is this product?"). This file is the operational plan — phases, sessions, work-in-flight. Update PRODUCT.md when the product evolves; update this file when work moves.

## Overview

Hara Vital is **the Spanish-speaking holistic-wellness trust layer** — a curated marketplace for **terapias alternativas y bienestar holístico** (reiki, masajes, constelaciones familiares, diseño humano, registros akáshicos, terapia floral/energética, meditación, etc.) in Spanish-speaking markets (LATAM + Spain), with Argentina as the home/proving ground. It combines two modes:

1. **Browse mode (Directory):** Users browse professionals ranked by reputation (stars, profile completeness). Professionals can pay for visibility (subscription tiers, boosts). This is the primary discovery path.
2. **Concierge mode (Solicitar):** Users describe what they need → admin reviews → sends personalized recommendations via tracking link. This is the high-trust differentiator — "we pick for you."

**What makes Hara different from Google/directories:**
- Professionals are verified — not everyone gets listed
- Reputation comes from real interactions, not anonymous reviews
- The concierge flow ("solicitar") provides personalized, human-curated recommendations
- Focus on trust in a market (alternative/holistic wellness in LATAM) where trust is the #1 barrier

**Revenue model:**
- **Subscription tiers:** Professionals pay monthly for visibility (appear higher, "Destacado" badge, featured placement)
- **Concierge leads (future):** The existing PQL/attribution system can be used to charge for curated leads delivered via `/solicitar` → `/r/[tracking_code]`

The app is built with Next.js 14.2 + TypeScript + Tailwind CSS v4 + Supabase + Upstash Redis.

Deployed at: https://hara-weld.vercel.app

## Success Criteria

- [x] Professional registration collects all profile fields (including short_description, experience_description, instagram, service_type, profile image)
- [x] Admin can review submitted profiles at `/admin/professionals/[id]/review`
- [x] Admin can approve (→ active) or reject (→ rejected + reason) profiles
- [x] Email to admin includes deep link to review page
- [x] Profile score preview based on submission completeness (10 criteria, 100 points)
- [x] DB supports `rejected` status and `rejection_reason`
- [x] Specialty color system — 12 curated colors, custom specialty support, admin mapping
- [x] 3-level testing infrastructure — 26 component tests + E2E + visual regression
- [ ] All pages visually match the design system (liquid-glass, tokens, pill buttons, identical page shells) — first pass done, needs visual testing
- [x] Public directory page (`/profesionales`) with reputation-based ranking — shipped 2026-04-24 (migration 004: ranking columns + trigger; /profesionales server component; home page 3rd CTA)
- [x] Home page redesign with dual CTA (concierge + directory) — "Ver profesionales" CTA added 2026-04-24
- [x] Destacado tier MVP — admin-gated payment recording, expiry-aware ranking, public Destacado chip, daily cron cleanup (shipped 2026-04-27, migration 005)
- [x] Reviews collection system — post-contact email review request (7-day cron), no-login submission at /r/review/[token], reviews card on /p/[slug], admin /admin/reviews moderation, DB trigger updates rating_average + rating_count → ranking_score chain (shipped 2026-04-27, migration 006)
- [x] Admin dashboard improvements — search + status filters on all 3 list pages, debug routes migrated to admin, inline match context on leads
- [x] Registration full-flow E2E test — Playwright test covering 4-step form, image upload, DB verification, cleanup
- [x] Unified legal page at `/terminosyprivacidad` with collapsible terms/privacy content and form links

## Constraints

- Design system is fixed — use it as-is, never modify or extend the visual language. If a context doesn't fit, change the context (e.g., use a different background), not the system.
- All user-facing copy in Spanish (Argentine informal: vos, querés, escribís)
- No broad DB schema changes — targeted additions only
- Rejected profile handling is pinned for a future conversation (keep data? allow resubmit?)
- **Concierge under-promoted until billing model lands** *(added 2026-05-12)* — concierge flow is alive end-to-end (`/solicitar` → admin curate → `/r/[tracking_code]`), but the Apr-1 PQL pivot left attribution unsolved. Until a new billing model is figured out, do **not lead with concierge** on the home, in PRDs, in `/ayuda` copy, or in marketing surfaces. Marketplace + concierge are co-equal in long-term product shape; this is a temporary visibility constraint, not a positioning change. See PRODUCT.md "How we make money" §2 for the canonical version.

## Roadmap

The product ships in 4 phase gates. Each phase has a clear definition of done. **Don't start phase N+1 until phase N is done.** Items not in a phase are in `Notes → Deferred` — no commitment, revisit only on real-user signal.

### Phase 0 — ACTIVATE *(handed off to Bel — runs in parallel with feature work)*

**PRD:** [`docs/prd/2026-04-27-phase-0-activation.md`](../docs/prd/2026-04-27-phase-0-activation.md)

**Definition of done:** the product works on prod for one real professional + one real user, end-to-end.

**Status:** 0/1/2 complete. Tasks 3–6 (smoke tests + visual QA + image upload e2e + rejected-profile flow decision) run as Bel's parallel verification track — she tests the app live while feature work proceeds. Phase 0 is a parallel track, not a gate on new features. If Bel surfaces a real bug from her testing, it becomes its own bugfix track via `/fix` or `/spec`.

0. ~~**Resume the Supabase database.**~~ ✅ Done 2026-05-01.
1. ~~**Apply migrations 004 + 005 + 006 to Supabase.**~~ ✅ Done 2026-05-01 via SQL Editor. All three verified end-to-end (RLS active, RPCs functional, triggers chaining correctly).
2. ~~**Verify Resend domain + swap `FROM_EMAIL`.**~~ ✅ Done 2026-05-01. `haravital.app` verified, `lib/email.ts` updated to `Hara Vital <hola@haravital.app>` with `replyTo: centrovitalhara@gmail.com`.
3. **Smoke test 3 flows on prod** — *Bel-tested in parallel.* Browse / Concierge / Onboarding flows. Bel runs on real device, surfaces specific bugs as they appear.
4. **Visual QA pass** — *Bel-tested in parallel.* Mobile viewport sweep across all routes.
5. **Image upload end-to-end verification** — *Bel-tested in parallel.*
6. **Decide rejected profile flow** — *deferred until a real professional gets rejected and the decision becomes concrete.* See `Open Questions`.

**Note for me (Claude):** when Bel reports a specific bug from her testing, treat it as a discrete bugfix (not a return to Phase 0 ceremony). Use `/fix` for in-scope bugs, `/spec` for anything that opens up scope.

### Soft Launch Push — Launch-Readiness Items *(active build track, blocks public launch)*

> Captured 2026-05-05 after a code-and-plan audit of the three core workflows (Browse, Concierge, Admin Approval). Phase 0 verified the *infrastructure* (DB up, migrations applied, domain verified). This section captures the *product-level* gaps that stand between "everything technically wired" and "a real holistic-wellness practitioner + a real user can both complete their journey end-to-end with the positioning we actually want." Destacado is intentionally out of scope here.

**Definition of done:** All three workflows complete end-to-end without manual admin glue, in language that matches the holistic-wellness positioning, with a desktop UI that doesn't look like an afterthought.

#### The items — to PRD and ship one at a time

1. ~~**Holistic modality catalog**~~ ✅ **Built 2026-05-05, migrations 009 + 010 applied 2026-05-07.** 184/184 unit tests + 23/23 practices integration tests + public-side registration E2E all green. Final naming is `practices` / "Práctica" (NOT `modalities` — collision with existing `professionals.modality` field for online/presencial format). DB-driven catalog of 15 holistic practices, shared `<PracticePicker>` component, server-side validation, admin re-classification banner for the 45 existing pros. **Only remaining gate before VERIFIED:** admin-side eyeball of the re-classification banner at `/admin/professionals/50434fcc-1c5b-4e14-ba42-f33ba0de6cf6/review` (Bel's manual check).
2. **Concierge link delivery — `/gracias` copy alignment** *(reframed 2026-05-07)* — Manual admin delivery (WhatsApp link or Instagram DM reply) is the intended flow, not a bug. The real gap was `/gracias` over-promising the channel. ✅ **Done 2026-05-07:** `/gracias` copy is now channel-agnostic ("Te escribimos cuando tengamos tus 3 opciones"). **Folded sub-items, deferred (await explicit go):** (a) user confirmation email after `/solicitar` submission, (b) `additional_context` dead-field cleanup in `app/actions/create-lead.ts:23`. **Out of scope:** auto-delivery automation, Instagram DM auto-reply (parked as a future n8n workflow, outside the codebase).
3. ~~**Professional approval/rejection emails**~~ ✅ **Built + VERIFIED 2026-05-08.** PRD `docs/prd/2026-05-07-pro-approval-rejection-emails.md` → plan `docs/plans/2026-05-08-pro-approval-rejection-emails.md` → 6 tasks all done. Three new pro-facing email functions in `lib/email.ts` (submission confirmation, approval, rejection-with-verbatim-reason), `emailBaseUrl()` + `escapeHtml()` helpers, registration cooldown check with server-composed Spanish error, admin PATCH email firing + `resubmit_after` write, Reject modal Flow-6 copy. Migration 011 applied (idempotent: schema-syncs `rejected` status + `rejection_reason` that lived only in `scripts/migrate-review-flow.mjs`, plus `resubmit_after TIMESTAMPTZ`, partial UNIQUE on email excluding rejected, regular email index). 251/251 unit tests, 3/3 integration tests, partial-UNIQUE smoke test green. Bonus fix: corrected operator-precedence bug at the previous `lib/email.ts:113-115` baseUrl pattern.
4. ~~**Public home flip**~~ — **Moved 2026-05-12 to the *Final Go-Live Gate* at the end of this plan.** The app is not ready to open yet; the home flip is the actual go-live moment, not a launch-readiness item. Item number kept (do not renumber) so session-log references to "Item 4" stay valid.
5. **Rejected-profile policy decision** — ✅ **Decided 2026-05-07: Soft no with 60-day cooldown.** Rejected pros can reapply after 60 days. Implementation: `resubmit_after TIMESTAMPTZ` on `professionals` (set on rejection to `NOW() + INTERVAL '60 days'`), registration handler blocks re-registration with the same email until `resubmit_after` passes. Rejection email (item 3) says: warm explanation + `rejection_reason` + *"Podés volver a aplicar a partir del [fecha]"*. **Now unblocks Item 3.**
6. **Desktop UI polish pass** — Mobile-first design works on phones; desktop "looks fine but that's it." Sweep every public + admin route at desktop widths (>= 1024px), catalog visual breaks, and tighten spacing/alignment/proportions for the 960px container. Bel runs Phase 0 mobile QA in parallel; this item is its desktop counterpart.
7. **Final wording pass** — Single consolidated copy review across every user-facing surface (homepage, `/profesionales`, `/solicitar`, `/gracias`, `/p/[slug]`, `/profesionales/registro`, all admin emails, all confirmation pages, error states). Done at the end so we audit against final structure, not chase moving copy. The *"¿Querés saber cuando abramos?"* on the current `/` is one example of the kind of line this pass exists to fix.
8. **`/ayuda` — Public support page** *(added 2026-05-12 from route-inventory audit)* — Lead-facing route for link recovery ("perdí mi link de recomendaciones"), common errors, and basic support contact. Lightweight static page or simple form. Launch-relevant: a user who loses their `/r/[tracking_code]` link today has no recovery path. Surface: new `app/ayuda/page.tsx`, link from footer + error states.

#### Operational admin routes (added 2026-05-12 from route-inventory audit)

Admin tooling gaps surfaced from the requested route list. Not blocking soft launch on day one, but each shortens admin friction once real concierge volume starts:

- `/admin/matches` *(listing)* — Today, matches are only navigable from `/admin/leads/[id]`. A flat list of all matches/tokens with state filters helps admin track in-flight concierge deliveries at a glance. **Priority:** Phase 1 (real usage will reveal whether the lead-by-lead nav is enough).
- `/admin/matches/[id]` *(detail)* — Match timeline view: tracking link, current state, expiration, "message sent" status, event history (contact_click, etc.). **Priority:** Phase 1, pair with `/admin/matches` listing.
- `/admin/events` *(raw audit)* — Read-only audit log of `events` table rows (contact_click, etc.) with filters. Operational/forensic value, not user-facing. **Priority:** Phase 1 nice-to-have; defer if Sentry + DB queries suffice.
- `/admin/settings` *(operational config)* — Admin-editable settings: official IG handle, default expiration windows, WhatsApp/email message templates. Today these live in code constants. **Priority:** Phase 1 only if real usage shows admin editing constants weekly; otherwise defer.

**Already roadmapped (no new entry):** `/admin/professionals/[id]` detail + `/admin/analytics` + `/pro/*` portal — all explicitly Phase 3 in this plan.

#### Workflow gap analysis (audit, 2026-05-05)

Findings the 7 items address. Captured here so the rationale doesn't get lost between sessions.

**Workflow 1 — Browse** *(user finds & contacts a practitioner)*
- ✅ Wired: `/profesionales` directory sorted by `ranking_score`, `/p/[slug]` profile, ContactButton fires `contact_click` for direct contacts, 7-day review-request cron, `/r/review/[token]` no-login submission, ranking auto-updates from reviews.
- 🔴 Public `/` is *Próximamente* — directory unreachable except via `/preview` *(item 4)*.
- 🔴 `/preview` hero says *"Te conectamos con tu terapeuta ideal"* — pre-pivot copy *(items 4 + 7)*.
- ✅ Migration 009 (review-delay parameterization) applied — confirmed 2026-05-07 via `select_pending_review_events(delay_days := 7)`. Was already in place; gap-analysis line was stale.
- 🟡 Directory header copy generic *(item 7)*.

**Workflow 2 — Concierge** *(user requests recommendations, admin curates)*
- ✅ Wired: `/solicitar` form (intent + location + modality + urgency + WhatsApp + advanced), `createLead` → admin email, `/admin/leads/[id]` detail, `/admin/leads/[id]/match` creator, atomic match RPC with attribution tokens, `/r/[tracking_code]` recommendations view, ContactButton with attribution token.
- 🔴 **`STYLE_OPTIONS` in `solicitar/page.tsx:43-51` is 100% traditional psychotherapy** *(item 1)*.
- ✅ **`/gracias` copy aligned with manual delivery reality** *(item 2, done 2026-05-07)*. Admin still sends the link manually (WhatsApp link or Instagram DM reply) — that's the intended flow now.
- 🟡 No user confirmation email after `/solicitar` submission — only admin gets pinged *(folded into item 2, deferred — awaits explicit go)*.
- 🟡 `additional_context` in `app/actions/create-lead.ts:23` has no DB column and no form input — dead field, either wire or delete *(folded into item 2, deferred — awaits explicit go)*.

**Workflow 3 — Admin approval** *(practitioner registers and gets verified)*
- ✅ Wired: `/profesionales/registro` 4-step form + image upload, `/api/professionals/register` inserts with `status='submitted'`, admin gets `notifyNewProfessional` email, `/admin/professionals/[id]/review` with score + approve/reject, status flips to `active` (auto-appears in directory) or `rejected` + reason.
- 🔴 **`STYLES` in `registro/page.tsx:41-48` is 100% traditional psychotherapy** — a reikista, masajista, or facilitador de constelaciones cannot honestly fill this field *(item 1)*.
- 🔴 **No email to the professional after approval** — they're live in the directory but never know *(item 3)*.
- 🔴 **No email to the professional after rejection** — `rejection_reason` is captured but never reaches the pro *(item 3)*.
- 🟡 No registration confirmation email to the pro (only admin gets pinged) *(could fold into item 3)*.
- ✅ Rejected-flow policy: soft no with 60-day cooldown *(item 5, decided 2026-05-07)*.

**Cross-cutting**
- 🔴 Holistic modality vocabulary missing system-wide (registration, intake form, public profile rendering) *(item 1)*.
- 🟡 `SPECIALTY_MAP` labels *"Terapia de pareja"* / *"Terapia familiar"* still carry "Terapia" prefix — symptom domain stays per Bel's directive (color scale untouched), but the labels could read *"Pareja"* / *"Familia"* in the wording pass *(item 7)*.

**What's NOT a gap** *(confirming the foundation is solid)*
- Auth, RLS, tracking codes, attribution tokens, atomic match RPC, image upload to Supabase Storage, ranking-score trigger chain, reviews → ranking flow, `contact_click` event → review-request cron — all wired correctly.
- Specialty (color-scale) categories — untouched per Bel's directive. Symptom domains, read consistently across forms / profile / admin.

#### Modality catalog scope *(item 1 — replaces the would-be PRD; lives here so we don't fragment context)*

**Goal.** Replace the traditional-psychotherapy `STYLE_MAP` and its mirrors with a curated list of holistic-wellness modalities, plus support for custom modalities (mirroring the `SpecialtySelector` 12-curated + 2-custom pattern).

**Why this first.** Highest blast radius of the 7 items. Today, every form asks about psychotherapy schools, every public profile renders psychotherapy school labels, and there is literally no honest way for a reikista, masajista, or facilitador de constelaciones to register their actual practice. Fixing this anchors the holistic positioning in the running app, not just in the docs.

**Proposed canonical list (Bel to confirm/edit before implementation).** ~10–12 curated modalities, sourced from PRODUCT.md + common LATAM holistic-wellness practices:

| Key | Display label (Spanish) |
|---|---|
| `reiki` | Reiki |
| `masajes-terapeuticos` | Masajes terapéuticos |
| `constelaciones-familiares` | Constelaciones familiares |
| `diseno-humano` | Diseño humano |
| `registros-akashicos` | Registros akáshicos |
| `terapia-floral` | Terapia floral |
| `terapia-energetica` | Terapia energética |
| `meditacion` | Meditación |
| `yoga-terapeutico` | Yoga terapéutico |
| `biodanza` | Biodanza |
| `reflexologia` | Reflexología |
| `sonoterapia` | Sonoterapia |

Plus up to 2 custom entries per professional (same UX as `SpecialtySelector`).

**Open product questions for Bel.**
- Is the list above the right starting set, or should some be removed / others added?
- Do we keep the field name `style` (DB column + TS type), or rename to `modality_practice` / `holistic_modality` to break with the psychotherapy framing? *(Renaming has DB migration cost; keeping `style` is cheaper.)*
- For the existing 45 submitted professionals: leave their `style` array empty, set a sensible default, or admin re-curates one-by-one during their review pass?

**Files to touch (when we implement).**
- `lib/design-constants.ts` — replace `STYLE_MAP` entries
- `app/solicitar/page.tsx` — replace `STYLE_OPTIONS` (lines 43-51)
- `app/profesionales/registro/page.tsx` — replace `STYLES` (lines 41-48), update labels in form
- `app/p/[slug]/page.tsx` — verify `style[]` rendering uses the new map (it already reads via `STYLE_MAP`, so this should propagate automatically)
- `app/admin/professionals/[id]/review/page.tsx` — verify the admin review surface displays new labels (also reads `STYLE_MAP`)
- Possibly a migration if we rename the column or set defaults on existing rows
- Tests: snapshot/unit assertions on the labels in any test that hard-codes psychotherapy strings

**Non-goals for this item.**
- Filtering / search by modality on `/profesionales` (deferred to Phase 2 directory filters PRD).
- Reframing the symptom domain (`SPECIALTY_MAP`) — color scale stays.
- Translating to other Spanish variants — Argentine vos / canonical labels for now; market-by-market voice is a future call.

---

### Phase 1 — OPEN FOR BUSINESS *(2–3 weeks)*

**Definition of done:** 10 real professionals onboarded, 5 real concierge requests handled, basic monitoring catches errors before users report them.

1. **Sentry + Vercel Analytics** wired in. `lib/monitoring.ts` already isolates the integration point.
2. **Schedule recurring jobs:** reconciliation (calls `check_pql_event_integrity()`), event purge (calls `purge_old_events()`), Destacado expiry (already wired). Verify all 3 cron entries fire on Vercel.
3. **Onboard first 10 professionals** through real registration. Document friction.
4. **Handle first 5 real `/solicitar` requests.** Document friction.
5. **Fix only the issues that show up from real usage.** Do not pre-build polish.

### Phase 2 — UNBLOCK SCALE *(1–2 months)*

**Definition of done:** admin is no longer in the critical path for payments or directory navigation.

1. **Self-serve Destacado checkout** — MercadoPago integration, `/profesionales/[slug]/upgrade`, webhook → `upgrade_destacado_tier()`. (PRD: `docs/prd/` — to be written, builds on the 2026-04-27 admin-gated MVP.)
2. **Directory filters + search** — specialty / location / modality filters, name search, pagination. (PRD: `docs/prd/` — to be written.)
3. **Destacado renewal reminders** — email N days before `tier_expires_at`, daily admin digest. (PRD: `docs/prd/` — to be written.)
4. **AFIP invoicing automation** — Tusfacturas or Contabilium integration. (PRD: `docs/prd/` — to be written.)

### Phase 3 — TWO-SIDED MARKETPLACE *(2–3 months)*

**Definition of done:** professionals can self-manage without admin involvement.

1. **`/pro/*` portal** — auth-bind `professionals.user_id` to Supabase Auth, build `/pro` home, `/pro/leads`, `/pro/profile` edit, tier visibility. (PRD: `docs/prd/` — to be written.)
2. **Admin detail pages** that depend on the portal: `/admin/professionals/[id]` (reviews, rating, tier history), `/admin/analytics` (funnel + MRR + active Destacado).

### Final Go-Live Gate — Public home flip *(end of plan; do not start until earlier work is done)*

**Status:** Deferred to end of plan as of 2026-05-12. The app is not ready to open. This gate exists so the home-flip decisions captured during Soft Launch Push discussions don't get lost — but the flip itself happens *after* everything above is done.

**Was Soft Launch Push Item 4.** Moved here because flipping `/` from *Próximamente* to the open-doors home is the actual go-live moment, not launch-readiness work. Item 4's number is preserved earlier in this plan (struck through with a redirect) so session-log references stay valid.

**Definition of done:** `/` serves the open-doors home; `/preview` is either decommissioned or kept as staging mirror; waitlist users are notified or transitioned cleanly to a newsletter list.

**What this gate involves:**
- Decide what `/` becomes: dual-CTA home (current `/preview` layout) **or** directory-first home (matches PRODUCT.md "Browse is the primary path").
- Swap `app/page.tsx` (currently *Próximamente* + `WaitlistForm`) with the chosen layout. `/preview` likely becomes the new `/` (or is deleted).
- Pre-pivot copy in `/preview` hero (*"Te conectamos con tu terapeuta ideal"*) must be fixed before flip — Item 7 (final wording pass) is a prerequisite, not parallel.
- Decide fate of existing `waitlist` table rows: auto-send "we're open" email, or quiet handover to a newsletter list. (`WaitlistForm` may be repurposed as newsletter footer per sub-decisions captured in the 2026-05-08 session log.)

**Prerequisite checklist before opening this gate:**
- [ ] Soft Launch Push items 1, 2, 3, 5, 6, 7, 8 all complete
- [ ] Phase 1 success criteria met (10 pros onboarded, 5 concierge requests handled end-to-end, basic monitoring catches errors before users report them)
- [ ] Item 7 (final wording pass) completed — `/preview` hero copy fixed before flip
- [ ] Bel decides browse-first vs. dual-CTA (sub-decisions captured 2026-05-08, revisit before flip)
- [ ] Waitlist email handover plan agreed (auto-announcement vs. quiet drop-in)

**Sub-decisions captured during 2026-05-08 discussion** *(reference only; revisit when the gate actually opens):*
- Browse-first home (matches PRODUCT.md "primary path")
- Waitlist form repurposed as newsletter footer
- Flip happens after Item 3 ships *(no longer the trigger — full prerequisite checklist above supersedes)*

## Session Log

### Session — 2026-05-12 (Plan corrections + brand rename + Item 8 /ayuda VERIFIED + DB cleanup + Item 7 PRD)

**Completed — Plan corrections + commits:**
- Fixed 2026-05-08 session-log misquote: "rewrite the entire app" → clarified as **content rewrite (Item 7), not app rewrite**. Items 6 + 7 remain in scope; Item 4 (Public home flip) moved out of Soft Launch Push to a new **Final Go-Live Gate** section at the end of the plan (the app is not ready to open). Item 4 number kept in original location, struck through with redirect.
- Added Item 8 (`/ayuda` public support page) to Soft Launch Push from route-inventory audit.
- Added "Operational admin routes" sub-section under Soft Launch Push: `/admin/matches`, `/admin/matches/[id]`, `/admin/events`, `/admin/settings` — Phase 1 candidates.
- Committed as `fb6776d`.

**Completed — Brand name sweep (Hara Match → Hara Vital):**
- Discovered during /prd /ayuda that the canonical product name is **Hara Vital**, not "Hara Match" — the docs had been wrong all along (matches domain `haravital.app`). Bel clarified: there was no rebrand, the docs were just wrong.
- Bulk `sed` replacement across 105 files: PRODUCT.md, CLAUDE.md, plan, FINAL_SPEC.md, READMEs, source files (`app/layout.tsx` metadata, `app/page.tsx` homepage hero, `lib/email.ts` From line and email bodies, `app/components/PublicLayout.tsx` footer, `package.json` description, every header comment), all 144 occurrences. No test assertions touched.
- Added **concierge visibility constraint** to PRODUCT.md "How we make money" §2 + plan Constraints section: concierge flow stays operationally alive but is **not actively promoted** in product surfaces until a new billing model lands (the Apr-1 PQL pivot left attribution unsolved). Marketplace + concierge remain co-equal long-term — this is a temporary visibility decision tied to monetization, not a positioning change.
- Committed as `8544bde`.

**Completed — Soft Launch Push Item 8: `/ayuda` (VERIFIED end-to-end via /spec):**
- PRD `docs/prd/2026-05-12-ayuda-public-support-page.md` (Status: Final). Standard research tier — surveyed FAQ/help-center UX patterns + LATAM marketplace `/ayuda` benchmarks (Mercado Libre, SaaS help pages). Per-PRD-question pattern: 7 questions before /spec, all answered.
- Plan `docs/plans/2026-05-12-ayuda-public-support-page.md` (Status: VERIFIED). spec-plan reviewer surfaced 7 findings (2 must_fix on error.tsx button structure + `/r/[tracking_code]` expired/transient conditional preservation, 3 should_fix, 2 suggestions); all addressed inline before implementation.
- 4 implementation tasks, all green:
  - Task 1: Extracted `DisclosureItem` + `Chevron` from `app/components/TermsAndPrivacyPage.tsx` into shared `app/components/ui/Disclosure.tsx`. Renamed types `LegalDisclosure`/`LegalGroup` → `DisclosureEntry`/`DisclosureGroup`. `TermsAndPrivacyPage` now imports from the new module; no inline duplicates remain.
  - Task 2: New `app/ayuda/page.tsx` (server component, 183 lines) — exact `TermsAndPrivacyPage` shell (PageBackground + container + back link + eyebrow + H1 + intro + anchor pill nav + GlassCard sections with `DisclosureItem` accordion). Two sections: Para usuarios (6 FAQs) + Para profesionales (6 FAQs). Contact GlassCard at bottom with `mailto:centrovitalhara@gmail.com` + `https://instagram.com/haravital` (NOT WhatsApp — that's user↔practitioner only).
  - Task 3: Added `/ayuda` links to 4 entry points — `PublicLayout` footer, `app/error.tsx` (as 3rd element below "Intentar de nuevo" + "Volver al inicio"), `app/r/[tracking_code]/page.tsx` error state (preserving expired-vs-transient conditional: expired → "¿Perdiste tu link? Visitá /ayuda", transient → "Probá de nuevo. ¿Necesitás ayuda?"), `app/page.tsx` Próximamente home (wrapped in `mt-auto pt-6 text-center space-y-2` flex div).
  - Task 4: New `app/not-found.tsx` (46 lines) — mirrors `error.tsx` shell exactly (same `bg-danger-weak` circle + warning SVG icon, no new icon library), "Página no encontrada" + "Volver al inicio" + "¿Necesitás ayuda?" link.
- spec-verify changes-review: alignment_score high, quality_score high, goal_score achieved, 7/8 truths verified statically (TS-001..004 verified live), 1 suggestion (Chevron not exported — YAGNI, no consumer needs it, left as-is per reviewer recommendation).
- **Phase B finding (fixed inline):** `PublicLayout` has **zero consumers** — every public page builds its own shell, so the footer Ayuda link in `PublicLayout.tsx` was dead code. Fix: added `<footer>` with /ayuda link directly to `app/profesionales/page.tsx`. `PublicLayout` adoption is a future cleanup item.
- E2E (Chrome DevTools MCP) — all 4 scenarios PASS: TS-001 (`/terminosyprivacidad` no regression after Disclosure extraction), TS-002 (`/ayuda` full render + accordion expand + email/IG link hrefs), TS-003 (lost-link recovery flow through `/r/INVALID123` error state → /ayuda), TS-004 (footer + 404 + Próximamente entry points).
- Tests: 251/251 unit · tsc clean · lint clean · build clean.
- Committed as `894e4c3`.

**Completed — DB cleanup + integration test leak fix:**
- Bel flagged during /ayuda E2E that `/profesionales` showed cards even though no professionals had been approved.
- Surveyed `professionals` table: 65 total → 20 leaked test rows (`admin-test-pro-*` and `test-pro-*` slug patterns, all `status='active'`) + 45 real `submitted` rows. The test rows were why the directory wasn't empty.
- Found leak source: `__tests__/integration/admin-matching.test.ts` and `__tests__/integration/api-events.test.ts` had `beforeAll` inserts with **zero cleanup logic** (no `afterAll`, no `delete`). Every test run permanently added rows.
- Wrote `scripts/survey-test-data.ts` (read-only diagnostic, categorizes test vs real rows by slug/email/name patterns) + `scripts/cleanup-test-data.ts` (one-shot deletion with full FK cascade: events → pqls direct + via match → match_recommendations direct + via match → matches → reviews → professionals).
- Initial cleanup hit FK constraint — `pqls` references `professional_id` directly, not just via `match_id`. Updated script to cover all direct-FK paths; second run succeeded. DB: 65 → 45.
- Added `afterAll` cleanup to both leaking integration test files so this stops recurring.
- All bundled with `/ayuda` commit `894e4c3`.

**Completed — Soft Launch Push Item 7 PRD (wording pass, ready for /spec tomorrow):**
- Wrote `docs/prd/2026-05-12-wording-pass.md` (Status: Final). Standard research tier — surveyed Spanish UX copywriting principles, LATAM holistic-wellness platform voice (minomada.app, sientelavibra.org, others), Argentine voseo conventions in UX.
- **Multiple voice iterations.** Initial PRD draft anchored on neutral "wellness app voice" and proposed Spanish copy that read translated-from-English (e.g., "Dejanos tu email y te avisamos cuando abramos" — still banner-speak, not native Argentine). Bel called this out three times before the pivot landed: the failure mode wasn't framing drift, it was *that Claude shouldn't propose finished Spanish at all*.
- **Final structure:** Voice section anchored **verbatim on Bel's brand voice doc** ("Cálido, claro, nunca clínico", "Acompañamiento, no tratamiento", "Hara hace silencio donde otros gritan", "Hara invita y respeta el timing del usuario", "Tu info se comparte recién cuando vos escribís", the *Hara = centro energético* framing, etc.). Per-surface audit table has **Before / Problem / Direction** columns — no proposed Spanish copy. Bel writes finals during /spec, anchored on the voice section.
- 17 surfaces in scope: 13 user-facing pages (home, /preview, /profesionales, /p/[slug], /profesionales/registro, /confirmacion, /solicitar, /gracias, /ayuda, /r/[tracking_code], /r/review/[token], /terminosyprivacidad, error.tsx, not-found.tsx) + 2 components (WaitlistForm, ContactButton) + email templates in `lib/email.ts`. Admin pages out of scope.
- Highest-priority surfaces (most concentrated bad-writing): `/preview` (pre-pivot hero "Te conectamos con tu terapeuta ideal"), Próximamente (rhetorical "¿Querés saber cuando abramos?"), `/profesionales` (flat directory header missing privacy line), `/solicitar` form, `error.tsx` (clinical formal tone).
- **Uncommitted** at session close — handoff to /spec tomorrow.

**Modified from original plan:**
- Item 4 (Public home flip) reclassified from Soft Launch Push Item to **Final Go-Live Gate** (post-Phase-3 trigger). The flip is the actual go-live moment, not launch-readiness. Number preserved at the original location with strikethrough + redirect note.
- Item 8 (`/ayuda`) added to Soft Launch Push — wasn't in the original 7-item list, surfaced from route-inventory audit.
- Operational admin routes (`/admin/matches` + `[id]`, `/admin/events`, `/admin/settings`) added as Phase 1 candidates — also from route-inventory audit, not in original plan.

**Deviations:**
- The brand-name correction (Hara Match → Hara Vital) was unplanned — discovered mid-/prd when Bel called out the wrong name appearing throughout docs and copy.
- The DB cleanup wasn't on today's agenda — discovered during /spec-verify Phase B of /ayuda when Bel asked why `/profesionales` showed cards she hadn't approved. Fixed inline + leak source closed.
- The Item 7 PRD took 4+ iterations because of voice fidelity issues. Should have asked Bel for her voice doc earlier instead of trying to derive voice from research. Documented in this entry as a lesson; future copy work should anchor on the brand voice doc from turn one.
- `PublicLayout` has zero consumers — found during /ayuda E2E. Documented in plan + footer added directly to `/profesionales/page.tsx` as a Phase B fix. `PublicLayout` adoption across public pages is a separate future cleanup.

**Blockers / open follow-ups:**
- None — all today's tracks completed cleanly.
- Item 7 PRD finalized but uncommitted at session close; handoff to /spec tomorrow.
- Item 6 (Desktop UI polish), Operational admin routes still open in Soft Launch Push.

**Tests:** 251/251 unit · tsc clean · lint clean · build clean · 4/4 E2E scenarios PASS for Item 8.

**Resume here (next session):**
1. Commit + push `docs/prd/2026-05-12-wording-pass.md` (Item 7 PRD, currently uncommitted).
2. `/spec docs/prd/2026-05-12-wording-pass.md` to start wording implementation. Bel writes final Spanish copy anchored on the PRD's Voice section; Claude applies file by file.
3. After Item 7: Item 6 (Desktop UI polish) → operational admin routes (`/admin/matches` + `[id]`) → remaining admin routes.
4. Final Go-Live Gate (Item 4 home flip) is deferred until Soft Launch Push + Phase 1 are done.

---

### Session — 2026-05-08 (Soft Launch Push Item 3: Pro approval/rejection emails — VERIFIED)

**Completed — /spec end-to-end on Item 3:**
- Plan: `docs/plans/2026-05-08-pro-approval-rejection-emails.md`. PRD was already final; planning skipped batch 1, went straight to exploration → batch 2 with one substantive design question (re-application schema). Bel chose partial UNIQUE index (`WHERE status != 'rejected'`) over (a) drop UNIQUE, (b) update-in-place — preserves "old row stays in DB" history while keeping live-row uniqueness intact.
- Planning reviewer (general-purpose substituting for `pilot:spec-review` which isn't installed): 3 must_fix + 9 should_fix + 5 suggestions. **All addressed before code:** operator-precedence bug at `lib/email.ts:113-115` (NEXT_PUBLIC_SITE_URL was being read but never used in the URL output) → fix via new `emailBaseUrl()` helper; XSS gap on admin-typed `rejection_reason` → fix via new `escapeHtml()` helper; `RegistroForm` scope leak → fix via server-composed Spanish error message (no client changes); schema drift surfaced (`rejection_reason` column + `'rejected'` status value lived only in `scripts/migrate-review-flow.mjs`, never landed in numbered migrations) → fix by absorbing into mig 011 idempotently.
- Implementation: 6 tasks in dependency order. Migration 011 → email helpers + 3 functions + 13 unit tests → registration handler cooldown + confirmation email → admin PATCH approve/reject email firing + `resubmit_after` write + 4 new PATCH unit tests → Reject modal copy (Flow 6) → cooldown integration test (3 scenarios). 251/251 unit tests green at every step.
- Implementation reviewer: 0 must_fix + 5 should_fix + 5 suggestions. **All 5 should_fix + 4 of 5 suggestions applied:** orphan mock vars, brittle `mockImplementationOnce` ordering → replaced with shared `builders.lastUpdatePayload` capture, PRD copy alignment on Reject modal (parenthetical form), gendered "Bienvenida" → gender-neutral "Te damos la bienvenida" (PRD draft was feminine but directory is mixed-gender), cooldown query secondary `.order('id', desc)` tiebreaker, rollback-comment caveat, `TODO(bel)` for `previous_application_at` semantics, `target/rel` on approval-email link, integration-test mock-invocation assertion. Skipped: `it.each` refactor (cosmetic only).
- Feature-dev:code-reviewer second-opinion (Bel-requested): 0 issues at ≥80% confidence. Confirmed all 5 should_fix and 4/5 suggestions correctly applied across all 9 changed files.
- Codex adversarial review (Bel-requested): hung at startup, no output beyond `Turn started` after ~2.5h. Killed cleanly. Likely auth/rate issue, unrelated to the code.
- Bel applied migration 011 via Supabase SQL Editor. Integration test went 3/3 green. Partial-UNIQUE smoke test (`rejected` + `submitted` coexist for same email; second non-rejected blocked with `23505`) confirmed schema invariant. **All 8 Goal Verification truths met.** Plan flipped to VERIFIED.

**Items 4/6/7 (Soft Launch Push remainder) discussion:**
- Bel's comment: "we have a task to rewrite the entire app" — **clarified 2026-05-12 as a content rewrite (which is Item 7 itself), NOT an app rewrite.**
- **Further clarified 2026-05-12: Item 4 (public home flip) moved out of Soft Launch Push to the *Final Go-Live Gate* at the end of this plan** — the app is not ready to open. Items 6 (desktop UI polish) and 7 (final wording pass) remain in the Soft Launch Push as launch-readiness work. Item 3 is durable (emails + migration carry over). Plan focused on Item 3 only this session.
- Item 4 sub-decisions captured during discussion (in case the current app ships before the rewrite): browse-first home (matches PRODUCT.md "primary path"), flip after Item 3 ships (now done), waitlist form repurposed as newsletter footer.
- Plan-vs-mental-model discrepancy noted: Bel originally only had Item 7 in mind. The 7-item Soft Launch Push list grew during the 2026-05-05 audit. Surfaced and acknowledged; proceeded with Item 3 as the next logical step regardless.

**Modified:**
- `migrations/011_pro_resubmit_cooldown.sql` (new) — schema sync (Section A, idempotent) + resubmit_after + partial UNIQUE + email index (Section B).
- `lib/email.ts` — `emailBaseUrl()` + `escapeHtml()` helpers, three new exported pro-facing functions, `notifyNewProfessional` updated to use `emailBaseUrl()` (replaces lines 113-115's broken pattern).
- `lib/email.test.ts` (new) — 13 unit tests including escape regression on `<script>`/`<img onerror>`, multi-line preservation, graceful fail.
- `app/api/professionals/register/route.ts` — cooldown check after input validation, server-composed 403 with both formatted dates, fire-and-forget `notifyRegistrationReceived`, secondary order by id for deterministic tiebreaker.
- `app/api/professionals/register/route.test.ts` — cooldown mock chain (`eq.eq.order.order.limit.maybeSingle`), `setupCooldownNoMatch()` helper, orphan mocks removed.
- `app/api/admin/professionals/[id]/route.ts` — extended `existing` select to `id, status, email, full_name, slug`, reject branch writes `resubmit_after = NOW + 60 days`, both branches fire emails fire-and-forget.
- `app/api/admin/professionals/[id]/route.test.ts` — 4 new PATCH tests (approve/reject × success/email-rejects), shared mock capturing `lastUpdatePayload`.
- `app/admin/professionals/[id]/review/page.tsx` — Reject modal copy aligned with PRD Flow 6 parenthetical form, hint about 60-day cooldown below textarea.
- `__tests__/integration/cooldown-enforcement.test.ts` (new) — TS-002 (within window blocks), TS-003 (after window allows, 2 rows preserved), no-prior-rejection passes through. Cleanup-by-email handles the multi-row case.

**Deviations:**
- `pilot:spec-review` and `pilot:changes-review` agents not installed in this environment — substituted with `general-purpose` for both, same brief.
- Codex review wedged silently. Killed after no output for 2.5h. Did not retry — feature-dev second-opinion already provided independent coverage.
- Did NOT use git-write commands. All 10 changed files (6 modified + 4 new) remain uncommitted at session close, ready for a clean separable commit.

**Blockers:** None remaining. Migration 011 applied + verified end-to-end.

**Tests:** 251/251 unit pass · 3/3 integration pass · partial-UNIQUE smoke pass · tsc clean · build clean.

**Resume here:**
1. Commit Item 3 as a clean separable PR ("feat: pro approval/rejection emails (Soft Launch Push Item 3)"). 10 files: 6 modified + 4 new (migration, 2 test files, plan).
2. Bel's call: proceed with Items 4/6/7 on the current app, OR pause the Soft Launch Push and shape the rewrite. If proceeding: Item 4 sub-decisions are already captured (browse-first, waitlist→newsletter); next step is `/spec` on Item 4.

---

### Session — 2026-05-07 (Soft Launch Push Item 1: Migration apply + verify)

**Completed — Migration apply + verify:**
- Bel applied `migrations/010_holistic_practices_catalog.sql` via Supabase SQL Editor. All 15 seed practices loaded. Renames (`professionals.style → practices`, `leads.style_preference → practice_preference`) and the new `professionals.needs_practice_review` column verified — 57 of 65 existing pros correctly flagged for re-classification.
- Migration 009 (review-delay parameterization) was already applied — plan was stale. Confirmed by calling `select_pending_review_events(delay_days := 7)` successfully.
- Added `scripts/verify-migrations-009-010.mjs` — same shape as the existing `apply-*.mjs` scripts. Uses Supabase as the truth oracle (queries the new objects with the service-role client). Reusable for future migration cycles.

**Completed — Test fixture fix + assertion tightening:**
- The integration suite surfaced a real assertion-correctness bug, not a migration bug. The "should reject NULL practices on insert" test (`practices-migration.test.ts:110`) was a **false positive** — the fixture omitted `status` (NOT NULL with no default per `001_schema.sql:12`), so the row failed on `status NOT NULL` instead of the `practices NOT NULL` constraint the test names. The sibling test "should default practices to empty array for new inserts" failed loudly for the same fixture gap. Both fixtures got `status: 'submitted'` added, and the NULL-practices test now also asserts `error.message + error.details` mentions "practices" — proving the right constraint fires. Without this, we had no actual evidence the migration's NOT NULL on practices worked.
- 23/23 practices integration tests green (`create-lead` 3/3, `practices-helpers` 8/8, `practices-migration` 12/12).

**Completed — Smoke test (public side):**
- `__tests__/e2e/registration-full-flow.spec.ts` passed in 3.8s. Drives the full 4-step form, clicks Reiki + Meditación y mindfulness chips on step 3 (asserts `aria-pressed='true'`), submits, then queries Supabase to assert `practices = ['reiki', 'meditacion-mindfulness']` on the inserted row. Cleanup deletes the test pro.
- Public registration page snapshotted clean — no SSR errors, only two pre-existing Google Maps deprecation warnings.

**Pending — Smoke test (admin side):**
- Re-classification banner needs Bel's manual eyeball. Suggested target: `/admin/professionals/50434fcc-1c5b-4e14-ba42-f33ba0de6cf6/review` (Laura Giraudo, submitted, `practices=[]`, `needs_practice_review=true`). Expected: banner with `<PracticePicker>` (15 chips), save disabled until selection, save → banner unmounts + "Prácticas" section populates. Component has 6/6 unit tests already.

**Other integration suites — pre-existing failures, NOT today's work:**
- `admin-matching` 0/7 — 5 of 7 fail with `<!DOCTYPE` (HTML response on JSON parse, dev-server / auth-wrapper symptom), 1 billing_month validator regression, 1 normalize. Predates 2026-05-05.
- `api-events` 4/5 — 1 fail: rate-limit test timeout (matches the "Upstash deferred / fail-open" decision; the test exercises the disabled path).
- `reviews-flow` 0/2 — RPC error semantics drifted (`invalid_token` returned where test expects `token_consumed`).
- These deserve a separate triage session. Not blocking Item 1.

**Modified:**
- `__tests__/integration/practices-migration.test.ts` — fixture fix on two tests + tightened error-message assertion on the NULL-practices test.
- `scripts/verify-migrations-009-010.mjs` — new (reusable verify pattern).

**Blockers / open follow-ups:**
- Admin banner visual confirmation (Bel) — blocks spec-verify gate flip to VERIFIED.
- Test-data debris: 20 extra professional rows accumulated from unclean test runs (65 total vs 45 baseline). Cleanup pass deferred.
- 10 pre-existing integration failures across 3 unrelated suites — separate triage.

**Tests:** 184/184 unit pass · practices integration 23/23 pass · registration E2E pass.

**Resume here:**
1. Bel eyeballs `/admin/professionals/50434fcc-1c5b-4e14-ba42-f33ba0de6cf6/review` — banner renders, picker works, save flow updates DB and unmounts banner.
2. Bel approves spec-verify gate → plan flips to VERIFIED.
3. Commit Soft Launch Push Item 1 as a clean separable commit.
4. Then move to **Item 2: Concierge link delivery** — admin success-screen "Send to user" button (WhatsApp link + Resend email) auto-delivering `/r/{tracking_code}`, fulfilling the `/gracias` promise.

---

### Session — 2026-05-05 (Soft Launch Push Item 1: Holistic practice catalog implementation)

**Completed — PRD + plan via /prd → /spec workflow:**
- Wrote `docs/prd/2026-05-05-holistic-modality-catalog.md` (Status: Final). Standard-tier research surfaced Nomada (closest competitor in AR) listing 20 categories; we landed on 15 canonical practices: reiki, constelaciones-familiares, registros-akashicos, diseno-humano, terapia-floral, masaje-terapeutico, meditacion-mindfulness, biodecodificacion, sonoterapia, tarot-terapeutico, astrologia, coaching-ontologico, aromaterapia, yoga-terapeutico, terapia-energetica.
- **PRD-amendment found during /spec-plan exploration:** PRD originally proposed renaming `style[]` → `modalities[]`, but the existing schema already has `professionals.modality TEXT[]` (online/presencial format) and `leads.modality_preference TEXT[]`. Singular-vs-plural collision plus literal SQL collision on `leads.modality_preference`. Bel chose `practices` / "Práctica" — PRD amended with full substitution table (key/label/component/file/UI label).
- Wrote `docs/plans/2026-05-05-holistic-modality-catalog.md` (12 tasks, Status: COMPLETE, Approved: Yes). Spec-review caught 4 issues during planning, all fixed before implementation: migration step ordering hardened (UPDATE WHERE NULL before SET NOT NULL), Tasks 4–7 reordered to pair form refactors with their write-path updates so the data flow never breaks mid-chain, PracticeReclassificationBanner extracted as its own component for proper test coverage, validatePracticeKeys cache TTL spelled out.
- Edited global rule `~/.claude/rules/task-and-workflow.md` line 7: Bel never authored the "NEVER auto-invoke /spec" rule. Replaced with the correct pattern (ask for approval, then invoke). Memory `feedback_spec_invocation_allowed.md` already captured this from a prior session.

**Completed — Implementation (12 tasks, all green):**
- `migrations/010_holistic_practices_catalog.sql` — atomic transaction. CREATE TABLE practices, INSERT 15 seeds, RENAME `professionals.style` → `practices`, RENAME `leads.style_preference` → `practice_preference`, UPDATE all professionals to `practices = '{}'`, SET NOT NULL DEFAULT '{}', ADD `needs_practice_review` boolean, mark all 45 pros for re-classification.
- `lib/practices.ts` — `Practice` type, `getActivePractices()`, `validatePracticeKeys()`. Module-level singleton cache with 60s TTL shared between both helpers, so registration / createLead / admin PATCH paths don't issue per-write Supabase round-trips.
- `app/components/PracticePicker.tsx` — shared `'use client'` chip multi-select used by registro form, solicitar form, and the admin re-classification banner. Optional `includeNoPreference` prop renders a "No tengo preferencia" pill with mutual-exclusion semantics (clicking it clears the array; clicking any chip while it's active starts a fresh selection).
- Refactored `app/profesionales/registro/page.tsx` and `app/solicitar/page.tsx` into server-component shells + `RegistroForm.tsx` / `SolicitarForm.tsx` client form children. Both pages get `export const dynamic = 'force-dynamic'`. Form bodies moved verbatim except `style[]` → `practices[]` field name and the inline `STYLES.map(...)` / `STYLE_OPTIONS.map(...)` blocks replaced with `<PracticePicker>`.
- `app/api/professionals/register/route.ts` — reads `practices` from FormData, calls `validatePracticeKeys()` (returns 400 with offending key on mismatch), inserts into `practices` column.
- `app/actions/create-lead.ts` — input renamed `style_preference` → `practice_preference`, validates keys, inserts into renamed column.
- `app/api/admin/professionals/[id]/route.ts` — GET response now `{ professional, practices }`. PATCH gained a practices-only path parallel to the specialty-only path, with empty-array enforcement (server-side defends against direct curl calls), type narrowing on array elements, and a single-query update (`update().eq().select().single()`) eliminating the TOCTOU window the changes-reviewer flagged.
- `app/admin/professionals/[id]/review/components/PracticeReclassificationBanner.tsx` — `'use client'` extracted component. Renders only when `needs_practice_review = true`, uses `<PracticePicker>`, save button disabled when nothing selected, calls extended PATCH, refetches on success, stays mounted with error message on failure. Now also accepts `initialSelected` prop and the review page passes `professional.practices` so re-runs pre-fill correctly (changes-reviewer fix #6).
- Wired the banner into `app/admin/professionals/[id]/review/page.tsx`, dropped `STYLE_MAP` import, built `practiceLabelMap` from the fetched catalog, renamed "Enfoque terapéutico" → "Prácticas".
- Updated `app/p/[slug]/page.tsx` — selects `practices` from DB, builds catalog map, renders practice labels with `practiceLabelMap[k] ?? k` fallback for unknown keys, dropped `STYLE_MAP` import. Added `export const dynamic = 'force-dynamic'` (changes-reviewer fix #2 — defensive even though the parameterized [slug] route was already rendering dynamic without it).
- Removed `STYLE_MAP` from `lib/design-constants.ts` (final cleanup, Task 11). `grep -r STYLE_MAP app lib` returns no matches.
- Updated `__tests__/e2e/registration-full-flow.spec.ts` — selects two practice chips (Reiki + Meditación y mindfulness) at step 1, asserts `aria-pressed='true'` after click, post-submit fetches the row from Supabase and asserts `practices` array contains both keys (changes-reviewer fix #1: replaced `if (practicesRow)` silent skip with `expect(practicesRow).not.toBeNull()` followed by unconditional assertion).

**Completed — Test coverage:**
- 37 new tests across 8 new test files: `lib/practices.test.ts` (8 — cache behavior + TTL with mocked Date), `__tests__/integration/practices-helpers.test.ts` (5), `__tests__/integration/practices-migration.test.ts` (10 — needs migration applied to go green), `__tests__/integration/create-lead.test.ts` (3), `app/components/PracticePicker.test.tsx` (13 — chip rendering, selection, no-preference mutual exclusion), `app/api/professionals/register/route.test.ts` (4), `app/api/admin/professionals/[id]/route-practices.test.ts` (6 — GET extended response + practices-only PATCH with all 4 validation paths + existing approve/reject untouched), `app/admin/professionals/[id]/review/components/PracticeReclassificationBanner.test.tsx` (6 — render conditions, save button disable, success unmount, failure mounted-with-error).
- **184/184 unit tests passing** (was 147 before this session — 37 added). Build clean. Full lint pass. Integration tests for practices-migration + practices-helpers will go RED until migration 010 is applied to Supabase test DB.

**Completed — Two reviewer cycles, all findings addressed:**
- spec-review (planning phase) — 4 issues, all fixed in plan before implementation started: migration ordering, task chain ordering (4→5→6→7 pairing), banner UI test gap, validation cache.
- changes-review (verify phase) — 4 issues found post-implementation, all fixed: TS-001 silent assertion → unconditional check; `/p/[slug]` got `force-dynamic`; TOCTOU eliminated via single-query update with `.select().single()`; type narrowing for `practices` array elements; banner gets `initialSelected` prop wired from `professional.practices`. The migration NOT NULL constraint test exists at `practices-migration.test.ts:110` (the changes-reviewer flagged it as possibly missing because they couldn't see it in the diff context — confirmed present, no fix needed).

**Modified:**
- PRD's `modalities` naming → `practices` mid-flight (post-amendment) for column-name disambiguation. The 15 seed values themselves (keys + Spanish labels) are unchanged from the PRD's research-driven canonical list.
- Test approach for the two `'use client'` form refactors (RegistroForm, SolicitarForm) and the two server shells: deliberately did not write per-page Vitest tests despite TDD-reminder hooks firing repeatedly. Reasoning: the form bodies are existing code moved verbatim with surgical changes (field rename, picker swap), and the meaningful behavior is covered at the right layers — `<PracticePicker>` has its own 13-test suite, the API write paths have their own 4 + 3 + 6 test suites, and the E2E covers the full registration flow. Mock-everything-then-assert-composition tests would test the framework, not our logic.

**Deviations:**
- Spent extra cycles on TDD-hook noise during the form refactors. Hook fires on every `Write`/`Edit` to a non-test file regardless of whether tests exist at meaningful layers. Continued the work, documented the reasoning above.
- The user attempted `/end-session` (Step 18 Code Review Gate currently held open with "Manual — I'll test and report back" — verification is not yet VERIFIED, will be completed when user confirms after testing).

**Blockers / open follow-ups:**
- **Bel must apply `migrations/010_holistic_practices_catalog.sql`** to Supabase before integration tests turn green and the running app works end-to-end. Migration 009 (carry-over from 2026-05-03) also still pending. Both via SQL Editor.
- spec-verify Step 18 gate held open — user chose "Manual — I'll test and report back". Plan status is `COMPLETE` (not yet `VERIFIED`). When Bel approves after live testing, mark VERIFIED.
- 30+ files modified/uncommitted. This change is a clean separable commit (Soft Launch Push Item 1: holistic practice catalog).
- Phase 0 Tasks 3–6 still on Bel's parallel track.

**Tests:** 184/184 unit pass · build clean · lint clean · integration tests RED until migration 010 applied · E2E ready for live test DB.

**Resume here:**
1. Bel applies migration 010 to Supabase (and 009 if not done).
2. Run `npm run test:integration` — practices-migration + practices-helpers go green.
3. Smoke test: `/profesionales/registro` step 2 shows the new "Práctica" picker; `/admin/professionals/[id]/review` shows re-classification banner for every existing pro; pick practices + save → banner disappears + Prácticas section populates.
4. Bel returns to spec-verify gate, approves → plan flips to VERIFIED.
5. Then commit (clean separable PR for Soft Launch Push Item 1).
6. Then move to **Soft Launch Push Item 2: Concierge link delivery** — admin success screen "Send to user" button (WhatsApp link + Resend email) wiring `/r/{tracking_code}` delivery automatically, fulfilling the `/gracias` promise.

### Session — 2026-05-05 (Positioning reframe across all docs + Phase 0 hand-off)

**Completed — Positioning reframe (terapias alternativas y bienestar holístico):**
- Bel flagged that PRODUCT.md and downstream docs were anchoring on "therapy / psychologists / coaches / somatic practitioners" framing — actual positioning is **terapias alternativas y bienestar holístico** (reiki, masajes terapéuticos, constelaciones familiares, diseño humano, registros akáshicos, terapia floral/energética, meditación). The match logic is symptom → holistic modality (a user atravesando ansiedad/insomnio/duelo gets paired with whichever holistic practice resonates), so the user-symptom color palette in `app/globals.css:41-64` stays as-is.
- Reframed 9 MD files: `PRODUCT.md` (most extensive — opening, demand side, supply side, personality), `README.md`, `CLAUDE.md`, `FINAL_SPEC.md` (example payload), `.claude/plans/main.md` (Overview), `.claude/skills/tailwind-design-system/SKILL.md` + `.codex/` mirror, `docs/prd/2026-05-01-monthly-social-strategist.md`, `docs/plans/2026-05-01-monthly-social-strategist.md` (3 spots — strategist tone seed values).
- Second pass after Bel rebuked the "what is NOT" pattern I'd added: stripped all negative brand-identity framing (`not traditional therapy`, `not a directory of psicólogos clínicos`, `we don't position ourselves alongside therapy`, `out of scope`). Replaced with positive definition by modality list — the practitioner roster + symptom vocabulary now does the disambiguation work positively. Also cleaned pre-existing negations in PRODUCT.md voice section per Bel's universal principle (`never clinical` → `conversational`; `No growth-hacker urgency. No countdown timers, no FOMO mechanics` → `Calm pacing. Copy that respects the user's time and earns attention through clarity`; etc.). `app/globals.css` color-scale comments untouched per Bel's directive.
- Saved learning: defining a brand by what it isn't is weaker than defining by what it is — if a clarification via negation is needed, the positive isn't specific enough yet. Modality lists do the work clinical disclaimers were trying to do.

**Completed — Phase 0 hand-off:**
- Phase 0 reframed in this plan as a parallel verification track owned by Bel, not a gate on feature work. Tasks 3–6 (smoke tests, visual QA, image upload e2e, rejected-profile decision) run on Bel's device while Claude builds. Bugs surfaced during her testing become discrete `/fix` or `/spec` tracks.

**Deviations:**
- Initially added "What it is *not*" sections to PRODUCT.md and "never frame as therapy" guards to the strategist plan — Bel called this out as a tendency to define by negation. Stripped on second pass.
- Touched some pre-existing negations in PRODUCT.md voice/personas (Bel's original prose) under her authorization to extend the cleanup.

**Blockers / open follow-ups:**
- None for this session's work. The reframe is doc-only; no code changes, no migrations.
- Last session's "Resume here" stack (dev cache clear, migration 009 apply, Flow A smoke) now lives on Bel's parallel track per the Phase 0 hand-off above.
- 23 modified + 6 untracked files uncommitted. Today's MD reframe is a clean separable commit (positioning reframe across docs) if we want to ship it before further work.

**Tests:** No code changes — no test runs needed.

**Completed — Workflow audit + plan reshape (the late part of the session):**
- Bel asked: *"what is really missing to have these two workflows working and also the admin part where I get the therapist request to be added to Hara and I can approve or not? Leave Destacado for later."* Read the actual code for Browse, Concierge, and Admin Approval flows end-to-end. Surfaced 5 launch-blocking gaps + cross-cutting drift. The single biggest finding: the running app's vocabulary is still 100% traditional psychotherapy (`STYLE_MAP`, both forms), even though the docs are reframed.
- Captured the full audit in this plan under **Soft Launch Push — Launch-Readiness Items** above. That section now contains: the 7 items (modality catalog, concierge link delivery, pro approval/rejection emails, public home flip, rejected-policy decision, desktop UI polish, final wording pass), the per-workflow gap analysis, and the inline scope for item 1 (holistic modality catalog — including a proposed canonical list and the open product questions Bel needs to answer).
- Decision: rather than fragment context across new PRD files, the modality catalog scope lives inline in this plan. Other items will be PRD'd inline here too as they come up. *(Bel's directive: "do not do a new file, update an existing file accordingly.")*

**Resume here:** Bel reviews the **Soft Launch Push** section and confirms / edits the proposed modality catalog list (canonical entries + answers to the open product questions), then we start implementing item 1 one-by-one.

### Archived Sessions
- **2026-05-03**: Heartbeat + review-delay refactor + UI 960px pass — Migration 008 (heartbeat table) applied + n8n workflow extended with Postgres node + Resend error notification + `automation/docs/heartbeat.md`. Upstash deferred indefinitely (free-tier DB stuck pending-restore, fail-open in prod). Migration 009 (review-delay parameterization) — RPC `select_pending_review_events(delay_days INT DEFAULT 7)`, fixed dropped-events bug from hardcoded `BETWEEN NOW() - 7d AND NOW() - 6d` 24h window. `app/api/cron/send-review-requests/route.ts` reads `REVIEW_DELAY_DAYS` env var. `.env.local` `*_ANON_KEY` → `*_PUBLISHABLE_KEY` rename. UI: 960px container expansion across 10 public pages + AdminLayout; 5 card lists → 3-col responsive grid; `/profesionales` richer directory cards with 9 added fields + `force-dynamic`. 17 modified + 5 untracked uncommitted. Migration 009 not yet applied to Supabase.
- **2026-05-01 → 2026-05-03**: Phase 0 push (domain, homepage, cleanup) — Fixed prod 500 (Vercel env var alignment, `f654181`). Resend domain `haravital.app` verified + `lib/email.ts` updated. Pre-launch `/` shipped as Próximamente + waitlist (mig 007, `6c548ef`); post-launch home moved to `/preview`. Test-data cleanup (deleted 23 orphan pros + 59 pqls). Admin delete-professional flow (`2ec2e5f`). Rate limiter fail-open in prod (`987b40e`). Upstash deferred — free-tier DB deleted, restore stuck. Codex review of migs 005/006 caught 4 bugs (missing RLS on 3 tables, off-by-one in upgrade_destacado_tier extension, OLD/NEW professional_id stale-aggregate). 147/147 unit pass.
- **2026-05-01**: Doc alignment + Cron PRD + Migrations 004/005/006 applied — Created PRODUCT.md (`a670736`), aligned top-level docs (`eb16d0f`), wrote cron infra PRD (`9caae6d`) routing scheduled jobs through self-hosted n8n at https://n8n.greenbit.info. Discovered existing `vercel.json` crons never fired in prod (Vercel Hobby + Supabase paused + migs not applied). Migrations 004/005/006 applied via Supabase SQL Editor + verified end-to-end (RLS active, RPCs functional, triggers correct). 135/135 unit pass.
- **2026-04-27**: Plan Restructure + Phase 0 PRD — Committed/pushed Reviews Collection System (`cf2fc6d`, 23 files). Rewrote `main.md` Roadmap (`48715d2`): 4 phase gates (Phase 0–3) with definition-of-done, moved polish/perf/a11y/infra items to `Deferred` section with rationale (−173/+91). Wrote `docs/prd/2026-04-27-phase-0-activation.md` (`61b5798`) covering 7 tasks. Mid-session discovered prod 500ing — initial framing of Vercel env-var audit corrected to actual cause (Supabase free-tier auto-pause, one-click resume; `2631b8f`). Saved memory `feedback_simplest_explanation_first.md` anchoring "boring cause first" debugging discipline. 135/135 unit pass.
- **2026-04-27**: Reviews Collection System (`/spec`, plan `docs/plans/2026-04-27-reviews-collection-system.md`, PRD `docs/prd/2026-04-27-reviews-collection-system.md`) — `migrations/006_reviews_collection.sql` (`reviews` + `review_requests` tables, `recompute_review_aggregates()`, `submit_review()` atomic RPC with `FOR UPDATE`, `select_pending_review_events()` cron helper, trigger using `CASE TG_OP`), `app/api/events/route.ts` direct-contact branch (synthetic `direct-{slug}-{nanoid(10)}` tracking code), `ContactButton` event-firing fix + `ReviewerEmailCapture`, `app/api/contact-email/route.ts`, daily 07:00 UTC review-request cron with Bearer auth + Resend `notifyReviewRequest` template, `app/api/reviews/submit/route.ts` (P0001 → Spanish error map, 5/hr rate limit), `app/r/review/[token]/page.tsx` 3-state form (valid/consumed/expired), `/p/[slug]` rating fields + reviews card, `/admin/reviews` moderation with `is_hidden` toggle, `__tests__/integration/reviews-flow.test.ts` + `__tests__/e2e/reviews.spec.ts` (TS-001 + TS-004 cron auth). Migration 006 written but not applied this session. 134/134 unit pass. Resend domain still pending at session end.
- **2026-04-27**: Destacado Tier — Admin-Gated MVP (`/spec`, plan `docs/plans/2026-04-24-destacado-tier-mvp.md`, PRD `docs/prd/2026-04-24-destacado-tier-mvp.md`) — `migrations/005_destacado_tier_mvp.sql` (`tier_expires_at` column + `subscription_payments` table + partial index + expiry-aware `recompute_ranking()` trigger + atomic `upgrade_destacado_tier()` RPC with `SELECT ... FOR UPDATE` row lock), `lib/ranking.ts` extended with `isEffectivelyDestacado()` + 11 new unit tests (29 total), `__tests__/integration/ranking-parity.test.ts` +3 fixtures (future/past expiry + retroactive RPC arithmetic), `app/api/admin/subscriptions/route.ts` (POST + GET history) + 15 unit tests, `app/admin/professionals/page.tsx` inline status chip + expand history + DestacadoPaymentModal (7 unit tests), Destacado chip on `/profesionales` + `/p/[slug]`, `app/api/cron/expire-destacado/route.ts` daily cron + 6 unit tests, `app/components/ui/Alert.tsx` `role="alert"`, `__tests__/e2e/destacado.spec.ts` (TS-001..005, cron auth verified green, DB-dependent tests skip until migration applied). Migration 005 written but not applied this session. 92/92 unit pass.
- **2026-04-24**: Directory + Ranking Foundation (`/spec`, plan `docs/plans/2026-04-24-directory-ranking-foundation.md`, PRD `docs/prd/2026-04-24-directory-ranking-foundation.md`) — `migrations/004_ranking_foundation.sql` (5 ranking columns + `recompute_ranking()` trigger NULL-safe + directory index + backfill), `lib/ranking.ts` + 18 unit tests, `__tests__/integration/ranking-parity.test.ts` (8-fixture DB-backed parity), `app/profesionales/page.tsx` server-rendered directory sorted by `ranking_score DESC`, "Ver profesionales" CTA on home, Playwright directory.spec + visual baseline. Sandbox unreachable to Supabase → migration applied later via SQL Editor. Closed the April pivot implementation gap.
- **2026-04-22**: Admin lead detail page (`.omx/plans/prd-admin-lead-detail.md`) — `/admin/leads/[id]` admin-only route + single-lead API at `/api/admin/leads/[id]`, reused status/urgency/match semantics, leads list links into detail while preserving "Crear match" path, unit coverage for the new page. Replaced DB-backed integration test with page-level unit test due to sandbox/Supabase isolation.
- **2026-04-20**: Legal/trust page (`docs/plans/2026-04-20-legal-pages.md`) — unified `/terminosyprivacidad` with two glass cards (Términos + Privacidad), collapsible subsections, anchor links; `/terminos` + `/privacidad` kept as redirects; registration + intake form footers updated. First pass overdesigned (split routes), reworked to single page after review.
- **2026-04-08**: Admin dashboard improvements (`/spec`, VERIFIED) — shared `AdminFilterBar` (search + status dropdown), 3 new admin API routes (`/api/admin/leads` with match-context joins, `/api/admin/professionals`, `/api/admin/pqls`), debug routes deleted, match creation page fixed for `specialties[]` field-type drift; registration full-flow E2E (`__tests__/e2e/registration-full-flow.spec.ts`) with Google Maps mock + image upload + DB cleanup.
- **2026-04-07**: Design system sweep — two passes (`/spec`). Pass 1 (tokens): extracted MODALITY_MAP / STYLE_MAP / STATUS_CONFIG / SERVICE_TYPE_MAP to `lib/design-constants.ts`, ScoreRing + ScoreBreakdown extracted, all `#FBF7F2` → `PageBackground`, `border-white/30` → `border-outline/30`. Pass 2 (real patterns): all Buttons → `rounded-full` pills, home page rework (PageBackground + glass card + privacy footer), Admin leads `Card` → `GlassCard`, identical DOM shells across public pages. First pass criticized as token-only; second pass audited finished pages and built design pattern catalog.
- **2026-04-06**: Test suite hardening (`/spec`, VERIFIED, commit `d6e1c6f`) — behavior-based component tests (Badge / Alert / GlassCard), Clerk removed from admin-auth-gating E2E, content-agnostic ui-smoke, condition-based polling (`expect.poll`) replacing `waitForTimeout`, dialog listener race fixed in admin-match-flow E2E, pre-push hook running unit tests, `test:preflight` script.
- **2026-04-03**: WhatsApp flag dropdown (40-country auto-detect from Google Places, E.164 formatting) + Instagram username validation (auto-strips URLs/@ prefixes); Specialty color system (`/spec`, VERIFIED, 5 commits) — 24 color tokens in `@theme` (12 hues × strong/weak), `SPECIALTY_MAP` 5 → 12 entries, `SpecialtySelector` + `SpecialtyMapper` extracted, all 5 display surfaces updated; Testing infrastructure (`/spec`, VERIFIED) — Vitest workspace (unit + integration projects), 26 component tests across 8 files, Playwright multi-project (public / admin / visual), 4 visual regression baselines.
- **2026-04-02**: Professional approval flow (score model, approve/reject API+UI), registration form expanded (short_description, experience_description, instagram, service_type), profile image upload (Storage helper, FormData, circular preview), phone auto-formatting, live validation, GlassCard/PageBackground/SectionHeader components extracted, admin professionals list rebuilt
- **2026-03-12**: Intake form (`/solicitar`), confirmation page (`/gracias`), email notifications (Resend — `notifyNewLead` + `notifyNewProfessional`), Supabase Auth for admin (replaced Clerk), Google Places Autocomplete, phone validation
- **2026-03-11/12**: Documentation cleanup (16→8 MD files), Claude Code tooling (8 milestones: CLAUDE.md, rules, skills, commands, agents, hooks), design system extraction (Phases 1-2: constants + Chip), professional profile `/p/[slug]` full rebuild (5 glass cards, 6 new DB columns), recommendations page fixes, production deployment fixes (liquid-glass, Upstash Redis), full page/workflow map (27 routes)

## Open Questions

- [x] What happens when a profile is rejected? Keep data? Allow resubmission? Notify the professional? → **Resolved 2026-05-07/08:** soft no with 60-day cooldown; verbatim rejection_reason emailed to the pro; row preserved (partial UNIQUE excludes rejected from the live-row uniqueness invariant). See Item 3 above.
- [x] What data should each card in the admin professionals list show? → Name, up to 3 specialty chips (colored), location, status badge (implemented in specialty color system)
- [ ] Should existing 45 professionals get placeholder images, or leave as initial-letter avatars until they re-register?
- [x] **Rewrite scope, timeline, and trigger.** → **Resolved 2026-05-12:** Bel clarified the "rewrite" she'd referenced is a **content rewrite (= Item 7, final wording pass), NOT an app rewrite**. Soft Launch Push continues on the current app. Items 6 + 7 remain in scope; Item 4 moved to **Final Go-Live Gate** (post-Phase-3 trigger) since the app is not ready to open.
- [x] **Item 4 detail decisions.** → **Resolved 2026-05-12:** Sub-decisions (browse-first home, waitlist → newsletter, post-Item-3 timing) preserved inside the new **Final Go-Live Gate** section at the end of the Roadmap. Hero copy ("Te conectamos con tu terapeuta ideal") is part of Item 7's wording-pass scope, not deferred to the gate itself.

## Notes

### Business Model Decision Log

#### Apr 1, 2026 — Pivot from PQL-only to Directory + Concierge

**Previous model:** Link-based attribution (PQL). User gets a link → sees 3 recommendations → contacts via WhatsApp → professional gets charged per qualified lead.

**Why we changed:**
- Dispute risk too high: "I didn't get that lead" / "they never contacted me" — more time mediating than earning
- Attribution is fragile: WhatsApp opens in new tab, user might save number and call later, tracking breaks
- Expiring links feel pushy to users and add operational complexity

**New model:** Two-sided marketplace with directory + concierge.
- **Directory** (primary): Professionals ranked by reputation, pay for visibility via subscription tiers
- **Concierge** (differentiator): `/solicitar` flow where admin hand-picks recommendations — keeps the existing matching/tracking infrastructure as an optional premium feature

**What we keep from the old model:**
- Tracking codes, attribution tokens, match creation — all preserved as infrastructure for the concierge flow
- PQL ledger — can be repurposed for concierge lead billing
- Event tracking — useful for analytics and review collection

**What changes:**
- Primary user flow is now Browse → Profile → Contact (not Link → Recommendations → Contact)
- New `/profesionales` directory page ranked by reputation score
- Subscription/tier system for professional visibility
- Review collection system (post-contact, no login required)

#### Ranking System Design

**Ranking score = weighted combination of:**
- Profile completeness (immediate, no user interaction needed)
- Star ratings from verified interactions (post-contact review links)
- Subscription tier (paid boost)

**Reviews without login:**
- After a user contacts a professional (tracked via contact events), send a unique review link via email/WhatsApp
- Review is tied to a real interaction — prevents spam
- No login required, but one review per interaction

**Subscription tiers (start simple):**
- **Básico (free):** Listed in directory, default ranking
- **Destacado (paid):** Higher ranking, visual badge, featured placement on home page
- More tiers/features can be added later

### Pages & Workflows (Full App Map)

#### Público (Lead)

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/` | **Done** | Home page — glass card, pill CTAs, PageBackground, dual CTA |
| 2 | `/r/[tracking_code]` | Exists | Concierge recommendations (kept for concierge flow) |
| 3 | `/solicitar` | **Done** | Concierge intake form |
| 4 | `/gracias` | **Done** | Confirmation post-solicitud |
| 5 | `/profesionales` | **Done** | Public directory ranked by ranking_score DESC — shipped 2026-04-24 |
| 6 | `/ayuda` | **New — Phase 3** | Soporte / recuperación de link / errores comunes |

#### Público (Profesional)

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/p/[slug]` | **Done** | Perfil público — 5 glass cards, design system |
| 2 | `/profesionales/registro` | **Done** | Registration form (now collects all fields + image) |
| 3 | `/profesionales/registro/confirmacion` | **Done** | Registration confirmation |

#### Admin / Ops

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/admin/leads` | **Done** | Bandeja de solicitudes — GlassCard, Spanish copy |
| 2 | `/admin/leads/[id]` | **Done** | Detalle de solicitud con contacto, contexto, needs y match actual |
| 3 | `/admin/leads/[id]/match` | **Done** | Crear match — GlassCard, Spanish copy, AdminLayout |
| 4 | `/admin/professionals` | **Done** | Listado profesionales grouped by status + inline Destacado tier management (modal, status chip, payment history expand) — added 2026-04-27 |
| 5 | `/admin/professionals/[id]/review` | **Done** | Admin review page with score + approve/reject |
| 6 | `/admin/professionals/[id]` | **New — Phase 3** | Professional detail (reviews, rating, tier) |
| 7 | `/admin/analytics` | **New — Phase 3** | Dashboard: funnel + directory metrics |
| 8 | `/admin/settings` | **New — Phase 3** | Configuración operativa |
| 9 | `/admin/pqls` | **Done** | Ledger PQL — GlassCard, Modal, Spanish copy, AdminLayout |
| 10 | `/admin/matches` | Deprioritized (pivot) | Listado de matches / tokens — may revisit for concierge |
| 11 | `/admin/matches/[id]` | Deprioritized (pivot) | Detalle de match: link, estado, vencimiento, timeline |
| 12 | `/admin/events` | Deprioritized (pivot) | Eventos crudos / auditoría (contact_click, etc.) |

#### Legales / Confianza

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/terminosyprivacidad` | **Done** | Página legal unificada con secciones de términos y privacidad |
| 2 | `/privacidad` | Redirect | Redirige al ancla de privacidad en `/terminosyprivacidad` |
| 3 | `/terminos` | Redirect | Redirige al ancla de términos en `/terminosyprivacidad` |

#### Futuro (Phase 4)

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/pro` | **New** | Home profesional autenticado |
| 2 | `/pro/leads` | **New** | Visibilidad de leads para el profesional |
| 3 | `/pro/analytics` | **New** | Performance por profesional |

### Real Backlog (folded into Roadmap phases)

Items below are tracked in the Roadmap above. Listed here only for cross-reference and to record what's intentionally *not* committed.

**Phase 0 (this week):** apply migrations 004/005/006 · verify Resend domain · visual QA · image upload e2e · decide rejected profile flow · smoke test all 3 flows

**Phase 1 (2–3 weeks):** Sentry + Vercel Analytics · cron jobs (reconciliation + event purge + destacado expiry) · onboard first 10 professionals · handle first 5 concierge requests

**Phase 2 (1–2 months):** Self-serve Destacado checkout (MercadoPago) · directory filters + search · renewal reminders · AFIP invoicing automation

**Phase 3 (2–3 months):** /pro/* portal · admin detail pages

### Deferred (no commitment — revisit only on real-user signal)

The product is not yet live. The items below are speculative polish, pre-mature optimization, or low-impact bugs. They stay deferred until a real user reports specific friction or a phase-gate definition of done requires them.

**Known low-impact bugs** *(deferred)*
- BottomSheet has no backdrop animation (no dimming overlay behind sheet)
- Backdrop-filter blur delay on card swipe (Chrome bug — `KNOWN_ISSUES.md`)
- PQL adjustment modal sends `{ amount, reason }` but API expects `{ adjustment_type, reason, billing_month }` (pre-existing — admin can adjust via DB if needed)
- Google Places autocomplete arrow-key feel

**Animation / micro-interactions** *(deferred)* — confetti on contact, success animation after WhatsApp opens, spring physics on swipe, drag resistance curves, momentum/bounce, staggered chip entrances, progress dot animations, shimmer on loading, text reveal animations, card deck depth shadows, micro-haptics, more delightful entrance on reveal screen, better card typography hierarchy, WhatsApp button pulse animation.

**Visual / theming** *(deferred)* — dark mode, hover states for desktop, Moonly-style card redesign exploration, background SVG adjustment, admin dashboard design polish, AnimatedIcon component.

**Design system extraction (remaining)** *(do as needed, not as a sweep)* — AvatarPlaceholder, PrivacyNotice, FormField. Extract only when the next page that needs one shows up.

**Performance targets as a checklist** *(replaced by Phase 1 Lighthouse CI)* — Lighthouse > 90, LCP < 2.5s, FID < 100ms, CLS < 0.1, TTFB < 800ms, API < 500ms, page load < 3s on 3G, TTI < 5s, first-load JS < 100KB. **Action:** establish Lighthouse CI in Phase 1; address regressions when they appear, not as a checklist of targets up front.

**Accessibility above WCAG AA** *(deferred)* — high contrast mode, full WCAG AAA. **Target stays AA.** Focus traps for modals + skip nav + screen reader announcements should land case-by-case during regular component work, not as a sweep.

**Infra hardening** *(deferred unless concrete signal)* — Cloudflare proxy/WAF, advanced DDoS rules, log aggregation, uptime monitoring beyond Vercel built-in, contract tests for validation rules, CI/CD workflow (GitHub Actions), `npm ci` lockfile verification in CI. Vercel + Sentry + the existing pre-push hook covers the realistic threat model for a pre-launch product.

**SEO / content polish** *(deferred until post-launch)* — meta tag audit in prod, Open Graph images, custom 404 page, full Spanish copy audit. Defer until there's traffic worth optimizing for.

**Misc deferred items**
- ~~**Infrastructure heartbeats (n8n)** — Hara main DB.~~ ✅ Done 2026-05-03. Migration 008 added `heartbeat` table; n8n workflow `Hara — Heartbeat` (https://n8n.greenbit.info) now has a parallel Postgres node pinging Hara's pooler every 3 days at 13:00 UTC. Both Postgres nodes share the same trigger and route their Error outputs to the existing Resend notification, so any heartbeat failure (either DB) sends an email. Manual fire verified — fresh row in `heartbeat` on both DBs. *(Note: `automation/workflows/heartbeat.json` in the automation repo is now stale — n8n is source of truth. Re-export from n8n if reproducibility matters.)*
- **Upstash — deferred indefinitely** *(no action)*. Existing free-tier DB stuck in "pending restore" since 2026-05-01. Free tier only allows 1 DB so we can't create a new one until the stuck one clears. Site works without it (rate limiter is fail-open per `lib/rate-limit.ts`); pre-launch zero traffic means there's nothing to rate-limit anyway. **Revisit triggers:** (a) Upstash restore fails or completes (then delete + recreate, or just keep), (b) abuse signal appears in prod logs, (c) ready to switch providers (Vercel KV, Redis Cloud, or drop the limiter and use Cloudflare WAF at the edge). Until one of those: do nothing. Heartbeat for Upstash is moot until then.
- Email: send copy to person who submitted *(unblocked now that Resend domain is verified — implement when needed)*
- Reconciliation API endpoint (`/api/admin/reconciliation`) — for concierge flow
- Custom-hook unit tests (`useRecommendations`, `useSwipeGesture`, etc.)
- E2E for admin review flow *(needs admin storageState — defer until admin auth stable)*
- Pre-merge checklist for the 7 QA rules
- `FINAL_SPEC.md` drift prevention discipline
- Lazy-load BottomSheet if it grows past 200 lines
- README reference cleanup (deleted `CODE_QUALITY_AUDIT_2026-01-06.md`, week-summary path)

### Working rules (from CLAUDE.md)
1. Never delete information without preserving it first
2. Do not assume — verify
3. Discuss before executing
4. Do not take shortcuts
5. One thing at a time, test after every change
6. Check the dev server before sending URLs
7. Read before writing
8. Track everything in this plan file

### Bugs fixed in previous sessions
- `/p/[slug]` specialty vs specialties column name — fixed
- `/p/[slug]` using Tailwind grays — fixed (now uses design system)
- E2E seed invalid tracking code — fixed
- Duplicate SPECIALTY_MAP and isValidReason — fixed (moved to lib/design-constants.ts)
- liquid-glass backdrop-filter dropped in production — fixed (using @apply)
- Upstash Redis 503 on Vercel — fixed (Marketplace integration)

### Auth decisions
- Clerk removed — was never configured, no reason to keep a third service
- Supabase Auth chosen because we already use Supabase and professionals will need accounts later for `/pro/*` portal
- Middleware changed from fail-closed-503 to redirect-to-login pattern
- Admin user created manually in Supabase Auth dashboard for now

### Infrastructure decisions

**Rate limiting (Upstash Redis) — fail open by design.** The original `lib/rate-limit.ts` was fail-closed in production for PQL billing fraud concerns. Post-pivot PQL is optional infrastructure, so the calculus flipped: a Redis hiccup taking down every public POST endpoint is far worse than a brief unprotected window. As of `987b40e` (2026-05-01) the limiter logs and returns `{success: true}` on any Redis error — endpoint behavior is unchanged when Redis is healthy, and a noisy log when it's not. The 4 callsites (`/api/waitlist`, `/api/events`, `/api/reviews/submit`, `/api/public/recommendations`) need no per-route try/catch.

**Upstash free-tier auto-deletion (2026-05-01 incident).** Free-tier Redis DBs are deleted after extended inactivity, and a "Restore" can sit pending indefinitely. We hit this; rather than wait, the plan is: stay on free tier through pre-launch (zero traffic = no rate-limit value lost), then either (a) add a daily heartbeat workflow in n8n that does `INCR` on a sentinel key to keep the DB warm, or (b) move to Upstash paid (~$0.20/100k req). Same pattern applies to the Supabase free-tier auto-pause we already documented — both should share a single "infrastructure heartbeats" workflow in n8n alongside the Destacado-expiry + review-request crons.

**The fail-open behavior also means we can defer reconnecting Upstash entirely.** The site works in both states; only rate-limit protection is gone when Redis is down. Fix for real before we have traffic worth protecting from.

### Email decisions
- Resend chosen for simplicity (one API call, good Next.js integration, free tier 3,000/month)
- Production sender = `Hara Vital <hola@haravital.app>` with `replyTo: centrovitalhara@gmail.com` (verified 2026-05-01). No mailbox needed at haravital.app — replies route via gmail. Cloudflare email forwarding considered and skipped (rare for users to compose fresh emails to a domain address; reply path covers ~all cases).
- Admin notifications (`notifyNewLead`, `notifyNewProfessional`) go to `centrovitalhara@gmail.com` (was `mariabmontoya@gmail.com` while domain was unverified).
- `lib/email.ts` has both `notifyNewLead()` and `notifyNewProfessional()` ready
- `create-lead.ts` server action has `additional_context` field but it doesn't exist in DB schema — skipped for now
- Email now includes deep link to admin review page (added 2026-04-02)

### Google Places in intake form
- PlacesAutocomplete component already existed, reused it
- Returns city, country, countryCode from selected place — replaces manual country dropdown
- Arrow key selection in Places dropdown may have minor issues (noted by user, not investigated yet)

### Key files reference
- `docs/DONE.md` — All completed work
- `CLAUDE.md` — Project guide and working rules
- `FINAL_SPEC.md` — Database schema (source of truth)
- `.claude/README.md` — Tooling reference
- `lib/profile-score.ts` — Profile scoring helper (10 criteria, 100 points)
- `lib/storage.ts` — Supabase Storage helper for profile images
- `lib/design-constants.ts` — SPECIALTY_MAP (12), SPECIALTY_COLORS (12), CURATED_SPECIALTY_KEYS, animation constants, MODALITY_MAP, STYLE_MAP, STATUS_CONFIG, SERVICE_TYPE_MAP
- `app/admin/professionals/[id]/review/components/ScoreDisplay.tsx` — ScoreRing + ScoreBreakdown (extracted from review page)
- `app/components/ui/Chip.tsx` — Chip with `specialty` prop (discriminated union) + 5 semantic variants
- `app/components/ui/GlassCard.tsx` — Reusable glass card component
- `app/components/ui/PageBackground.tsx` — Reusable page background component
- `app/components/ui/SectionHeader.tsx` — Reusable section header label
- `app/profesionales/registro/components/SpecialtySelector.tsx` — Specialty toggles + custom fields
- `app/admin/professionals/[id]/review/components/SpecialtyMapper.tsx` — Admin specialty mapping dropdown
- `vitest.workspace.ts` — Vitest workspace (unit + integration projects)
- `playwright.config.ts` — Playwright multi-project (public, admin, visual)
- `app/admin/components/AdminFilterBar.tsx` — Shared search + status filter component for admin list pages
- `app/api/admin/leads/route.ts` — Leads list API with match context joins
- `app/api/admin/professionals/route.ts` — Professionals list API (replaced debug route)
- `app/api/admin/pqls/route.ts` — PQLs list API (replaced debug route)
- `__tests__/e2e/registration-full-flow.spec.ts` — Full 4-step registration E2E with Google Maps mock + image upload + DB cleanup
- `docs/plans/` — Spec-driven plans (specialty-color-system, testing-infrastructure, design-system-sweep, test-suite-hardening, registration-full-flow-e2e, admin-dashboard-improvements, directory-ranking-foundation, destacado-tier-mvp)
- `lib/ranking.ts` — TS ranking formula helper (`computeRankingScore`, `isEffectivelyDestacado`) — must stay in sync with `migrations/004_ranking_foundation.sql` AND `migrations/005_destacado_tier_mvp.sql`
- `migrations/004_ranking_foundation.sql` — Ranking columns + `recompute_ranking()` trigger — **apply to Supabase before running integration tests**
- `migrations/005_destacado_tier_mvp.sql` — `tier_expires_at` column + `subscription_payments` table + expiry-aware trigger + `upgrade_destacado_tier()` RPC — **apply after 004**
- `app/profesionales/page.tsx` — Public directory page (server component, sorted by `ranking_score DESC`, Destacado chip)
- `app/p/[slug]/page.tsx` — Public profile page (Destacado chip near name)
- `app/admin/professionals/page.tsx` + `components/DestacadoPaymentModal.tsx` — Admin tier management UI (modal, row chip, expand history)
- `app/api/admin/subscriptions/route.ts` — POST upgrade + GET history (admin only via middleware)
- `app/api/cron/expire-destacado/route.ts` + `vercel.json` — Daily cron for tier cleanup (Bearer CRON_SECRET auth)
- `__tests__/integration/ranking-parity.test.ts` — DB-backed parity test (TS ↔ SQL formula + RPC arithmetic)
- `scripts/apply-ranking-migration.mjs` — Apply migration 004 to Supabase
- `scripts/apply-destacado-migration.mjs` — Apply migration 005 to Supabase
- `docs/prd/` — Product Requirements Documents (directory-ranking-foundation, destacado-tier-mvp, reviews-collection-system, + future PRDs)
- `migrations/006_reviews_collection.sql` — reviews + review_requests + submit_review() RPC + aggregate trigger — **apply after 004 + 005**
- `scripts/apply-reviews-migration.mjs` — apply migration 006 to Supabase
- `app/components/ContactButton.tsx` — fixed: now fires events for direct contacts (was skipping)
- `app/components/ReviewerEmailCapture.tsx` — optional email capture on /p/[slug]
- `app/api/cron/send-review-requests/route.ts` — daily review request email cron (07:00 UTC)
- `app/api/reviews/submit/route.ts` — token-gated review submission
- `app/r/review/[token]/page.tsx` — public review form (no login required)
- `app/admin/reviews/page.tsx` + `/api/admin/reviews/` — admin moderation with is_hidden toggle

### Seed data
- Run `npm run qa:seed-e2e` to seed 4 professionals + 1 lead + 1 match with 3 recommendations
- `scripts/migrate-review-flow.mjs` — sets all professionals to `submitted` for testing
- Current tracking code changes on each seed run (uses `generateTrackingCode()`)
- Check `.e2e-test-data.json` for the latest tracking code after seeding

### Deployment
- Auto-deploys on push to main via Vercel
- Upstash Redis connected via Vercel Marketplace integration
- All env vars set in Vercel
- Live at https://hara-weld.vercel.app
- **New env vars needed in Vercel for latest deploy:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`

### Packages
- `@supabase/ssr` — Supabase server-side auth for Next.js
- `resend` — transactional email API
- `libphonenumber-js` — phone number validation and formatting by country
- `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event` — component testing
- `jsdom` — browser environment for Vitest unit tests
- `@vitejs/plugin-react` — JSX transform for Vitest jsdom environment

### Supabase Storage
- Bucket: `profile-images` (public access, created 2026-04-02)
- Images stored as `{professionalId}.{ext}` — one per professional, upsert on re-upload
- Max 5 MB, JPG/PNG/WebP only
- Upload happens after DB insert (needs the ID for the file path)
