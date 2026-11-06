# Hara: critical journeys and domain-specific edge cases

Created: 2026-11-06
Agent: Codex
Status: DEFERRED_BY_USER
Approved: No
Iterations: 1
Worktree: No
Type: Bugfix

## Revision history and scope

Deferred by the user on 2026-11-06: "ok dejalo para mas tarde". The plan remains unapproved; no implementation or additional journey testing is authorized by this deferral.

Revision 1 was explicitly REJECTED by the user: it expanded only their examples and did not analyze Hara's own lifecycle and cross-feature failures. It remains unapproved. This revision is based on PRODUCT.md, the actual server/browser paths, database functions and existing tests across professional accounts, concierge, discovery/contact, reputation, Destacado and Diario.

This is a verification plan, not authorization to redesign all those features. Cases below are proposed business contracts. A source observation is not a reproduced production bug. Only separately reproduced, approved defects may be fixed. No business code, live accounts, leads, payments or reviews were changed for this revision.

## Product outcomes that determine readiness

1. A professional can apply, see the review decision, recover their access and edit only their own approved profile. Publication remains controlled by the admin.
2. A person finds an available, verified professional and can reach the right WhatsApp without exposing their own private information.
3. Concierge preserves what the person asked, supports the admin's actual selection, and displays those same recommendations when the person follows the link later.
4. Reviews represent the right person/professional interaction and update reputation consistently when edited or moderated.
5. Destacado payments, remaining service days, renewal and expiry agree with what the professional received.
6. Diario publishes only approved content and does not expose a draft/withdrawn article through an old link.

Passing a call-count assertion, a generated URL or a total number of unit tests is insufficient evidence for these outcomes.

## Evidence classifications

- **Reproduced:** an actual handler/component was exercised in an isolated diagnostic with stated fake boundaries, or a real-service result was observed. This does not imply a live database write unless explicitly stated.
- **Source-confirmed behavior:** code currently does this, but the whole user journey has not been reproduced.
- **Risk to reproduce:** a plausible race/failure tied to a specific implementation; not a confirmed bug.
- **Product decision:** existing rules conflict or intent is ambiguous. Set the expected behavior explicitly before writing a test that enforces it.
- **Existing test, not complete:** keep its useful checks and extend the missing outcome; do not duplicate it or claim it covered the full journey.

## Independent cases derived from Hara

