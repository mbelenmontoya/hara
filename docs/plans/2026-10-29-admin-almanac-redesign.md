# Admin Almanac Redesign Implementation Plan

Created: 2026-10-29
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** The admin at /admin looks like Claude Design design 13 (almanac style, 13a desktop and 13b phone), runs on the real admin API, shows an unread number per section, and only the admin can get in.

## Out of Scope

- The practice form stays on its own pages (`/admin/practices/new`, `/admin/practices/[key]/edit`), restyled. It does not become the design's modal (user decision).
- PQLs stay in the menu and get restyled with the same admin pieces. The design has no PQL screen, so there is no PQL-specific design to match.
- No unread number on Prácticas, Analíticas or PQLs (the user picked Leads, Profesionales, Blog and Reseñas).
- The "Soy profesional" form (design 12) is a separate plan.
- No change to what any admin API returns, except the new `/api/admin/unread` route and the admin check in the middleware.

## Approach

**Chosen:** Rewrite `app/components/AdminLayout.tsx` as the almanac shell (sidebar on desktop, top bar and pill nav on phone, unread badges, toasts), add a small set of admin UI pieces in `app/admin/components/`, then restyle each existing page in place, keeping its current data fetching and API calls.
**Why:** Every feature the design shows already exists in the current pages and routes, so restyling in place keeps the working logic and its tests. The cost is that the large pages (`professionals/page.tsx` 443 lines, `review/page.tsx` 641 lines) must be split while they are restyled, so they end under the 440-line limit.

## Context for Implementer

- **Review pace update (user, 2026-11-06, after Task 5):** do Tasks 6 to 11 in one go and review everything at the end. Still run my own desktop browser check per task.
- **Review pace (user decision): page by page.** After each task that changes a page (Tasks 3 to 10), stop, start or reuse the dev server, and ask the user to check that page in the browser before the next task starts. Do not batch pages.
- **Design source.** Claude Design project `d0e3236f-a77b-4d60-b083-b3dd4cdd9da2`, file `Hara Vital App.dc.html`, section `t13`. The local copy is at `/private/tmp/claude-501/-Users-belenmontoya-Desktop-repos-hara/7ec11e52-ddee-4379-9900-4f342bbc26ba/scratchpad/design/app.html` (markup lines 34 to 445: 13a desktop from line 37, 13b phone from line 243). Its logic is in `logic.js` in the same folder (the `rvA` function, lines 535 to 707). It holds every state, toast text and validation message. If the copy is gone, read it through the `claude_design` MCP (`read_file`, or `render_preview` and download `serve_url`). Never show `serve_url` to the user. The design's names, emails and numbers (Valeria Sosa, HV-XXXX, etc.) are placeholders. Never ship them.
- **Colors map to existing tokens, no new hex values** (the same mapping the public almanac pages use): page `#F7EDE8` → `bg-background`; cream cards `#FBF6F2` → `bg-gray-50`; ink and selected `#221E29` → `bg-foreground` / `text-foreground`; primary action `#7B4238` → `bg-brand-dark`; accent `#B57261` → `brand`; muted text `#5E5550`/`#7B706B` → `text-muted` / `text-gray-700`; skeleton `#EBE4D9` → `bg-surface-2`; status greens, ambers and reds → the `success`, `warning` and `danger` `-weak`/`-dark` tokens. Fonts: titles use `font-almanac-serif` (Instrument Serif), everything else `font-almanac` (Jost). Both are unlayered classes in `app/globals.css`, because the global `h1..h6` rule beats Tailwind utilities.
- **Copy rules.** Argentine vos. No em or en dashes anywhere. The design uses `name — specialty` in the match picker and `start – end` in date ranges, so write `name · specialty` and `start al end`. Also remove the dashes already in the admin copy you touch (for example `BlogReviewClient.tsx:102`). An empty field shows a muted italic line ("No dejó email"), never a blank.
- **Every list** needs a loading state (skeleton cards plus "Cargando…"), an empty state and a no-results state with "Limpiar búsqueda". Every action shows a toast. Every destructive action (delete, reject, discard, deactivate, hide) asks for confirmation first. The existing `Modal` (`app/components/ui/Modal.tsx`) already becomes a bottom sheet on phones (`items-end sm:items-center`), so restyle it rather than replacing it.
- **Admin pages** must work at 402px wide (13b): the nav turns into pills, tables turn into cards, and dialogs turn into bottom sheets.
- **Phone checks (user decision 2026-11-06):** the admin is used on desktop. Keep building the phone layout from 13b, but do not test it in the browser. Browser checks are desktop only, and TS-006 is dropped.

