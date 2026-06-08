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
- [ ] All pages visually match the design system (liquid-glass, tokens, pill buttons, identical page shells) — desktop responsive pass (Item 6) + JSON-driven wording pass (Item 7) committed 2026-05-20, awaiting Bel manual browser verification to flip to VERIFIED
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
6. ~~**Desktop UI polish pass**~~ ✅ **Built 2026-05-14, committed/pushed 2026-05-20 (`4dd2ad0`). Awaiting Bel manual browser verification to flip to VERIFIED.** PRD `docs/prd/2026-05-14-desktop-responsive-ui-pass.md`, plan `docs/plans/2026-05-14-desktop-responsive-ui-pass.md`. 11 tasks: `.container-public` extended to 1024px at `lg:`, `SiteHeader` with desktop nav (3 links + active state) wired to root layout, `/p/[slug]` decomposed into 6 sub-components + sticky contact sidebar, `/r/[tracking_code]` extracted into `DeckView`/`GridView`/`RecommendationCard`, `RevealOnScroll` with `prefers-reduced-motion`, `/profesionales` 2-col grid at `lg:`, BottomSheet modal-on-desktop.
7. ~~**Final wording pass**~~ ✅ **Applied 2026-05-20 (`f8f2471`). Awaiting Bel manual browser verification to flip to VERIFIED.** JSON-driven approach (different from the 2026-05-13 reverted attempt): Bel writes finalized Spanish copy in `content/*.json` (13 files), Claude mechanically applies to app files. 21 string changes across 7 files (preview, solicitar, r/review, registro, registro/confirmacion, lib/email, not-found); 7 files already matched JSON. 6 categories of gap-strings documented in 2026-05-20 session log for follow-up.
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

## Next Steps

1. ~~**Approve search motor spec**~~ ✅ **VERIFIED 2026-06-03** — Bel manually tested name/practice/accent search and approved. Spec `docs/plans/2026-06-02-search-professionals-directory.md` flipped to VERIFIED.

2. ~~**Apply migrations 012, 013, 014–018 to Supabase**~~ ✅ **Done 2026-06-05** — all applied.

3. ~~**Debug and fix `SuggestedPractices` mapping feature**~~ ✅ **Done** — dismiss route (`/api/admin/practices/dismiss`) calls `dismiss_specialty_suggestion` RPC (migration 014), removing entries from the DB directly. `router.refresh()` after both dismiss and map operations.

4. **Fix metadata in `app/layout.tsx`** — old copy still present
   - What: `title`, `description`, `openGraph`, and `twitter` fields still reference "terapeuta ideal", "verificados", "psicólogo argentina" — language that conflicts with the holistic-wellness positioning and the copy fixes applied this session.

6. **Complete profile image scoring discussion** — next session
   - What: `profileImage` criterion (10pts) is now binary (has http URL or not). Admin can override via score editor. No AI image analysis implemented — left to admin judgment.

7. **Bel manual browser test of remaining pages** (carried over from 2026-05-20)
   - What: Homepage layout + copy verified this session. Remaining: desktop nav, 2-col directory, scroll reveals, sticky sidebar on /p/[slug], container widths.

8. **Decide on Item 7 gap strings** (carried over)
   - Considerations: `'Enviando…'` (WaitlistForm), directory chip labels, profile review fallbacks, Solicitar currency labels, Registro currency descriptions, admin emails (out of scope).

9. **Item 4 (Public home flip)** — deferred until Phase 1 done
   - What: See Final Go-Live Gate section for prerequisite checklist.

10. **Phase 1 — first 10 pros, 5 concierge requests, Sentry + Vercel Analytics**

11. **Apply migration 020 to Supabase**
    - What: `migrations/020_complete_specialty_mappings.sql` is committed but not yet applied to the production DB
    - Why: specialty mappings update is a data improvement
    - Note: `migrations/021_blog_posts.sql` was applied this session (2026-06-08) — blog feature is now live

