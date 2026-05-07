# Holistic Modality Catalog

Created: 2026-05-05
Author: belu.montoya@dialpad.com
Category: Infrastructure
Status: Final (amended 2026-05-05)
Research: Standard

> **Amendment (2026-05-05, post-approval):** During `/spec-plan` exploration we found the PRD's proposed column name `professionals.modalities` collides with the existing `professionals.modality TEXT[]` (online/presencial format) and the proposed `leads.modality_preference` is **already** an existing column. The user chose option (A): use **`practices`** as the catalog/column term and **"Práctica"** as the UI label, leaving the existing `modality` column untouched. All references below to `modalities` (column, type, helper, component, file, label) should be read as `practices` / "Práctica". The PRD's conceptual references to "holistic modalities" (the product positioning) are unchanged. Concrete substitutions:
> - Catalog table: `modalities` → `practices`
> - Column: `professionals.modalities` → `professionals.practices`
> - Column: `leads.modality_preference` → `leads.practice_preference`
> - Type: `Modality` → `Practice`
> - Helper: `getActiveModalities()` → `getActivePractices()`
> - File: `lib/modalities.ts` → `lib/practices.ts`
> - Component: `<ModalityPicker>` → `<PracticePicker>`
> - File: `app/components/ModalityPicker.tsx` → `app/components/PracticePicker.tsx`
> - Flag: `professionals.needs_modality_review` → `professionals.needs_practice_review`
> - UI label: "Modalidad" → "Práctica"
> - Migration filename: `010_holistic_modalities_catalog.sql` → `010_holistic_practices_catalog.sql`
>
> The 15 seed values (keys: `reiki`, `constelaciones-familiares`, etc.) are unchanged.

## Problem Statement

The codebase still encodes the pre-pivot psychotherapy positioning (cognitive-behavioral, psychoanalytic, gestalt, humanistic, sistémico…) in three hardcoded TypeScript constants — `STYLE_MAP` in `lib/design-constants.ts`, `STYLES` in `app/profesionales/registro/page.tsx`, and `STYLE_OPTIONS` in `app/solicitar/page.tsx`. After the April 2026 pivot, Hará is a holistic-wellness marketplace (reiki, constelaciones familiares, diseño humano, registros akáshicos, terapia floral, etc.) and the catalog visible to professionals and end users no longer matches the product. Drift is already in: `STYLE_MAP` lists eight values; the registration form lists six; the concierge filter lists seven. A single source of truth is the structural fix.

The catalog also needs to live in the database, not in code. Hardcoding it in three TS files reproduces the exact drift problem we are fixing and blocks the deferred submission/review workflow (where pros suggest new modalities and admin merges duplicates), since that flow can't be added cleanly on top of static constants.

## Core User Flows

### Flow 1: New professional registers with the holistic catalog
1. Pro lands on `/profesionales/registro` and reaches step 2 (specialties + modalities).
2. The form shows a multi-select labeled **"Modalidad"** populated from `modalities` rows where `active = true`, ordered by `sort_order`.
3. Pro picks one or more modalities (e.g., reiki, terapia floral) — same UI control as today, only the values change.
4. On submit, the selected `modalities.key` values are written into `professionals.modalities` (text array).
5. Admin reviews the registration as today; the admin review page renders labels by joining `professionals.modalities` against `modalities.label`.

### Flow 2: User requests a concierge match
1. User on `/solicitar` reaches the "advanced" section.
2. The "Modalidad preferida" multi-select is populated from the same `modalities` query, plus a built-in **"No tengo preferencia"** option (UI-only, not a DB row).
3. User picks zero or more modalities; selection is written into `leads.modality_preference` on submit. Selecting "No tengo preferencia" stores an empty array `'{}'` (any other selection is mutually exclusive with it; toggling it on clears the others, and toggling on any modality clears it).
4. Admin uses these values when hand-picking 3 recommendations — no scoring or ranking changes in this PRD.

### Flow 3: Admin re-classifies an existing professional
1. The migration sets `professionals.modalities = '{}'` and `professionals.needs_modality_review = true` for all 45 existing pros.
2. Admin opens `/admin/professionals/[id]/review` for a flagged pro.
3. A banner renders at the top: *"Esta profesional necesita re-clasificación al nuevo catálogo holístico."*
4. The banner contains the same multi-select used in registration.
5. Admin selects the correct modalities and saves. Save writes `professionals.modalities` and sets `needs_modality_review = false` in the same transaction.
6. Banner disappears. Display labels (here and on `/p/[slug]`) now render from `modalities.label`.

