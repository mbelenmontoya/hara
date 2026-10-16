# Almanac Ayuda Page (/que-es-hara) Implementation Plan

> CHANGED 2026-10-02 at the user's request after review: the page is only the title "Preguntas" (no "sin letra chica"), the category chips and the accordion. "¿Qué es Hara Vital?" is one more question (first in the first category) whose answer holds all the About-Hara text and links; there are no separate About sections or header any more.

Created: 2026-10-02
Author: mariabmontoya@gmail.com
Agent: Claude Code
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** `/que-es-hara` looks like the almanac Ayuda (Claude Design 9g) on a phone, using our own content: the About-Hara sections, the user and professional questions as an accordion with category chips, a dark "¿No está aquí?" card with email and Instagram, and the final links. Nothing in the current content is removed.

## Out of Scope

- The design's emergency-line card and WhatsApp button. We have no confirmed Argentine emergency line, no team WhatsApp number and no office hours, so neither is built or invented (tracked in `ISSUES.md`).
- The bottom navigation bar, and any other page.
- Changing `DisclosureItem` (`app/components/ui/Disclosure.tsx`), which `/terminosyprivacidad` also uses.

## Approach

**Chosen:** Keep `app/que-es-hara/page.tsx` as a server page that holds the content, restyle its sections in the almanac look, and move the FAQ into one new client component `app/que-es-hara/AyudaFaq.tsx` (category chips plus an accordion with one question open at a time).
**Why:** The content and links stay where they are, and only the FAQ needs state; the cost is that the old sidebar contents and its anchor links go away, replaced by the chips.

## Context for Implementer

The design is a base to put our content in, not literal text. Copy stays in Argentine vos (the design uses tú). Almanac classes `font-almanac`, `font-almanac-serif` and `almanac-label` are in `app/globals.css`; `h1..h6` get a global Poppins rule (use the unlayered almanac classes), adjacent `<p>` get a global margin (use spans or `mt-*` on non-adjacent elements), and the h1-h3 bottom margin is in `@layer base`, so `mb-0` works. Reuse patterns from `app/HomeConcierge.tsx` for the dark card (orbit image `/assets/almanac/orbita_punteada-cream.svg`).

## Progress Tracking

- [x] Task 1: FAQ component (category chips and accordion)
- [x] Task 2: Restyle the page with our content
- [x] Task 3: Browser check and ISSUES.md entry

## Implementation Tasks

### Task 1: FAQ component (category chips and accordion)

**Objective:** A client component that shows two category chips (questions for people looking for help, and for professionals) and the questions of the chosen category as an accordion, one open at a time, with a "+" that becomes "−" when open. Verified by TS-002.

**Files:**

- Create: `app/que-es-hara/AyudaFaq.tsx`
- Test: `app/que-es-hara/AyudaFaq.test.tsx`

**Key Decisions / Notes:**

- Props: `groups: { id: string; label: string; items: { title: string; paragraphs: readonly string[] }[] }[]`; the first group is selected at first, nothing is open at first.
- Chips are `<button aria-pressed>`; each question is a `<button aria-expanded aria-controls>` with the answer in a region below it; opening one closes the previous one; switching the category closes everything.
- Look from design 9g: serif 21px question, light "+" in terracotta (`text-brand`), hairline `border-outline` rows, answer in Jost 15px `text-gray-800`; chips are rounded-full, selected `bg-brand-dark text-gray-50`, unselected `bg-gray-50 border-outline`.
- Use `<span>` for the sign and text (not adjacent `<p>`); question text in a `<span class="font-almanac-serif">` since `h3` would get the global margin.

**Definition of Done:**

- [ ] The first category's questions show at first, none open; tapping the other chip shows only that category's questions and marks it pressed
- [ ] Opening a question shows its answer and sets `aria-expanded`; opening a second one closes the first; tapping the open one closes it
- [ ] Switching category closes any open question
- [ ] Verify: `npx vitest run --project unit AyudaFaq`

### Task 2: Restyle the page with our content

**Objective:** Rebuild the page layout in the almanac look: header, the four About-Hara sections as editorial blocks, the FAQ with its heading, the dark "¿No está aquí?" card with email and Instagram, and the final links. Verified by TS-001.