12. **Update nav: point "Ayuda" to `/que-es-hara` or redirect `/ayuda`**
    - What: SiteHeader still links "Ayuda" to `/ayuda`; the content is now merged into `/que-es-hara`. Either redirect `/ayuda` → `/que-es-hara`, or update the nav link label/target
    - Considerations: `/ayuda` still works standalone — redirect is the cleaner option

---

## Session Log

### Session — 2026-06-08 (Blog .md upload + Hara Vital author override — both VERIFIED)

**Completed:**
- **Blog `.md` upload feature** (`docs/plans/2026-06-07-blog-md-upload.md` — VERIFIED): new write/upload mode toggle on `/blog/escribir`; `MarkdownUpload.tsx` sub-component (`.md`-only, async `file.text()`, `parseMarkdownDoc` + `sanitizeBlogHtml`, preview); `parse-markdown.ts` pure helper (YAML frontmatter + H1 title extraction, 140-char clamp at single exit); `marked` dep added; `lib/sanitize.ts` comment clarified. Code review: hardened frontmatter delimiter from `indexOf('\n---')` → `/^---$/m` (prevents false matches on `---note` lines). 67/67 test files, 462 tests all green.
- **Hara Vital author override** (`docs/plans/2026-06-08-hara-vital-author.md` — VERIFIED): admin blog review dropdown gets "✦ Hara Vital (editorial)" option; `PATCH /api/admin/blog/[id]` handles `'hara-vital'` sentinel (first branch, bypasses professional lookup, sets `author_name='Hara Vital'`, `is_hara_editorial=true`, `professional_id=null`); email suppression covers both first-assignment AND re-approval paths; admin blog list shows Hara Vital pill badge; `/blog` listing and `/blog/[slug]` detail page show Hara isotipo logo instead of plain author name. DB migration applied: `ALTER TABLE blog_posts ADD COLUMN is_hara_editorial BOOLEAN NOT NULL DEFAULT FALSE;`. Code review: fixed email firing on first assignment (pre-update `post.is_hara_editorial=false` → added `professional_id !== 'hara-vital'` guard). 464 tests all green, all 3 E2E scenarios verified live.
- **Email FROM address fixed**: `lib/email.ts` FROM changed from `hola@haravital.app` (unverified domain) to `automations@mail.greenbit.info` (Greenbit's verified sending subdomain). Also fixed Resend SDK silent error swallowing — SDK returns `{error}` not throws; added proper error check and logging.
- **`KNOWN_ISSUES.md` §2 added**: documents Resend domain verification requirement (mail.greenbit.info must be verified in Resend dashboard) so this never gets lost again.
- `migrations/021_blog_posts.sql` applied to Supabase — blog feature fully live.

**Blockers:**
- `migrations/020_complete_specialty_mappings.sql` still not applied to Supabase production DB.

---

### Session — 2026-06-07 (Ranking scores, WelcomeHint, blog fix, que-es-hara + ayuda merge)

**Completed:**
- Professionals directory: added `ranking_score` to SELECT query and `DirectoryProfessional` interface; added "ÍNDICE HARA" badge to each professional card, color-coded by score tier (green `text-success` ≥51, amber `text-warning` 30–50, terracotta `text-brand` <30); ordering preserved from DB ORDER BY ranking_score DESC, `.filter()` maintains it through search
- WelcomeHint collapsible dropdown: fixed broken toggle — went through multiple approaches (localStorage guard broken by React Strict Mode double-mount, `useState` toggle stuck open due to stale `.next` HMR cache); final implementation uses native `<details>`/`<summary>` HTML — zero React state, browser-native toggle, reliable in all conditions
- Large catch-up commit (`82d7982`): committed all previously untracked files — blog feature (public index, post detail, write form, admin review queue, API routes + tests), WelcomeModal, Qué es Hara page, ProfilePosts, SolicitarForm updates, SiteHeader + AdminLayout + error/not-found/gracias/ayuda/confirmacion updates, `lib/email.ts` + `lib/storage.ts` + `lib/sanitize.ts`, migrations 020 + 021, assets reorganized to `public/assets/bg/`, new fonts + logo, package deps updated; 439/439 unit tests green
- Qué es Hara + Ayuda merged (`d6bdfb1`): `/que-es-hara` redesigned as document-style page — sticky left sidebar TOC on desktop (7 sections, anchor links), horizontal TOC on mobile, all original content preserved verbatim, FAQ sections (usuarios + profesionales from `/ayuda`) + contact section appended; 443/443 unit tests green
- Blog 404 fixed: `.next/server/app/blog/` cache corrupted by HMR during WelcomeHint rewrites; cleared cache + restarted dev server (`pkill -f "next dev"`, restart)

**Deviations:**
- Ranking score display, WelcomeHint fix, and merged page were unplanned improvements requested by Bel during the session

**Blockers:**
- Migrations 020 (specialty mappings) and 021 (blog_posts) need to be applied to Supabase — both committed but not applied to prod DB yet

---

### Session — 2026-06-05 (Nav double-active bug + registration form centering fix)

**Completed:**
- Fixed nav showing two active items simultaneously on `/profesionales/registro`: `SiteHeader.tsx` desktop and mobile `isActive` logic now uses "most specific match wins" — prefix-match only activates when no other nav link claims the same path more specifically. Root cause: `pathname.startsWith('/profesionales/')` matched `/profesionales/registro`, which is itself a nav entry.
- Fixed registration form terms text not centered: added `mx-auto` to the `max-w-sm` paragraph in `RegistroForm.tsx:631`. `text-center` centers text within the element; `mx-auto` was missing to center the constrained-width element itself within its parent.
- Created `app/components/SiteHeader.test.tsx` (TDD — wrote failing test before fix): 4 tests covering home link + z-index, hamburger toggle, the specific double-active regression on `/profesionales/registro`, and excluded-routes returning null. All 4 pass.
- Committed and pushed to Vercel production. Pre-push hook ran the full 360-test unit suite — all green.

**Deviations:**
- This session opened as a continuation of the `/end-session` workflow from the previous session (which hit context limits mid-update). Plan file duplicate-step cleanup and this session log entry were completed here.

---

### Session — 2026-06-02 (Search motor — `/profesionales` client-side filtering)

**Completed:**
- PRD `docs/prd/2026-06-02-search-professionals-directory.md` (Status: Final) — search by name, practice (key/label/alias), specialty free-text; client-side filtering; accent normalization; key decisions: single free-text input, useMemo, alias matching critical.
- Spec plan `docs/plans/2026-06-02-search-professionals-directory.md` (Status: COMPLETE — awaiting Bel's manual approval to flip VERIFIED).
- Created `app/profesionales/components/ProfessionalsDirectory.tsx` (276 lines, `'use client'`): exports `DirectoryProfessional` interface (adds `practices: string[] | null`), `normalize` (NFD accent strip), `buildPracticeIndex`, `matchesProfessional` (all exported for unit testing); `ProfessionalCard` + format helpers moved here from `page.tsx`; search input with lupa icon + ✕ clear button; result count (only when searching); `aria-live="polite"` on results region for screen readers; `useMemo` for `practiceIndex` (once) and `filtered` (per keystroke).
- Created `app/profesionales/components/ProfessionalsDirectory.test.tsx` — 12 unit tests covering `normalize`, `buildPracticeIndex`, `matchesProfessional` (name, specialty, practice label, alias, accent-insensitive, empty query, no match).
- Updated `app/profesionales/page.tsx`: 222 → 67 lines; adds `practices` to SELECT; `Promise.all([getProfessionals(), getActivePractices().catch(...)])` — graceful fallback to `[]` if catalog fails; delegates rendering to `ProfessionalsDirectory`; removed moved code.
- 306/306 unit tests pass, tsc clean, build clean (`/profesionales` 4.01 kB).
- Changes-review: compliance=high, quality=high, goal=achieved, 7/7 truths verified. Single suggestion (aria-live) applied inline.
- E2E: TS-001 name search PASS, TS-002 practice+clear PASS, TS-003 alias NOT_APPLICABLE (no professional has `constelaciones-familiares` mapped in `practices` column yet — requires migration 013 + alias population in DB), TS-004 empty state + accent normalization PASS.

**Blockers:**
- Alias search end-to-end requires migration 013 applied to Supabase (adds `aliases text[]` to `practices` table) + aliases to be seeded via `migrations/016_new_practices_and_mappings.sql`. Until then, alias matching only works in unit tests.
- Spec waiting for Bel's manual approval (Step 1 above).

---

### Session — 2026-06-01 (Copy audit + homepage layout fixes)

**Completed:**
- Pushed backlog from 2026-05-30/31 session (32 files, `515df17`) — pre-push hook was blocked by missing `vi.mock('next/cache', ...)` in `app/api/admin/practices/[key]/route.test.ts`; added mock, 293/293 tests pass
- Homepage copy pass triggered by Bel's review of live site:
  - `waitlist_card_title`: "¿Querés saber cuando abramos?" → "¿Te querés enterar primera?"
  - `waitlist_card_body` and `WaitlistForm` button: "Avisame cuando abran" → "Anotame", body rewritten
  - Full audit of all 13 content JSON files + source files — removed clinical language across all pages:
    - "pacientes" (3×) → "consultas" / "quienes te consulten" (ProfileHero, RegistroForm)
    - `/preview` h1: "Te conectamos con tu terapeuta ideal" → "Encontrá tu profesional de bienestar"
    - "Cuéntanos" → "Contanos" (voseo fix on /preview)
    - `step3_short_description_placeholder`: "Psicóloga especializada en ansiedad y estrés laboral" → "Facilitadora de constelaciones familiares y diseño humano"
    - Review page footer: "verificados" removed
  - 8 source files + 4 content JSON files updated
- Homepage layout fixes after Bel reported mobile scroll:
  - `SiteHeader` excluded from `/` (was adding ~56px logo bar on mobile)
  - `pt-16` → `pt-8`, added `justify-center`, hero `mb-10` → `mb-6`
  - Bel confirmed scroll resolved on mobile

**Deviations:**
- Copy audit and layout fixes were unplanned — surfaced from Bel's live testing session

**Blockers (carried over):**
- Migrations 012 + 013 not yet applied to Supabase
- `SuggestedPractices` alias mapping still broken (entries reappear on navigation)
- `app/layout.tsx` metadata still has old copy ("terapeuta ideal", "verificados") — added as Next Step 4

### Archived Sessions

- **2026-05-30/31**: Admin UI overhaul + score system + practices mapping — admin professionals card redesign, DB cleanup (274 test leads deleted, 45 raw profile_image_url nulled), review page full rebuild (ScoreRing, ScoreBreakdown editable, PracticeMapper), profile-score.ts overhaul (partial scoring, 10 criteria, 100pts, 26 tests), practices catalog: migs 012+013 (specialties[] + score_overrides + aliases), PracticeForm checkboxes, lib/admin-practices.ts suggestions, SuggestedPractices.tsx; SuggestedPractices alias mapping BROKEN at session end (reappear bug, handed off); 293/293 tests.

- **2026-05-20**: Soft Launch Push Items 6 + 7 — committed desktop UI pass (`4dd2ad0`) + wording pass from content/*.json (`f8f2471`) + Node 26 localStorage shim (`98f79be`); 251/251 unit tests; awaiting Bel manual browser verification for Items 6 + 7 VERIFIED stamps.

- **2026-05-14**: Soft Launch Push Item 6 — Desktop responsive UI pass via /spec: PRD + plan + 11 implementation tasks (container-public 1024px, SiteHeader extracted to root layout, profile 6 sub-components, DeckView/RecommendationCard extracted, RevealOnScroll, directory 2-col, profile sticky sidebar, GridView 3-col, BottomSheet modal-on-desktop, scroll reveals). Build/tsc clean, 49/63 integration pass (14 pre-existing failures). COMPLETE pending Bel manual browser verification.

- **2026-05-12**: Brand rename Hara Match → Hara Vital (105 files), plan corrections (Item 4 → Final Go-Live Gate, Item 8 added), Item 8 `/ayuda` VERIFIED via /spec (4 tasks, /terminosyprivacidad Disclosure extraction, 4 entry points, new not-found.tsx, DB integration test leak fixed with afterAll cleanup), Item 7 PRD finalized (wording pass, voice-doc-anchored, no Claude-proposed copy).
- **2026-05-08**: Soft Launch Push Item 3: Pro approval/rejection emails — VERIFIED via /spec. Migration 011 (resubmit cooldown + partial UNIQUE + email index), `emailBaseUrl()` + `escapeHtml()` helpers, 3 pro-facing email functions, registration cooldown, admin PATCH email firing, Reject modal copy. 251/251 unit, 3/3 integration, partial-UNIQUE smoke. Migration 011 applied by Bel.
- **2026-05-07**: Soft Launch Push Item 1: Migration 010 applied by Bel (15 practices seeded, style→practices rename verified). Test fixture false-positive fixed in practices-migration.test.ts. Registration E2E passed. Admin re-classification banner pending Bel's manual eyeball.
- **2026-05-05 (later)**: Soft Launch Push Item 1 — Holistic practice catalog (`/prd` → `/spec`, plan `docs/plans/2026-05-05-holistic-modality-catalog.md`, PRD `docs/prd/2026-05-05-holistic-modality-catalog.md`). 15-practice canonical catalog seeded via `migrations/010_holistic_practices_catalog.sql` (created table + renamed `style` → `practices` + `style_preference` → `practice_preference` + `needs_practice_review` flag for the 45 pre-existing pros). `lib/practices.ts` with 60s TTL cache, shared `<PracticePicker>` (registro + solicitar + admin), refactored both forms to server/client split, `app/api/admin/professionals/[id]/route.ts` GET+PATCH practices-only path, `PracticeReclassificationBanner` for the 45 pros. 12 tasks all green. 184/184 unit (37 new). Two reviewer cycles, all findings fixed. Migration 010 + 009 pending Bel's SQL Editor apply at session end. Plan status COMPLETE pending live test + approval.
- **2026-05-05**: Positioning reframe across all docs + Phase 0 hand-off + workflow audit — Rewrote product framing (terapias alternativas y bienestar holístico) across 9 MD files; stripped negative brand framing per Bel's feedback; Phase 0 handed off to Bel as parallel verification track. Workflow audit surfaced 7 Soft Launch Push items (modality catalog, concierge link delivery, pro emails, home flip, rejected policy, desktop UI, wording pass); full audit captured in this plan.
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
- [x] Should existing 45 professionals get placeholder images, or leave as initial-letter avatars until they re-register? → **Resolved 2026-05-30:** show initial-letter avatars as visual placeholder; the profile-score "has image" criterion stays unmet until they upload a real photo (intentional — placeholder lowers their ranking vs pros with real images).
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
- `app/profesionales/page.tsx` — Public directory page (server component, 67 lines; fetches professionals + practices catalog in parallel; delegates rendering to `ProfessionalsDirectory`)
- `app/profesionales/components/ProfessionalsDirectory.tsx` — Client island: search input, `buildPracticeIndex`, `matchesProfessional`, filter logic, `ProfessionalCard` + format helpers; exports `DirectoryProfessional` type
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
