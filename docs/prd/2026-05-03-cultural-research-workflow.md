# Cultural Research Workflow

Created: 2026-05-03
Updated: 2026-05-04
Author: belu.montoya@dialpad.com
Category: Feature
Status: Final
Research: Standard

## Problem Statement

The Monthly Social Strategist workflow has no fresh cultural-context input. The current strategist prompt carries a static cultural calendar in its KNOWLEDGE section (national holidays, awareness months, seasonal mood). That calendar handles cyclical signals but cannot see **time-sensitive cultural moments** — current news climate, public conversations worth referencing or avoiding, awareness campaigns the local press is covering, viral cultural moments, recent events that shape what wellness content should and shouldn't lean into this month.

The original v1/v2 strategist invoked Anthropic's `web_search` tool inline. That was removed in v3 to keep the strategist fast, cheap, and structurally simple — not because the underlying need disappeared. This PRD defines a **separate Cultural Research Workflow** that runs on its own schedule (bimonthly by default, on-demand via webhook), does the heavy web research once per period, and writes a structured cultural-context summary into a new DB table.

**Decoupled by design (Path C).** This PRD ships the data layer only. The strategist's `Fetch Context` CTE and prompt template are **not** modified here — that integration is a separate follow-up PRD. Cultural context is produced and stored regardless of whether anything reads it yet, which keeps the existing strategist a stable contract and makes both PRDs independently testable.

The architecture is multi-tenant from day one. Hara is the first user, not a unique one — every per-account behavior must work for client #2 the same way it works for Hara, with no hardcoded defaults.

## Core User Flows

### Flow 1: Bimonthly research run (automatic)

1. n8n cron fires on the 1st of every other month (Jan, Mar, May, Jul, Sep, Nov) at 09:00 ART
2. Workflow iterates over all `accounts` rows where `cultural_research_mode != 'off'`
3. For each enabled account, the workflow expands the research targets from per-account config:
   - Zones from `accounts.cultural_research_zones` (TEXT[], may be empty)
   - Countries from `accounts.cultural_research_countries` (TEXT[], may be empty)
   - The `cultural_research_mode` enum gates which target sets are active for the run (`zone_only`, `country_only`, `both`)
4. For each (account, zone, country?) tuple: call Claude Sonnet 4.6 with `web_search_20250305`, asking for a forward-looking 60-day cultural-context summary covering the run period
5. Validate output JSON shape, write to `cultural_context` table with `period_start = run_date`, `period_end = run_date + 60 days`, `expires_at = period_end`
6. Log to `agent_runs` (cost, duration, full I/O) — same audit-log pattern as the strategist
7. Notify each account's `notification_email` via Resend with summary + Studio link

### Flow 2: On-demand research (manual webhook)

