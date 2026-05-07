# Monthly Social Strategist Workflow

Created: 2026-05-01
Author: belu.montoya@dialpad.com
Category: Feature
Status: Final
Research: Standard

## Problem Statement

Hara Match is a pre-launch wellness marketplace for Spanish-speaking markets, building credibility and curiosity on Instagram before launch. Manual content planning isn't sustainable — but bad strategy upstream poisons every downstream workflow (caption generation, image generation, publishing). The strategist agent must be solid, voice-consistent, and narratively coherent before any content production can be automated.

This workflow generates the strategy layer only: a monthly content plan with ~20 post slots, each carrying enough strategic context for a downstream constructor workflow to execute. It does not write captions, generate media, or publish — those are separate workflows that consume this one's output.

The architecture is multi-tenant from day one because the long-term vision is a sellable SaaS where Hara is account #1 of many.

## Core User Flows

### Flow 1: Monthly generation (automatic)

1. n8n cron fires on the 1st of the month at 09:00 ART
2. Workflow reads from Supabase `automations` project: `brand_context`, `content_pillars`, last 4 weeks of `post_slots` (anti-repetition), `posting_benchmarks`, prior rejected strategies (memory)
3. Strategist agent (Claude Sonnet 4.6) runs with web search tool — fetches Argentine cultural/temporal context for the month (holidays, awareness/efemérides relevant to a holistic-wellness audience: lunaciones, equinoccios, fechas energéticas, mental-health awareness dates, plus news climate). Hara is a marketplace for **terapias alternativas y bienestar holístico** — the strategist speaks from inside that world.
4. Agent outputs structured JSON: monthly theme, narrative arc across 4 weeks, format distribution, ~20 post slots with full briefs
5. Workflow validates JSON shape, writes `monthly_strategies` row + `post_slots` rows in single transaction
6. Workflow logs to `agent_runs` (cost, duration, full I/O)
7. Email notification sent to Bel via Resend: "Estrategia de [mes] lista. N posts. Revisar." with Supabase Studio link.

### Flow 2: Review (manual, on Bel's schedule)

1. Bel opens Supabase Studio
2. Reads the latest `monthly_strategies` row (theme, arc, distribution, agent_reasoning)
3. Reads child `post_slots` rows (briefs)
4. Forms judgment subjectively (manual review of briefs is MVP validation strategy — no constructor exists yet to render finished posts)
5. If satisfied: no action needed. Slots stay `pending_construction` for the future constructor workflow.
6. If not satisfied: proceeds to Flow 3

### Flow 3: Regeneration (on rejection)

1. Bel writes `rejection_reason` (and optional `rejection_categories`) on the `monthly_strategies` row in Supabase Studio
2. Bel triggers regeneration by hitting the saved webhook URL bookmark (manual webhook decided in /spec)
3. Workflow reads the previous strategy + `rejection_reason` as additional input to the strategist prompt
4. Strategist generates new strategy that explicitly addresses the rejection
5. Old strategy archived (`status='archived'`); new strategy written with `supersedes_id` pointing to old
6. Email notification sent to Bel again with the new attempt
7. Loop until satisfied

## Scope

### In Scope

