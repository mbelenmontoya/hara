# Hara Vital Author Override Implementation Plan

Created: 2026-06-08
Author: belu.montoya@dialpad.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Let an admin assign "Hara Vital" as the author of a blog post during approval, by adding it as a special option in the "Vínculo a profesional" dropdown on the admin review page. Posts authored by Hara Vital show the Hara logo on all public pages instead of a person name.

## Out of Scope

- **No public form change.** The `/blog/escribir` submission form is untouched — the Hara Vital option is admin-only.
- **No author email notification for Hara Vital posts.** When a post is published as Hara Vital, `notifyBlogPostPublished` is skipped (no individual to notify).
- **Reversibility (un-assign Hara Vital) is not in scope.** Once set, the admin can only re-approve via the normal flow. Clearing the editorial flag is a future task.

## Approach

**Chosen:** Add a `'hara-vital'` sentinel value to the existing professional dropdown in `BlogReviewClient.tsx`. The `PATCH /api/admin/blog/[id]` route detects this sentinel and sets a new `is_hara_editorial` boolean column on `blog_posts`. Public pages (`/blog` listing, `/blog/[slug]` detail) fetch this column and render the Hara isotipo logo when it's true.
**Why:** Sentinel in the existing dropdown costs zero new UI surface and reuses the PATCH route's existing professional-assignment logic — at the cost of a lightweight DB column (avoids fragile `author_name === 'Hara Vital'` string matching).

## Context for Implementer

The sentinel value `'hara-vital'` is detected by the API because it is 10 characters, whereas real professional IDs are 36-character UUIDs. Do NOT validate it against the `professionals` table — it should bypass that check entirely. The `isHaraVital` boolean in the client mirrors whether the `selectedProId === 'hara-vital'` so the UI can show a distinct label and suppress the dropdown when already editorial.

## Runtime Environment

- **Start command:** `npm run dev`
- **Port / URL:** http://localhost:3000 — admin pages under `/admin/blog`
- **Health check:** `GET /admin/blog` (requires admin session)

## Assumptions

- The `blog_posts` table supports adding a `boolean` column with a default — Task 1 depends on this (standard Supabase/Postgres, safe assumption).
- The Hara isotipo image is served from `/assets/logo/isotipo.png` (confirmed in `app/layout.tsx`). Tasks 2 and 3 depend on this path.

## Progress Tracking

- [x] Task 1: DB column + API route update
- [x] Task 2: Admin review UI (dropdown option + admin list badge)
- [x] Task 3: Public blog pages display the Hara logo

> Source of truth for completion. `spec-implement` toggles `[ ]` → `[x]` here.

## Implementation Tasks

### Task 1: DB column + API route update

**Objective:** Add `is_hara_editorial boolean DEFAULT false NOT NULL` to `blog_posts` via a Supabase SQL migration. Update `PATCH /api/admin/blog/[id]` to recognise the `'hara-vital'` sentinel: when `professional_id === 'hara-vital'`, set `author_name = 'Hara Vital'`, `is_hara_editorial = true`, `professional_id = null`, `professional_link_confirmed = false`, and skip `notifyBlogPostPublished`. Also skip `notifyBlogPostPublished` when the fetched post already has `is_hara_editorial = true` (re-approval path). Verified by TS-001.

**Files:**

- Modify: `app/api/admin/blog/[id]/route.ts`
- Test: `app/api/admin/blog/[id]/route.test.ts`

**Key Decisions / Notes:**

- **DB migration**: Run in Supabase SQL editor (or dashboard): `ALTER TABLE blog_posts ADD COLUMN is_hara_editorial BOOLEAN NOT NULL DEFAULT FALSE;` — no data loss, existing rows default to `false`.
- **API detection — insertion order is critical**: The `if ('professional_id' in body)` block at line 91 has three branches: `if (professional_id === null)` → `else if (typeof professional_id === 'string' && professional_id)` (UUID branch). The sentinel `'hara-vital'` is a non-empty string, so if the new clause is inserted AFTER line 92 (null check) but BEFORE line 95 (UUID branch), it works correctly. Concretely the structure must be:
  ```
  if ('professional_id' in body) {
    if (professional_id === 'hara-vital') {          // ← NEW — FIRST named branch
      update.author_name = 'Hara Vital'
      update.is_hara_editorial = true
      update.professional_id = null
      update.professional_link_confirmed = false
    } else if (professional_id === null) {           // existing
      ...
    } else if (typeof professional_id === 'string' && professional_id) {  // existing UUID
      ...
    }
  }
  ```
  No Supabase lookup for the sentinel — skip it entirely.