1. Operator hits webhook with body `{ account_id, zone?, country?, period_start?, period_end?, supersedes_id?, rejection_reason? }`
2. Same Anthropic + web_search call as Flow 1, scoped to the specified target and period (defaults: account's first configured zone, no country, today → today + 60 days)
3. Inserts new `cultural_context` row, archiving the prior row (status `archived`) when `supersedes_id` is provided
4. Email notification sent

Use cases for Flow 2: a major event happens between bimonthly runs (election, natural disaster, sudden viral moment), or the most recent run produced low-quality output and needs a regen with `rejection_reason`.

### Strategist consumption — out of scope here

The Monthly Social Strategist's integration with this data is **a separate future PRD**. Until that ships, the strategist continues to run unchanged using its static cultural calendar. The data produced by this workflow accumulates in the DB as an audit trail and waits for the consumer.

## Scope

### In Scope

- Single n8n workflow: bimonthly cron + on-demand webhook (dual-trigger pattern, same as the strategist)
- Cultural Researcher agent (Claude Sonnet 4.6) with the `web_search_20250305` tool
- Per-account opt-in via `accounts.cultural_research_mode` (TEXT, NOT NULL, no default — every account explicitly sets it)
- Per-account scope configuration via `accounts.cultural_research_zones TEXT[]` and `accounts.cultural_research_countries TEXT[]` (NOT NULL, no defaults; either may be empty depending on `cultural_research_mode`)
- New `cultural_context` table with race-prevention partial unique index (one `active` row per `(account_id, zone, country, period_start, period_end)`)
- Manual regeneration with rejection feedback loop via webhook (`supersedes_id` + `rejection_reason`), same pattern as the strategist
- `agent_runs` log entry per (account, zone, country) combo — uses the existing table with `workflow_name = 'cultural-research'`
- Email notification via Resend per account when fresh context lands (reuses the existing Resend Header Auth credential)
- Cultural-research output text is produced in **neutral Spanish** regardless of any account's brand voice. The downstream consumer (whatever writes captions or strategies) re-expresses it in the brand's voice. This decouples cultural-data language from brand-voice decisions.
- Migration: new `cultural_context` table + index + new columns on `accounts`. **Existing tables and existing strategist reads are untouched.**

### Explicitly Out of Scope

- **Strategist integration** — extending the strategist's `Fetch Context` CTE, adding a `{cultural_context}` placeholder to the prompt template, or modifying `compose-prompt-jscode.js`. All of that is a separate future PRD.
- **Modifying `brand_context`, `content_pillars`, `posting_benchmarks`, or any field the strategist already reads.** Existing reads are a stable contract.
- **Brand-voice decisions** — voseo vs neutral Spanish for the strategist's *output* is deferred; this PRD only commits cultural-research's *production language* to neutral Spanish.
- **Per-month research cadence** — bimonthly is the contract. Monthly is what v1/v2 tried inline and abandoned.
- **Deduplication across markets within a single account** — separate rows per `(zone, country)` tuple. Sharing is a future optimization.
- **Sentiment classification on news climate** — capture textual `news_climate`; classification is post-MVP.
- **Non-Spanish markets** — language-specific prompting for English/Portuguese is post-MVP.
- **Admin UI for reviewing rows** — review happens in Supabase Studio for MVP, same as strategist.
- **Hara-specific seeding hardcoded into the workflow.** Hara's `cultural_research_mode`, zones, and countries are populated by a seed script, not by the workflow's runtime defaults.

## Technical Context

- **Runtime:** existing n8n on Hetzner Coolify (no new infrastructure)
- **Database:** existing Supabase `automations` project; one new table + three new columns on `accounts`. No changes to existing tables.
- **AI model:** Claude Sonnet 4.6 with `web_search_20250305` tool
- **Notification:** Resend, reusing the existing credential
- **Trigger:** Schedule Trigger (bimonthly cron) + Webhook Trigger (on-demand) — same dual-trigger pattern as the strategist
- **Auth:** built-in Header Auth credential, separate from the strategist's webhook credential (rotation independence)
- **Budget cap:** ~$2 per (account, zone, country) per run; modeled higher than the strategist because web_search is enabled. Hara today (1 zone + 1 country) at bimonthly cadence ≈ $24/year. Trivial.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Cadence | Bimonthly cron + on-demand webhook | Cultural calendar shifts ~6×/year in LATAM. Bimonthly means each strategist run consumes context that is at most one month old. Quarterly leaves month-3 stale. Monthly is what v1/v2 abandoned. |
| Strategist integration | **Path C — decoupled.** Future PRD owns it. | Existing strategist is a stable contract. Shipping this workflow's data layer independently is testable on its own and avoids coupling two design changes into one spec. |
| Where web_search lives | This workflow only, never the strategist | Isolates the slow, expensive, multi-block-response tool to a low-frequency workflow. Strategist stays fast. |
| Geographic scoping | `zone` (required) + `country` (nullable, additive) | Zone covers wellness conversation, seasonality, regional algorithm patterns. Country covers local-specific moments the zone can't see. They layer; they don't substitute. Toggleable per account so either can be turned off. |
| Multi-tenant defaults | None. Every per-account column is NOT NULL with no DB default. | "Hara is the first user, not a unique one." The workflow code is account-agnostic; Hara's specific values are populated by an idempotent seed script. |
| Per-account toggle shape | Single enum `cultural_research_mode` (`off | zone_only | country_only | both`) | One source of truth beats two booleans. Four discrete states cover all valid combinations. |
| Cultural-research output language | Neutral Spanish, regardless of consumer brand voice | Cultural data should be portable. The consumer (strategist or any future workflow) re-expresses it in its own voice. Locking the data in voseo or in tú would force a rewrite when a brand on the other voice consumes it. |
| Validity window | `expires_at = period_end` (60 days from run) | Future strategist consumer's read joins only non-expired rows; forces refresh on schedule. |
| Output format | Structured JSON in `summary_jsonb` (not free text) | Consumers read specific fields (e.g. `holidays`, `conversations_to_avoid[]`); free text would force re-parsing per consumer. |
| Storage of sources | Inside `summary_jsonb.sources` array | Stays with the data. Premature normalization to a separate table. |
| Multi-market within one account | Separate rows per (zone, country) tuple | Simpler schema; deduplication is a future optimization when it earns its keep. |
| Race prevention | Partial unique index on `(account_id, zone, country, period_start, period_end) WHERE status='active'` | Same proven pattern as `monthly_strategies.uniq_active_strategy`. |
| Webhook auth | Separate Header Auth credential, not shared with strategist | Rotation independence; a leaked cultural-research secret shouldn't force a strategist credential rotation. |

## Success Criteria

- Bimonthly cron completes for all enabled accounts within 30 minutes total
- Total cost per bimonthly run is under $10 across all accounts (Hara alone, well under $1 per run)
- Output JSON validates against schema (no malformed runs reach the DB)
- One `cultural_context` row per `(account, zone, country)` per period with `status='active'`
- Race-prevention partial unique index holds under concurrent invocations (regen-loser rolls back via existing division-by-zero pattern)
- Email notification arrives within 30 seconds of run completion per account
- `agent_runs` audit row is `success` + `finished_at` populated for every successful run; `error` + `error_message` on failure
- The workflow runs end-to-end for a hypothetical second account with different `cultural_research_zones` / `cultural_research_countries` without code changes (verified in manual testing)

Note: "the strategist consumes the new context" is **not** a success criterion of this PRD — that belongs to the follow-up PRD.

## Open Questions for /spec

- **`summary_jsonb` final field list.** Starting proposal: `{ holidays: [{date, name, country}], awareness_dates: [{date, name, scope}], seasonal_mood: '...', news_climate: '...', conversations_to_lean_into: [], conversations_to_avoid: [], sources: [{url, title, accessed_at}] }`. Locked in /spec.
- **Zone slug vocabulary.** `latam_hispana` is the working term for "all Spanish-speaking LATAM." Need: is one zone enough, or do we want regional cuts (`rioplatense`, `andino`, `centroamerica_caribe`)? Lean: one zone today, refine when client #2 arrives with a different regional reality.
- **Country code format.** ISO-3166 alpha-2 (`AR`, `MX`, `CO`)? Lean: yes, alpha-2.
- **Period boundary style.** Calendar bimonthly (`Jan-Feb`, `Mar-Apr`, ...) vs rolling 60-day from each run date. Lean: rolling 60-day, simpler under on-demand reruns and matches `expires_at = period_end` cleanly.
- **`cultural_research_mode` values for Hara.** What does the seed insert? Not a workflow concern — a seed-script question. Flag for the seed PR.
- **Webhook auth credential.** Separate from strategist (lean) — confirm naming + 1Password entry in /spec.
- **What to inject into the cultural-research agent's prompt itself.** The agent is a derivative of the strategist's prompt but narrower in scope. Voice rules apply (Argentine informal Spanish for AR-country contexts? Or neutral Spanish always? Lean: neutral always; the consumer re-voices.)
- **Migration number.** This will be `005_cultural_context.sql` (next available after 004). Confirm in /spec.

## Research Findings

Standard tier — applied learnings from existing strategist constraints + outside research on Spanish-language localization:

- The strategist's v1/v2 attempts to inline `web_search` produced 5+ minute responses with multiple text blocks (Anthropic's response shape with tools enabled). This PRD's design avoids that by isolating the tool to a low-frequency workflow.
- n8n's existing dual-trigger (Schedule + Webhook) pattern is proven in the strategist v3.
- Multi-tenant schema design lifted directly from `accounts` + `brand_context` + `monthly_strategies` precedent. No novel patterns.
- 60-day context window is consistent with how content strategists in the wellness space plan: by season, not by month.
- **Neutral Spanish for wellness content is industry-recognized.** Localization-industry guidance places healthcare, NGO, and wellness brands in the category where neutral Spanish works as a voice — content is "serious and informative" enough that the loss of regional warmth is offset by frictionless multi-market reach. (See sources below.)
- **Voseo carries verb conjugation drift, not just a pronoun swap.** `vos tenés / podés / sos / sabés` and the imperative form (`mirá`, `pedí`, `contá`) all change. This is why brand-voice decisions and cultural-data language need to be decoupled — converting one isn't a `replace()`.