**Files:**

- Modify: `app/que-es-hara/page.tsx`
- Modify: `app/que-es-hara/page.test.tsx`

**Key Decisions / Notes:**

- Layout: `font-almanac` wrapper, single column `max-w-md` widening to `md:max-w-2xl`, flat `bg-background`, no `PageBackground`, no `GlassCard`, no sidebar or TOC.
- Header: `almanac-label` "Sobre Hara", `h1` serif "¿Qué es <em>Hara Vital</em>?" (keep the current h1 meaning), and the current intro sentence.
- About blocks (`id="producto"` etc. kept): serif `h2` with one italic word ("El producto es la <em>confianza</em>", "Cómo <em>funciona</em>", "Para <em>quién</em> es", "Qué nos hace <em>diferentes</em>"), body text unchanged, links unchanged (`/`, `/solicitar`, `/registro`); the three differences keep their check marks, drawn as hairline-separated rows. All current text stays word for word.
- FAQ: a section titled "Preguntas, <em>sin letra chica</em>." (from the design) containing `AyudaFaq` with the groups "Para quien busca" and "Para profesionales" and the current 6 + 6 questions unchanged.
- "¿No está aquí?" dark card (look of `app/HomeConcierge.tsx`): label, serif "Escribinos a una <em>persona</em>.", the current sentence "Por email o por Instagram. Te respondemos lo antes que podamos.", and two buttons: `mailto:centrovitalhara@gmail.com` (shows the address) and `https://instagram.com/haravital` ("@haravital en Instagram", `target="_blank" rel="noopener noreferrer"`). No phone, no hours.
- Final links: "Explorar profesionales" (`/`) as a dark button and "O pedí una recomendación personalizada →" (`/solicitar`) as a text link. Metadata (title, description) unchanged.
- `page.test.tsx`: drop the tests that asserted the 7 sidebar anchors and the two old FAQ headings; keep the checks that the four About titles, the contact email and the sections' internal links render, and add that both FAQ categories' chips and one question from each are reachable.

**Definition of Done:**

- [ ] All current About-Hara text, both FAQ lists, the email and Instagram links and the final links are still on the page
- [ ] The page uses no `GlassCard`, `PageBackground` or sidebar, and the h1 renders in Instrument Serif
- [ ] The Instagram link opens in a new tab with `rel="noopener noreferrer"` and the email link is a `mailto:`
- [ ] Verify: `npx vitest run --project unit que-es-hara`

### Task 3: Browser check and ISSUES.md entry

**Objective:** Check the real page in Chrome and record what we still need (emergency line, team WhatsApp, office hours).

**Files:**

- Modify: `ISSUES.md`

**Key Decisions / Notes:**

- Add an entry: the design shows a team WhatsApp with office hours and an emergency line, we have neither, and the design's number (800 911 2000) is a Mexican helpline example that must not be used; we need a confirmed Argentine emergency line (name and number) and the WhatsApp number and hours.
- Wait about a second after navigating before the first click (hydration).

**Definition of Done:**

- [ ] TS-001 and TS-002 pass in the browser
- [ ] `ISSUES.md` has the new entry with no em dashes
- [ ] Verify: `npm run test:unit && npx tsc --noEmit 2>&1 | grep -E "^(app|lib)/"`

## E2E Test Scenarios

### TS-001: Ayuda on a phone
**Priority:** Critical
**Preconditions:** Dev server on port 3000, viewport about 390px
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/que-es-hara` | Serif "¿Qué es Hara Vital?", the four About sections in the almanac look, no sidebar, no horizontal scroll |
| 2 | Scroll to the end | "Preguntas, sin letra chica." with chips and questions, the dark card with email and Instagram, and the two final links |
| 3 | Tap "Explorar profesionales" | Lands on `/` |

### TS-002: FAQ chips and accordion
**Priority:** Critical
**Preconditions:** Same as TS-001
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tap a question | Its answer opens and the "+" becomes "−" |
| 2 | Tap another question | The first closes and the second opens |
| 3 | Tap the "Para profesionales" chip | Only the professional questions show, all closed |
