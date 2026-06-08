# Blog with Admin Approval Implementation Plan

Created: 2026-06-07
Author: belu.montoya@dialpad.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Anyone can submit a blog post through a public form (title, rich-text body, cover image + 1 optional image, name, email). The post lands in an admin moderation queue with `submitted` status and is invisible to the public until an admin approves it. On submit, if the author's email matches an **active** professional, the post auto-links to that profile (admin can override during review); published posts show a link back to the profile, and the profile lists the professional's posts. Approved posts appear on a public `/blog` index and at `/blog/[slug]`.

## Out of Scope

- **Editing/versioning published posts.** v1 is submit → approve/reject. No author-side edit-after-publish, no revision history. Admin can reject; re-submission is a new post.
- **Comments, likes, tags/categories, pagination on the index.** Index is a flat newest-first list. (Pagination is a fast follow-up if volume grows.)
- **Public authentication.** There is no public login; author identity is the self-entered email, validated only by format. Profile-linking is by email match against active professionals, not by authenticated identity.
- **Draft auto-save / unsubmitted drafts.** The form is fill-and-submit; nothing is persisted until submit.
- **SEO metadata beyond a basic title/description** on the detail page.

## Approach

**Chosen:** Mirror the existing professional-moderation stack for a new `blog_posts` table — public submission route modeled on `app/api/professionals/register/route.ts` (insert-then-upload-image-by-ID, slug generation, admin email), admin review modeled on the professionals PATCH approve/reject (`app/api/admin/professionals/[id]/route.ts`), image storage via a new `blog-images` bucket added to `lib/storage.ts`, and public pages as service-role server components like `app/p/[slug]/page.tsx`. TipTap supplies the WYSIWYG editor; `isomorphic-dompurify` sanitizes the HTML server-side before storage and again on render.

**Why:** Every moving part already has a battle-tested pattern in this codebase — reusing them keeps the blog consistent with the rest of the admin/moderation surface and minimizes net-new abstractions. The only genuinely new dependencies are TipTap (editor) and DOMPurify (sanitizer); the cost is two new client/runtime deps and a security-critical sanitization seam that must be unit-tested.

## Context for Implementer

- **Status workflow is the spine.** `blog_posts.status ∈ {submitted, published, rejected}`. Public pages query `status = 'published'` ONLY; the admin queue sees all. Approval sets `status='published'` + `published_at=NOW()`. This mirrors `professionals.status` and `STATUS_CONFIG` in `lib/design-constants.ts`.
- **All blog DB access goes through `supabaseAdmin` (service role).** Public server components (`/blog`, `/blog/[slug]`) read via `supabaseAdmin` exactly like `app/p/[slug]/page.tsx` does — no anon RLS policies are added. `/admin/*` and `/api/admin/*` are gated by `middleware.ts`; public `/api/blog` is NOT gated and therefore MUST be rate-limited.
- **Sanitization is the security keystone (Task 2).** Body HTML originates from anonymous public users. It is sanitized with a strict allowlist before storage AND again on render (defense-in-depth). Never render `body_html` without passing it through `sanitizeBlogHtml` first.
- **Image upload is non-blocking but cover is required at submit.** Follow the register route: insert the row first, then upload images using the new post ID as the path. The form enforces a cover client-side; the API rejects a submission with no cover file, but a *storage* failure after insert is logged and non-blocking (admin sees the post without a cover), matching the professional pattern.

## Assumptions

- **The `blog-images` storage bucket can be created the same way `profile-images` was.** Task 1 includes the `storage.buckets` insert + public-read policy SQL; if `profile-images` was instead created via the Supabase dashboard, the implementer replicates that setup for `blog-images` (public bucket) — Tasks 3, 6, 8, 9 depend on public image URLs resolving.
- **`isomorphic-dompurify` runs under the Node runtime used by the API routes** (`export const runtime = 'nodejs'`). Task 2 depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Stored XSS via WYSIWYG HTML from anonymous submitters | High | Critical | Strict-allowlist `sanitizeBlogHtml` (Task 2) applied **before storage** (Task 3) and **again on render** (Tasks 8/9). Unit tests assert `<script>`, `onerror=`, and `javascript:` hrefs are stripped. |
| Public submission endpoint abused (spam/flood) | Medium | Medium | Rate-limit `POST /api/blog` by IP via existing `ratelimit` from `lib/rate-limit.ts` (Task 3), same pattern as other public endpoints. |
| Impersonation: someone submits a post under a professional's email to attach it to that profile | Medium | High | Auto-match is stored as a *tentative* suggestion (`professional_link_confirmed=false`, Task 3) and matches only `status='active'` pros. The public link-back (Tasks 8/9) renders ONLY when `professional_link_confirmed=true`, a flag only an admin can set via explicit confirmation in review (Task 6). An unconfirmed link is never publicly visible — the mitigation is enforced by the query filter, not admin vigilance. |