Sources:
- [Voseo in Spanish: What Countries Use "Vos" vs "Tú," and Why — Crisol Translations](https://www.crisoltranslations.com/our-blog/voseo-latin-american-spanish/)
- [Which Spanish language variant is best for global marketing? — VeraContent](https://veracontent.com/mix/spanish-language-variant-marketing/)
- [Latin American vs European Spanish for Global Brands — Crisol Translations](https://www.crisoltranslations.com/our-blog/latin-american-spanish-european-spanish/)
- [Voseo — Wikipedia](https://en.wikipedia.org/wiki/Voseo)

## Dependencies

- No code dependencies on the strategist workflow. This workflow ships independently.
- Migration ordering: `005_cultural_context.sql` is additive — new table, new columns on `accounts`. Existing strategist's `Fetch Context` CTE keeps working unchanged.
- Anthropic credential reused. Resend credential reused. Postgres credential reused. **One new credential needed:** Header Auth for the cultural-research webhook.

## Phasing

This PRD is one feature. Recommended phasing inside /spec:

1. Migration `005_cultural_context.sql` (new table + partial unique index + three new columns on `accounts`, all NOT NULL no-default; existing accounts backfilled in the migration body so the NOT NULL doesn't break)
2. Seed script populating Hara's `cultural_research_mode`, `cultural_research_zones`, and `cultural_research_countries` with explicit values (no defaults baked into the migration; Hara is treated as the first account, not a unique one)
3. Workflow JSON: `cultural-research.json` (Schedule + Webhook → fetch enabled accounts → loop per (account, zone, country) → Anthropic with `web_search` → validate JSON → atomic write → email)
4. Manual testing guide (similar shape to `2026-05-03-monthly-strategist-v3.md`): dry run, real bimonthly run, on-demand webhook, regen-with-rejection, error path
5. Documentation in `automation/docs/HANDOFF.md` describing the new workflow + the deferred-strategist-integration follow-up

## Notes

- The Cultural Researcher agent's prompt is a derivative of the Strategist's prompt but narrower in scope: produce structured cultural context, not posts. Tone rules apply (clear, never clinical) so the data feels coherent when consumed downstream, but the *voice* (vos vs tú) is intentionally neutral so the data is portable.
- The `expires_at` mechanism gives a natural "stale" signal: a SQL query can dashboard which accounts have stale or missing cultural context — useful for an admin UI later.
- This workflow is the first piece of automation that **iterates per-account**. The strategist is single-account-per-invocation. Patterns established here (loop over `accounts WHERE cultural_research_mode != 'off'`, fan out per (zone, country)) will inform future per-account batch workflows. Because Hara is the first user and not a unique one, the loop must work identically when a hypothetical second account exists with different config.
- Brand spelling throughout this PRD: **Hara** (no accent — references the Japanese concept of the body's vital center). Existing DB seed has `'Hara Vital'` as the literal account name; that's data, not prose, and is not in scope to change here.