- Single n8n workflow: monthly cron-triggered batch
- Strategist agent (Claude Sonnet 4.6) with web search tool
- Reads context from Supabase `automations` project: `brand_context`, `content_pillars`, last 4 weeks of `post_slots`, `posting_benchmarks`, prior rejected strategies for memory
- Outputs validated JSON: monthly theme, narrative arc, format distribution, ~20 post slots with full briefs (pillar, format, theme/angle, emotional tone, narrative role, visual direction, caption brief, scheduled datetime, cta_type, risk_flags)
- Writes to Supabase `automations` project, multi-tenant schema (`account_id` everywhere), Hara as account #1
- Email notification via Resend with summary + Supabase Studio link (reuses Hara's existing RESEND_API_KEY)
- Manual regeneration with rejection feedback loop: Bel writes `rejection_reason`, triggers regen, strategist learns
- All archived strategies retained as long-term memory across months
- `agent_runs` log: model used, cost, duration, errors, full I/O for replay/debugging
- Heartbeat cron (every 3 days) to prevent Supabase free-tier pause
- LATAM posting benchmarks seeded as global reference data
- Anti-repetition v1: plain-text comparison of last 4 weeks' `theme_angle` fields
- API keys live exclusively in n8n credentials, never in DB

### Explicitly Out of Scope

- **Caption/copy writing** — constructor workflow's job (next phase)
- **Image, carousel, video generation** — constructor workflow's job
- **Publishing to Instagram** — third-party tool decision (Postiz, Mixpost, etc.) deferred
- **Admin UI** — separate Next.js app on Vercel, separate Claude conversation
- **Multi-tenant client signup, billing, auth** — schema is multi-tenant ready, but no client onboarding UX in MVP
- **Approval status lifecycle beyond `pending_construction`** — constructor's concern (which slots to consume)
- **Vector embeddings (pgvector) for semantic anti-repetition** — text comparison sufficient for v1; pgvector available when needed
- **Real Meta analytics feedback loop** — first 2-3 months use LATAM benchmarks; analytics integration is post-MVP
- **Content pillars definition** — deferred to a separate Claude conversation that benchmarks pillars as a community manager exercise
- **Hara's existing Supabase project** — explicitly not used; `automations` is its own project

## Technical Context

- **Runtime:** n8n on existing Hetzner 4GB Coolify server (no upgrade needed for strategist alone)
- **Database:** New Supabase project named `automations`, free tier initially
  - Heartbeat cron required (project will pause after 7 days idle without it)
  - Upgrade to Supabase Pro ($25/mo) recommended once paying clients exist
- **Schema:** Multi-tenant — `account_id` foreign key on every relevant table. Hara is the only seeded account in MVP. Schema organization (`public` vs domain-split) is a /spec decision.
- **AI model:** Claude Sonnet 4.6 (~$0.50/run, $5/month cap, well under budget)
- **Web search tool:** TBD in /spec — Anthropic native or Tavily
- **Notification:** Email via Resend (reuses Hara's existing RESEND_API_KEY — decided in /spec; no bot required)
- **Trigger for regeneration:** TBD in /spec — manual webhook URL vs Supabase database webhook on field change
- **Budget cap:** $5/month total API costs

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Database location | New Supabase project `automations` (not Hara's) | Clean separation; Hara is account #1, sellable as SaaS from day 1; no migration when second client added |
| Pause mitigation | Heartbeat cron in n8n every 3 days | Free; `*/6` cron produces 7-day gap at month-end (exactly at pause threshold); `*/3` gives 4-day buffer |
| Notification channel | Email via Resend (not Telegram) | Decided in /spec: simpler setup, no bot required, zero new credentials (reuses Hara's existing RESEND_API_KEY + mariabmontoya@gmail.com as recipient). Works immediately since recipient is the Resend account owner, bypassing unverified-domain limitation. |
| Strategist model | Claude Sonnet 4.6, not Opus | EQ-Creative parity at 1/5 the cost (Sonnet 1991 vs Opus 2216) |
| Validation in MVP | Manual review of briefs in Supabase Studio | No constructor exists yet; subjective is acceptable; admin app comes later |
| Recovery from bad output | Manual regeneration with rejection feedback | One-shot too rigid for creative output; rejection signal is the cheapest form of long-term memory |
| Rejection capture UX | Supabase field update (not Telegram bot) | Forward-compatible with future admin app; single source of truth; data-layer-first beats UX-first |
| Anti-repetition v1 | Plain-text comparison of last 4 weeks | pgvector available but premature for MVP |
| Schema design | Multi-tenant ready (`account_id` everywhere) | Sellable from day 1; no painful migration later |
| Server upgrade | None — 4GB stays | Strategist alone doesn't justify 8GB; revisit when constructor lands |
| Output structure | Strategist outputs strict JSON schema in one call | One agent call cheaper and easier to validate than chained calls |
| Strategist memory | Fresh load with structured context (incl. rejected strategies) | Door open for true long-term memory later via embeddings/summaries |
| Narrative arc emphasis | Load-bearing field, not soft prose | 2026 IG algorithm rewards serialized storytelling — micro-episodes across consecutive days outperform standalone posts |
| Save-priority over likes | Strategist briefs explicitly prioritize save-worthy content | 2026 wellness audience signal: saves > likes for resource value |

## Success Criteria

- Workflow completes a monthly run in under 5 minutes
- Total cost per run is under $1 (Sonnet 4.6 token usage)
- Output JSON validates against schema (no malformed runs reach the database)
- A populated `monthly_strategies` row + ~20 valid `post_slots` rows on every successful run
- Strategy reads as if a real community manager wrote it (subjective; validated through manual review until constructor exists)
- Email notification (via Resend) arrives within 30 seconds of workflow completion (measured by agent_runs.email_sent_at - agent_runs.finished_at)
- Regeneration with rejection feedback produces measurably different output (not just minor reword) — measured by `theme_angle` text similarity vs prior attempt
- Heartbeat cron keeps Supabase free-tier project warm indefinitely (zero pause incidents)

## Research Findings

Standard tier research surfaced:

- **n8n templates validate the pattern.** Workflows 6070 (Gemini + Telegram + Apify) and 4060 (OpenAI + content calendar) implement the monthly Instagram strategy + post-slot generation pattern. We adapt, not invent.
- **System prompt structure is industry-standard:** persona + context + rules + knowledge. Three-layer quality gate: AI classifier + rule validator + human review. "Act as community manager" persona-driven prompting is the established approach.
- **2026 IG algorithmic edge: serialized storytelling** — micro-episodes across consecutive days outperform standalone posts. This sharpens the `narrative_arc` requirement from soft to load-bearing.
- **Wellness audiences engage with 200-400 word captions.** Saves have eclipsed likes as the primary engagement signal. Strategist must prioritize save-worthy briefs.
- **pgvector confirmed in Supabase** for v2 semantic anti-repetition.
- **Argentina-specific posting time data is sparse.** Strategist defaults to global benchmarks (Wed noon, Thu 9am, evening 6-9pm) until Hara accumulates real data.

Sources:
- [n8n template 6070 — Instagram + Gemini + Telegram + Apify](https://n8n.io/workflows/6070-instagram-content-and-dm-automation-with-gemini-telegram-and-apify/)
- [n8n template 4060 — Instagram + OpenAI + Content Calendar](https://n8n.io/workflows/4060-automated-instagram-content-planning-and-posting-with-openai-and-content-calendar/)
- [Supabase pgvector docs](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Sprout Social: 2026 Instagram Campaigns](https://sproutsocial.com/insights/instagram-campaigns/)
- [Auralcrave: 2026 Instagram Strategy](https://auralcrave.com/en/2026/04/22/the-2026-great-engagement-5-strategies-to-master-the-new-instagram-logic/)
- [Buffer: 2026 Best Time to Post](https://buffer.com/resources/when-is-the-best-time-to-post-on-instagram/)
- [How to Train Generative AI to Speak in Brand Voice](https://www.getfishtank.com/insights/how-to-train-generative-ai-to-speak-in-your-brand-voice)

## Open Questions for /spec

These were spec-level details resolved in /spec (see `hara/docs/plans/2026-05-01-monthly-social-strategist.md`):

- ✅ Web search tool: Anthropic native (with Tavily fallback documented)
- ✅ Regeneration trigger: manual webhook URL bookmark
- ✅ Notification channel: email via Resend (not Telegram — see Key Decisions table)
- ✅ Schema organization: single `public` schema (domain-split deferred)
- ✅ Heartbeat cron: every 3 days, pings `heartbeat` table
- ✅ JSON schema: defined in `automation/prompts/strategist-system-prompt.md`
- ✅ Strategist prompt: Persona/Context/Rules/Knowledge in `automation/prompts/strategist-system-prompt.md`