## E2E Test Scenarios

### TS-001: Submit a blog post
**Priority:** Critical
**Preconditions:** None (public). Dev server on `localhost:3000`.
**Mapped Tasks:** Task 3, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/blog/escribir` | Form renders: title, rich-text editor, name, email, cover upload (required), optional second image |
| 2 | Fill title, write body in the editor (bold + a link), name, email; attach a cover image | Fields accept input; editor shows formatting; cover filename shown |
| 3 | Click submit | Redirects to a confirmation state ("recibimos tu nota, la revisamos antes de publicar") |
| 4 | Visit `/blog` | The just-submitted post is NOT listed (still `submitted`) |

### TS-002: Admin approves a post → goes live
**Priority:** Critical
**Preconditions:** Logged in as admin; at least one `submitted` post exists.
**Mapped Tasks:** Task 5, Task 6, Task 7, Task 8

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/blog` | Submitted post appears in the queue with status badge |
| 2 | Open the post's review page | Rendered preview (sanitized), author, linked-professional dropdown, Approve/Reject |
| 3 | Click Approve | Status → published; redirect/refresh shows it under "Publicadas" |
| 4 | Visit `/blog` then open the post | Post is listed and its `/blog/[slug]` detail renders body + cover |

### TS-003: Admin rejects a post
**Priority:** High
**Preconditions:** Logged in as admin; a `submitted` post exists.
**Mapped Tasks:** Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the post's review page | Reject control with a reason field |
| 2 | Enter a reason and Reject | Status → rejected; post does NOT appear on `/blog` |

### TS-004: Linked professional — bidirectional link
**Priority:** High
**Preconditions:** An active professional exists; a published post whose `author_email` matched that professional (or admin linked it).
**Mapped Tasks:** Task 3, Task 8, Task 9

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the post at `/blog/[slug]` | Shows "Escrito por [name] — Ver perfil" linking to `/p/[slug]` |
| 2 | Open `/p/[slug]` | A "Notas de [name]" section lists the published post linking back to `/blog/[slug]` |

## Goal Verification

### Truths

