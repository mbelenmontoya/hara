# Blog Markdown Upload Implementation Plan

Created: 2026-06-07
Author: belu.montoya@dialpad.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** On the blog submission form (`/blog/escribir`), let an author upload a `.md` file as an alternative to typing in the rich-text editor. The file's markdown becomes the post body, its title (YAML frontmatter `title:` or first `# H1`) auto-fills the Título field, and only `.md` files are accepted.

## Out of Scope

- **Markdown constructs outside the existing allowlist are dropped.** The stored body is sanitized to the same allowlist the TipTap editor uses (`p, br, strong, em, u, h2, h3, ul, ol, li, blockquote, a`). So markdown images (`![]()` → `<img>`), code blocks, tables, strikethrough, and `#`/`####`–`######` headings are stripped on conversion. The preview reflects this (no silent surprise), but we are **not** widening the allowlist in this plan.
- **The cover image stays a form field.** It is required by `/api/blog` and is uploaded via the existing file input — it is never read from the markdown.
- **The original markdown source is not stored.** We store the converted+sanitized HTML in `body_html`, exactly like editor-authored posts. No new DB column.
- **No drag-and-drop.** Standard file picker only.
- **No changes to `/api/blog` or its DB contract.** Conversion is client-side; the API keeps receiving `body_html`.

## Approach

**Chosen:** Add a write/upload mode toggle to `EscribirForm.tsx`; a new `MarkdownUpload.tsx` sub-component reads the `.md`, converts it via a new `marked` dependency through a pure `parseMarkdownDoc` helper, sanitizes the result with the existing `sanitizeBlogHtml`, and reports `{ title, html }` back to the form. Submission reuses the existing `/api/blog` `body_html` path unchanged.
**Why:** Client-side conversion + reuse of `sanitizeBlogHtml` means zero API/DB change and the preview equals the stored result (server re-sanitizes idempotently), at the cost of bundling the markdown parser + dompurify into the already-client-only (`ssr:false`) escribir page.

## Context for Implementer

`app/blog/escribir/page.tsx` loads `EscribirForm` with `dynamic(..., { ssr: false })` because TipTap needs the DOM — so the form and everything it imports run **only in the browser**. That is why importing `sanitizeBlogHtml` (which pulls in `isomorphic-dompurify`) into the client form is safe here: the "Node runtime only / not Edge" caveat in `lib/sanitize.ts` is about the Edge runtime, not the browser. `isomorphic-dompurify` is built to run in both.

## Runtime Environment

- **Start command:** `npm run dev`
- **Port / URL:** http://localhost:3000 — page under test: `/blog/escribir`
- **Health check:** `GET /blog/escribir` returns 200
- **Restart:** Ctrl-C then `npm run dev`. If the `.next` cache misbehaves after adding a dependency: `rm -rf .next && npm run dev`.

## Assumptions

- `isomorphic-dompurify` (already a dependency) sanitizes correctly when imported into the client bundle. Task 2 depends on this.
- The `lib/sanitize.ts` header comment update is a **required part of Task 2**, not an afterthought: an implementer who reads the current "server-side only / do NOT import in Edge" comment first may otherwise skip the client import and leave the preview unsanitized (silently breaking TS-006 on the client side).

## Progress Tracking

- [x] Task 1: Markdown parsing helper + `marked` dependency
- [x] Task 2: Upload UI + form integration (mode toggle, preview, `.md`-only)

> Source of truth for completion. `spec-implement` toggles `[ ]` → `[x]` here.

## Implementation Tasks

### Task 1: Markdown parsing helper + `marked` dependency

**Objective:** Add the `marked` dependency and a pure, DOM-free `parseMarkdownDoc(raw)` function that takes raw `.md` text and returns `{ title: string | null; html: string }` — extracting the title from YAML frontmatter `title:` or the first `# H1` (and removing that heading from the body), then converting the remaining markdown to HTML. This is the conversion core reused by the upload UI; verified by unit tests (no UI involved).

**Files:**

- Create: `app/blog/escribir/parse-markdown.ts`
- Create: `app/blog/escribir/parse-markdown.test.ts`
- Modify: `package.json` (add `marked` via `npm install marked`)

**Key Decisions / Notes:**

- Install `marked` (`npm install marked`) — ships its own TypeScript types, so **no** `@types/marked`. Convert with `marked.parse(body)` and coerce to string (default config is synchronous: `const html = marked.parse(body) as string`).
- Frontmatter: lightweight manual parse — **do not** add `gray-matter`. If `raw` starts with `---\n`, read up to the next line that is exactly `---`; within that block match `/^title:\s*(.+)$/m`, trim, strip one layer of surrounding `"` or `'`. Body = everything after the closing `---`.
- If no frontmatter title, take the first `/^#\s+(.+)$/m` line as the title and remove that single line from the body. If neither exists → `title: null`.
- Clamp the extracted title to **140** chars (matches the form `maxLength` and API limit). Apply the clamp at a **single exit point** — after the frontmatter/H1 branches converge on a title — so both sources are covered by construction.
- Keep this function pure / DOM-free (no DOMPurify here) — sanitization is the consumer's job. This keeps the unit test free of jsdom-specific behavior.