| ID / Priority | Person's situation and failure trigger | Business contract / evidence that must make the case RED | Why it belongs to this app and current evidence |
|---|---|---|---|
| A1 / P0 | A new professional forgets their password while their application is still submitted | Proposed: recover access to the review page, while editing/publication remain blocked. Generic 200 without a receivable recovery link cannot pass. | New registration creates Auth before approval, but `app/api/pro/forgot-password/route.ts:38-43` filters active profiles. Its current unit test explicitly expects no recovery for submitted users. This is a contract mismatch to resolve, not an already fixed bug. |
| A2 / P0 | Approve and Reject are sent from two tabs after both loaded the same submitted application | One authoritative decision and a consistent email; the losing action must conflict rather than also succeed. No contradictory approval/rejection mail. | `app/api/admin/professionals/[id]/route.ts:157-167,188-196,230-233` reads status separately and updates by id. Concurrency risk; must reproduce with real transactions. |
| A3 / P0 | Professional A sends B's id/user_id/email or attempts to grant themselves active/Destacado status while editing | Only A's permitted fields can change. B, identity, role, status and tier remain unchanged in the actual DB. A submitted account stays blocked. | `app/api/pro/profile/route.ts:121-133,181-216` uses a service-role update after ownership resolution. Real two-user isolation matters more than merely observing an eq call. Existing units cover pieces. |
| A4 / P1 | A pro replaces their photo, but image upload or the final profile update fails | Keep the previously usable image and clearly distinguish saved fields from failed photo changes. Do not claim a new photo was saved when it was not. | `lib/storage.ts:64` upserts an id-based object before `app/api/pro/profile/route.ts:213` writes the row. Partial-save risk; no live destructive test performed. |
| A5 / P1 | A legacy professional uses an old invitation, a new invitation, or a reused/expired recovery link | Correct account/role and profile binding; used/expired link gives a recoverable state, never another person's profile, an admin role change or a login loop. Approval for a new account must not replace the chosen password with legacy onboarding. | `lib/pro-invite.ts`, `/pro/set-password`, middleware and the approval handler have different branches for pre-existing accounts. Units cover branches; full lifecycle/inbox proof is missing. |
| C1 / P0 | Admin chooses three pros, and one is withdrawn or stops accepting clients before saving the Carta | Reject/refresh stale selection before committing a misleading recommendation. Never auto-replace a personally chosen pro with a random one. | `app/api/admin/matches/route.ts` and `migrations/003_production_hardening.sql:34-80` validate distinct ids/ranks/atomic insertion but do not themselves establish current availability. Risk; check deployed function/schema during reproduction. |
| C2 / P0 | The person opens an already shared Carta after a recommended pro is paused or deleted | No withdrawn profile advertised as available; the remaining options still work, and the missing option is understandable. Do not fabricate three recommendations or fail the entire Carta. | Public profile lookup requires active status; `app/api/public/recommendations/route.ts:95-105` currently drops null joins without a status/availability check. Cross-surface state mismatch to reproduce. |
| C3 / P0 | A Carta is shared or its JSON is inspected by someone other than the requester | Only the permitted first name/recommendation data is public. Never the requester's full note, contact details or another lead's data. Each contact link targets the professional selected for that Carta. | `leads.additional_context` contains name and personal circumstances; the recommendations API intentionally whitelists the response. Verify the real response/HTML, not just the serializer helper. |
| C4 / P1 | Admin creates a Carta but never actually shares it on WhatsApp | Report prepared vs actually delivered as separate outcomes. A generated tracking code or current sent_at is not receipt evidence. | The match RPC sets status/sent_at at creation; concierge fulfillment is manual. Test the generated destination/link; actual controlled WhatsApp delivery remains a separate step. |
| D1 / P0 | The directory database request fails while the person is looking for help | An operational failure must not be certified as an ordinary zero-professionals result; a legitimate empty filter is handled separately with a way to clear it. | `lib/active-professionals.ts:18-20` logs and returns [] on error. Source-confirmed ambiguity; browser/monitoring behavior still to reproduce. |
| D2 / P1 | A person opens WhatsApp, but sendBeacon exists and returns false | Keep WhatsApp usable and attempt the alternate contact-event transport. Missing contact recording must make the contact/review-eligibility stage RED. | `app/components/ContactButton.tsx:78-87` ignores the beacon result. Reproduced with an isolated component diagnostic: expected fetch fallback was called zero times (`/tmp/hara-beacon-rejection-probe.log`); source restored. No real contact was sent. |
| R1 / P0 | A person revisits their review link and changes 2 stars to 5, or uses it from two tabs | One review for the underlying contact, updated content/rating, stable count and correctly recalculated average/ranking. Expired link cannot edit. | `migrations/024_review_tags_and_edit.sql:58-86` explicitly makes a consumed link editable until expiry. Testing only that a token is consumed would enforce the wrong product behavior. |
| R2 / P0 | Admin hides a review after it affected public reputation | Text disappears and rating/count/ranking agree across profile, home and Carta after a fresh read. Editing the same hidden review must not silently make it public. | `reviews.is_hidden`, aggregate trigger in migration 006, and review edit RPC interact. Verify stored aggregate and every public surface together. |
| R3 / P1 | Review cron creates an invitation row, then email fails; cron runs again or overlaps another run | Never report the invitation delivered without receipt. Determine and test the recovery path without duplicate invitations or permanent invisible loss. | `app/api/cron/send-review-requests/route.ts:70-106` inserts before send; the selector excludes existing requests. Current unit explicitly accepts the undelivered row. Recovery policy needs approval, not an invented claim of automatic retry. |
| R4 / Decision | Someone writes a direct review without a recorded contact, or uses two tabs with the same email | First agree which kind of review Hara promises and what identity is verified. Under a one-per-person/pro contract, parallel posts cannot inflate reputation. | PRODUCT.md says real-interaction reviews, but `/api/reviews/direct` is intentionally open and does SELECT then INSERT. Do not prohibit direct reviews or invent a DB uniqueness fix before resolving the policy/deployed constraints. |
| P1 / P0 | A paid period ends at midnight in Argentina; a renewal is entered before expiry or retroactively | Badge, service expiry and ranking agree. Remaining paid days are retained and inclusive periods do not lose a day due to UTC/ART conversion. | `migrations/005_destacado_tier_mvp.sql:223-237`, `lib/ranking.ts` and stored ranking use different clocks/surfaces. Existing parity tests help; only rereading the final row and public pages completes the case. |
| P2 / P1 | Admin records one payment, response is lost, then retries; alternatively two real equal payments exist | One payment must not be accidentally booked twice; two genuinely different payments must still both count. Do not deduplicate merely because amounts/dates match. | Migration 005:181 explicitly permits identical calls as separate payments. This requires a decision about operation/payment identity before asserting idempotency; it is not labeled a newly confirmed bug. |
| P3 / P1 | Renewal and expire-destacado cron run concurrently, or expiry occurs while the cron is delayed | Renewal is not overwritten by expiry; elapsed/unelapsed service is represented consistently. Measure stale ranking if cleanup is delayed; do not infer it from a mocked JS clock. | Payment RPC locks the pro row; cron conditionally downgrades expired rows; chips independently check expiry. Requires real Postgres concurrency and defined expiry timing. |
| B1 / P1 | An article already linked from Diario is withdrawn, or a draft slug is opened directly | Unpublished content is not exposed through permalink/next-article/profile linkage; a valid fallback/404 is shown without leaking author contact details. | `app/blog/[slug]/page.tsx:29-49` filters published posts and active author links. Verify routes after a status transition, not only a button or heading. |

