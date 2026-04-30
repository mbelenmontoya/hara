# Hará Match — Product

> The canonical answer to "what is this product?" — read this before the code, the plan, or the PRDs. Update when the product evolves, not when features ship.

## What it is

Hará Match is a **curated wellness professional marketplace** for Spanish-speaking markets. It's a **trust layer** between people who need wellness support and the professionals who can provide it — verified professionals, reputation built from real interactions, and a human-curated concierge fallback when browsing isn't enough.

Not a directory (anyone-can-list). Not a booking platform (no calendars or payments between user and pro). Not a marketplace in the Uber sense (no automated matching at scale). The product is the *trust*.

## Two ways in

1. **Browse (Directory)** — `/profesionales`
   The discovery-first path. Users land, browse cards ranked by reputation, pick someone, and contact via WhatsApp. Most users will end up here.

2. **Concierge (Solicitar)** — `/solicitar`
   The high-trust differentiator. User describes what they need (situation, modality, location, budget, urgency) → admin reads it → admin hand-picks 3 recommendations → user gets a tracking link → contacts via WhatsApp. This is the "we pick for you" moat.

Both paths end the same way: a WhatsApp conversation between user and professional, on the user's terms, on their timing.

## Who it's for

### Demand side — the people seeking help

- Adults in LATAM (and Spain) looking for therapy, coaching, or wellness support
- The kind of person who Googles "psicólogo en Buenos Aires" and gets overwhelmed by 50 unverified results
- People for whom **trust is the #1 barrier** — they don't want to gamble on a stranger from Instagram
- Mobile-first, WhatsApp-native, prefers calm and private to flashy and social

### Supply side — the professionals

- Independent wellness professionals: therapists, psychologists, coaches, somatic practitioners
- Want to be discovered, build a reputation, fill their practice — but don't want to perform on social media or learn SEO
- Will pay monthly for visibility (Destacado tier) once they trust the platform sends real clients

## Where

The vision is **the Spanish-speaking wellness trust layer** — not a single-country product. Wherever someone speaks Spanish and struggles to find a trustworthy wellness professional, Hará should be the answer.

- **Home / proving ground:** Argentina. All copy today is Argentine informal Spanish (*vos, querés, escribís*), pricing is in ARS, AFIP invoicing automation is on the roadmap. We start here because this is where we are and where we can iterate fastest.
- **Same-language reach:** Spain, Mexico, Chile, Uruguay, Colombia, and the rest of the Spanish-speaking world. Same product, same trust problem, no language barrier. The order we expand in is a real product question, not a constraint.
- **What this means for how we build:** decisions that lock us into Argentina-only assumptions (single tax model, single currency assumption, AR-only voice tone hard-coded into copy strings) should be flagged early so we can keep optionality. Argentina-first ≠ Argentina-only.

## The problem we're solving

In LATAM, finding a trustworthy wellness professional is broken.

| Where people look today | Why it fails |
|--------------------------|--------------|
| Google | Unverified results, SEO-gamed, no signal of quality |
| Instagram | No structure, anyone can claim credentials, reviews are vanity metrics |
| Word of mouth | Slow, limited to your social graph, awkward when nobody in your circle has a name |
| Existing directories | Either too big and unfiltered, or too small and niche |

The bet: people will pay (with attention, and on the supply side, with money) for a place where (1) every listed professional is verified, (2) ratings come from people who actually contacted them, and (3) when overwhelmed, a real human will pick for you.

## What makes it different

1. **Verified professionals only.** Not everyone gets listed. Admin reviews each registration before it goes public.
2. **Real-interaction reviews.** Review links are sent only to people who actually contacted a professional. No anonymous spam, no review-bombing.
3. **Concierge as a moat.** The `/solicitar` flow is the human-touch version that no scaled directory can copy without breaking unit economics. It's also the proof point: "we know our professionals well enough to match you."
4. **Personality.** Calm, warm, trustworthy, premium. "Therapy app designed by Apple." Liquid-glass design, soft beige and violet, no growth-hacker aesthetics. The product feels the way good therapy feels.
5. **Privacy as a load-bearing value.** *"Tu info se comparte recién cuando vos escribís."* The user holds the keys until they choose to open the conversation. This is not a footnote — it's a UX promise that shows up in copy, flow, and what we don't ask for upfront.

## How we make money

Supply-funded. Users pay nothing.

1. **Subscription tiers for professionals** *(primary)*
   - **Básico (free):** listed in directory, default ranking
   - **Destacado (paid):** higher ranking, visual badge, featured placement
   - More tiers can be added over time as we learn what professionals will pay for

2. **Concierge leads** *(future, optional)*
   - The existing PQL/attribution infrastructure can be repurposed to charge professionals per curated lead delivered through `/solicitar` → `/r/[code]`
   - We pivoted *away* from PQL-only billing on **Apr 1, 2026** because attribution disputes were unsustainable as the primary revenue model. But the infra is preserved as an optional premium layer for the concierge flow.

## How we know we're winning

The product ships in **4 phase gates**, each defined by real-user evidence rather than feature checklists. Detail lives in `.claude/plans/main.md`.

| Phase | What "done" means |
|-------|-------------------|
| **0 — ACTIVATE** | Works on prod for 1 real pro + 1 real user, end-to-end |
| **1 — OPEN FOR BUSINESS** | 10 pros onboarded, 5 concierge requests handled, monitoring catches errors before users report them |
| **2 — UNBLOCK SCALE** | Admin no longer in the critical path for payments or directory navigation |
| **3 — TWO-SIDED MARKETPLACE** | Professionals self-manage without admin involvement |

Each phase is gated on real-user signal — we don't start phase N+1 until phase N is real.

## Voice and tone

- **Spanish — Argentine informal:** *vos, querés, escribís, podés*. Never *tú*.
- **Warm, clear, never clinical.** "Tus 3 opciones están listas" not "Recommendations available."
- **Privacy-forward language.** Tell the user what we don't share, before they have to ask.
- **No growth-hacker urgency.** No countdown timers, no "ONLY 2 LEFT", no FOMO mechanics. The wellness market punishes that tone.

## Open product questions

Things that aren't decided yet, tracked here so they don't get lost:

- **Origin story / founder context** — why this, why now, why you. Worth writing down for tone consistency and for anyone who joins later.
- **First 100 professionals plan** — supply acquisition strategy (cold outreach? existing network? content marketing?) shapes onboarding UX priorities.
- **Pricing intuition for Destacado** — what's a realistic monthly price in ARS for AR, and how does that translate as we expand to other Spanish-speaking markets?
- **Specific competitors / inspirations** — who we watch, who we explicitly don't want to become.
- **Country expansion order beyond Argentina** — Spain? Mexico? Chile? Uruguay? Colombia? Each has different operational implications (currency, tax, payment rails, local trust signals). Order is open; the destination — all Spanish-speaking markets — is not.
- **Voice across markets** — Argentine *vos* is locked for the home market, but does Mexico get *tú*, Spain get *tú*, etc., or do we keep one warm pan-regional voice? Decide when we have a real signal from a second market, not before.

## Source-of-truth references

- `.claude/plans/main.md` — operational plan with phase-by-phase roadmap and session log
- `docs/prd/` — feature-level PRDs (one per shipped feature)
- `CLAUDE.md` — engineering context (stack, conventions, working rules)
- `FINAL_SPEC.md` — database schema and API contracts
- `docs/DONE.md` — completed work history