## Runtime Environment

- **Start:** `npm run dev > /tmp/hara-dev.log 2>&1 & echo $! > /tmp/hara-dev.pid` (port 3000). **Stop:** only `kill "$(cat /tmp/hara-dev.pid)"`, never by port.
- **Health:** `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/admin/login` returns 200.
- Browser checks use Claude in Chrome in a new tab. The admin needs a signed-in admin session. The user signs in themselves, and Claude never types passwords.

## Assumptions

- The user runs `migrations/025_admin_read_at.sql` in the Supabase SQL editor before the unread numbers can work. Until then, `GET /api/admin/unread` fails and the menu shows no numbers, without breaking the admin. Tasks 2 and 3 depend on this.
- The user sets `ADMIN_EMAILS` in `.env.local` and in Vercel before anything is pushed. Without it nobody can enter the admin, because the check fails closed. Task 1 depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| A deploy without `ADMIN_EMAILS` locks the admin out | Medium | High | Task 1 adds `ADMIN_EMAILS` to `.env.example` with a comment, and the final report tells the user to set it in Vercel before pushing. The login page shows "Esta cuenta no tiene acceso al admin." so the cause is visible. |
| A redirect loop for a signed-in non-admin (`/admin/login` sends any user to `/admin/leads`, which sends a non-admin back) | High if missed | High | Task 1 changes the `/admin/login` rule to redirect only admins, and a middleware test covers a signed-in non-admin on `/admin/login`. |
| Restyling breaks existing page tests that query old text or classes | High | Low | Each task runs the full unit project. Tests that assert behaviour stay. Only text queries that changed with the copy get updated, and assertions are never loosened (testing rule). |

## E2E Test Scenarios

### TS-001: Admin shell, login and logout
**Priority:** Critical
**Preconditions:** Dev server running. The user is signed out.
**Mapped Tasks:** Task 1, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/leads` | Redirected to `/admin/login`, which shows the almanac login (serif title, email and password fields, "Ingresar") |
| 2 | Click "Ingresar" with both fields empty | "Completá tu email y tu contraseña." under the form, no request sent |
| 3 | The user signs in as the admin | Lands on Solicitudes. The sidebar shows Leads, Profesionales, Prácticas, PQLs, Analíticas, Blog, Reseñas, with Leads selected (ink background) |
| 4 | Read the sidebar footer | Shows the signed-in email and "Salir" |
| 5 | Click "Salir" | Back on `/admin/login`. Navigating to `/admin/leads` redirects to the login again |

### TS-002: Leads list, detail and Crear match
**Priority:** Critical
**Preconditions:** Signed in as admin. At least one lead exists (real data).
**Mapped Tasks:** Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/leads` | Title "Solicitudes" with the real count, a search box, status pills (Todos, Nuevo, Matcheado, Contactado, Convertido, Cerrado), cards in 2 columns on desktop |
| 2 | Type a string that matches nothing | "Sin resultados" card with "Limpiar búsqueda". Clicking it restores the list |
| 3 | Click "Ver detalle" on a lead | Detail with identifier, status badge, urgency chip, "Creada el … a las …", Contacto y contexto rows (empty ones in muted italics), Qué está buscando chips, Lo que contó, Match actual |
| 4 | On a lead without a match, click "Crear match" and submit with nothing picked | "Seleccioná 3 profesionales." |
| 5 | Pick the same professional twice, then submit | "Los 3 profesionales deben ser distintos." The picker labels use "Nombre · especialidad" with no dash |

### TS-003: Unread numbers
**Priority:** High
**Preconditions:** Migration 025 run. Signed in as admin. A new lead was created after the migration (via `/solicitar`).
**Mapped Tasks:** Task 2, Task 3, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/leads` | The Leads menu item shows a number ≥ 1 |
| 2 | Open that new lead's detail page | The Leads number goes down by 1 |
| 3 | Go back to the list | The number stays down after a reload |

### TS-004: Professional review and Destacado
**Priority:** Critical
**Preconditions:** Signed in as admin. At least one professional exists.
**Mapped Tasks:** Task 5, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/professionals` | "Pendientes de revisión (n)" group first, then "Revisados (n)". Cards show the name, a status dot, 2 specialty chips (+n), location, "Registrado …" |
| 2 | Click "Eliminar" on a card, then "Cancelar" in the confirmation | The confirmation closes and nothing is deleted |
| 3 | Open "Pasar a Destacado" on an active profile and click save with no amount | "Ingresá el monto del pago." and nothing saved |
| 4 | Close the modal and open a profile's review page | Score ring with the total, the criteria list with points, Sobre, Datos de contacto, Perfil profesional, and the action bar for its status |
| 5 | Click a criterion | It becomes editable with − and +. Changing it updates the total |