- **Email suppression**: Add `is_hara_editorial` to the `.select()` string at `route.ts:44` (the fetch query for the existing post): `'id, slug, title, status, author_email, professional_id, professional_link_confirmed, is_hara_editorial'`. Then in the notification block at line 129: `if (action === 'approve' && !post.is_hara_editorial)`. **If `is_hara_editorial` is omitted from the `.select()`, `post.is_hara_editorial` will be `undefined` (falsy), and the email fires incorrectly — this is the most likely implementation mistake.**
- **`UpdatePayload` type** (route.ts:70): add `author_name?: string; is_hara_editorial?: boolean` to the type.
- Existing tests in `route.test.ts` mock `supabaseAdmin` — add one new test: "when professional_id is 'hara-vital', sets author_name='Hara Vital', is_hara_editorial=true, professional_id=null, skips email".

**Definition of Done:**

- [ ] `PATCH /api/admin/blog/{id}` with `{ action: 'approve', professional_id: 'hara-vital' }` updates `author_name='Hara Vital'`, `is_hara_editorial=true`, `professional_id=null` in the DB
- [ ] `is_hara_editorial` is included in the `.select()` at route.ts:44 (verify by confirming `post.is_hara_editorial` is not `undefined` in the approval branch)
- [ ] `notifyBlogPostPublished` is NOT called when `is_hara_editorial` is set
- [ ] Verify: `npm run test:unit`

### Task 2: Admin review UI — dropdown option + list badge

**Objective:** Add "Hara Vital" as the first named option in the "Vínculo a profesional" select in `BlogReviewClient.tsx` (value `'hara-vital'`). When selected, show a distinct callout replacing the standard helper text so the admin knows this is an editorial override. In `handleAction`, treat `'hara-vital'` exactly like a UUID professional ID: pass it as `professional_id` in the PATCH body. On the admin blog list (`app/admin/blog/page.tsx`), fetch `is_hara_editorial` and show a "Hara Vital" pill badge on editorial posts. Verified by TS-002.

**Files:**

- Modify: `app/admin/blog/[id]/BlogReviewClient.tsx`
- Modify: `app/admin/blog/page.tsx`

**Key Decisions / Notes:**

- **Dropdown option**: Insert immediately after `<option value="">Sin vínculo</option>` and before the professionals list: `<option value="hara-vital">✦ Hara Vital (editorial)</option>`. The `✦` glyph is a lightweight visual separator; no SVG needed in a `<select>`.
- **Callout when 'hara-vital' selected**: Below the select, conditional on `selectedProId === 'hara-vital'`, render a small info banner (reuse `bg-brand-weak border-brand/20 text-brand` pattern from the existing `bg-info-weak` banner on line 101): "Esta nota se va a publicar como contenido editorial de Hara Vital. El nombre del autor va a mostrarse como 'Hara Vital' con el logo de Hara."
- **`handleAction` — no code change needed, but verify two paths**: (1) `selectedProId === 'hara-vital'` with `initialLink === ''` (typical case) → `'hara-vital' !== ''` is true → `body.professional_id = 'hara-vital'` sent ✓. (2) `selectedProId === ''` (admin leaves default) → `body.professional_id = null` sent ✓ — `'hara-vital'` is never confused with the empty-string guard. **Invariant the logic depends on**: the API always stores `professional_id = null` (not `'hara-vital'`) when Hara Vital is selected, so on page reload `initialLink = post.professional_id ?? '' = ''`, never `'hara-vital'`. This invariant is guaranteed by the API design in Task 1.
- **Admin blog list badge**: `app/admin/blog/page.tsx` currently renders `author_name` and `status`. Add `is_hara_editorial` to the `BlogPost` interface and the `.select()` query. When `is_hara_editorial`, render a small pill `<span className="inline-flex items-center gap-1 text-xs font-medium text-brand bg-brand-weak rounded-full px-2 py-0.5">Hara Vital</span>` next to the author name cell.
- `Trivial:` The admin list badge is ≤ 5 lines in a server component; no new public symbol; covered by the build check.

**Definition of Done:**

- [ ] The dropdown in the admin review page shows "✦ Hara Vital (editorial)" as an option
- [ ] Selecting it shows the editorial callout banner
- [ ] Submitting "Aprobar y publicar" with Hara Vital selected calls PATCH with `professional_id: 'hara-vital'`
- [ ] Admin blog list shows a "Hara Vital" pill on posts where `is_hara_editorial=true`
- [ ] Verify: `npm run lint && npm run build`

### Task 3: Public blog pages — Hara logo as author

**Objective:** Update the public blog listing (`/blog`) and blog detail (`/blog/[slug]`) pages to display the Hara isotipo logo (`/assets/logo/isotipo.png`) + "Hara Vital" in the author byline when `is_hara_editorial=true`, replacing the plain text author name. On the detail page, the professional card ("Escrito por" section) is hidden for editorial posts. Verified by TS-003.