These are scenario families, not a target number of test functions. P0 protects access, privacy, trustworthy recommendations/reputation and paid service. P1 covers recovery and operational races. The original form/DB/mail examples remain baseline journeys below; they are not the whole plan.

## Baseline complete journeys

- **Professional:** apply -> Auth/profile with matching data -> visible pending request in admin -> decision -> correct public visibility and private editing -> received notifications. Required/optional data, normal email normalization and rollback are checked at entry boundaries.
- **Discovery:** filters -> list/map agree -> public profile -> correct WhatsApp destination -> recorded event -> opt-in review eligibility. Refusing to provide review email cannot block contact.
- **Concierge:** all answers -> saved lead -> same admin request -> three curated recommendations -> valid Carta -> correct contact. Requester privacy is checked at the public boundary. Manual sharing is explicitly separate.
- **Reputation:** eligible contact -> scheduled invitation -> receipt -> first submission -> edit -> moderation -> consistent count/average/ranking. Direct-review policy is recorded separately.
- **Destacado:** payment -> correct ledger/expiry -> public badge/ranking -> renewal -> expiry. Distinguish a retry of one operation from a second real payment.
- **Diario:** draft -> publish -> public content/links -> withdraw -> no public exposure.

## Contract decisions before turning observations into fixes

1. **Account recovery:** proposal is to let a submitted account recover access to its review page while retaining publication/edit restrictions. Current old test forbids this; it must not silently dictate the new product contract.
2. **Unavailable Carta pro:** proposal is to show unavailability/remaining valid options and request a curated replacement, without exposing withdrawn contact or substituting automatically.
3. **Review invitation mail failure:** define a recoverable path and no silent green; current log-only tradeoff is not represented as automatic retry.
4. **Direct reviews and payment identity:** preserve current behavior until explicit decisions about verification and real transaction identity. No unapproved ban on direct reviews or automatic merging of payments.

## What the gate checks

For each journey record Browser / Server / Database / Admin / Delivery / Recovery as applicable, with PASS, FAIL or BLOCKED and actual evidence. No message id means delivery is unverified. A service acknowledgment alone is not inbox receipt. A created Carta is not a delivered WhatsApp message.