**Definition of Done:**

- [ ] `parseMarkdownDoc('---\ntitle: Hola\n---\n\nTexto')` returns title `'Hola'` and html containing `<p>Texto</p>`
- [ ] `parseMarkdownDoc('# Mi título\n\nCuerpo')` returns title `'Mi título'` and html that does NOT contain `Mi título` (the H1 line is removed from the body)
- [ ] `parseMarkdownDoc('Solo cuerpo sin título')` returns `title: null` and html containing `<p>Solo cuerpo sin título</p>`
- [ ] A **frontmatter** title longer than 140 chars is truncated to exactly 140
- [ ] An **H1** title longer than 140 chars is truncated to exactly 140
- [ ] Verify: `npm run test:unit`

### Task 2: Upload UI + form integration

**Objective:** Add a write/upload mode toggle to `EscribirForm.tsx` and a new `MarkdownUpload.tsx` sub-component. In upload mode the TipTap editor is replaced by a `.md` file picker that accepts only `.md`/`.markdown` files, parses them via `parseMarkdownDoc`, sanitizes the HTML with `sanitizeBlogHtml`, shows a rendered preview, auto-fills the Título field, and feeds the sanitized HTML into the existing submit path. Verified by TS-001 through TS-006.

**Files:**

- Create: `app/blog/escribir/MarkdownUpload.tsx`
- Modify: `app/blog/escribir/EscribirForm.tsx`
- Modify: `lib/sanitize.ts` (clarify the runtime comment — browser use is fine; only the Edge runtime is excluded)

**Key Decisions / Notes:**

- **`MarkdownUpload.tsx` responsibilities:** render a file input with `accept=".md,.markdown,text/markdown"`; on change, reject any file whose name does not end in `.md`/`.markdown` (case-insensitive) via `onError('Solo se aceptan archivos .md')`; read with `await file.text()`; call `parseMarkdownDoc`; sanitize the body with `sanitizeBlogHtml`; reject empty body (`onError('El contenido del archivo está vacío.')`) and reject when the **sanitized HTML length** (not the raw markdown length — `marked` expands markdown into tags, so the converted output is what must fit) exceeds 50 000 chars, matching `MAX_BODY_CHARS` in `app/api/blog/route.ts:23` (`onError('El contenido es demasiado largo.')`); on success call `onParsed({ title, html })` and render the sanitized HTML in a `prose prose-sm` preview container plus the file name. Props: `onParsed`, `onError`. Keep it ≤ ~150 lines.
- **Submit the sanitized HTML** (`onParsed.html`) as `body_html`. The server re-sanitizes (idempotent), so preview === stored. This is why the preview must use `sanitizeBlogHtml`, not raw `marked` output.
- **`EscribirForm.tsx` changes:** add `mode: 'write' | 'upload'` state with a toggle (follow existing button styling, e.g. the toolbar button classes already in the file); when `upload`, render `<MarkdownUpload>` instead of the TipTap toolbar+editor; hold `uploadedHtml` / set title from `onParsed`; surface `onError` through the existing `error` Alert. In `handleSubmit`, source the body as `mode === 'upload' ? uploadedHtml : (editor?.getHTML() ?? '')`.
- **`isFormValid` — add an upload-only condition; do NOT touch write mode.** Add exactly one clause: when `mode === 'upload'`, also require `uploadedHtml.trim().length > 0`. **Leave write mode exactly as it is today** — its empty-body check stays at submit time inside `handleSubmit`; do NOT add an editor-content check to `isFormValid`, or the submit button would disable on an empty editor (an unrequested behavior change). Concretely: `isFormValid = <existing checks> && (mode === 'write' || uploadedHtml.trim().length > 0)`.
- **Mode-switch state semantics (no ambiguity):** switching `upload → write` **clears** `uploadedHtml` and removes the preview (full state reset — user must re-upload), so no stale preview survives a re-toggle. Switching `write → upload` does **not** touch the editor's content (TipTap keeps its state across the toggle since `useEditor` is created unconditionally). Only the active mode's body is ever submitted.
- Reuse the existing `INPUT_CLASS` / `LABEL_CLASS` / `HELPER_CLASS` constants and the `Alert` component — do not introduce new color/spacing literals (tailwind-tokens rule).
- Spanish copy, Argentine informal (e.g. toggle labels "Escribir" / "Subir .md"; helper "Subí un archivo .md — el título sale del archivo").

