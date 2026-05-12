# Hara Vital — Product

> The canonical answer to "what is this product?" — read this before the code, the plan, or the PRDs. Update when the product evolves, not when features ship.

## What it is

Hara Vital is a curated marketplace for **terapias alternativas y bienestar holístico** in Spanish-speaking markets — reiki, masajes terapéuticos, constelaciones familiares, diseño humano, registros akáshicos, terapia floral, terapia energética, meditación, y otras prácticas afines. It's a **trust layer** between people atravesando algo concreto (ansiedad, insomnio, duelo, estrés, búsqueda de claridad) and the holistic practitioners who can accompany them — verified practitioners, reputation built from real interactions, and a human-curated concierge layer for users who want a recommendation chosen for them.

The match is **"lo que estás atravesando → quién puede acompañarte desde otro lugar"** — anchored in what the user is *feeling*, open about the modality. A user with insomnia might be paired with masaje, constelaciones, or reiki — whatever resonates. The platform's job is to make that pairing trustworthy.

The product is the *trust*.

## Two ways in

1. **Browse (Directory)** — `/profesionales`
   The discovery-first path. Users land, browse cards ranked by reputation, pick someone, and contact via WhatsApp. Most users will end up here.

2. **Concierge (Solicitar)** — `/solicitar`
   The high-trust differentiator. User describes what they need (situation, modality, location, budget, urgency) → admin reads it → admin hand-picks 3 recommendations → user gets a tracking link → contacts via WhatsApp. This is the "we pick for you" moat.

Both paths end the same way: a WhatsApp conversation between user and professional, on the user's terms, on their timing.

## Who it's for

### Demand side — the people seeking help

- Adults in LATAM (and Spain) atravesando algo concreto — ansiedad, insomnio, duelo, estrés, agotamiento, una búsqueda de claridad — y abiertos a acompañamiento desde **terapias alternativas y bienestar holístico** (reiki, masajes, constelaciones, diseño humano, registros akáshicos, terapia floral, etc.)
- People who frame their need as *"no puedo dormir"* / *"estoy con mucha ansiedad"* / *"estoy atravesando un duelo"* — in the language of lived experience
- The kind of person who's tried Google or Instagram, found 50 unverified options across reiki, masajes, constelaciones, and given up
- People for whom **trust is the #1 barrier** — they want certainty before opening a conversation with someone they found on Instagram
- Mobile-first, WhatsApp-native, prefers calm and private to flashy and social

### Supply side — the professionals

- Practicantes independientes de **terapias alternativas y bienestar holístico**: reikistas, masajistas terapéuticos, facilitadores de constelaciones familiares, expertos en diseño humano, lectores de registros akáshicos, terapeutas florales, terapeutas energéticos, instructores de meditación, y otras prácticas afines
- Want to be discovered, build a reputation, fill their practice — and want the platform to handle visibility for them, so their energy stays in the work
- Will pay monthly for visibility (Destacado tier) once they trust the platform sends real clients

## Where

The vision is **the Spanish-speaking wellness trust layer across every Spanish-speaking market**. Wherever someone speaks Spanish and struggles to find a trustworthy wellness professional, Hara should be the answer.

- **Home / proving ground:** Argentina. All copy today is Argentine informal Spanish (*vos, querés, escribís*), pricing is in ARS, AFIP invoicing automation is on the roadmap. We start here because this is where we are and where we can iterate fastest.
- **Same-language reach:** Spain, Mexico, Chile, Uruguay, Colombia, and the rest of the Spanish-speaking world. Same product, same trust problem, shared language across all markets. The order we expand in is an open product question.
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
4. **Personality.** Calm, warm, trustworthy, premium. *"Holistic-wellness app designed by Apple."* Liquid-glass design, soft beige and violet, in the calm aesthetic of premium wellness brands. The product feels the way a good holistic session feels — present, unhurried, attended-to.
5. **Privacy as a load-bearing value.** *"Tu info se comparte recién cuando vos escribís."* The user holds the keys until they choose to open the conversation. This is a UX promise that shows up in copy, flow, and asking only for what's strictly necessary at each step.

## How we make money

Supply-funded. Users pay nothing.

1. **Subscription tiers for professionals** *(primary)*
   - **Básico (free):** listed in directory, default ranking
   - **Destacado (paid):** higher ranking, visual badge, featured placement
   - More tiers can be added over time as we learn what professionals will pay for

2. **Concierge leads** *(future, optional — billing unsolved)*
   - The existing PQL/attribution infrastructure can be repurposed to charge professionals per curated lead delivered through `/solicitar` → `/r/[code]`
   - We pivoted *away* from PQL-only billing on **Apr 1, 2026** because attribution disputes were unsustainable as the primary revenue model. But the infra is preserved as an optional premium layer for the concierge flow.
   - **Visibility constraint (added 2026-05-12):** Until a new concierge billing model lands, concierge stays operationally alive (the flow runs end-to-end) but is **not actively promoted** in product surfaces — home, hero copy, and support pages lead with marketplace. Marketplace and concierge remain co-equal in the long-term product shape; this is a temporary visibility decision tied to monetization, not a positioning change.

## How we know we're winning

The product ships in **4 phase gates**, each defined by real-user evidence rather than feature checklists. Detail lives in `.claude/plans/main.md`.

| Phase | What "done" means |
|-------|-------------------|
| **0 — ACTIVATE** | Works on prod for 1 real pro + 1 real user, end-to-end |
| **1 — OPEN FOR BUSINESS** | 10 pros onboarded, 5 concierge requests handled, monitoring catches errors before users report them |
| **2 — UNBLOCK SCALE** | Admin no longer in the critical path for payments or directory navigation |
| **3 — TWO-SIDED MARKETPLACE** | Professionals self-manage without admin involvement |

Each phase is gated on real-user signal — we start phase N+1 only when phase N is real.

## Voice and tone

- **Spanish — Argentine informal:** *vos, querés, escribís, podés*.
- **Warm, clear, conversational.** *"Tus 3 opciones están listas"* — specific, warm, immediate.
- **Privacy-forward language.** Tell the user how we hold their info — that we share it only when *they* choose to open the conversation.
- **Calm pacing.** Copy that respects the user's time and earns attention through clarity. The wellness market rewards that tone.

## Open product questions

Open product questions, tracked here so they stay visible:

- **Origin story / founder context** — why this, why now, why you. Worth writing down for tone consistency and for anyone who joins later.
- **First 100 professionals plan** — supply acquisition strategy (cold outreach? existing network? content marketing?) shapes onboarding UX priorities.
- **Pricing intuition for Destacado** — what's a realistic monthly price in ARS for AR, and how does that translate as we expand to other Spanish-speaking markets?
- **Specific competitors / inspirations** — who we watch, who we admire, and who we want to outlearn.
- **Country expansion order beyond Argentina** — Spain? Mexico? Chile? Uruguay? Colombia? Each has different operational implications (currency, tax, payment rails, local trust signals). Order is open; the destination — all Spanish-speaking markets — is not.
- **Voice across markets** — Argentine *vos* is locked for the home market, but does Mexico get *tú*, Spain get *tú*, etc., or do we keep one warm pan-regional voice? Decide when we have a real signal from a second market, not before.

## Source-of-truth references

- `.claude/plans/main.md` — operational plan with phase-by-phase roadmap and session log
- `docs/prd/` — feature-level PRDs (one per shipped feature)
- `CLAUDE.md` — engineering context (stack, conventions, working rules)
- `FINAL_SPEC.md` — database schema and API contracts
- `docs/DONE.md` — completed work history