### Flow 4: Public profile and admin display surfaces
1. Any surface that today reads `STYLE_MAP[key]` (`app/p/[slug]/page.tsx`, `app/admin/professionals/[id]/review/page.tsx`) instead reads from a server-side fetch of `modalities`.
2. Unknown / legacy keys (which should not exist after migration) fall back to the raw key, never to the old psychotherapy label.

## Scope

### In Scope
- New table `modalities` with columns: `key text primary key`, `label text not null`, `slug text unique not null`, `sort_order int not null default 0`, `active bool not null default true`, `created_at timestamptz default now()`.
- Migration `010_holistic_modalities_catalog.sql` that:
  - Creates the table.
  - Seeds 15 rows (canonical list below).
  - Renames `professionals.style` → `professionals.modalities`.
  - Renames `leads.style_preference` → `leads.modality_preference`.
  - Sets `professionals.modalities = '{}'` for all existing rows.
  - Adds `professionals.needs_modality_review boolean not null default false` and sets `= true` for all existing rows.
- Delete `STYLE_MAP`, `STYLE_OPTIONS`, `STYLES` from the three files. Replace with DB-driven reads.
- New shared `<ModalityPicker>` client component used by all three picker surfaces (registro form, solicitar form, admin re-classification banner). Replaces the three inline `.map()` implementations the codebase has today. See *Existing code* below for full props signature.
- Server components (`/p/[slug]`, `/admin/professionals/[id]/review`, `/profesionales`) fetch modalities directly via `supabaseAdmin`.
- Client-component pages get the list as a prop from a server-component parent. Both `/solicitar` and `/profesionales/registro` are currently `'use client'` for the entire page body, so each is split:
  - `app/solicitar/page.tsx` — becomes a thin **server component** that calls `getActiveModalities()` and renders `<SolicitarForm modalities={...} />`.
  - `app/solicitar/SolicitarForm.tsx` — new file, `'use client'`, holds today's `useState` form logic unchanged except for accepting `modalities: Modality[]` as a prop.
  - `app/profesionales/registro/page.tsx` — becomes a thin **server component** that calls `getActiveModalities()` and renders `<RegistroForm modalities={...} />`.
  - `app/profesionales/registro/RegistroForm.tsx` — new file, `'use client'`, holds today's form body unchanged except for accepting `modalities: Modality[]` as a prop.
  - This is the idiomatic App Router pattern (RSC parent fetches, client child receives). No new API route in v1, no client-side fetch, no loading flicker on the modality field.
- Replace UI copy "Estilo terapéutico" → "Modalidad" everywhere it appears (registration form label + helper text, concierge form label, admin review section heading, public profile section heading).
- Admin re-classification banner on `/admin/professionals/[id]/review` shown when `needs_modality_review = true`. Saving picks clears the flag and writes `professionals.modalities` in one update.
- TypeScript: a `Modality` type exported from `lib/types.ts` (or co-located), shared by all surfaces.

### Explicitly Out of Scope
- **Submission/review workflow** — pros suggesting new modalities, admin merging duplicates / rejecting too-specific. Deferred to a follow-up PRD; the table schema is forward-compatible (adding `status`, `submitted_by`, `merged_into` later is non-breaking).
- **Admin CRUD UI for the modalities table** — for v1, admin edits seed list via SQL or Supabase Studio. UI editor is part of the deferred PRD.
- **Per-market localization** — the labels are Argentine Spanish. Spain/México use the same labels for v1; multi-locale support is deferred until we have real signal from a second market.
- **Search/ranking changes** — directory ordering and concierge match logic stay the same. Only the universe of allowed values changes.
- **Backfill of legacy values** — we are not auto-mapping `cognitive-behavioral` → anything. All 45 pros are cleared and admin re-classifies manually using the banner. ~30-60 min of admin work, one-time.
- **Public `/api/modalities` route** — the table is small (~15 rows) and only consumed by Hará surfaces. Direct Supabase reads suffice; a route can be added later if a public client (or the deferred submission flow) needs it.