Ordinary complete journeys use the actual application, production-mode server, isolated real DB/Auth/Storage fixtures and controlled receiving inboxes. Fault injection is allowed at one named boundary to exercise outages; it is labeled as simulated and does not replace the real happy journey. Races use real transactions; changing only the JS clock does not change Postgres NOW().

Retain valuable isolated tests for fast security/validation coverage. Replace stale product assumptions and assertions that only count calls. Example: the current ContactButton test titled 'does not fire any event when onBeforeNavigate throws' only asserts that clicking does not throw and never verifies its stated event behavior. Test titles and outcomes must agree.

## Existing evidence retained from the rejected revision


- The latest real registration/sign-in/review browser test passed (`/tmp/hara-login-real-e2e.log`, 8.2 seconds). Its server log simultaneously records Resend rejecting the example.com confirmation recipient (`/tmp/hara-registro-production.log:15`). This proves a verification gap; it does not prove the mail provider is universally broken.
- Read-only Gmail verification found the matching admin notification for `E2E Test Prof 1793996168571` in INBOX, message `1a1b2813be71ea1f`. The admin notice arrived; recipient confirmation was not tested with a receivable address. No new email was sent during this audit.
- An isolated diagnostic ran the actual registration handler with mocked external services. Missing name correctly returned 400 without writes. Whitespace name, 60 whitespace bio characters and `specialties: ['']` each returned 200 and attempted both account creation and insertion. The expected 400 assertions failed (`/tmp/hara-required-fields-probe.log`). Original test file restored byte for byte.
- An isolated diagnostic ran the actual createLead action with mocked storage and email. Empty email/WhatsApp returned a lead id instead of rejecting (`/tmp/hara-concierge-contact-probe.log`). Temporary test removed. This establishes an application-validation gap, not a claim that a real database write was performed.
- Production caller of createLead: `app/solicitar/SolicitarForm.tsx:74`. Other callers are its three integration tests. The current form tests already check full mapped input and the save-error UI, but cannot detect a broken real DB connection or missing admin notification.
- Concierge confirmation promises a WhatsApp link within 48 hours. Current match creation builds the Carta and tracking code; it does not automatically send a WhatsApp message. Human fulfillment must be reported separately from application persistence and notification.
- No business code changed, no new account/lead was created, and no user records were edited in this audit.


## Test environment and data protection

- No implementation is approved. This revision is diagnosis and case design only.
- Use controlled recipients and a unique run id, not example.com for inbox delivery. The connected Hara Gmail can verify receipt during an agent-run check; reusable CI inbox access requires its own explicit credentials/configuration, not an assumed tool available inside Node.
- Use an authenticated admin test session, never a role/middleware bypass. Shared-database lead cleanup stays through the admin/user under the existing project rule; no new test lead is written before the cleanup mechanism is agreed.
- Keep a ledger of every fixture and verify cleanup after failures. Never alter real professional status, reviews, subscriber payments or real customer requests for a test.
- Inspect deployed schema/RPCs read-only before attributing a migration-defined risk to the live database. No migration or production schema change is authorized.
- Do not run the existing integration global setup against the review server: it deletes .next and starts another dev server.

## Tasks

- [ ] Task 1: Reproducing Tests (RED) and real-journey baselines
- [ ] Task 2: Minimum source fixes for reproduced, approved contracts
- [ ] Task 3: Quality Gate by product outcome

### Task 1: Reproducing Tests (RED) and real-journey baselines

**Objective:** Exercise the six actual product journeys and their prioritized transitions, preserving useful existing tests and reproducing suspected defects before fixes.
**Files:** existing professional/concierge browser tests, profile/approval/recovery tests, ContactButton/events tests, reviews and cron tests, Destacado parity/browser tests, Diario route tests and this case matrix.
**Key Decisions / Notes:** Resolve the explicit contract decisions first. Reuse existing suites and small controlled fixtures; do not create one test for each implementation line. Missing inbox/admin/staging access is BLOCKED, never a green skip. Existing local diagnostics are not represented as live-service success.
**Definition of Done:**
- [ ] Every P0 case is mapped to an executable scenario and observable stored/public outcomes.
- [ ] At least the confirmed validation/beacon failures have persistent reproducing RED tests before source edits.
- [ ] Each suspected race/state bug has a deterministic reproduction or remains labeled unconfirmed; no fixes inferred only from reading.
- [ ] Existing tests that enforce obsolete behavior are identified and rewritten against the approved business contract.