1. A post submitted through the public form is never visible on any public surface (`/blog`, `/blog/[slug]`, or a professional profile) until an admin sets it to `published` — rejecting or leaving it `submitted` keeps it invisible. *(spans Tasks 3, 6, 7, 8, 9)*
2. HTML a submitter puts in the body that contains script or event-handler/`javascript:` payloads is neutralized: it is stored sanitized and rendered sanitized, so no injected script executes for a reader. *(spans Tasks 2, 3, 8, 9)*
3. A post can only display a "Ver perfil" link (and appear on a professional's profile) after an admin has explicitly confirmed the professional link — submitting under someone else's email alone never surfaces that post on their profile or links to it publicly. *(spans Tasks 1, 3, 6, 8, 9)*

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 step 1: `/blog/escribir` renders | Critical | LIVE_PASS | 0 | Title "Escribí una nota \| Hara Vital" confirmed |
| TS-001 step 4: submitted post not in `/blog` | Critical | LIVE_PASS | 0 | Empty state "Todavía no hay notas publicadas" shown; "Notas" active in nav |
| TS-002: Admin approves post → goes live | Critical | UNIT_VERIFIED | 0 | PATCH /api/admin/blog/[id] has 11 tests. Admin session required for browser E2E. /admin/blog correctly returns 307 (middleware-gated). |
| TS-003: Admin rejects post | High | UNIT_VERIFIED | 0 | Tested via PATCH route tests: status=rejected + reason stored, 409 on re-reject |
| TS-004: Bidirectional link | High | UNIT_VERIFIED | 0 | professional_link_confirmed guard verified in all query paths in blog/[slug]/page.tsx and p/[slug]/page.tsx |
| Goal Truth 1: non-published slug → 404 | N/A | LIVE_PASS | 0 | `curl /blog/nonexistent-slug-xyz` → 404 confirmed |

**Live-target probe summary:**
- Tier 1 (local port 3000): OK — dev server was running; `GET /blog` → 200
- Tier 2: Not attempted (Tier 1 succeeded)
- Tier 3: Not attempted (Tier 1 succeeded)

**Not verified:** Full TS-002/TS-003/TS-004 browser flows require admin session (no test credentials available). UNIT_VERIFIED via 22 route-level tests covering all state transitions.

## Progress Tracking

- [x] Task 1: Create `blog_posts` table + `blog-images` bucket (migration 021)
- [x] Task 2: `sanitizeBlogHtml` helper (DOMPurify allowlist) + tests
- [x] Task 3: Public submission API `POST /api/blog` (validate, sanitize, slug, email-link, upload, notify admin)
- [x] Task 4: Public submission form page `/blog/escribir` with TipTap editor
- [x] Task 5: Admin blog queue list `/admin/blog` + nav item
- [x] Task 6: Admin review page + `PATCH /api/admin/blog/[id]` (approve/reject/link, notify author)
- [x] Task 7: Public blog index `/blog`
- [x] Task 8: Public blog detail `/blog/[slug]`
- [x] Task 9: "Notas de [name]" section on professional profile `/p/[slug]`

## Implementation Tasks

### Task 1: Create `blog_posts` table + `blog-images` bucket (migration 021)

**Objective:** Add the `blog_posts` table that backs the entire feature, plus the public `blog-images` storage bucket for cover/secondary images. This is the data foundation every other task builds on.

**Files:**

- Create: `migrations/021_blog_posts.sql`

**Key Decisions / Notes:**

- Columns: `id UUID PK DEFAULT gen_random_uuid()`, `slug TEXT UNIQUE NOT NULL`, `status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','published','rejected'))`, `title TEXT NOT NULL`, `body_html TEXT NOT NULL`, `excerpt TEXT`, `author_name TEXT NOT NULL`, `author_email TEXT NOT NULL`, `professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL`, `professional_link_confirmed BOOLEAN NOT NULL DEFAULT false`, `cover_image_url TEXT`, `secondary_image_url TEXT`, `rejection_reason TEXT`, `published_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- **`professional_link_confirmed` gates the impersonation vector:** an email-match auto-link (Task 3) is stored as a *tentative suggestion* (`professional_id` set, `professional_link_confirmed=false`). The public profile link-back (Tasks 8/9) renders ONLY when `professional_link_confirmed=true`, which only an admin can set (Task 6). This prevents anyone who knows a professional's email from silently attaching a post to that profile.
- Indexes: `idx_blog_posts_status ON blog_posts(status)`, `idx_blog_posts_professional ON blog_posts(professional_id)`, `idx_blog_posts_published ON blog_posts(status, published_at DESC)`. Slug is already unique-indexed by the constraint.
- `ON DELETE SET NULL` on `professional_id` so deleting a professional doesn't break their posts (mirrors how `events` survive deletions).
- Bucket: `INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images','blog-images', true) ON CONFLICT (id) DO NOTHING;` plus a public-read storage policy. Follow exactly how `profile-images` is configured (see `lib/storage.ts` BUCKET = 'profile-images'); if that bucket was made via the dashboard, replicate the same setup for `blog-images`.
- Wrap schema changes in `BEGIN; ... COMMIT;` and include a commented rollback block, matching the style of `migrations/010_holistic_practices_catalog.sql`.

**Definition of Done:**

- [ ] Migration creates `blog_posts` with all columns, the status CHECK, the FK, and the three indexes.
- [ ] Migration creates (or documents, matching `profile-images`) the public `blog-images` bucket.
- [ ] Verify: `psql`/Supabase SQL run applies cleanly and is idempotent on re-run (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).

### Task 2: `sanitizeBlogHtml` helper (DOMPurify allowlist) + tests

**Objective:** Provide the single sanitization function used to neutralize submitter-authored HTML, both before storage and on render. This is the security keystone for the whole feature.

**Files:**

- Create: `lib/sanitize.ts`
- Create: `lib/sanitize.test.ts`

**Key Decisions / Notes:**

- Add dependency `isomorphic-dompurify`. Export `sanitizeBlogHtml(html: string): string` and `htmlToExcerpt(html: string, max = 200): string` (strips all tags, collapses whitespace, truncates — used for the index card excerpt).
- Allowlist only: `p, br, strong, em, u, h2, h3, ul, ol, li, blockquote, a`. Allowed attrs: `href` (on `a`) + force `rel="noopener noreferrer nofollow"` and `target="_blank"`. `ALLOWED_URI_REGEXP` restricts hrefs to `http/https/mailto` (blocks `javascript:`). No `img`, `script`, `style`, `iframe`, event handlers.
- This matches the TipTap StarterKit feature set chosen in Task 4 (headings level 2–3, bold/italic/underline, lists, blockquote, link) so sanitization never silently strips legitimate authored content.

**Definition of Done:**

- [ ] `sanitizeBlogHtml('<script>alert(1)</script><p onerror="x">hi</p>')` returns markup with no `<script>` and no `onerror`.
- [ ] An `<a href="javascript:alert(1)">` loses its dangerous href; an `<a href="https://x.com">` survives with `rel`/`target` applied.
- [ ] `htmlToExcerpt` returns tag-free text truncated to the limit.
- [ ] Verify: `npm test -- --reporter=dot lib/sanitize.test.ts`

### Task 3: Public submission API `POST /api/blog`

**Objective:** Accept a public post submission (multipart form), validate and sanitize it, generate a unique slug, auto-link to an active professional by email match, insert as `submitted`, upload cover + optional secondary image, and email the admin. Models `app/api/professionals/register/route.ts`.

**Files:**

- Create: `app/api/blog/route.ts`
- Create: `app/api/blog/route.test.ts`
- Modify: `lib/storage.ts` (add `uploadBlogImage`)
- Modify: `lib/email.ts` (add `notifyNewBlogPost`)

**Key Decisions / Notes:**

- `export const runtime = 'nodejs'`. Rate-limit first with an explicit window: `ratelimit.limit('blog-submit:ip:' + ip, { limit: 3, window: '1 h' })` using `x-forwarded-for` (matches the `reviews/submit` + `waitlist` precedent — confirmed `ratelimit.limit(key, { limit, window })` signature in `lib/rate-limit.ts`); 429 on limit. A submission is heavyweight (storage writes + admin email), so 3/h/IP is generous yet flood-resistant.
- Parse `FormData`: `title`, `body_html`, `author_name`, `author_email`, `cover_image` (File, required), `secondary_image` (File, optional). Validate, returning 400 on any failure: title 4–140 chars (server-enforced, matches the client cap); `author_name` non-empty; email via the same regex as the register route; raw `body_html.length ≤ MAX_BODY_CHARS` (define `const MAX_BODY_CHARS = 50_000` — checked BEFORE sanitizing, to bound storage/DB/sanitizer cost); `body_html` non-empty AFTER `sanitizeBlogHtml`; reject if no cover file. Compute `excerpt` via `htmlToExcerpt` from the sanitized HTML.
- Slug: reuse the `generateSlug` approach from the register route (NFD strip, kebab, 50-char cap) seeded from `title`; resolve collisions with the same `like('slug', slug%)` + counter logic.
- **Email link is tentative, never trusted:** `select id from professionals where lower(email)=lower(author_email) and status='active'` → if found, set `professional_id` AND leave `professional_link_confirmed=false` (the DB default). This is a suggestion for the admin, NOT a published link — the profile link-back stays hidden until an admin confirms in Task 6. If no match, `professional_id` stays null.
- Insert with `status='submitted'` and sanitized `body_html`; then `uploadBlogImage(coverFile, post.id, 'cover')` and (if present) `'secondary'`, updating `cover_image_url`/`secondary_image_url`. Upload failure is logged + non-blocking (mirror register route).
- `uploadBlogImage(file, postId, slot)`: copy `uploadProfileImage` structure (same ALLOWED_TYPES/MAX_FILE_SIZE), bucket `'blog-images'`, path `${postId}-${slot}.${ext}`.
- `notifyNewBlogPost`: mirror `notifyNewProfessional` — to `ADMIN_EMAIL`, link to `/admin/blog/${id}` via `emailBaseUrl()`; fire-and-forget `.catch(() => {})`.

**Definition of Done:**

- [ ] POST without a cover file → 400; title too short → 400; `body_html` over `MAX_BODY_CHARS` → 400; over-rate-limit → 429.
- [ ] Valid POST inserts a row with `status='submitted'`, sanitized `body_html`, generated unique slug, and — when the email matches an active professional — `professional_id` set WITH `professional_link_confirmed=false` (null + false when no match).
- [ ] Verify: `npm test -- --reporter=dot app/api/blog/route.test.ts` (mocks `supabaseAdmin`, `lib/storage`, `lib/email`, `lib/rate-limit`, `lib/sanitize`).

### Task 4: Public submission form page `/blog/escribir` with TipTap editor

**Objective:** The public-facing authoring page: a TipTap WYSIWYG editor plus title/name/email fields and cover (required) + optional second image upload, submitting as multipart to `POST /api/blog` and showing a confirmation state. Uses the Hara voice and design tokens.

**Files:**

- Create: `app/blog/escribir/page.tsx`
- Create: `app/blog/escribir/EscribirForm.tsx`
- Create: `app/blog/escribir/EscribirForm.test.tsx`

**Key Decisions / Notes:**

- Add deps `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-underline`. Configure StarterKit limited to: headings (levels 2–3), bold, italic, underline, bulletList, orderedList, blockquote, link. This set must match Task 2's allowlist.
- `'use client'` form. Editor HTML via `editor.getHTML()` held in state; on submit build `FormData` (title, body_html, author_name, author_email, cover_image, secondary_image) and POST to `/api/blog`. Mirror validation/UX of `app/profesionales/registro/RegistroForm.tsx` (button states, error `Alert`). Reuse `INPUT_CLASS`/`LABEL_CLASS`-style tokens and `PageBackground`.
- Cover required client-side; show selected filenames; cap to exactly 1 cover + 1 optional secondary (no third input). Copy in Argentine informal Spanish ("Escribí tu nota", "Subí una imagen de portada", confirmation: "Recibimos tu nota — la revisamos antes de publicarla").
- Page is a thin server shell rendering `<EscribirForm />`; editor is dynamically imported with `ssr: false` to avoid SSR issues with TipTap.

**Definition of Done:**

- [ ] Page renders title, editor toolbar (bold/link/heading), name, email, cover (required) + optional second image, submit button.
- [ ] Submit is disabled until title, body, name, valid email, and a cover are present; submitting posts multipart to `/api/blog` and shows the confirmation state on success.
- [ ] Verify: `npm test -- --reporter=dot app/blog/escribir/EscribirForm.test.tsx` (validation/enablement; TipTap mocked).

### Task 5: Admin blog queue list `/admin/blog` + nav item

**Objective:** Admin moderation list showing posts filterable by status (submitted/published/rejected), each linking to its review page. Mirrors `app/admin/reviews/page.tsx` and adds the nav entry.

**Files:**

- Create: `app/admin/blog/page.tsx`
- Modify: `app/components/AdminLayout.tsx` (add `{ href: '/admin/blog', label: 'Blog' }`)

**Key Decisions / Notes:**

- Server component fetching all `blog_posts` via `supabaseAdmin` (ordered `created_at DESC`), passed to a client list with an `AdminFilterBar` status filter (default "submitted"), mirroring `app/admin/reviews/page.tsx` and the `VISIBILITY_OPTIONS` pattern.
- Each row: title, author, status badge (reuse `STATUS_CONFIG`-style badge or a small local map for the three blog statuses), created date, link to `/admin/blog/[id]`. Empty state via `EmptyState`.
- Add the nav item after "Analíticas" in `AdminLayout` `NAV_ITEMS`.

**Definition of Done:**

- [ ] `/admin/blog` lists posts with a working status filter; rows link to `/admin/blog/[id]`.
- [ ] Posts with status `published` or `rejected` do NOT appear when the filter is set to `submitted` (moderation-queue correctness — verify during TS-002 once mixed-status test data exists).
- [ ] "Blog" appears in the admin sidebar and highlights when active.
- [ ] Verify: `npm run build` compiles; manual/E2E (TS-002 step 1) shows the queue. (No new pure-logic unit beyond build; covered by E2E.)

### Task 6: Admin review page + `PATCH /api/admin/blog/[id]` (approve/reject/link, notify author)

**Objective:** The admin review screen — sanitized preview of the post, a dropdown to confirm/override the linked professional, and Approve/Reject actions — backed by a PATCH route that transitions status, sets the link, and emails the author. Models the professionals review + PATCH.

**Files:**

- Create: `app/admin/blog/[id]/page.tsx`
- Create: `app/api/admin/blog/[id]/route.ts`
- Create: `app/api/admin/blog/[id]/route.test.ts`
- Modify: `lib/email.ts` (add `notifyBlogPostPublished`, `notifyBlogPostRejected`)

**Key Decisions / Notes:**

- GET (in the route or via direct `supabaseAdmin` in the server page) loads the post + the list of active professionals for the link dropdown. Render the body through `sanitizeBlogHtml` again (defense-in-depth) inside the preview.
- **Link confirmation UI (impersonation mitigation):** when the post has `professional_id` set but `professional_link_confirmed=false`, the review screen must visually flag it — e.g. a banner "Auto-vinculado por email a [name] — confirmá o quitá el vínculo" — distinct from a confirmed link. The admin explicitly confirms (keep + set `professional_link_confirmed=true`), changes the professional, or clears the link before approving.
- PATCH body `{ action: 'approve'|'reject', rejection_reason?, professional_id? }`. **`professional_id` semantics:** absent/`undefined` → leave the existing value unchanged; explicit `null` → clear the link (`professional_id=null, professional_link_confirmed=false`); a UUID → set/replace the link AND set `professional_link_confirmed=true` (admin action = confirmation). Validate a provided UUID belongs to an existing professional (else 400).
- Approve → only valid from `status='submitted'`; sets `status='published'`, `published_at=NOW()`. Reject → only valid from `status='submitted'`; sets `status='rejected'`, stores `rejection_reason`. **Idempotency/state guards:** approving an already-`published` post or rejecting an already-`rejected` post returns 409 Conflict (no mutation); unknown id → 404; invalid `action` → 400. Mirror `app/api/admin/professionals/[id]/route.ts` structure; `export const runtime = 'nodejs'`.
- On publish, `notifyBlogPostPublished({ to: author_email, title, url: emailBaseUrl()+'/blog/'+slug })`; on reject, `notifyBlogPostRejected({ to: author_email, title, reason })`. Both fire-and-forget, mirroring `notifyProfessionalApproved`/`notifyProfessionalRejected`.
- Route is admin-gated by existing `middleware.ts` (no extra auth code needed).

**Definition of Done:**

- [ ] PATCH `approve` from `submitted` sets `status='published'` + `published_at`; an explicit `professional_id` UUID sets the link AND `professional_link_confirmed=true`; an explicit `null` clears it; an absent field leaves it unchanged. PATCH `reject` from `submitted` sets `status='rejected'` + `rejection_reason`.
- [ ] Re-approving an already-`published` post (or re-rejecting an already-`rejected` post) → 409 with no mutation; invalid `action` → 400; non-existent id → 404; bad `professional_id` → 400.
- [ ] Review page renders a sanitized preview + professional dropdown + approve/reject controls, and visually flags an unconfirmed auto-link distinctly from a confirmed one.
- [ ] Verify: `npm test -- --reporter=dot app/api/admin/blog/[id]/route.test.ts` (mocks supabaseAdmin + email).

### Task 7: Public blog index `/blog`

**Objective:** Public listing of published posts, newest-first, with cover thumbnail, title, excerpt, and author — the discovery surface for the blog.

**Files:**

- Create: `app/blog/page.tsx`

**Key Decisions / Notes:**

- `export const dynamic = 'force-dynamic'`. Server component querying `supabaseAdmin.from('blog_posts').select(...).eq('status','published').order('published_at', { ascending:false })`.
- Card grid mirroring the directory/profile card aesthetic (`GlassCard`, `PageBackground`, design tokens). Each card: cover image (or token placeholder), title, `excerpt`, "por [author_name]", links to `/blog/[slug]`. `EmptyState` when none. Argentine-informal heading ("Notas de la comunidad" or similar).
- Add a footer/nav link to `/blog` where the site lists public pages (same place "Qué es Hara" lives), so the index is reachable.

**Definition of Done:**

- [ ] `/blog` lists only `published` posts, newest first, each linking to its detail page; empty state renders when there are none.
- [ ] Verify: `npm run build` compiles; E2E TS-002 step 4 / TS-004 confirm listing.

### Task 8: Public blog detail `/blog/[slug]`

**Objective:** Render a single published post — title, cover + optional second image, sanitized body, author with profile link-back when linked. 404 for non-published or unknown slugs. Mirrors `app/p/[slug]/page.tsx`.

**Files:**

- Create: `app/blog/[slug]/page.tsx`

**Key Decisions / Notes:**

- `export const dynamic = 'force-dynamic'` AND `export const runtime = 'nodejs'` (required — this page imports `sanitizeBlogHtml`, which needs the Node runtime for DOMPurify; `app/p/[slug]/page.tsx` currently declares only `dynamic`, so do not assume a global Node default). Fetch by `slug` AND `status='published'` via `supabaseAdmin`; `notFound()` otherwise (so `submitted`/`rejected` posts 404 publicly).
- Render `body_html` with `dangerouslySetInnerHTML` ONLY after passing through `sanitizeBlogHtml` (defense-in-depth — never trust the stored value). Show cover at top, secondary below the body if present.
- Render the "Escrito por [name] — Ver perfil" link to `/p/[slug]` ONLY when `professional_id` is set AND `professional_link_confirmed=true` (resolve the professional's `slug`/`full_name`). An unconfirmed auto-link must NOT surface publicly. Use `PageBackground` + tokens for layout consistency with other public pages.

**Definition of Done:**

- [ ] A published post renders title, cover, sanitized body, and (when linked) a working "Ver perfil" link to `/p/[slug]`.
- [ ] A `submitted`/`rejected`/unknown slug returns the 404 page.
- [ ] Verify: `npm run build` compiles; E2E TS-002/TS-004 confirm render + link.

### Task 9: "Notas de [name]" section on professional profile `/p/[slug]`

**Objective:** Add a section to the professional public profile listing that professional's published posts, each linking to `/blog/[slug]` — the reverse half of the bidirectional link.

**Files:**

- Modify: `app/p/[slug]/page.tsx`
- Create: `app/p/[slug]/components/ProfilePosts.tsx`

**Key Decisions / Notes:**

- This page imports `sanitizeBlogHtml` indirectly only if it renders excerpts; it does NOT render `body_html`, so no sanitize call is needed here — but if any blog HTML is rendered, add `export const runtime = 'nodejs'`. (The post list uses `title`/`excerpt`/date only, so Node runtime is not required by this task; keep the page's existing `dynamic = 'force-dynamic'` declaration untouched.)
- In the profile server component, after loading the professional, query `blog_posts` where `professional_id = pro.id AND status='published' AND professional_link_confirmed=true` ordered `published_at DESC` (limit ~10) — the `professional_link_confirmed` filter ensures an unconfirmed auto-link never surfaces a post on someone's profile. Pass to `<ProfilePosts posts={...} />`.
- `ProfilePosts` renders nothing when the list is empty (no empty-state noise on profiles without posts). When present: a "Notas de [first name]" section with compact rows (title + date) linking to `/blog/[slug]`, styled with existing profile section components (`RevealOnScroll`, GlassCard-consistent).
- Keep the change additive — insert the section among existing `Profile*` sections without altering their props, so existing profile tests stay green.

**Definition of Done:**

- [ ] A professional with ≥1 published post shows a "Notas de [name]" section linking to each post; a professional with none shows no such section.
- [ ] Existing `app/p/[slug]` tests still pass unchanged.
- [ ] Verify: `npm test -- --reporter=dot app/p` and `npm run build`; E2E TS-004 confirms the reverse link.
