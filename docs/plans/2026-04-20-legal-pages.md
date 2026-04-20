## Execution Plan

**Goal:** Add the legal page planned in `.claude/plans/main.md` so Hará Match has a public `/terminosyprivacidad` route that matches the current design system, keeps the page manageable on mobile, and is linked from active data-collection flows.

**Steps:**
1. Define the route scope and reuse strategy
   - Action: Review existing public-page shells and shared UI to avoid inventing a parallel layout.
   - Test: Confirm the implementation can reuse `PageBackground`, `GlassCard`, and `SectionHeader`.
   - Dependencies: None.

2. Implement the legal page shell and route content
   - Action: Create a shared page with two glass-card sections (`Términos` and `Privacidad`) and transparent collapsible subsection titles inside each card.
   - Test: Build the app and verify `/terminosyprivacidad` compiles cleanly.
   - Dependencies: Step 1.

3. Link the new page from live user flows
   - Action: Update the registration and intake form footers so users can reach the unified legal page from the forms where they submit personal data.
   - Test: Build the affected pages and inspect the diff for correct internal links.
   - Dependencies: Step 2.

4. Validate and review
   - Action: Run lint/build verification and inspect the resulting diff for consistency with the design system.
   - Test: `npm run lint` and `npm run build`.
   - Dependencies: Steps 2-3.

**Estimated complexity:** Moderate
**Risk factors:** Legal copy must stay generic and consistent with actual product behavior; the unified page must stay light enough on mobile without hiding the design system behind extra containers.