### TS-005: Prácticas, Analíticas, Blog, Reseñas, PQLs
**Priority:** High
**Preconditions:** Signed in as admin.
**Mapped Tasks:** Task 7, Task 8, Task 9, Task 10

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/practices` and click "Desactivar" on an active practice | A confirmation names the practice and how many professionals use it. "Cancelar" closes it and nothing changes |
| 2 | Navigate to `/admin/analytics`, click "7 días", then click a professional | The table updates. The chart panel shows that professional's three lines, or "Sin datos en este período" |
| 3 | Navigate to `/admin/blog` | Pills "Pendientes (n)", "Publicadas (n)", "Rechazadas (n)" with real counts |
| 4 | Navigate to `/admin/reviews` and click "Ocultar" on a review | A confirmation appears. On confirm, a toast "Reseña oculta." and the card moves to Ocultas |
| 5 | Navigate to `/admin/pqls` | The page uses the same almanac title, pills and cards as the other admin pages |

### TS-006: Phone layout
**Priority:** High
**Preconditions:** Signed in as admin. Window resized to 402px wide.
**Mapped Tasks:** Task 3, Task 4, Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/leads` | Top bar with the logo, "ADMIN" and "Salir". Nav pills scroll sideways, and there is no horizontal page scroll |
| 2 | Click the "Profesionales" pill | The Profesionales page loads with the pill selected |
| 3 | Open the delete confirmation on a card | It opens as a bottom sheet |

## Progress Tracking

- [x] Task 1: Only the admin gets into /admin and /api/admin
- [x] Task 2: Unread tracking (migration 025, lib, /api/admin/unread)
- [x] Task 3: Almanac admin shell, toasts and login
- [x] Task 4: Leads list, lead detail and Crear match
- [x] Task 5: Profesionales list, Destacado payment and delete
- [x] Task 6: Professional review page
- [x] Task 7: Prácticas list, suggestions and form pages
- [x] Task 8: Analíticas
- [x] Task 9: Blog queue and note review
- [x] Task 10: Reseñas and PQLs
- [x] Task 11: Docs

## Implementation Tasks

### Task 1: Only the admin gets into /admin and /api/admin

**Objective:** Fix ISSUES 18. Today `middleware.ts` lets any signed-in Supabase user into the admin, including professionals who sign in at `/pro/login`. After this task, only emails listed in `ADMIN_EMAILS` get in. A signed-in non-admin is sent to the login with an error on pages, and gets a 403 on the API. Verified by TS-001.

**Files:**

- Create: `lib/admin-auth.ts`
- Modify: `middleware.ts`
- Modify: `app/admin/login/page.tsx` (only to read `?error=no-access` and show the message; the restyle comes in Task 3)
- Modify: `.env.example`
- Test: `middleware.test.ts`, `lib/admin-auth.test.ts`

**Key Decisions / Notes:**

- `lib/admin-auth.ts` exports `isAdminEmail(email: string | null | undefined): boolean`. It reads `process.env.ADMIN_EMAILS` (comma-separated), trims and lowercases each entry, and compares with the lowercased email. An empty or missing list returns `false`, so the check fails closed.
- In `middleware.ts`, an admin route with a user who is not an admin: `/api/admin/*` returns `NextResponse.json({ error: 'Forbidden' }, { status: 403 })`, and `/admin/*` redirects to `/admin/login?error=no-access`. The `/admin/login` rule (`middleware.ts:25`) must redirect to `/admin/leads` only when `isAdminEmail(user.email)`. Otherwise it lets the login page render, which prevents a redirect loop. `/pro/*` rules stay as they are.
- `/api/debug` is in `isProtectedRoute` today, so give it the same admin check as `/api/admin`.
- The login page shows "Esta cuenta no tiene acceso al admin." when `error=no-access` is set.
- `.env.example` gets `ADMIN_EMAILS=` with a one-line comment. Never print `.env.local`.

**Definition of Done:**