**Files:**

- Modify: `app/blog/page.tsx`
- Modify: `app/blog/[slug]/page.tsx`

**Key Decisions / Notes:**

- **Blog listing byline** (currently `app/blog/page.tsx:92`): replace `por {post.author_name}` with a conditional:
  ```tsx
  {post.is_hara_editorial
    ? <span className="inline-flex items-center gap-1.5">
        <img src="/assets/logo/isotipo.png" alt="Hara" className="w-4 h-4 object-contain" />
        Hara Vital
      </span>
    : <>por {post.author_name}</>
  }
  ```
  Add `is_hara_editorial: boolean` to the `BlogPost` interface and `.select()` at `page.tsx:35`.
- **Blog detail byline** (currently `app/blog/[slug]/page.tsx:76`): same conditional for the `por {post.author_name}` span. Add `is_hara_editorial` to the interface and `.select()` at line 25.
- **Professional card suppression**: the "Escrito por" card at `app/blog/[slug]/page.tsx:107` is already conditional on `professional` (the resolved pro). When `is_hara_editorial=true` the `professional_id` is null, so `professional` resolves to null and the card is already suppressed — verified: `app/blog/[slug]/page.tsx:40` guards the lookup with `if (post.professional_id && post.professional_link_confirmed)`. Since `professional_id = null` for Hara Vital posts, `professional` stays `null` and the card never renders. Do NOT add a separate `is_hara_editorial` check — it's redundant.
- **Next.js Image**: use `<img>` (not `<Image>`) consistent with the rest of the file (cover images at lines 76/63 use `<img>`). Add `// eslint-disable-next-line @next/next/no-img-element` per the existing pattern.
- `Trivial:` Blog detail professional card: zero net lines — existing guard at page.tsx:40 covers it; verified against the source. Covered by TS-003.

**Definition of Done:**

- [ ] Blog listing shows the Hara isotipo logo + "Hara Vital" (no "por") on editorial posts
- [ ] Blog detail shows the Hara isotipo logo in the author byline on editorial posts
- [ ] The "Escrito por / Ver perfil" professional card is NOT shown on editorial posts
- [ ] Non-editorial posts are unaffected — still show `por {author_name}` as before
- [ ] Verify: `npm run lint && npm run build`

## E2E Test Scenarios

### TS-001: Admin assigns Hara Vital and publishes
**Priority:** Critical
**Preconditions:** Dev server running; a blog post exists in `submitted` status; logged in as admin at `/admin/blog/{id}`.
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/blog/{id}` for a submitted post | Review page loads with "Vínculo a profesional" dropdown |
| 2 | Open the dropdown | "✦ Hara Vital (editorial)" appears as the first option after "Sin vínculo" |
| 3 | Select "✦ Hara Vital (editorial)" | Editorial callout banner appears below the dropdown |
| 4 | Click "Aprobar y publicar" | Redirects to `/admin/blog` |
| 5 | Check the admin blog list | The published post shows a "Hara Vital" pill badge next to the author name |

### TS-002: Admin blog list shows Hara Vital badge
**Priority:** High
**Preconditions:** At least one post with `is_hara_editorial=true` exists.
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/blog` | Blog list renders |
| 2 | Find the Hara Vital post | A purple "Hara Vital" pill badge is visible next to the author name |

### TS-003: Public blog shows Hara logo on editorial posts
**Priority:** Critical
**Preconditions:** A published post with `is_hara_editorial=true` exists.
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/blog` | Blog listing shows the Hara isotipo logo + "Hara Vital" (no "por") on the editorial post card |
| 2 | Click the editorial post | Detail page loads |
| 3 | Check the author byline | Hara logo + "Hara Vital" shown; no "por {name}" plain text |
| 4 | Check for the professional card | "Escrito por / Ver perfil" card is NOT present |
| 5 | Check a regular (non-editorial) post | Shows normal `por {author_name}` — unaffected |

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001   | Critical | PASS   | 0 | Dropdown shows "✦ Hara Vital (editorial)", callout banner appears, approval sets author_name="Hara Vital", post published |
| TS-002   | High     | PASS   | 0 | "Hara Vital" pill badge visible in admin list next to "Publicada" status |
| TS-003   | Critical | PASS   | 0 | Hara logo + "Hara Vital" (no "por") shown on /blog listing and /blog/[slug] detail; no professional card |

**Code review found and fixed:** Email notification was firing on first Hara Vital assignment (`post.is_hara_editorial` is `false` in the pre-update fetch). Fixed: added `professional_id !== 'hara-vital'` to the email guard + added assertion to the sentinel test.
