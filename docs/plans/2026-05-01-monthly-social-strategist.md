# Monthly Social Strategist Workflow Implementation Plan

Created: 2026-05-01
Author: belu.montoya@dialpad.com
Status: COMPLETE
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Build an n8n-hosted strategist agent that generates a monthly Instagram content strategy (theme, narrative arc, ~20 post slots with full briefs) for Hará Match using Claude Sonnet 4.6, persists to a new multi-tenant Supabase project (`automations`), notifies via email, and supports rejection-driven regeneration.

**Architecture:** Two n8n workflows on the existing Hetzner Coolify server: (1) **Generation** — webhook-triggered, reads context from `automations` Supabase project, calls Sonnet 4.6 with web search, validates JSON output, writes `monthly_strategies` + `post_slots`, logs to `agent_runs`, sends email; handles fresh generation and regeneration via conditional branching driven by `rejection_reason` presence. (2) **Heartbeat** — cron every 3 days, writes a row to keep the free-tier Supabase project warm.

**Where artifacts live (important):** All implementation artifacts (SQL migrations, seed scripts, n8n workflow JSON exports, strategist prompt, README, manual testing doc) live in the **sibling `automation/` directory** at `/Users/belumontoya/Desktop/greenbit/automation/` — NOT inside this Hará repo. Reasoning: the workflow is multi-tenant from day 1 (Hará is account #1 of many); the implementation is product-agnostic and will be reused for additional clients. Plan paths in this document use `../automation/` relative to `hara/` for clarity. The plan file itself (this document) lives in `hara/docs/plans/` because that's where /spec was invoked. The PRD lives in `hara/docs/prd/` because Hará's product team owns it.

**Tech Stack:** n8n (existing Hetzner 4GB Coolify), Supabase Postgres (new project `automations`, free tier), Anthropic Claude Sonnet 4.6 with native web search tool, Resend (reusing Hará's existing account + API key), JSON Schema validation in n8n Code node.

## Scope

### In Scope

- New Supabase project `automations` provisioning + schema migration committed in `../automation/migrations/001_initial_schema.sql`
- One-time SQL seed script (`../automation/seed/001_initial_seed.sql`): Hará account, brand_context (incl. recipient email + locked voice rules from PRODUCT.md/globals.css), placeholder content_pillars, LATAM posting_benchmarks, heartbeat row
- Strategist system prompt at `../automation/prompts/strategist-system-prompt.md` with persona/context/rules/knowledge structure and the strict JSON output schema
- Generation workflow JSON export at `../automation/workflows/monthly-strategist.json` — webhook-triggered (manual + cron-disabled), handles fresh generation and regeneration via branch on detected `rejection_reason`
- Heartbeat workflow JSON export at `../automation/workflows/heartbeat.json` — cron every 3 days (safety margin against Supabase 7-day pause threshold), writes a heartbeat row
- Setup README at `../automation/README.md` walking through Supabase project creation, migration apply, seed run, n8n credential setup, workflow import, and manual first-run steps
- Anti-repetition v1: text comparison of generated `theme_angle` values vs the last 4 weeks of `post_slots`; retry once with stronger instruction if similarity exceeds threshold
- Cost + duration + raw I/O logged to `agent_runs` for every run (success and failure)
- PRD update: `docs/prd/2026-05-01-monthly-social-strategist.md` notification section changed from "Telegram" to "email via Resend (reuse Hará's existing credential)"

### Out of Scope

- **Caption / image / video generation** — constructor workflow's job (next phase)
- **Publishing to Instagram** — third-party tool decision deferred (Postiz, Mixpost, etc.)
- **Admin UI** — separate Next.js app, separate Claude conversation
- **Multi-tenant client onboarding UX** — schema is multi-tenant ready (`account_id` everywhere) but no signup flow
- **Real Meta analytics feedback loop** — first 2-3 months use seeded LATAM benchmarks
- **Vector/semantic anti-repetition (pgvector)** — text comparison sufficient for v1
- **Approval status lifecycle beyond `pending_construction`** — constructor's concern
- **Hara's existing Supabase project** — explicitly not used; `automations` is its own project
- **Cron activation** — generation cron stays disabled in v1; manual trigger only until Bel validates 1-2 outputs subjectively
- **Resend domain verification** — handled by Hará Phase 0 Task 2; this plan uses `onboarding@resend.dev` from sender (works because recipient is the Resend account owner)
- **Real content pillars definition** — placeholder pillars seeded; replaced via separate Claude conversation later
- **Approval/admin UI for strategy review** — Bel reads `monthly_strategies` + `post_slots` directly in Supabase Studio

## Approach

**Chosen:** Approach B — two workflows (Generation + Heartbeat), with regeneration as conditional branching inside Generation.

**Why:** Heartbeat is genuinely orthogonal (it pings even when no strategy work is happening). Generation and regeneration share ~90% of the node graph and ~100% of the prompt — splitting them invites drift. Two workflows = clean separation without duplication.

**Alternatives considered:**
- **A. Single linear workflow** — rejected: bundling heartbeat with strategy logic creates one ~22-node graph that's harder to debug; heartbeat needs to fire even when generation is broken
- **C. Three workflows (Generation + Regeneration + Heartbeat)** — rejected: duplicates strategist prompt across two workflows; future prompt changes risk drift between fresh-generation and regen paths

**Key sub-decisions (locked):**
- Web search tool: Anthropic native (built into Claude API; one credential to manage)
- Regeneration trigger: manual webhook URL (Bel writes `rejection_reason` in Studio, then hits saved bookmark URL)
- Notification channel: email via Resend, reusing Hará's existing `RESEND_API_KEY`
- From address: `onboarding@resend.dev` (works in MVP because Bel is the Resend account owner; switches automatically once Hará Phase 0 Task 2 verifies `mail.hara.app`)
- To address: stored in `automations.brand_context.notification_email` (per-account, swappable, multi-tenant ready)
- Schema: single `public` schema on the new Supabase project (domain split is a mechanical migration later if needed)
- Cold-start posture: workflow runs against empty memory (no prior `post_slots`, no rejected strategies) — strategist prompt acknowledges first-run state
- Done definition: manual trigger produces 1 valid strategy Bel can review in Studio; cron stays disabled

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Brand voice canonical sources** — `PRODUCT.md` (lines 92-97 "Voice and tone": Argentine informal — vos/querés/escribís, never tú; calm/warm/premium *"holistic-wellness app designed by Apple"*; privacy-forward; no FOMO/urgency. Hará is a marketplace for **terapias alternativas y bienestar holístico**: reikistas, masajistas terapéuticos, facilitadores de constelaciones familiares, expertos en diseño humano, lectores de registros akáshicos, terapeutas florales/energéticos, instructores de meditación. The strategist must speak from inside that world — its vocabulary, references, and aesthetic.) and `app/globals.css` (lines 7-88 `@theme` block: warm beige #FBF7F2 base, brand violet #4B2BBF, 12 specialty colors mapped to user-symptom/feeling domains — what the user is *atravesando*). The strategist prompt must inline relevant excerpts (not links) so the agent has them at inference time.
- **Existing email utility** — `lib/email.ts` shows the established pattern: `Resend` SDK, hardcoded `ADMIN_EMAIL = 'mariabmontoya@gmail.com'`, `FROM_EMAIL = 'onboarding@resend.dev'`. n8n workflow does NOT import this file — it uses Resend's HTTP API directly via n8n credentials. Same API key value, same recipient, same from address as Hará's email infrastructure. Match the visual style of Hará's existing emails (system-ui sans-serif, table layout, brand violet button — see `lib/email.ts:69-99` for reference markup).
- **Migration convention** — Hará uses sequential numeric migrations in `migrations/NNN_*.sql` (see Hará's `migrations/001_schema.sql` through `006_reviews_collection.sql`). Mirror this convention in the SIBLING directory: `../automation/migrations/NNN_*.sql` (i.e., `/Users/belumontoya/Desktop/greenbit/automation/migrations/`).
- **Resend domain status** — Hará is currently on the unverified `onboarding@resend.dev` test domain, which only delivers to the Resend account owner. This is fine for automation notifications because the only recipient IS the account owner (Bel). When Hará Phase 0 Task 2 lands (`docs/prd/2026-04-27-phase-0-activation.md` Task 2), the verified domain (likely `hola@mail.hara.app`) becomes available; the n8n credential can switch over with a single config change.
- **Pillar definition is deferred** — `PRODUCT.md` and the PRD both note that real content pillars come from a separate Claude conversation later. Seed with **placeholder pillars** (4-5 inferred from PRODUCT.md sections like "Educación emocional", "Historias de la red profesional", "Recursos prácticos para usuarios", "Privacidad y confianza", "Cultura del cuidado") with `is_placeholder=true`. Strategist prompt acknowledges placeholders so the agent doesn't lock into generic angles. Replace via UPDATE when real pillars arrive.
- **Specialty color tokens** — `app/globals.css:41-64` defines 12 specialty colors (ansiedad → teal `#1A7A65`, depresión → indigo `#4B5FC1`, estrés → amber `#C48A1A`, etc.). The strategist's `visual_direction` field for any post touching a specific specialty should reference the corresponding token. Inline this mapping in the prompt's "Knowledge" section.
- **Hetzner Coolify n8n** — n8n is already running on the existing 4GB Hetzner Coolify server. Strategist alone doesn't justify upgrading to 8GB (revisit when constructor lands). Confirm n8n version supports Anthropic node natively, or fall back to HTTP Request node calling Anthropic's REST API directly.
- **Anthropic native web search** — built into Claude API. Tool name: `web_search_20250305` (or current at implementation time). Verify GA status against Anthropic docs before locking in; if unavailable on the target SDK version, fall back to Tavily via n8n's HTTP Request node (single credential swap, no architectural change).
- **n8n credential storage** — API keys (Anthropic, Supabase service_role, Resend) live ONLY in n8n's encrypted credential store. Never in DB, never in code, never in logs, never in any `../automation/` file (not even in `.env.example`). The workflow JSON export must use n8n's credential reference syntax (`{{ $credentials.X }}`), not literal keys. The webhook URL itself is sensitive (n8n generates a UUID-based URL); treat it as a secret.

## Runtime Environment

- **n8n host:** existing Hetzner 4GB Coolify server (no upgrade needed for strategist alone)
- **Supabase project:** new project named `automations`, free tier (heartbeat keeps it warm; upgrade to Pro $25/mo recommended once paying clients exist)
- **Trigger:** manual via webhook URL (saved as bookmark); cron node defined but disabled in v1
- **Health check:** `automations.heartbeat` table — most recent row should be ≤3 days old; `automations.agent_runs` last successful run for the active month should exist
- **Restart procedure:** n8n workflows are stateless within a run — re-trigger the webhook for a fresh attempt; failed runs leave a row in `agent_runs` with `status='error'` for diagnostics

## Database Schema (`automations` project)

**9 tables total:** `_schema_version`, `accounts`, `brand_context`, `content_pillars`, `posting_benchmarks`, `monthly_strategies`, `post_slots`, `agent_runs`, `heartbeat`.

```sql
-- _schema_version: track applied migrations programmatically
CREATE TABLE _schema_version (
  version INT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT
);

-- accounts: multi-tenant root (Hará is account #1)
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- brand_context: per-account brand voice, tone rules, recipient email
CREATE TABLE brand_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  voice_rules TEXT NOT NULL,         -- Locked voice rules from PRODUCT.md
  tone_description TEXT NOT NULL,    -- "Calm, warm, trustworthy, premium..."
  visual_tokens JSONB NOT NULL,      -- Color/spacing/radius tokens from globals.css
  privacy_rules TEXT NOT NULL,       -- "Tu info se comparte recién cuando vos escribís"
  forbidden_patterns TEXT[] NOT NULL, -- ["countdown_timers", "fomo_urgency", "growth_hacker_tone"]
  notification_email TEXT NOT NULL,  -- Recipient for run-complete emails
  notification_from TEXT NOT NULL DEFAULT 'onboarding@resend.dev',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id)
);

-- content_pillars: per-account pillars (placeholders allowed)
CREATE TABLE content_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_placeholder BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- posting_benchmarks: global LATAM defaults until per-account analytics exists
CREATE TABLE posting_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,               -- 'global_latam' | 'account:<id>'
  day_of_week TEXT NOT NULL,         -- 'mon'..'sun'
  hour_local INT NOT NULL,           -- 0-23 (ART local time)
  format TEXT NOT NULL,              -- 'carousel'|'reel'|'post'|'story_series'
  performance_note TEXT,             -- "highest engagement window for wellness"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- monthly_strategies: one row per (account, month, attempt)
CREATE TABLE monthly_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  target_month DATE NOT NULL,        -- e.g., 2026-06-01 for June 2026
  status TEXT NOT NULL DEFAULT 'active', -- 'active'|'archived'
  monthly_theme TEXT NOT NULL,
  narrative_arc JSONB NOT NULL,      -- { week_1: ..., week_2: ..., week_3: ..., week_4: ... }
  format_distribution JSONB NOT NULL, -- { carousel: 8, reel: 6, ... }
  agent_reasoning TEXT NOT NULL,
  rejection_reason TEXT,             -- Bel writes here to trigger regen
  rejection_categories TEXT[],       -- Optional structured tags
  supersedes_id UUID REFERENCES monthly_strategies(id),
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Note: agent_run_id FK is DEFERRABLE because agent_runs is inserted before monthly_strategies in the same transaction; FK check defers to COMMIT.
CREATE INDEX idx_monthly_strategies_account_month ON monthly_strategies(account_id, target_month, status);

-- post_slots: ~20 per strategy
CREATE TABLE post_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES monthly_strategies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  pillar_name TEXT NOT NULL,         -- denormalized for anti-repetition without join
  format TEXT NOT NULL,              -- 'carousel'|'reel'|'post'|'story_series'
  theme_angle TEXT NOT NULL,         -- LOAD-BEARING: anti-repetition compares this
  narrative_role TEXT NOT NULL,      -- 'intro'|'build'|'reveal'|'recap'|'standalone'
  emotional_tone TEXT NOT NULL,
  visual_direction TEXT NOT NULL,    -- references brand_context.visual_tokens
  caption_brief TEXT NOT NULL,       -- 200-400 word brief for downstream constructor
  cta_type TEXT NOT NULL,            -- 'save'|'share'|'dm'|'comment'|'none'
  save_worthy_reason TEXT NOT NULL,
  risk_flags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending_construction',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_post_slots_account_scheduled ON post_slots(account_id, scheduled_at);
CREATE INDEX idx_post_slots_strategy ON post_slots(strategy_id);

-- agent_runs: audit log of every strategist invocation
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,       -- 'monthly-strategist' | 'heartbeat'
  trigger_kind TEXT NOT NULL,        -- 'manual_webhook' | 'cron' | 'regenerate'
  model TEXT NOT NULL,               -- 'claude-sonnet-4-6'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INT,
  input_tokens INT,
  output_tokens INT,
  cost_usd NUMERIC(10,4),
  status TEXT NOT NULL DEFAULT 'running', -- 'running'|'success'|'error'
  error_message TEXT,
  raw_input JSONB,                   -- full prompt + context for replay
  raw_output JSONB,                  -- full agent response
  strategy_id UUID REFERENCES monthly_strategies(id) ON DELETE SET NULL,
  email_sent_at TIMESTAMPTZ          -- populated after Resend API call returns 200
);
CREATE INDEX idx_agent_runs_account_started ON agent_runs(account_id, started_at DESC);

-- heartbeat: keeps free-tier project warm
CREATE TABLE heartbeat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pinged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**RLS:** Disabled on all tables; access is service-role-only via n8n credentials. (When admin UI lands, RLS gets enabled with `account_id`-scoped policies.)

## Strategist Output JSON Schema

```json
{
  "monthly_theme": "string (3-7 words, evocative, not generic)",
  "target_month": "YYYY-MM",
  "narrative_arc": {
    "week_1": "string (1-2 sentences: opening beat)",
    "week_2": "string (build)",
    "week_3": "string (reveal/peak)",
    "week_4": "string (recap/forward look)"
  },
  "format_distribution": {
    "carousel": "int (count)",
    "reel": "int",
    "post": "int",
    "story_series": "int"
  },
  "post_slots": [
    {
      "scheduled_at": "ISO8601 with -03:00 offset (ART)",
      "pillar_name": "string (must match a content_pillars.name)",
      "format": "carousel | reel | post | story_series",
      "theme_angle": "string (specific narrative angle, used for anti-repetition)",
      "narrative_role": "intro | build | reveal | recap | standalone",
      "emotional_tone": "string (calm | warm | reflective | invitational | etc.)",
      "visual_direction": "string (color palette + composition guidance, references tokens)",
      "caption_brief": "string (200-400 word brief for downstream constructor)",
      "cta_type": "save | share | dm | comment | none",
      "save_worthy_reason": "string (why this earns saves vs likes)",
      "risk_flags": ["string"]
    }
  ],
  "agent_reasoning": "string (why this theme/arc/distribution; addresses rejection_reason if applicable)"
}
```

**Validation rules (Code node post-LLM):**
- `post_slots.length` between 16 and 24 (target ~20)
- Sum of `format_distribution` values equals `post_slots.length`
- All `pillar_name` values present in seeded `content_pillars.name`
- All `scheduled_at` values fall within `target_month`
- `target_month` matches workflow's computed target month
- `theme_angle` not duplicated within the strategy (case-insensitive)

## Workflow Behavior

### Generation workflow trigger detection

On webhook hit:
1. Compute `target_month` (default: following calendar month if omitted in payload)
2. Read latest non-archived `monthly_strategies` row for `(account_id, target_month)`
3. Branch:
   - **No active strategy exists** → FRESH GENERATION mode
   - **Active strategy exists, `rejection_reason` is set** → REGENERATION mode (load prior strategy + rejection feedback into prompt; archive old after new is committed)
   - **Active strategy exists, `rejection_reason` is null** → reject with HTTP 409: "Strategy already exists for this month. To regenerate, write `rejection_reason` first, then retry."

### Anti-repetition v1

- Read `post_slots.theme_angle` from the last 4 weeks across this account
- **Cold start:** if the last-4-weeks corpus is empty (first run, or first run after pause), skip the cross-strategy similarity check entirely. The in-strategy uniqueness check (no duplicate `theme_angle` within the same strategy) still applies.
- After strategist returns, compare each new `theme_angle` against priors using normalized text similarity (lowercase, strip punctuation, simple Levenshtein ratio or substring containment)
- If any new angle exceeds 0.75 similarity to a prior, retry the strategist call ONCE with appended instruction: "The following theme angles overlap with recent posts: [list]. Generate alternatives that explore distinct angles."
- After retry, accept output even if some overlap remains (log warning to `agent_runs.error_message`); manual review catches it. **The truth verifier expects this behavior** — see Goal Verification truth #7.

### Error handling

- Anthropic API failure → log to `agent_runs` (status=error), send error email, exit
- Validation failure → retry once with stronger format instruction; if second fails, log + email
- Supabase write failure → atomic transaction (Code node calling Postgres directly with BEGIN/COMMIT); on error, rollback, log, email
- Webhook called when strategy exists without rejection_reason → return 409 with explanation; do NOT call Anthropic (saves cost)

## Assumptions

- Anthropic native web search tool is GA on Claude Sonnet 4.6 by 2026-05-01 — supported by 2026 release notes; verify exact tool name (`web_search_20250305` or current) at implementation time. **If unavailable**, fall back to Tavily via n8n HTTP Request node — Tasks 3, 4 affected (single credential swap, prompt unchanged).
- Sonnet 4.6 model ID is `claude-sonnet-4-6` per current Anthropic SDK conventions.
- n8n on Hetzner Coolify can reach Anthropic API, Supabase, and Resend (all standard outbound HTTPS) — Task 4 depends.
- Bel has admin access to create new Supabase projects under the existing organization — Task 1 depends.
- Resend account API key (`RESEND_API_KEY` in `.env.local`) is shareable for use in n8n credentials — Task 4 depends. (Same key, two consumers; Resend allows this.)
- The `mariabmontoya@gmail.com` email is the correct recipient for Hará automation notifications — Task 2 (seed) depends. Stored in `brand_context.notification_email` so it's swappable.
- Single n8n run completes in <5 minutes (free n8n execution timeout) — Sonnet 4.6 typical run is 30-60s; budget cap of 5min has wide margin — Task 4 depends.
- Specialty color mappings in `app/globals.css:41-64` are stable and the strategist can reference them in `visual_direction` — Task 3 (prompt) depends.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Anthropic web search returns stale or low-quality cultural context | Medium | Medium | System prompt instructs strategist to prefer recent results and cite sources in `agent_reasoning`; manual review catches drift |
| Free-tier Supabase pauses despite heartbeat | Low | High | Heartbeat fires every 3 days (4-day buffer before 7-day pause threshold; cron `*/3` avoids the month-end 7-day gap that `*/6` produces); after first month, verify heartbeat row count = expected |
| Strategist outputs malformed JSON | Medium | High | Strict schema validation in Code node post-call; one retry with explicit format instruction; on second failure, log full raw output to `agent_runs.raw_output` for manual triage |
| n8n workflow exceeds 5min timeout | Low | High | Sonnet 4.6 typical is 30-60s; alert if >4min via duration check in agent_runs; fall back to Opus or split into chained calls only if becomes recurring |
| Email delivery fails (Resend rate limits, transient API error) | Low | Low | Resend account already battle-tested by Hará app; on email failure, do NOT fail the run — strategy is still in DB and Bel can read Studio directly; log the email failure in `agent_runs.error_message` |
| Cost per run exceeds $1 cap or monthly $5 cap | Low | Medium | Pre-flight cost cap node (Task 4) returns HTTP 402 if `SUM(cost_usd)` for current month ≥ $5 before any Anthropic call; `agent_runs.cost_usd` recorded per run via Compute cost node using documented pricing constants; bypassed only when `dry_run=true` |
| Anti-repetition v1 (text comparison) misses semantic overlap | High | Low | Acceptable for MVP; retry logic catches blatant duplicates; Bel's manual review catches subtle ones; pgvector path documented for v2 |
| Bel hits regen webhook without writing `rejection_reason` first | Medium | Low | Webhook trigger logic checks for `rejection_reason IS NOT NULL` on the active strategy; returns HTTP 409 with corrective message; no Anthropic call made |
| Placeholder content_pillars produce generic output | Medium | Medium | Prompt explicitly acknowledges placeholder pillars and asks strategist to lean on `brand_context.tone_description` for differentiation; replace pillars before second monthly run |
| Webhook URL leaks (treated as secret) | Low | High | n8n generates UUID-based URLs (unguessable); store URL in 1Password or similar; rotate if compromised by deleting + recreating webhook node |

## Goal Verification

### Truths

1. **Schema applies cleanly:** Running `../automation/migrations/001_initial_schema.sql` against a fresh Supabase project creates exactly 9 tables with no errors and indexes/FKs intact. Verifiable via `SELECT count(*) FROM information_schema.tables WHERE table_schema='public'` returning 9, and the names matching: `_schema_version`, `accounts`, `agent_runs`, `brand_context`, `content_pillars`, `heartbeat`, `monthly_strategies`, `post_slots`, `posting_benchmarks`. `_schema_version` contains exactly one row with `version=1`.
2. **Seed produces a valid context:** Running `../automation/seed/001_initial_seed.sql` inserts exactly 1 account, 1 brand_context row, ≥4 content_pillars (placeholder), ≥7 posting_benchmarks (LATAM), and 1 heartbeat row.
3. **Manual generation produces valid output:** Hitting the generation webhook URL (with no payload, defaults to next month) creates 1 `monthly_strategies` row, 16-24 `post_slots` rows, and 1 `agent_runs` row with `status='success'` and `cost_usd < 1.00` — within 5 minutes.
4. **JSON schema enforced:** Output JSON validates against the schema above (theme present, 4-week arc populated, format distribution sums to slot count, all pillars match seeded names, all scheduled_at values fall within target month).
5. **Email arrives:** A run-complete email is sent to `mariabmontoya@gmail.com` and `agent_runs.email_sent_at - agent_runs.finished_at < interval '30 seconds'` for the latest successful run; the email's subject contains the target month and body links to the Supabase Studio row. Email arrives in inbox within 5 minutes (Resend delivery latency varies and is outside our control).
6. **Heartbeat keeps DB warm:** The heartbeat workflow inserts a row every 3 days (chosen for safety margin against Supabase's 7-day pause threshold); after 14 days the heartbeat table has ≥4 rows and the Supabase project shows no pause incidents.
7. **Regeneration produces measurably different output:** With an active strategy, writing `rejection_reason='theme too generic'` and hitting the webhook archives the prior strategy (`status='archived'`) and creates a new strategy with `supersedes_id` pointing to the prior. **The first-attempt strategist call is rejected if any new `theme_angle` has >0.75 similarity to a prior angle**, forcing a retry with explicit anti-overlap instruction. After acceptance (with possible warning logged to `agent_runs.error_message`), `agent_runs.raw_output` for the regen run differs from the prior run's raw_output (i.e., not a no-op).
8. **409 guardrail works:** Hitting the webhook when an active strategy exists without `rejection_reason` returns HTTP 409 and does NOT trigger an Anthropic call. Verified by: webhook response status code = 409 AND no new row in `agent_runs` after the call. Documented as test scenario in `../automation/docs/manual-testing/2026-05-01-monthly-social-strategist.md`.

### Artifacts

- `../automation/migrations/001_initial_schema.sql` — DDL for all 9 tables
- `../automation/seed/001_initial_seed.sql` — initial data
- `../automation/prompts/strategist-system-prompt.md` — full prompt + JSON schema
- `../automation/workflows/monthly-strategist.json` — n8n workflow export (generation)
- `../automation/workflows/heartbeat.json` — n8n workflow export (heartbeat)
- `../automation/README.md` — setup walkthrough
- `../automation/docs/manual-testing/2026-05-01-monthly-social-strategist.md` — manual testing guide (lives in sibling automation directory, NOT hara)
- `docs/prd/2026-05-01-monthly-social-strategist.md` — updated to reflect email (not Telegram); stays in hara because the PRD is owned by Hará's product team

## Progress Tracking

- [x] Task 1: Schema migration for `automations` Supabase project
- [x] Task 2: Initial seed script (account, brand_context, placeholder pillars, LATAM benchmarks, first heartbeat)
- [x] Task 3: Strategist system prompt + JSON output schema
- [x] Task 4: Generation workflow (n8n JSON export) — fresh + regen branches, validation, transactional write, email
- [x] Task 5: Heartbeat workflow (n8n JSON export)
- [x] Task 6: Setup README, manual testing doc, and PRD update (Telegram → email)

**Total Tasks:** 6 | **Completed:** 6 | **Remaining:** 0

## Implementation Tasks

### Task 1: Schema migration for `automations` Supabase project

**Objective:** Create the schema DDL file that, when applied to a fresh Supabase project, produces the 9 tables defined in this plan with correct types, FKs, and indexes.

**Dependencies:** None (this is the foundation).

**Files:**
- Create: `../automation/migrations/001_initial_schema.sql`

**Key Decisions / Notes:**
- Mirror Hará's migration convention (`migrations/NNN_*.sql` numeric prefix) — see `migrations/001_schema.sql` for reference style
- All UUIDs default to `gen_random_uuid()` (pgcrypto extension; Supabase ships it)
- All timestamps `TIMESTAMPTZ` with `DEFAULT now()`
- RLS DISABLED on every table — service role only access in MVP
- No triggers, no RPCs in this migration — keep it pure schema; move-fast if pivots needed
- `_schema_version` is a real table (not a comment) so migration state is programmatically queryable; INSERT `(1, now(), 'initial schema')` at the bottom of 001
- Cyclic FK between `agent_runs.strategy_id` ↔ `monthly_strategies.agent_run_id` is intentional and resolved with `DEFERRABLE INITIALLY DEFERRED` on `monthly_strategies.agent_run_id` so both inserts can happen in one transaction

**Definition of Done:**
- [ ] File exists at `../automation/migrations/001_initial_schema.sql`
- [ ] Running the file against a fresh Postgres database (or fresh Supabase project) succeeds with zero errors
- [ ] All 9 tables exist: `_schema_version`, `accounts`, `agent_runs`, `brand_context`, `content_pillars`, `heartbeat`, `monthly_strategies`, `post_slots`, `posting_benchmarks`
- [ ] `_schema_version` has exactly one row with `version=1`
- [ ] Foreign keys enforced: deleting an account cascades to all child rows
- [ ] Four indexes present: `idx_monthly_strategies_account_month`, `idx_post_slots_account_scheduled`, `idx_post_slots_strategy`, `idx_agent_runs_account_started`
- [ ] `monthly_strategies.agent_run_id` FK to `agent_runs.id` is DEFERRABLE INITIALLY DEFERRED (verified via `\d+ monthly_strategies`)

**Verify:**
- Apply via Supabase SQL Editor on the new `automations` project
- Run `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1;` — expect the 9 tables in alphabetical order: `_schema_version`, `accounts`, `agent_runs`, `brand_context`, `content_pillars`, `heartbeat`, `monthly_strategies`, `post_slots`, `posting_benchmarks`
- Run `SELECT version FROM _schema_version;` — expect `1`

---

### Task 2: Initial seed script

**Objective:** Populate the new `automations` project with Hará as account #1, brand voice rules extracted from `PRODUCT.md` + `app/globals.css`, placeholder content pillars, LATAM posting benchmarks, and a first heartbeat row.

**Dependencies:** Task 1 (schema must exist).

**Files:**
- Create: `../automation/seed/001_initial_seed.sql`

**Key Decisions / Notes:**
- Hard-code Hará's account UUID as a fixed value (e.g., `00000000-0000-0000-0000-000000000001`) so n8n credential references are stable across DB rebuilds. Document this in README.
- `brand_context.voice_rules`: paste the exact text of PRODUCT.md "Voice and tone" section (lines 92-97) — vos/querés/escribís rule, "warm, clear, never clinical", privacy-forward language, no FOMO mechanics
- `brand_context.tone_description`: paste "Calm, warm, trustworthy, premium. Holistic-wellness app designed by Apple. Hará is a marketplace for terapias alternativas y bienestar holístico — reiki, masajes terapéuticos, constelaciones familiares, diseño humano, registros akáshicos, terapia floral, terapia energética, meditación, y otras prácticas afines."
- `brand_context.visual_tokens`: JSONB containing key tokens from `globals.css:7-88` — at minimum `{ background, surface, brand, brand_weak, success, warning, danger, info, specialty: { ansiedad: '#1A7A65', depresion: '#4B5FC1', ... } }`
- `brand_context.privacy_rules`: "Tu info se comparte recién cuando vos escribís" (load-bearing UX promise from PRODUCT.md)
- `brand_context.forbidden_patterns`: `ARRAY['castilian_tu_pronoun', 'usted_pronoun', 'fomo_urgency', 'countdown_timers', 'growth_hacker_tone']` — explicit pronoun names disambiguate (Castilian "tú" forbidden, Argentine "vos" required; "usted" is the formal pronoun, also forbidden). Add an SQL comment in the seed file: `-- 'castilian_tu_pronoun' = the Spanish 'tú' pronoun used in Spain/most LATAM. Argentine voice uses 'vos' instead — see Task 3 strategist prompt.`
- `brand_context.notification_email`: `'mariabmontoya@gmail.com'`
- `brand_context.notification_from`: `'onboarding@resend.dev'` (with explicit comment that this gets updated when Phase 0 Task 2 lands)
- 4-5 placeholder content pillars with `is_placeholder=true`: "Educación emocional", "Historias de la red profesional", "Recursos prácticos para usuarios", "Privacidad y confianza", "Cultura del cuidado". Each gets a 1-2 sentence description.
- 7-12 LATAM posting benchmarks (`scope='global_latam'`) covering known good windows: Wed noon, Thu 9am, evening 6-9pm — per the research findings in the PRD
- One heartbeat row with `pinged_at = now()` to seed the table

**Definition of Done:**
- [ ] File exists at `../automation/seed/001_initial_seed.sql`
- [ ] Idempotent: running twice does not error or duplicate (use `ON CONFLICT DO NOTHING` on natural keys, or wrap in `IF NOT EXISTS` guards)
- [ ] After running: `SELECT count(*)` per seeded table returns: accounts=1, brand_context=1, content_pillars≥4, posting_benchmarks≥7, heartbeat≥1
- [ ] `brand_context.notification_email = 'mariabmontoya@gmail.com'`
- [ ] All voice text excerpts match PRODUCT.md / globals.css exactly (verifiable by string compare)

**Verify:**
- Apply against Supabase project via SQL Editor
- Run `SELECT name, is_placeholder FROM content_pillars ORDER BY display_order;` — expect 4-5 placeholder rows
- Run `SELECT notification_email FROM brand_context;` — expect `mariabmontoya@gmail.com`

---

### Task 3: Strategist system prompt + JSON output schema

**Objective:** Author the canonical strategist prompt that the n8n workflow injects into the Anthropic API call. Produces deterministic JSON output adhering to the schema in this plan.

**Dependencies:** Task 2 (prompt references seeded data shape).

**Files:**
- Create: `../automation/prompts/strategist-system-prompt.md`

**Key Decisions / Notes:**
- Industry-standard 4-section structure: **Persona** → **Context** → **Rules** → **Knowledge** (per research findings; references included in PRD)
- **Persona:** "You are an Argentine community manager for Hará Match, a curated wellness professional marketplace. Your tone is calm, warm, premium..."
- **Context:** placeholders for `{brand_context}`, `{content_pillars}`, `{recent_post_slots}` (last 4 weeks for anti-repetition), `{posting_benchmarks}`, `{prior_rejected_strategies}` (last 3 with rejection_reason), `{target_month}`, `{is_regeneration}`, `{rejection_reason}` (only if regen). The n8n Code node fills these from DB queries.
- **Rules** (load-bearing, MUST appear verbatim in the prompt):
  - Use Argentine informal Spanish (vos/querés/escribís); never tú; never usted
  - Tone: calm, warm, trustworthy, premium ("holistic-wellness app designed by Apple"). Hará is a marketplace for **terapias alternativas y bienestar holístico**: reikistas, masajistas terapéuticos, facilitadores de constelaciones familiares, expertos en diseño humano, lectores de registros akáshicos, terapeutas florales/energéticos, instructores de meditación. Speak from inside that world — its vocabulary, references, and aesthetic. Acknowledge user-side feelings (ansiedad, insomnio, duelo, búsqueda de claridad) as *experiences atravesadas*, in everyday language.
  - Privacy-forward: include privacy reassurance language where relevant ("Tu info se comparte recién cuando vos escribís")
  - **No FOMO**: forbidden phrases include "solo quedan", "última oportunidad", "¡no te lo pierdas!", countdown framing, growth-hacker urgency
  - Save-priority over likes: `save_worthy_reason` must be specific and concrete
  - Serialized storytelling: at least 60% of slots use `narrative_role` ∈ {intro, build, reveal, recap}; standalone is the exception
  - JSON-only output: no preamble, no markdown, no explanation outside `agent_reasoning`
- **Knowledge:**
  - Inline excerpts of PRODUCT.md sections (mission, voice and tone, what makes it different)
  - Inline color token mapping for specialty domains (ansiedad → teal, depresión → indigo, etc. with hex codes)
  - LATAM cultural calendar guidance: October = mental health awareness month; February = back-to-routine in Argentina; December = wrap-up reflection; etc.
  - 2026 IG algorithm note: "the platform rewards serialized storytelling and resource-value content over standalone aesthetic posts"
- **Anti-repetition guidance** (in Rules): "Vary `theme_angle` distinctly from the most recent 4 weeks of posts (provided in Context). Avoid synonyms of recent angles."
- **Regeneration guidance** (conditional, only when `{is_regeneration} = true`): "The previous strategy for this month was rejected with feedback: {rejection_reason}. Address this feedback explicitly in your new strategy. Your `agent_reasoning` must reference how this version differs."
- **Web search instruction**: "Use the web search tool to fetch current Argentine cultural/temporal context for {target_month} — holidays, mental health awareness dates, news climate. Cite sources you used in `agent_reasoning`."
- **Output schema**: paste the JSON schema from this plan verbatim, with one example, marked as the strict contract
- **First-run / cold-start handling**: prompt explicitly says "If `recent_post_slots` is empty (this is the first month), establish a foundational tone for future months to build on."

**Definition of Done:**
- [ ] File exists at `../automation/prompts/strategist-system-prompt.md`
- [ ] Contains all four sections (Persona, Context, Rules, Knowledge) clearly marked
- [ ] All load-bearing brand voice rules appear verbatim
- [ ] JSON output schema appears in full, with one example
- [ ] Template placeholders (`{brand_context}`, etc.) are clearly marked and consistent with what Task 4's Code node will inject
- [ ] Includes regeneration-mode conditional block
- [ ] Includes cold-start conditional block
- [ ] Total length 4-8 KB markdown (long enough to be specific, short enough to leave token budget for context)

**Verify:**
- Read the file end-to-end, check it covers every rule listed above
- Manually substitute the placeholders with sample data and verify the rendered prompt is coherent

---

### Task 4: Generation workflow (n8n JSON export)

**Objective:** Build the end-to-end n8n workflow that handles webhook trigger → context fetch → strategist call → validation → transactional write → email notification, with branching for fresh-generation vs regeneration.

**Dependencies:** Tasks 1, 2, 3 (schema, seed, prompt all exist).

**Files:**
- Create: `../automation/workflows/monthly-strategist.json` (n8n workflow export)

**Key Decisions / Notes:**
- **Trigger node:** Webhook (POST). Optional payload: `{ account_id?, target_month?, dry_run? }`. Defaults: account_id = Hará's seeded UUID; target_month = first day of following calendar month; dry_run = false.
- **Dry-run mode (`dry_run=true`):** skips the Anthropic API call entirely and uses a hardcoded sample JSON response stored in the workflow as static data. All downstream validation, write, and email logic runs against the sample. This lets implementer verify everything except the LLM call without burning tokens (estimated saving: ~$0.50 per test cycle).
- **Pre-flight cost cap check** (Code node, before mode detection): query `SELECT COALESCE(SUM(cost_usd),0) AS month_total FROM agent_runs WHERE account_id=$1 AND status='success' AND date_trunc('month', started_at)=date_trunc('month', now())`. If `month_total >= 5.00`, return HTTP 402 immediately with body `{ error: 'monthly_budget_exceeded', month_total }`; do not call Anthropic. Skipped when `dry_run=true`.
- **Mode detection** (Code node): query latest `monthly_strategies` for `(account_id, target_month)`. Branch:
  - No row → FRESH GENERATION (set `is_regeneration=false`)
  - Row with `rejection_reason` → REGENERATION (set `is_regeneration=true`, prior_strategy_id, rejection_reason)
  - Row without `rejection_reason` → return 409 immediately ("Strategy exists; write rejection_reason first")
- **Context gathering** (5 parallel Supabase nodes):
  1. brand_context for account_id
  2. content_pillars for account_id (ordered by display_order)
  3. posting_benchmarks (scope='global_latam')
  4. last 4 weeks of post_slots (for anti-repetition; account_id, scheduled_at >= now() - 28 days)
  5. prior rejected strategies (last 3, account_id, rejection_reason IS NOT NULL)
- **Compose prompt** (Code node): load `strategist-system-prompt.md` (stored as n8n static data or fetched from filesystem if Coolify mount allows; otherwise embed inline), substitute placeholders, return as messages array for Anthropic API
- **Insert agent_runs row** (Postgres node): status='running', started_at=now(), workflow_name='monthly-strategist', trigger_kind=detected mode, model='claude-sonnet-4-6', raw_input=composed prompt — capture row id for later updates
- **Anthropic API call** (HTTP Request node OR Anthropic node if available):
  - Model: `claude-sonnet-4-6`
  - Max tokens: 8000 (output JSON ~4-6KB; buffer for retries)
  - **Web search tool name VERIFICATION GATE before this node is implemented:** confirm exact identifier against current Anthropic API docs (https://docs.anthropic.com/en/docs/build-with-claude/tool-use). Document the verified version string + source URL in the workflow node's description field. If the tool is not GA on Sonnet 4.6, switch to Tavily fallback (HTTP Request node calling `https://api.tavily.com/search`) — prompt unchanged, tool definition swapped.
  - System message: composed prompt's persona+context+rules+knowledge sections
  - User message: "Generate the monthly content strategy for {target_month} per the JSON schema. Return only valid JSON."
- **Validate JSON** (Code node):
  - Parse JSON; if parse fails, retry the call ONCE with stronger format instruction; if still fails, mark agent_runs as error and exit
  - Validate against schema (post_slots length 16-24, format_distribution sum = post_slots length, all pillar_names exist in seeded pillars, all scheduled_at within target_month, theme_angles unique within strategy)
- **Anti-repetition check** (Code node):
  - Compare each new theme_angle to last-4-weeks corpus using normalized similarity (lowercase + strip punctuation + Levenshtein ratio)
  - If any exceeds 0.75 similarity, retry call ONCE with appended instruction listing the conflicting angles; accept on second pass even if some overlap (log warning to `agent_runs.error_message`)
  - Cold-start exception: if last-4-weeks corpus is empty, skip the cross-strategy check entirely
- **Compute cost** (Code node): calculate `cost_usd` from Anthropic's `usage.input_tokens` + `usage.output_tokens` using documented pricing constants. Define at top of node:
  ```javascript
  const SONNET_4_6_INPUT_PER_MTOK = 3.00;   // USD per 1M input tokens
  const SONNET_4_6_OUTPUT_PER_MTOK = 15.00; // USD per 1M output tokens
  // SOURCE: https://www.anthropic.com/pricing — verify at implementation time
  ```
  Compute: `cost_usd = (input_tokens / 1e6) * INPUT_PER_MTOK + (output_tokens / 1e6) * OUTPUT_PER_MTOK`. If web search was used and Anthropic charges for it (per-search fee), add that line item. Store as decimal with 4 places of precision.
- **Atomic write** (single Postgres node, "Execute Query" mode, multi-statement query — n8n does NOT share connections across nodes, so transactions must be one node):
  - The prior Code node composes one SQL string wrapping `BEGIN; UPDATE ... [archive prior]; INSERT INTO monthly_strategies (...) RETURNING id INTO new_strategy_id; INSERT INTO post_slots (...) VALUES (...), (...), ...; UPDATE agent_runs SET status='success', finished_at=now(), output_tokens=$X, cost_usd=$Y, raw_output=$Z, strategy_id=new_strategy_id WHERE id=$run_id; COMMIT;`
  - Use `DO $$ ... $$ LANGUAGE plpgsql;` block for the variable scoping if Postgres node doesn't accept `DECLARE` in plain SQL
  - All values parameterized to prevent injection from prompt-derived content
  - On error: the Postgres node's failure path triggers the Error path below (rollback is automatic since BEGIN was inside the same query)
- **Send email via Resend HTTP API** (HTTP Request node):
  - Endpoint: `POST https://api.resend.com/emails`
  - Headers: `Authorization: Bearer {{ $credentials.resend.api_key }}`
  - Body: `{ from: brand_context.notification_from, to: brand_context.notification_email, subject: 'Estrategia de {target_month_label} lista — {N} posts', html: <table-style markup matching lib/email.ts visual style> }`
  - Body links to Supabase Studio URL: `https://supabase.com/dashboard/project/{automations_project_ref}/editor/{monthly_strategies_table_id}?filter=id:eq:{strategy_id}` — store project_ref in n8n env, table id in node
  - On 200 response: UPDATE agent_runs SET email_sent_at=now() WHERE id=$run_id (truth #5 verifier reads this)
- **Error path** (catch every fallible node): UPDATE agent_runs SET status='error', error_message=..., finished_at=now(); send error email with truncated stack trace
- **HTTP response**: on success, return `{ status: 'success', strategy_id, target_month, post_slot_count, dry_run }` with HTTP 200; on 409 path return `{ error: 'rejection_reason_required' }` with HTTP 409; on cost cap return `{ error: 'monthly_budget_exceeded', month_total }` with HTTP 402

**Security:**
- API keys (Anthropic, Supabase service_role, Resend) live ONLY in n8n credential store, NEVER in `../automation/` files committed to git. The workflow JSON export must use n8n's credential reference syntax (`{{ $credentials.X }}`), not literal keys.
- Webhook URL is treated as a secret — store in 1Password; if leaked, delete the webhook node and recreate to rotate the URL.

**Performance considerations:**
- Strategist call is the only meaningfully expensive node (30-60s, ~$0.50/run); everything else is ms-scale Postgres + HTTP
- Total node count ~18-22 — within reasonable n8n maintainability range
- No polling loops; no expensive data transforms in render-path equivalents

**Definition of Done:**
- [ ] File exists at `../automation/workflows/monthly-strategist.json` (valid n8n workflow JSON)
- [ ] Workflow imports cleanly into a fresh n8n instance
- [ ] Required credentials documented: Anthropic, Supabase (service role), Resend
- [ ] Anthropic web search tool name verified against current Anthropic docs; verified version string + source URL stored in the relevant node's description field
- [ ] No literal API keys in the exported JSON (all credentials reference `{{ $credentials.X }}`)
- [ ] Pre-flight cost cap query implemented; manually verified by setting test data with `cost_usd=5.00` and confirming next request returns HTTP 402
- [ ] `dry_run=true` query param skips the Anthropic call and uses sample JSON; verified by no new charges in Anthropic console + complete row inserts in DB
- [ ] Atomic write verified: simulated post_slots insert failure leaves no orphan monthly_strategies row (use `pg_terminate_backend` mid-transaction in a test, or inject a constraint violation in one slot)
- [ ] Manual webhook trigger with no payload produces a complete strategy + post_slots + agent_runs row + email — within 5 minutes
- [ ] `agent_runs.email_sent_at` populated within 30 seconds of `agent_runs.finished_at` for successful runs
- [ ] Regeneration path tested: with active strategy + rejection_reason set, hitting webhook archives prior, creates new with supersedes_id, email arrives with "(regen #N)" prefix
- [ ] 409 guardrail tested: with active strategy and no rejection_reason, webhook returns 409 and DOES NOT call Anthropic (verified by no new agent_runs row)
- [ ] All error paths log to agent_runs and send error email

**Verify:**
- Import workflow JSON into n8n
- Configure 3 credentials
- Activate webhook (manual mode, cron disabled)
- Hit webhook URL via curl or browser bookmark
- Open Supabase Studio, verify monthly_strategies + post_slots + agent_runs rows
- Check inbox for `mariabmontoya@gmail.com`

---

### Task 5: Heartbeat workflow (n8n JSON export)

**Objective:** Prevent the free-tier `automations` Supabase project from auto-pausing after 7 days of idle by writing a row to `heartbeat` every 3 days (chosen for safety margin against the 7-day pause threshold; cron `*/6` produces a 7-day gap at month boundary which is exactly at threshold).

**Dependencies:** Task 1 (schema must exist).

**Files:**
- Create: `../automation/workflows/heartbeat.json`

**Key Decisions / Notes:**
- 2 nodes total: Cron trigger + Postgres node
- Cron schedule: every 3 days at 10:00 ART (`0 13 */3 * *` UTC, given ART is UTC-3). Why every 3 days, not 6: cron `*/6` in day-of-month skips from day 31 to day 1 (next month) producing a 7-day gap exactly at the Supabase pause threshold. `*/3` produces gaps of 1-3 days — well clear of 7. Cost is negligible (one Postgres INSERT per ping).
- Postgres action: `INSERT INTO heartbeat (pinged_at) VALUES (now());`
- No notification on heartbeat — silent operation; query heartbeat table to verify

**Definition of Done:**
- [ ] File exists at `../automation/workflows/heartbeat.json`
- [ ] Workflow imports cleanly into n8n
- [ ] Activated workflow inserts a heartbeat row on the configured cadence
- [ ] After 14 days of operation, heartbeat table has ≥4 rows AND Supabase project shows no pause incidents

**Verify:**
- Import workflow, activate cron
- Trigger manually once to confirm it inserts a row
- Wait 3 days, verify second row appears automatically

---

### Task 6: Setup README, manual testing doc, and PRD update

**Objective:** Produce setup documentation that lets someone provision and run this from scratch, the manual testing guide required by project rules, and update the original PRD to reflect the email (not Telegram) decision.

**Dependencies:** Tasks 1-5 (everything else in place).

**Files:**
- Create: `../automation/README.md` (in sibling automation directory, NOT hara)
- Create: `../automation/docs/manual-testing/2026-05-01-monthly-social-strategist.md` (in sibling automation directory)
- Modify: `docs/prd/2026-05-01-monthly-social-strategist.md` (in hara — Telegram → email; add line: "Notification channel changed to email via Resend during /spec — see Key Decisions")

**Key Decisions / Notes:**
- README sections: Overview · Prerequisites · Provision Supabase · Apply Schema · Run Seed · n8n Credentials Setup · Import Workflows · First Manual Run · Regeneration Flow · Cost Monitoring · Troubleshooting
- README must include explicit credential safety line: "API keys (Anthropic, Supabase service_role, Resend) live ONLY in n8n credential store. The `../automation/` directory in this repo MUST NOT contain any API key, even in `.env.example`. Use placeholders like `<set-in-n8n-credentials>` in any sample."
- README "Regeneration Flow" section documents: where to find the webhook URL in n8n UI, how to bookmark it, where to store the bookmark (1Password recommended), what to do if URL is rotated (delete + recreate webhook node, update bookmark)
- README disambiguates `heartbeat` workflow (n8n) from `heartbeat` table (Supabase Postgres) — both share the name; different things
- README "Cost Monitoring" section documents: pricing constants location (Task 4 Compute cost node), how to check monthly spend (`SELECT SUM(cost_usd) FROM agent_runs WHERE date_trunc('month', started_at)=date_trunc('month', now())`), what triggers HTTP 402 ($5/mo cap)
- README troubleshooting: "If Anthropic changes pricing, update constants in `monthly-strategist.json` Code node 'Compute cost'."
- Manual testing doc covers: fresh-generation happy path, regeneration happy path, 409 guardrail, cost cap (402) guardrail, dry-run mode, validation failure simulation, email failure tolerance, heartbeat verification after 3 days
- PRD edit is minimal — single section update + a Key Decisions row addition; preserves PRD's "Status: Final" since this is /spec-level refinement, not a problem-statement change

**Definition of Done:**
- [ ] README at `../automation/README.md` walks through provisioning end-to-end with zero ambiguity (someone unfamiliar can stand up the system)
- [ ] README includes credential safety line, regeneration URL handling section, heartbeat workflow/table disambiguation, cost monitoring section
- [ ] Manual testing doc covers ≥8 scenarios with concrete pass/fail criteria (8 listed above)
- [x] PRD updated: all notification-describing uses of Telegram replaced with email; 5 remaining "Telegram" occurrences are intentional ("not Telegram" decisions and historical research references — not notification claims). Notification line in Technical Context says "Email via Resend (reuses Hará's existing RESEND_API_KEY)"; Key Decisions table has new row "Notification channel | Email via Resend (not Telegram)"
- [ ] All cross-references between files (README ↔ migrations ↔ workflows) use absolute paths from repo root
- [ ] No literal API keys, webhook URLs, or other secrets in any file under `../automation/`

**Verify:**
- Read README top-to-bottom; trace every step against actual files
- Open manual testing doc; confirm each scenario maps to a verifiable artifact
- Diff PRD; confirm only notification-related lines changed

---

## Open Questions

- **Anthropic web search exact tool name** at implementation time (e.g., `web_search_20250305` or current). **Verification gate before Task 4 starts:** confirm tool identifier and Sonnet 4.6 support against https://docs.anthropic.com/en/docs/build-with-claude/tool-use; if not GA, switch to Tavily (HTTP Request node). Document the verified version + source URL in the workflow node's description.
- **Anthropic Sonnet 4.6 pricing constants** — Task 4 Compute cost node uses `INPUT_PER_MTOK=3.00` and `OUTPUT_PER_MTOK=15.00` as starting values. **Verification gate before Task 4 starts:** confirm against https://www.anthropic.com/pricing at implementation time and update if changed.
- **Real content pillars vs placeholders** — placeholders are seeded with `is_placeholder=true`. Bel may want to define real pillars before first run instead of after. If so, it's a one-time UPDATE before Task 4's first manual trigger.

## Deferred Ideas

- **pgvector semantic anti-repetition** — once monthly volume gives us enough corpus, switch from text similarity to embedding similarity for richer overlap detection
- **Per-account analytics feedback loop** — replace global LATAM benchmarks with real Meta analytics per account (post-MVP, Pro tier)
- **Domain split (`accounts.*`, `social.*`, `analytics.*` schemas)** — mechanical migration if/when the surface area grows beyond ~15 tables
- **Admin UI for strategy review** — separate Next.js app on Vercel; reads `monthly_strategies` + `post_slots` from `automations` Supabase
- **Self-trigger on rejection** — Supabase database webhook on `rejection_reason` field update, replacing manual webhook hit
- **Multi-tenant client onboarding** — adds account creation flow, billing tier, per-account credential isolation
- **Cost cap auto-enforcement** — pre-flight aggregate query against `agent_runs.cost_usd` for current month; abort run if > $5/month already spent
- **Multi-DB heartbeat** — extend the heartbeat workflow to also ping Hará's main Supabase project (currently it only pings `automations`). Both are free-tier and at risk of pause. Add a second Postgres node in `heartbeat.json` with credentials for Hará's main DB, connected in parallel from the cron trigger. Or: create a second heartbeat workflow if the credentials should stay isolated. Consider when to do this based on whether Hará's main project is actually idle long enough to risk pause. *(noted 2026-05-01)*