- [ ] A signed-in non-admin on `/admin/leads` is redirected to `/admin/login?error=no-access` (test).
- [ ] A signed-in non-admin on `/api/admin/leads` gets 403 (test).
- [ ] A signed-in non-admin on `/admin/login` gets the page, not a redirect (test).
- [ ] An admin email (any case, with spaces in the list) gets through, and an empty `ADMIN_EMAILS` lets nobody in (`lib/admin-auth.test.ts`).
- [ ] Existing `/pro` middleware tests still pass.
- [ ] Verify: `npx vitest run --project unit middleware.test.ts lib/admin-auth.test.ts`

### Task 2: Unread tracking (migration 025, lib, /api/admin/unread)

**Objective:** Add a way to remember what the admin has opened, so the menu can show unread numbers for Leads, Profesionales, Blog and Reseñas. An item stops counting as unread when the admin opens it. For reviews, which have no detail page, they count as read when the admin opens the Reseñas page. Verified by TS-003.

**Files:**

- Create: `migrations/025_admin_read_at.sql`
- Create: `lib/admin-unread.ts`
- Create: `app/api/admin/unread/route.ts`
- Test: `app/api/admin/unread/route.test.ts`

**Key Decisions / Notes:**

- The migration follows the style of `migrations/023_leads_additional_context.sql` (header comment, rollback lines, `BEGIN`/`COMMIT`). It adds `admin_read_at TIMESTAMPTZ` (nullable) to `leads`, `professionals`, `blog_posts` and `reviews`, and sets `admin_read_at = now()` on every existing row, so every number starts at 0 (user decision). New rows default to `NULL`, which means unread. The user runs it in the SQL editor. Never run it from the session.
- `lib/admin-unread.ts` exports `UNREAD_KINDS = ['leads', 'professionals', 'blog', 'reviews'] as const`, a map from kind to table (`blog` → `blog_posts`), `countUnread()` (4 `select('id', { count: 'exact', head: true }).is('admin_read_at', null)` queries in `Promise.all`), and `markRead(kind, id?)`. With an id it updates that row where `admin_read_at` is null. With kind `reviews` and no id, it marks every unread review read. It uses `supabaseAdmin`.
- `GET /api/admin/unread` returns `{ leads, professionals, blog, reviews }`. `POST` takes `{ kind, id? }`. It returns 400 for an unknown kind, and 400 for a missing id when kind is not `reviews`. A DB error returns 500 and is logged with `logError` (it fails before migration 025 runs, and the UI handles that).
- Follow the mocking pattern of `app/api/admin/professionals/[id]/route.test.ts` for `supabaseAdmin`.

**Definition of Done:**

- [ ] GET returns the four counts from the `admin_read_at IS NULL` filter, and the test asserts the filter and the table per kind, not only the response.
- [ ] POST `{ kind: 'leads', id }` updates `leads` for that id only. POST `{ kind: 'reviews' }` updates all unread reviews. POST `{ kind: 'nope' }` and POST `{ kind: 'leads' }` without an id return 400.
- [ ] A DB error returns 500.
- [ ] Verify: `npx vitest run --project unit app/api/admin/unread`

### Task 3: Almanac admin shell, toasts and login

**Objective:** Rewrite `AdminLayout` as the design's shell. On desktop it has a 236px sidebar with the logo, "ADMIN", the nav with unread badges, the signed-in email and "Salir". On a phone it has a top bar and sideways-scrolling nav pills. It also provides toasts for every page and restyles the login. Verified by TS-001 and TS-006. Stop here for the user's browser review.

**Files:**

- Modify: `app/components/AdminLayout.tsx`
- Create: `app/admin/components/AdminToast.tsx`
- Modify: `app/admin/login/page.tsx`
- Test: `app/components/AdminLayout.test.tsx`, `app/admin/login/page.test.tsx`

**Key Decisions / Notes:**