**Definition of Done:**

- [ ] In upload mode, selecting a valid `.md` auto-fills the Título field and shows a rendered preview of the body
- [ ] Selecting a non-`.md` file shows "Solo se aceptan archivos .md" and sets no title/preview
- [ ] An empty-body `.md` shows the empty-content error and leaves the submit button disabled
- [ ] A `.md` whose **converted (sanitized) HTML** exceeds 50 000 chars shows the too-long error and leaves submit disabled (the check is on the sanitized HTML length, not the raw markdown length)
- [ ] In **write** mode, clicking "Publicar nota" with an empty editor shows the existing submit-time error — the button is NOT disabled (no regression to current behavior)
- [ ] Switching between "Escribir" and "Subir .md" shows/hides the editor and upload UI correctly; submit sends only the active mode's body
- [ ] Switching "Subir .md" → "Escribir" → "Subir .md" shows an empty file picker with **no** stale preview from the previous file
- [ ] A `.md` containing `<script>` or disallowed tags renders a preview with those stripped (allowlist enforced client-side)
- [ ] `lib/sanitize.ts` header comment updated so it no longer reads "server-side only / do NOT import in Edge": new wording clarifies the function is safe to import in browser bundles and Node API routes, and must NOT be imported only into Next.js **Edge** middleware/Edge API routes
- [ ] Verify: `npm run lint && npm run build` (E2E TS-001–TS-006 executed in spec-verify Phase B)

## E2E Test Scenarios

### TS-001: Upload `.md` with frontmatter title
**Priority:** Critical
**Preconditions:** Dev server running; on `/blog/escribir`.
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/blog/escribir` | Form loads with a mode toggle ("Escribir" / "Subir .md") |
| 2 | Click "Subir .md" | TipTap editor is hidden; a `.md` file input + preview area appear |
| 3 | Upload `post.md` = `---\ntitle: Mi nota\n---\n\n## Sección\n\nTexto **fuerte**.` | Título field shows "Mi nota"; preview renders an h2 "Sección" and bold "fuerte" |
| 4 | Fill name + email, select a cover image | "Publicar nota" button becomes enabled |
| 5 | Click "Publicar nota" | Success state "Recibimos tu nota" appears |

### TS-002: Title from first `# H1` when no frontmatter
**Priority:** Critical
**Preconditions:** On `/blog/escribir`, "Subir .md" mode.
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload a file = `# Título H1\n\nCuerpo del post.` | Título field shows "Título H1"; preview shows "Cuerpo del post" and does NOT repeat "Título H1" |

### TS-003: Mode toggle shows/hides correct inputs
**Priority:** High
**Preconditions:** On `/blog/escribir`.
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In "Escribir" mode, type "Contenido del editor" in the editor | Editor shows the text; no file input visible |
| 2 | Click "Subir .md", upload a file with body "Contenido del archivo" | Editor hidden; preview shows "Contenido del archivo" |
| 3 | Click "Escribir" again | Editor visible again with its prior content; upload preview hidden |

### TS-004: Reject non-`.md` file
**Priority:** High
**Preconditions:** On `/blog/escribir`, "Subir .md" mode.
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attempt to upload `notas.txt` | Error "Solo se aceptan archivos .md" shown; Título unchanged; no preview |

### TS-005: Empty / frontmatter-only `.md`
**Priority:** Medium
**Preconditions:** On `/blog/escribir`, "Subir .md" mode.
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload a `.md` whose body is empty (e.g. only `---\ntitle: X\n---\n`) | Error "El contenido del archivo está vacío."; submit stays disabled |

### TS-006: Disallowed HTML is stripped in preview
**Priority:** Medium (security)
**Preconditions:** On `/blog/escribir`, "Subir .md" mode.
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload a `.md` = `<script>alert(1)</script>\n\n![x](http://e/x.png)\n\nTexto seguro.` | Preview shows "Texto seguro." with no script executed and no `<script>`/`<img>` in the rendered output |

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001   | Critical | PASS   | 0            | Frontmatter title "Mi nota" auto-filled; preview showed h2 + bold; submit succeeded |
| TS-002   | Critical | PASS   | 0            | H1 title extracted; H1 line absent from body preview |
| TS-003   | High     | PASS   | 0            | Editor shown/hidden correctly; toggle back restores editor |
| TS-004   | High     | PASS   | 0            | "Solo se aceptan archivos .md" shown for .txt file; no preview |
| TS-005   | Medium   | PASS   | 0            | Empty-body error shown; submit disabled |
| TS-006   | Medium   | PASS   | 0            | `<script>` and `<img>` stripped; "Texto seguro." rendered |
