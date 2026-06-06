# Professional Interaction Analytics

Created: 2026-06-05
Author: belu.montoya@dialpad.com
Agent: Claude Code
Category: Feature
Status: Draft
Research: Quick

## Problem Statement

Hara is a marketplace where professionals pay for visibility. Right now there is zero data on how much
visibility they're actually getting. We can't answer "how many people visited your profile this week?"
or "how many clicked your Instagram?" — which means we can't demonstrate value to existing subscribers,
close new ones, or understand which professionals are performing well. All admin decisions and sales
conversations happen without data. This feature captures the missing signals and surfaces them in
the admin dashboard as charts that can be downloaded to show in sales conversations with professionals.

## Core User Flows

### Flow 1: Admin views a professional's analytics

1. Admin goes to `/admin/analytics`
2. Admin sees a list of professionals with summary stats (views, WhatsApp clicks, Instagram clicks)
3. Admin clicks on a professional (or filters by name)
4. Admin sees time-series charts for that professional: profile views, WhatsApp contacts, Instagram clicks
5. Admin adjusts the date range (last 7 days / 30 days / 90 days / custom)
6. Admin right-clicks or uses a download button to save chart images to disk
7. Admin shares images in WhatsApp / email with the professional as a proof-of-value screenshot

### Flow 2: A professional's profile page is visited (instrumentation)

1. User navigates to `/p/[slug]`
2. A `profile_view` event fires silently (non-blocking) via sendBeacon to `/api/events`
3. Event is stored in the existing `events` table with `event_type: 'profile_view'` and `professional_id`

### Flow 3: A user clicks WhatsApp on a professional's profile page (instrumentation)

1. User is on `/p/[slug]`, clicks "Contactar por WhatsApp"
2. A `whatsapp_click` event fires via sendBeacon to `/api/events` before navigation
3. Event stored with `event_type: 'whatsapp_click'`, `professional_id`, and `professional_slug`
4. WhatsApp opens in a new tab — tracking never blocks navigation

### Flow 4: A user clicks the Instagram link (instrumentation)

1. User is on `/p/[slug]`, sees the Instagram link in the Contact card
2. User clicks — the link opens Instagram in a new tab
3. An `instagram_click` event fires via sendBeacon before navigation (same pattern as `ContactButton`)
4. Event stored with `event_type: 'instagram_click'`

## Scope

### In Scope

- **Three new event types on `/p/[slug]`:**
  - `profile_view` — fires on page mount via a new `ProfileViewTracker` client component
  - `whatsapp_click` — fires from the ContactButton on the profile page (the existing `contact_click` in `ProfileContact.tsx` was wired for the reviews cron, not analytics — this replaces it with a dedicated, clearly-intentional event)
  - `instagram_click` — fires on Instagram link click in `ProfileContact.tsx`
- **Extend `/api/events`** to accept and store all three new event types — no DB schema changes needed, new values for the existing `event_type` column
- **New admin page `/admin/analytics`** with:
  - Summary table: all professionals ranked by total profile views (configurable period)
  - Per-professional detail view with 3 line/bar charts: profile views, WhatsApp clicks, Instagram clicks over time
  - Date range selector: last 7d / 30d / 90d / custom
  - Chart image download button (PNG export)
- **New read API `/api/admin/analytics`** that queries the events table and returns aggregated time-series data grouped by day and event type per professional

### Explicitly Out of Scope

- Professional-facing dashboard — professionals do not see their own stats yet
- Concierge deck impressions (`/r/[tracking_code]`) — separate concern, different instrumentation surface
- "Ver detalles" bottom sheet open tracking — low signal, deferred
- Real-time dashboards or live refresh
- Email reports or scheduled exports
- CSV export (chart image export covers the sales use case; CSV is a separate feature)
- Deduplication logic (raw counts for now; dedup can be added in the display layer later using `session_id`)

## Technical Context

- **Existing events table columns relevant here:** `event_type` (text), `professional_id` (uuid FK),
  `tracking_code` (text, NOT NULL — needs a synthetic value for profile_view), `fingerprint_hash`,
  `session_id`, `ip_address`, `user_agent`, `referrer`, `created_at`
- **`tracking_code` constraint:** the column is `NOT NULL`. For `profile_view` and `instagram_click`
  events originating from `/p/[slug]`, use the same synthetic format as direct contacts:
  `"direct-{slug}-{nanoid(10)}"` — or simpler, use `"profile-{slug}"` as a fixed identifier
  since these are not billing events and don't need uniqueness
- **Rate limiting:** existing `ratelimit` from `lib/rate-limit.ts` should gate profile_view events to
  prevent inflation (e.g., 1 per session per professional per 5 minutes)
- **Instrumentation location:** `profile_view` fires from a new `ProfileViewTracker` client component
  dropped into `app/p/[slug]/page.tsx`; `whatsapp_click` replaces the ContactButton's current
  `contact_click` payload in `ProfileContact.tsx` (or extends it with a distinct `event_type`);
  `instagram_click` fires from an `onClick` added to the `<a>` tag in `ProfileContact.tsx`
  using the same sendBeacon pattern as `ContactButton`
- **WhatsApp existing behavior:** `ProfileContact.tsx` currently passes `trackingCode="direct-profile-visit"`
  and no `attributionToken` to `ContactButton`, which fires a `contact_click` event intended for the
  reviews cron — not analytics. We keep the existing cron event untouched and fire an additional
  `whatsapp_click` event from the same button click for analytics purposes
- **Admin auth:** existing admin layout at `app/admin/` handles auth — new page follows the same pattern
- **Chart library:** Recharts — already popular in the React/Next.js ecosystem, tree-shakeable,
  supports `<ResponsiveContainer>` for fluid layouts; install via `npm install recharts`
- **PNG export:** use `html2canvas` on the chart container element — `npm install html2canvas`
- **Analytics query:** a single Supabase query grouping events by `date_trunc('day', created_at)` and
  `event_type` filtered by `professional_id` and date range, executed server-side in the API route

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Who sees the metrics | Admin only | Professionals don't have a dashboard yet; admin can screenshot charts to share manually |
| Event storage | Extend existing `events` table, new `event_type` values | No migration needed, same dedup/fingerprint infrastructure reused |
| Profile view counting | Raw events (no dedup) | Simple, honest, fast. `session_id` is captured so dedup can be added later in the display query |
| `tracking_code` for non-billing events | Use `"profile-{slug}"` fixed format | Column is NOT NULL; non-billing events don't need unique codes |
| Chart library | Recharts | Lightweight, composable, React-native, good TypeScript support |
| Chart export | html2canvas → PNG download | No server round-trip, works entirely in the browser |
| Admin analytics location | New `/admin/analytics` page | Keeps separation from the existing leads/professionals/reviews admin sections |