## Technical Context

### Relevant architecture
- **App Router with mixed server/client components.** Most pages are server components (`app/p/[slug]/page.tsx`, `app/admin/professionals/[id]/review/page.tsx`, `app/profesionales/page.tsx`) and can fetch from Supabase directly. Two surfaces are currently `'use client'` for the entire page body (`app/solicitar/page.tsx`, `app/profesionales/registro/page.tsx`) — these get split into a server-component shell that fetches modalities and a client-component form child that receives them as a prop. See *In Scope* for exact file layout.
- **Single Supabase admin client** at `lib/supabase-admin.ts`. The `modalities` reads use the same client; RLS does not need to gate this table — it's public catalog data.
- **Data model:** `professionals.style TEXT[]` and `leads.style_preference TEXT[]` are free-form text arrays today. They become `professionals.modalities` and `leads.modality_preference` after the migration. No FK constraint to `modalities.key` — keep them as plain text arrays so rename/cleanup of catalog keys doesn't cascade. UI is the integrity layer.

### Constraints
- **Tailwind v4 + design tokens.** New banner on the admin review page uses existing tokens (`bg-warning-weak`, `text-warning`, `border-outline`) — no new tokens needed.
- **Spanish copy, Argentine informal.** "Modalidad" (singular form for the field label, plural "Modalidades" for the section heading on profiles).
- **No `console.log`** — use `lib/monitoring.ts` for any error path in the new code.
- **Caching.** The modalities table is small and rarely changes. Use Next.js default fetch caching with `revalidateTag('modalities')` invoked from any future admin write path. Acceptable to leave revalidation manual for v1 (admin SSH-ing into Supabase and editing won't trigger Next.js cache invalidation; restart of the deploy will).

### Existing code (key files this PRD touches)
- `lib/design-constants.ts` — delete `STYLE_MAP` (lines 124–134). Keep all other constants.
- `app/profesionales/registro/page.tsx` — convert to server component; fetch modalities; render `<RegistroForm modalities={...} />`.
- `app/profesionales/registro/RegistroForm.tsx` — **new file**, `'use client'`. Holds today's body of `registro/page.tsx` (delete `STYLES` const at the old lines 41–48), accepts `modalities: Modality[]` prop, updates form state field name `style` → `modalities`, changes label "Estilo terapéutico" → "Modalidad".
- `app/solicitar/page.tsx` — convert to server component; fetch modalities; render `<SolicitarForm modalities={...} />`.
- `app/solicitar/SolicitarForm.tsx` — **new file**, `'use client'`. Holds today's body of `solicitar/page.tsx` (delete `STYLE_OPTIONS` at the old lines 43–51), accepts `modalities: Modality[]` prop, renames `stylePreference` state → `modalityPreference`, changes label and field name. Implements the "No tengo preferencia" mutual-exclusion rule from Flow 2.
- `app/admin/professionals/[id]/review/page.tsx` — replace `STYLE_MAP[s]` lookups (line 188) with map built from server-fetched modalities, render the re-classification banner when `needs_modality_review`.
- `app/p/[slug]/page.tsx` — replace `STYLE_MAP[s]` lookups (line 140) with the same DB-driven map.
- `app/admin/professionals/page.tsx` and `app/admin/leads/...` — verify no other STYLE_* readers exist (grep before write).
- New file: `migrations/010_holistic_modalities_catalog.sql`.
- New file: `lib/modalities.ts` — `getActiveModalities()` server helper returning `Modality[]`, plus `Modality` type.
- New file: `app/components/ModalityPicker.tsx` — `'use client'`, shared multi-select used by `RegistroForm`, `SolicitarForm`, and the admin re-classification banner. Props: `modalities: Modality[]`, `selected: string[]`, `onChange: (next: string[]) => void`, `label: string`, `helperText?: string`, `includeNoPreference?: boolean` (when `true`, renders the "No tengo preferencia" pill and enforces mutual exclusion: selecting it clears `selected`; selecting any modality is implicitly "preference set"). Controlled component — does not own state. Renders chips with existing design tokens (`bg-brand-weak`/`text-brand` selected, `bg-surface`/`border-outline` unselected, matches today's `solicitar`/`registro` chip pattern).

### Canonical seed list (15)
| key | label (es-AR) | slug | sort_order |
|-----|---------------|------|------------|
| `reiki` | Reiki | `reiki` | 10 |
| `constelaciones-familiares` | Constelaciones familiares | `constelaciones-familiares` | 20 |
| `registros-akashicos` | Registros akáshicos | `registros-akashicos` | 30 |
| `diseno-humano` | Diseño humano | `diseno-humano` | 40 |
| `terapia-floral` | Terapia floral (Flores de Bach) | `terapia-floral` | 50 |
| `masaje-terapeutico` | Masaje terapéutico | `masaje-terapeutico` | 60 |
| `meditacion-mindfulness` | Meditación y mindfulness | `meditacion-mindfulness` | 70 |
| `biodecodificacion` | Biodecodificación | `biodecodificacion` | 80 |
| `sonoterapia` | Sonoterapia | `sonoterapia` | 90 |
| `tarot-terapeutico` | Tarot terapéutico | `tarot-terapeutico` | 100 |
| `astrologia` | Astrología | `astrologia` | 110 |
| `coaching-ontologico` | Coaching ontológico | `coaching-ontologico` | 120 |
| `aromaterapia` | Aromaterapia | `aromaterapia` | 130 |
| `yoga-terapeutico` | Yoga terapéutico | `yoga-terapeutico` | 140 |
| `terapia-energetica` | Terapia energética (otras) | `terapia-energetica` | 150 |

`sort_order` uses gaps of 10 so admin can later splice new entries (e.g. `numerologia` at 95) without touching existing rows.

## Research Findings

### Methodology
Seven web searches across Argentine and Spanish holistic-therapy directories (View Buenos Aires, Sanadores Argentinos, Camino al Ser, Centro Holístico, Silvaia, Naturpeutic, Red Holística, Buddhoom, Vitalidad Holística), modality-specific keyword searches, and the closest-competitor signal — Nomada (`minomada.app/directorio`).

### Key findings
- **Closest competitor (Nomada, Argentina) lists 20 categories**: Yoga, Meditación, Breathwork, Reiki, Sound Healing, Tarot, Astrología, Coaching, Nutrición Holística, Terapia Floral, Aromaterapia, Masaje Terapéutico, Biodescodificación, Constelaciones Familiares, Radiestesia, Psicología, Health Coach, Diseño Humano, Musicoterapia, Danzaterapia, Registros Akáshicos. We chose ~15 because Nomada's 20 includes adjacencies (Psicología, Health Coach, Nutrición) that don't fit Hará's holistic-wellness focus.
- **Spain directories (Silvaia) group by outcome**, not modality (e.g., "Cuerpo y Salud Física", "Para Mujeres"). We stayed on modality grouping because (a) it matches Hará's `solicitar` form structure, (b) it's the dominant pattern in Argentina (the home market), (c) outcome grouping is a v2 conversation tied to a deeper UX redesign.
- **Naming-convention drift between markets**: "biodecodificación" (AR) / "biodescodificación" / "bioneuroemoción" (ES) all name the same practice. Catalog uses one canonical key (`biodecodificacion`) and one label; alternate spellings handled by future synonym table if needed.
- **Argentine vocabulary frequency** (across results): Reiki, Constelaciones, Registros Akáshicos, Diseño Humano, Biodecodificación, Coaching Ontológico, Tarot Terapéutico appeared in nearly every directory or practitioner page sampled. Spain results emphasized Reiki, Flores de Bach, Constelaciones, Mindfulness, Yoga.
- **Long-tail risk**: Numerología, Péndulo Hebreo, Breathwork, Kinesiología, Cristales, Acupuntura, Radiestesia, Musicoterapia, Danzaterapia all appear in real practitioner directories but are lower-frequency. Captured by the `terapia-energetica` umbrella for v1, properly catalogued via the deferred submission/review workflow.

### Sources
- [Nomada Directorio](https://minomada.app/directorio) — closest signal; 20-category Argentine wellness directory
- [Silvaia](https://www.silvaia.com/terapeutas) — outcome-grouped Spain directory
- [Camino al Ser Holístico](https://caminoalser.ar/terapias-holisticas/) — practitioner-facing AR site listing typical modalities
- [Centro Holístico BA](https://www.centroholistico.com.ar/) — Registros Akáshicos as a major category
- [Naturpeutic](https://naturpeutic.com/) — Spain/multi-market directory
- [Sanadores Argentinos](https://sanadoresargentinos.com/es/methods/) — AR practitioner directory

### Trade-offs and considerations
- **Umbrella vs. explicit** — `terapia-energetica` covers the long tail (reconexión, sanación pránica, gemoterapia, péndulo hebreo) for v1. Risk: pros pick the umbrella when they offer something specific. Mitigation: deferred submission workflow lets pros propose the specific modality to be added.
- **Bundled labels** — `meditacion-mindfulness` and `terapia-floral (Flores de Bach)` bundle close synonyms behind one row. Reduces filter clutter; loses precision on the difference between meditation traditions and floral systems.
- **Single key for `tarot`** — `tarot-terapeutico` is intentional. Plain divinatory tarot is a different audience than therapeutic/evolutionary tarot, and Hará is positioning toward the latter.

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| **Source of truth** | Database-driven (`modalities` table) | Hardcoding the list in three TS constants reproduces the drift problem this PRD exists to fix, and blocks the deferred submission/review workflow. The table is a one-time addition that pays for itself across both PRDs. |
| **PK shape** | `key text primary key` (no surrogate id) | Text arrays already exist in code (`professionals.style[]`, `leads.style_preference[]`). Keeping the array element a stable text key matches the existing data model and avoids a second join everywhere a label is rendered. |
| **No FK from `professionals.modalities[]` to `modalities.key`** | Plain text array, validated by UI | Postgres foreign-key support on array elements is poor (no native referential integrity for `text[]` element references). UI is the integrity layer; if a key is renamed or removed in the catalog, dashboards / migrations handle the cleanup. |
| **Migration strategy for the 45 pros** | Clear all + flag for admin re-classification | Auto-mapping psychotherapy keys to holistic ones produces wrong data. Clearing is honest about the discontinuity; the flag plus banner makes the work explicit and bounded (~30-60 min one-time). |
| **Column rename** | Rename `style[]` → `modalities[]` and `style_preference[]` → `modality_preference[]` | The post-pivot codebase shouldn't carry psychotherapy-coded names. Same migration that creates the catalog handles the rename so we pay the audit cost once. |
| **UI copy** | "Estilo terapéutico" → "Modalidad" | Modalidad is the dominant term across the AR/ES holistic directories sampled and matches Hará's product voice. |
| **Admin tooling** | Re-classification banner on existing review page | Existing surface, ~1-2h work, fits the natural admin workflow (admin already opens each pro to verify them). A dedicated batch UI is faster for admin but the work is one-time and 45 rows. |
| **Seed list size (15)** | 15 modalities | Larger than what PRODUCT.md names (8), smaller than Nomada's 20. Covers the high-frequency core; long tail captured by the umbrella `terapia-energetica` until the deferred submission workflow lands. |
| **No public API route** | Server components fetch directly; client surfaces receive list as prop | Two surfaces need it; both have natural server-component parents. Adding a route now is YAGNI — it's the deferred PRD's job if a non-Hará caller needs the catalog. |
| **Client-side data fetch pattern** | Server-component shell + `'use client'` form child (idiomatic RSC) | Both `/solicitar` and `/profesionales/registro` are currently fully-client pages. The alternative (`GET /api/modalities` + `useEffect` fetch) avoids the file split but adds a network round-trip on every page load, a 50–200ms loading flicker on the modality field, and contradicts the "no API route" decision above. The server-shell pattern is two new files and a one-time refactor; the API-route pattern is a per-pageload cost forever. |
| **Picker rendering** | Shared `<ModalityPicker>` client component (controlled) | Today's three picker surfaces (registro form, solicitar form, admin re-classification banner) would each be inline implementations of the same chip/pill UI — the same shape of duplication the catalog refactor exists to eliminate. A shared controlled component centralizes the mutual-exclusion rule for "No tengo preferencia" and is the natural home if we later add modality icons, descriptions, or search. Decoupled from the data-fetch decision above; the picker takes `modalities: Modality[]` as a prop. |
| **Out of scope: search/ranking changes** | Same logic, new values | This PRD is structural. Concierge ranking and directory order are a separate decision tied to how admin curates and how Destacado tier works. |