- Nav items in this order: Leads, Profesionales, Prácticas, PQLs, Analíticas, Blog, Reseñas (`/admin/reviews`). The active item has ink background and cream text (`bg-foreground text-background`), the others are transparent. The badge shows only when the unread number is > 0, on Leads, Profesionales, Blog and Reseñas.
- `AdminLayout` takes an optional `markRead?: { kind: UnreadKind; id?: string }` prop. On mount it POSTs the mark-read first (when given), then GETs `/api/admin/unread`. If the GET fails, it shows no badges and nothing else changes.
- The email comes from `createClient().auth.getUser()` (`lib/supabase/client.ts`). "Salir" calls `auth.signOut()`, then `router.push('/admin/login')` and `router.refresh()`.
- `AdminToast.tsx` exports `AdminToastProvider` and `useAdminToast()`, which returns `show(text, kind?: 'ok' | 'err')`. The layout renders the provider. The toast is a bottom pill (`bg-foreground`, or `bg-danger-dark` for errors) inside an `aria-live="polite"` region, and it hides after 3800 ms (`TOAST_MS`, the design's value).
- Logo: `/assets/logo/isotipo.png` (the public almanac pages use it, and the design's wordmark SVG is a whole artboard sheet). The login is a centered cream card with a serif title, email and password, a "Ingresar" button (`bg-brand-dark`, "Ingresando..." while busy), "Completá tu email y tu contraseña." when a field is empty, and the existing error messages, including Task 1's no-access one.

**Definition of Done:**

- [ ] The layout test asserts the 7 nav links and their hrefs (including `/admin/pqls` and `/admin/reviews`), a badge with the number from a mocked `/api/admin/unread`, no badge for 0, and that `markRead` POSTs before the GET.
- [ ] "Salir" calls `signOut` and goes to `/admin/login` (test).
- [ ] Login shows the empty-fields error without calling Supabase, and shows the no-access message for `?error=no-access` (test).
- [ ] At 402px the nav renders as pills and the page has no horizontal scroll (browser check).
- [ ] Verify: `npx vitest run --project unit app/components/AdminLayout.test.tsx app/admin/login` and TS-001 in Chrome

### Task 4: Leads list, lead detail and Crear match

**Objective:** Restyle `/admin/leads`, `/admin/leads/[id]` and `/admin/leads/[id]/match` to the design, and add the shared admin pieces the rest of the pages reuse: page title, filter pills and search, cream card, status badge, skeleton, empty state and no-results state. Opening a lead's detail marks it read. Verified by TS-002 and TS-003. Stop here for the user's browser review.

**Files:**

- Create: `app/admin/components/AdminUI.tsx`
- Modify: `app/admin/components/AdminFilterBar.tsx`
- Modify: `app/admin/leads/page.tsx`, `app/admin/leads/[id]/page.tsx`, `app/admin/leads/[id]/match/page.tsx`
- Test: `app/admin/components/AdminFilterBar.test.tsx`, `app/admin/leads/[id]/page.test.tsx`

**Key Decisions / Notes:**

- `AdminUI.tsx` exports small presentational pieces only: `AdminTitle` (serif title plus count line), `AdminCard`, `StatusBadge` (label to token colors, covering lead, professional, blog, review and practice states), `AdminSkeleton` (3 fading cards plus "Cargando…"), `AdminEmpty` and `AdminNoResults` (with an `onClear` prop). Keep it under 300 lines.
- `AdminFilterBar` becomes the design's search box plus pills (ink when selected). Keep its current props and behaviour so its test still describes it.
- The card headline is `intent_tags[0]` (today's "primary need", `leads/page.tsx:111`), and the status shows its Spanish label from `LEAD_STATUS_LABEL` (today the raw status shows). The urgency dot colors are `Urgente` → danger, `Pronto` → warning, `Sin prisa` → muted. The match line reads `tracking_code · name · name · name`.
- The detail page passes `markRead={{ kind: 'leads', id }}` to `AdminLayout`. Empty texts: "No dejó email", "No dejó WhatsApp", "No indicó ubicación", "No contó nada más.". The match page keeps its existing validation messages and success screen. Picker options read `Nombre · especialidad`.

**Definition of Done:**

- [ ] The leads list shows the skeleton while loading, "Sin solicitudes" with no leads, and "Sin resultados" plus "Limpiar búsqueda" when filters match nothing (test or browser check).
- [ ] The lead detail renders muted italic empty texts for a lead with no email or WhatsApp, and passes `markRead` (test in `leads/[id]/page.test.tsx`).
- [ ] No em or en dash in the three pages: `grep -nP '[\x{2013}\x{2014}]' app/admin/leads -r` returns nothing.
- [ ] Verify: `npx vitest run --project unit app/admin` and TS-002 and TS-003 in Chrome

### Task 5: Profesionales list, Destacado payment and delete

**Objective:** Restyle `/admin/professionals` (pending group first, then reviewed group, cards with chips, the "Historial de pagos" disclosure), the Destacado payment modal and the delete confirmation. Split the 443-line page so it ends under 440 lines. Verified by TS-004. Stop here for the user's browser review.

**Files:**

- Modify: `app/admin/professionals/page.tsx`
- Create: `app/admin/professionals/components/ProfessionalCard.tsx`
- Modify: `app/admin/professionals/components/DestacadoPaymentModal.tsx`
- Test: `app/admin/professionals/components/DestacadoPaymentModal.test.tsx`

**Key Decisions / Notes:**

- Move the per-card markup and the payment-history disclosure into `ProfessionalCard.tsx`. Data loading, delete and the subscriptions fetch stay in the page.
- The card button reads "Revisar perfil" for pending and "Ver perfil" otherwise. "Pasar a Destacado" shows for active profiles and "Renovar Destacado" when already Destacado. "Eliminar" opens the confirmation, which names the person. On success, show the toast "Eliminaste el perfil de {nombre}.". Payment rows show `amount currency · start al end · Factura N or Sin factura · method`.
- The modal keeps its current fields, validation and POST to `/api/admin/subscriptions`. Only the look changes (pills for currency, period and method, and a "Destacado hasta el …" line). On success, show the design's toast "Pago registrado. {nombre} es Destacado hasta el {fecha}.".

**Definition of Done:**

- [ ] `page.tsx` is under 440 lines and `ProfessionalCard.tsx` under 300.
- [ ] The modal test still covers the missing-amount and custom-period validation and the POST body, with no assertion loosened.
- [ ] The delete confirmation's Cancelar leaves the list unchanged (browser check).
- [ ] Verify: `npx vitest run --project unit app/admin/professionals` and TS-004 steps 1 to 3 in Chrome

### Task 6: Professional review page

**Objective:** Restyle `/admin/professionals/[id]/review` to the design: a header with the photo (upload or replace), name, status, "Registrado el …", slug, tier, ranking and rating, plus the score ring; the editable criteria list; Sobre, Datos de contacto and Perfil profesional with the practice mapping; and the action bar per status (approve or reject with a reason when pending, "Reenviar acceso" when active, the rejection reason when rejected). Split the 641-line page. Opening it marks the professional read. Verified by TS-004. Stop here for the user's browser review.

**Files:**

- Modify: `app/admin/professionals/[id]/review/page.tsx`
- Create: `app/admin/professionals/[id]/review/components/ReviewHeader.tsx`, `app/admin/professionals/[id]/review/components/ReviewSections.tsx`
- Modify: `app/admin/professionals/[id]/review/components/ScoreDisplay.tsx`, `PracticeMapper.tsx`, `PracticeReclassificationBanner.tsx`
- Test: the existing `ScoreDisplay.test.tsx`, `PracticeMapper.test.tsx`, `PracticeReclassificationBanner.test.tsx`

**Key Decisions / Notes:**

- The page keeps every fetch and handler (image upload, PATCH approve/reject, invite). The new components are presentational. The target is the page under 440 lines and each component under 300.
- Pass `markRead={{ kind: 'professionals', id }}` to `AdminLayout`.
- Empty texts follow the design (`rvAbout` and `rvContact` in `logic.js`): "Sin descripción corta", "Sin biografía", "No completó su experiencia", "Sin Instagram", "Sin dirección: usamos el centro de la ciudad", "Sin ranking", "Sin reseñas".
- Rejecting uses the restyled `Modal` with a required reason ("Escribí el motivo antes de rechazar."). Approve and reject results show as toasts with the design's texts. Approving is not blocked by unmapped practices today (`review/page.tsx` has no such guard), so do not add the design's "Mapeá todas las prácticas antes de aprobar." block. That would be new behaviour, and the user can ask for it later.

**Definition of Done:**

- [ ] `page.tsx` is under 440 lines and every new component under 300.
- [ ] The existing review-component tests pass with no assertion loosened.
- [ ] Rejecting without a reason shows the error and sends nothing (browser check).
- [ ] Verify: `npx vitest run --project unit app/admin/professionals` and TS-004 steps 4 and 5 in Chrome

> **Deviation (Task 6):** `ScoreDisplay.tsx` was left untouched because `/pro/perfil` also renders `ScoreRing` and `ScoreBreakdown`. The admin ring and editable criteria live in `ReviewHeader.tsx` and `ReviewSections.tsx` (`CriteriaCard`, tested in `ReviewSections.test.tsx`). `ScoreBreakdown`'s `onOverride` path is now unused; ask before removing it. `PracticeReclassificationBanner` was already unused before this work.

### Task 7: Prácticas list, suggestions and form pages

**Objective:** Restyle `/admin/practices`: the title "Prácticas" with the count line, the collapsible "Prácticas sugeridas por los profesionales (n)" box with discard, create and alias actions, practice rows with an Activa or Inactiva badge, and a deactivate confirmation. Also restyle the form pages `/admin/practices/new` and `/admin/practices/[key]/edit` in the same look (they stay pages, user decision). Verified by TS-005. Stop here for the user's browser review.

**Files:**

- Modify: `app/admin/practices/page.tsx`, `app/admin/practices/PracticesList.tsx`, `app/admin/practices/SuggestedPractices.tsx`
- Modify: `app/admin/practices/components/PracticeForm.tsx`, `app/admin/practices/new/page.tsx`, `app/admin/practices/[key]/edit/page.tsx`
- Test: `app/admin/practices/PracticesList.test.tsx`, `app/admin/practices/components/PracticeForm.test.tsx`

**Key Decisions / Notes:**

- Suggestions only carry `{ entry, count }` (`SuggestedPractices.tsx:104`), not who wrote them, so the design's "Escrita por Ana, Luis" line becomes "Escrita por {count} profesional(es)". "Crear" keeps linking to `/admin/practices/new?label=…` (`SuggestedPractices.tsx:130`).
- Discarding a suggestion and deactivating a practice each ask for confirmation first. The deactivate one shows "{n} profesionales la usan", using the usage count `loadAdminPracticesView` already returns. Toasts use the design's texts ("Descartamos “X” y la quitamos de los perfiles.", "X ya no aparece en el selector público.").
- `practices/page.tsx` is a server component. The toasts live in the client components (`PracticesList`, `SuggestedPractices`) through `useAdminToast`.

**Definition of Done:**

- [ ] Deactivate and discard both require confirmation, and Cancelar sends no request (tests in `PracticesList.test.tsx`, plus a browser check for discard).
- [ ] `PracticeForm` tests still cover key, slug and duplicate validation with no assertion loosened.
- [ ] Verify: `npx vitest run --project unit app/admin/practices` and TS-005 step 1 in Chrome

### Task 8: Analíticas

**Objective:** Restyle `/admin/analytics` to the design: 7, 30 and 90 day pills, the per-professional table (Vistas de perfil, Clics WhatsApp, Clics Instagram) that becomes cards on a phone, the selected row highlight, the chart panel with "Últimos N días · from al to", and "Descargar imagen". Verified by TS-005. Stop here for the user's browser review.

**Files:**

- Modify: `app/admin/analytics/page.tsx`
- Test: `app/admin/analytics/page.test.tsx`

**Key Decisions / Notes:**

- Keep `recharts` and the existing PNG download (`analytics/page.tsx:119`). Only change the line colors to tokens: views → foreground, WhatsApp → success, Instagram → brand. Keep the existing "Sin datos todavía" and "Sin datos en este período" states, and add the design's "Elegí a alguien de la tabla" panel when nobody is selected.
- The download shows the toast "Descargamos la imagen de {nombre}.".

**Definition of Done:**

- [ ] The existing analytics test passes with no assertion loosened. It is updated only where copy changed, and it still asserts the `days` query parameter on fetch.
- [ ] Verify: `npx vitest run --project unit app/admin/analytics` and TS-005 step 2 in Chrome

### Task 9: Blog queue and note review

**Objective:** Restyle `/admin/blog` (Pendientes, Publicadas and Rechazadas pills with real counts, search, cards with title, author, email, date, status and the unconfirmed-link flag) and `/admin/blog/[id]` (note preview, author rows, the professional link select, and approve or reject with a reason). Opening a note marks it read. Verified by TS-005. Stop here for the user's browser review.

**Files:**

- Modify: `app/admin/blog/page.tsx`, `app/admin/blog/[id]/page.tsx`, `app/admin/blog/[id]/BlogReviewClient.tsx`

**Key Decisions / Notes:**

- `blog/[id]/page.tsx` is a server component. It passes `markRead={{ kind: 'blog', id }}` to `AdminLayout`, which is a client component, so the prop is serializable.
- The flag uses `professional_id && !professional_link_confirmed` (`BlogReviewClient.tsx:44`). Rewrite the auto-link message without the dash: "Se vinculó solo por email a {nombre}. Confirmá o quitá el vínculo antes de publicar."
- Reject uses the restyled `Modal` with a required reason. Approve and reject show the design's toasts ("Nota publicada en el Diario.", "Nota rechazada. Le avisamos a {autor}.").
- `Trivial:` no new logic. The changes are markup and copy, and they are covered by `app/api/admin/blog/[id]/route.test.ts` plus TS-005 step 3.

**Definition of Done:**

- [ ] The pill counts match the number of posts per status (browser check against the list).
- [ ] Rejecting without a reason shows "Escribí el motivo antes de rechazar." and sends nothing (browser check).
- [ ] Verify: `npx vitest run --project unit app/admin app/api/admin/blog` and TS-005 step 3 in Chrome

### Task 10: Reseñas and PQLs

**Objective:** Restyle `/admin/reviews` (Visibles and Ocultas pills with counts, search, cards with reviewer, professional, stars, text, date and badge, and hide or show with a confirmation for hide), and mark every unread review read when the page opens. Also restyle `/admin/pqls` with the same admin pieces (title, pills, cards, the adjust modal), since the design has no PQL screen (user decision). Verified by TS-005. Stop here for the user's browser review.

**Files:**

- Modify: `app/admin/reviews/page.tsx`, `app/admin/pqls/page.tsx`

**Key Decisions / Notes:**

- The reviews page passes `markRead={{ kind: 'reviews' }}`.
- The PATCH to `/api/admin/reviews/[id]` does not return the new rating, so the toast says "Reseña oculta." or "Reseña visible otra vez." without the design's "rating pasa de X a Y" part.
- PQLs keep every fetch and the adjust flow (`pqls/page.tsx:115`). Only the look changes, using `AdminUI` pieces and the restyled `Modal`.
- `Trivial:` no new logic. The changes are markup plus one prop, and they are covered by `app/api/admin/unread/route.test.ts` (mark-all for reviews) plus TS-005 steps 4 and 5.

**Definition of Done:**

- [ ] Hiding a review asks for confirmation, and on confirm the card moves to Ocultas (browser check).
- [ ] After opening Reseñas, the Reseñas badge is gone on the next page (browser check).
- [ ] Verify: `npx vitest run --project unit` (full unit project) and TS-005 steps 4 and 5, plus TS-006, in Chrome

### Task 11: Docs

**Objective:** Bring the docs in line with what changed, so nobody reads stale facts about the admin.

**Files:**

- Modify: `CLAUDE.md` (the admin entry in Project Structure, `reviews/` and the shared `app/admin/components/`; the `ADMIN_EMAILS` requirement)
- Modify: `ISSUES.md` (move entry 18 to Done with the date)
- Modify: `.claude/plans/hara.md` (session log and status)
- Modify: `.claude/rules/component-standards.md`, `.claude/commands/feature-start.md`, `.claude/skills/code-reuse-enforcer/SKILL.md`, and the `.codex` mirrors, only if `AdminLayout`'s one-line description in them is now wrong

**Key Decisions / Notes:**

- `Trivial:` docs only.
- Update only what is now wrong. No new .md files.

**Definition of Done:**

- [ ] `git grep -n "PQLs\|pqls" CLAUDE.md` still lists the PQL page, and the CLAUDE.md admin tree lists `reviews/`.
- [ ] ISSUES 18 is under Done.
- [ ] Verify: `npx tsc --noEmit && npx vitest run --project unit && npm run build` (stop the dev server by its PID first, because the build rewrites `.next`)

## E2E Results

Live target: Tier 1, my dev server on port 3000 (PID in `/tmp/hara-dev.pid`), Claude in Chrome with the user's admin session. Desktop checks ran in a 1280px iframe inside the tab because the window could not be resized. Phone checks were dropped at the user's request (2026-11-06).

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | PASS | 0 | Login, sidebar with 7 links and email checked. "Salir" not clicked (it would sign the user out); covered by `AdminLayout.test.tsx` |
| TS-002 | Critical | PASS | 1 | List, "Sin resultados" plus "Limpiar búsqueda", detail, both match errors. Fixed: date read "6 de jun de 2026" and time "03:01 p. m." in Chrome. No real match submitted |
| TS-003 | High | PASS | 0 | Lead set unread showed "1" on Leads; opening its detail cleared it |
| TS-004 | Critical | PASS | 0 | Groups, Eliminar then Cancelar keeps 45, empty-amount error with no POST, review page ring and criteria (44 to 46 after two "+") |
| TS-005 | High | PASS | 0 | Prácticas (deactivate then Cancelar sends nothing, edit form), Analíticas (table, chart, totals), Blog (pill counts 0/3/0 match the API, note page), Reseñas and PQLs (empty states: no rows in the data) |
| TS-006 | Medium | SKIPPED | 0 | Dropped by the user: the admin is used on desktop only |

Not verified live, covered by unit tests instead: discarding a suggested practice (no suggestions in the data), rejecting a professional or a note (no pending rows), hiding a review (no reviews; hiding a real one changes a rating), the "Match creado" screen and "Descargar imagen" (would create real data or download a file).