### Task 2: Minimum source fixes for reproduced, approved contracts

**Objective:** Fix each proven failure at its source with the smallest change needed for its scenario, without expanding product policy implicitly.
**Files:** only the entry point(s) demonstrated by Task 1, with their callers/tests listed in the per-case reproduction notes.
**Key Decisions / Notes:** A2/C1/race risks do not authorize speculative rewrites. No blanket queue, schema change, paid-service deduplication, review restriction, or recovery-role change is presumed approved. Persisted requests must remain safe even when email delivery fails.
**Definition of Done:**
- [ ] The corresponding RED case passes and verifies the full affected outcome, not only a helper/call.
- [ ] Ownership, privacy, valid legacy accounts, optional inputs, existing reviews and distinct legitimate payments are preserved.
- [ ] No unrelated data or implementation change is bundled into a test coverage fix.

### Task 3: Quality Gate by product outcome

**Objective:** Report readiness by journey and failure stage, with real evidence and remaining product decisions visible.
**Files:** critical-flow runner/report, the affected suites and current plan/docs.
**Key Decisions / Notes:** Run type/build and useful units, then the approved production-mode real-service gate. Lint remains unconfigured in this repository and cannot be marked passed. Plan approval is separate from approval to deploy or mutate production data.
**Definition of Done:**
- [ ] P0 journey/edge table shows PASS/FAIL/BLOCKED with DB ids, receipt ids, screenshots or error evidence as applicable.
- [ ] Contact fallback, stale professional state, review edit/moderation and paid-period boundaries are checked at their actual coupled surfaces.
- [ ] P1 and contract-decision cases are listed honestly; no global 'all flows work' based on a test count.
- [ ] Fixture cleanup is verified through the approved method; no business code, migrations, commits or deployments beyond the separately approved scope.

## Previous example-only matrix (rejected scope, retained for traceability)

The following original baseline cases are retained as supporting coverage, not the release strategy:


| ID | Real user case | Required proof and failure condition |
|----|----------------|--------------------------------------|
| CF-01 | Professional submits a complete application, then signs in | Auth role/user_id correct, all submitted profile values reread from DB, admin record, review notice and edit 403; both correlated emails must arrive at controlled inboxes. Any absent/mismatched result fails its stage. |
| CF-02 | Required professional data is missing, whitespace, wrong type or a blank list entry | Server rejects with 400 before account/profile writes or notifications. Optional empty fields stay allowed. |
| CF-03 | Profile insert fails after account creation | No submitted profile and no orphan Auth account; recoverable form error; no success notification. Failure injection is clearly identified. |
| CF-04 | Email credentials/provider/delivery fail | Saved request remains consistent; the mail-delivery gate fails explicitly with stage/recipient/run id. No green based only on the HTTP application response. |
| CF-05 | Person completes concierge online and presencial paths | Country/place/contact, intents, note, schedule, modality and entered budget match the DB row; the same lead appears in admin; its admin notification is received. |
| CF-06 | Concierge has unusable contact, missing intent/location, or invalid/inverted budget | Required-data contract applied by server, no record and no notification; invalid optional budgets are checked before treating this as a confirmed bug. |
| CF-07 | Concierge save fails or a person double clicks/retries after a timeout | No false success or phantom notification; answers remain; duplicate behavior is measured and fails the scenario if it creates duplicate requests. |
| CF-08 | Admin prepares the three concierge recommendations | Three distinct professionals, public Carta resolves and matches the selections; sharing link has the right destination. Actual WhatsApp delivery is a separate controlled/manual check, not inferred from creating a match. |
