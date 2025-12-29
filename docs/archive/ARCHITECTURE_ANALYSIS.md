# Hará Match - MVP Architecture Analysis

**Project:** Performance-based lead marketplace for wellness professionals in LATAM
**Key Constraint:** Solo builder, must be operational before lead acquisition
**Critical Requirement:** Bulletproof PQL attribution and billing

---

## Architecture Approach 1: Modern Full-Stack (Next.js + Supabase)

### Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Backend:** Next.js API Routes + Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Analytics:** Supabase + custom events table + PostHog/Plausible for lightweight product analytics
- **Email:** Resend or SendGrid
- **Hosting:** Vercel (frontend) + Supabase Cloud
- **Queue:** Supabase pg_cron or Inngest for follow-ups

### Key Tradeoffs

**Pros:**
- **Fastest time-to-market:** Supabase provides auth, database, realtime, and storage out of the box
- **Excellent DX:** Hot reload, TypeScript end-to-end, tRPC-like type safety with Supabase client
- **Serverless scaling:** Auto-scales from 0 to high traffic, pay-per-use
- **Built-in admin UI:** Supabase Studio for direct DB access during MVP
- **Great mobile performance:** Next.js App Router with RSC (React Server Components) reduces client JS
- **LATAM-friendly:** Vercel has South America edge locations, low latency

**Cons:**
- **Vendor lock-in:** Heavily dependent on Supabase ecosystem
- **Cost at scale:** Supabase can get expensive beyond free tier (~$25/mo → $100+/mo with usage)
- **Limited queue capabilities:** Need external service (Inngest) for complex job scheduling
- **Learning curve:** App Router patterns are newer, fewer Stack Overflow answers

**Cost Estimate (MVP → 6 months):**
- Vercel: $0 (hobby) → $20/mo (pro if custom domain + analytics)
- Supabase: $0 (free tier: 500MB DB, 2GB storage) → $25/mo (pro: 8GB DB, 100GB storage)
- Resend: $0 (free tier: 100 emails/day) → $10/mo
- Inngest: $0 (free tier) → $20/mo
- **Total:** $0–$75/mo

### Data Model

```sql
-- Professionals table
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'active', 'paused')),

  -- Profile basics
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT, -- NULL if online_only
  online_only BOOLEAN DEFAULT false,

  -- Professional details
  modality TEXT[] NOT NULL, -- e.g. ['therapy', 'coaching', 'reiki']
  specialties TEXT[] NOT NULL, -- intent tags they serve: ['anxiety', 'relationships', 'trauma']
  style TEXT[], -- e.g. ['empathetic', 'structured', 'spiritual']
  price_range_min INTEGER, -- in local currency cents
  price_range_max INTEGER,
  currency TEXT DEFAULT 'USD',

  -- Operational
  accepting_new_clients BOOLEAN DEFAULT true,
  response_time_expectation TEXT, -- e.g. "within 24 hours"

  -- Content
  bio TEXT,
  profile_image_url TEXT,
  legacy_testimonials JSONB DEFAULT '[]', -- [{text, author, date}]

  -- Performance metrics (calculated)
  total_pqls INTEGER DEFAULT 0,
  avg_response_rating DECIMAL(3,2), -- calculated from feedback

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_professionals_status ON professionals(status);
CREATE INDEX idx_professionals_country_city ON professionals(country, city);
CREATE INDEX idx_professionals_modality ON professionals USING GIN(modality);
CREATE INDEX idx_professionals_specialties ON professionals USING GIN(specialties);

-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User info (optional for anonymous leads)
  email TEXT,
  whatsapp TEXT,
  user_name TEXT,

  -- Request details
  country TEXT NOT NULL,
  city TEXT,
  online_ok BOOLEAN DEFAULT true,
  modality_preference TEXT[], -- e.g. ['therapy', 'coaching']
  budget_min INTEGER,
  budget_max INTEGER,
  currency TEXT DEFAULT 'USD',

  -- Intent/problem
  intent_tags TEXT[] NOT NULL, -- e.g. ['anxiety', 'relationships']
  style_preference TEXT[], -- e.g. ['empathetic', 'structured']
  urgency TEXT, -- 'immediate', 'this_week', 'flexible'
  additional_context TEXT,

  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'matched', 'contacted', 'converted', 'closed')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- UTM tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_country ON leads(country);

-- Matches table (the core attribution entity)
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Tracking
  tracking_code TEXT UNIQUE NOT NULL, -- e.g. 'M-20240115-A3K9' for sharing/attribution
  match_version INTEGER DEFAULT 1, -- for A/B testing recommendation logic later

  -- Recommendations (3 professionals)
  recommendations JSONB NOT NULL, -- [{pro_id, rank, reasons: [string]}]

  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'viewed', 'contacted', 'feedback_received')),

  -- Delivery
  sent_at TIMESTAMPTZ,
  sent_via TEXT, -- 'email', 'whatsapp', 'web'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) -- admin who created the match
);

CREATE INDEX idx_matches_lead_id ON matches(lead_id);
CREATE INDEX idx_matches_tracking_code ON matches(tracking_code);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);

-- Events table (critical for attribution and analytics)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'lead_submitted',
    'match_created',
    'match_sent',
    'profile_view',
    'contact_click', -- THIS IS THE PQL TRIGGER
    'feedback_submitted',
    'professional_applied'
  )),

  -- Attribution context
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  tracking_code TEXT, -- denormalized for quick filtering

  -- Event metadata
  event_data JSONB DEFAULT '{}', -- flexible field for event-specific data

  -- User context
  session_id TEXT, -- browser session for deduplication
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_match_id ON events(match_id);
CREATE INDEX idx_events_professional_id ON events(professional_id);
CREATE INDEX idx_events_tracking_code ON events(tracking_code);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_contact_click ON events(professional_id, event_type) WHERE event_type = 'contact_click';

-- PQLs table (derived from events, for billing)
CREATE TABLE pqls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Attribution
  match_id UUID NOT NULL REFERENCES matches(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  event_id UUID NOT NULL REFERENCES events(id),
  tracking_code TEXT NOT NULL,

  -- Billing
  billing_month DATE NOT NULL, -- first day of month, e.g. '2024-01-01'
  billed BOOLEAN DEFAULT false,
  billed_at TIMESTAMPTZ,
  invoice_id TEXT,

  -- Dispute handling
  disputed BOOLEAN DEFAULT false,
  dispute_reason TEXT,
  dispute_resolved_at TIMESTAMPTZ,
  waived BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent double-charging: one PQL per (match, professional) pair
  UNIQUE(match_id, professional_id)
);

CREATE INDEX idx_pqls_professional_billing ON pqls(professional_id, billing_month);
CREATE INDEX idx_pqls_billed ON pqls(billed) WHERE NOT billed;
CREATE INDEX idx_pqls_disputed ON pqls(disputed) WHERE disputed;

-- Feedback table
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Attribution
  match_id UUID NOT NULL REFERENCES matches(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),

  -- Feedback data
  contacted BOOLEAN,
  session_booked BOOLEAN,
  match_suitability INTEGER CHECK (match_suitability BETWEEN 1 AND 5),
  comments TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_professional_id ON feedback(professional_id);
CREATE INDEX idx_feedback_match_id ON feedback(match_id);

-- Follow-up jobs (for automated outreach)
CREATE TABLE follow_up_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  match_id UUID NOT NULL REFERENCES matches(id),
  lead_id UUID NOT NULL REFERENCES leads(id),

  job_type TEXT NOT NULL CHECK (job_type IN ('contact_check', 'session_check')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),

  sent_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_follow_up_jobs_scheduled ON follow_up_jobs(scheduled_at) WHERE status = 'pending';
```

### Event Tracking Implementation

**Client-side tracking (React hook):**

```typescript
// hooks/useTrackEvent.ts
export function useTrackEvent() {
  return useCallback(async (eventType: EventType, data: EventData) => {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        match_id: data.matchId,
        professional_id: data.professionalId,
        tracking_code: data.trackingCode,
        event_data: data.metadata,
        session_id: getOrCreateSessionId(), // localStorage-based
        referrer: document.referrer,
      }),
    });
  }, []);
}

// Usage in profile page
const trackEvent = useTrackEvent();

// On profile view
useEffect(() => {
  const matchId = searchParams.get('match');
  if (matchId) {
    trackEvent('profile_view', {
      matchId,
      professionalId: professional.id,
      trackingCode: searchParams.get('tc'),
    });
  }
}, [professional.id, searchParams]);

// On contact click
<WhatsAppButton onClick={() => {
  trackEvent('contact_click', {
    matchId: searchParams.get('match'),
    professionalId: professional.id,
    trackingCode: searchParams.get('tc'),
  });
  // Then open WhatsApp
}} />
```

**Server-side PQL creation (automatic trigger):**

```typescript
// app/api/events/route.ts
export async function POST(req: Request) {
  const body = await req.json();

  // Insert event
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      ...body,
      ip_address: req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent'),
    })
    .select()
    .single();

  // If this is a contact_click, create PQL
  if (body.event_type === 'contact_click') {
    await createPQL(event);
  }

  return NextResponse.json({ success: true });
}

async function createPQL(event: Event) {
  const billingMonth = startOfMonth(event.created_at);

  await supabase.from('pqls').insert({
    match_id: event.match_id,
    lead_id: event.lead_id,
    professional_id: event.professional_id,
    event_id: event.id,
    tracking_code: event.tracking_code,
    billing_month: billingMonth,
  }).onConflict('match_id, professional_id').ignore(); // Prevent duplicates
}
```

### Recommendation Workflow

**Phase 1: Admin-Assisted (MVP)**

1. Admin views new leads in dashboard (`/admin/leads`)
2. Click "Create Match" → Opens matching interface
3. Interface shows:
   - Lead details (intent tags, location, budget, style)
   - Filtered professionals (meets hard constraints)
   - Sortable by: tag overlap, profile completeness, recent PQL count
4. Admin selects 3 professionals, writes custom reasons for each
5. System generates `tracking_code` and creates Match record
6. Admin clicks "Send" → generates recommendation page at `/r/{tracking_code}`
7. System sends email/WhatsApp with link to recommendation page

**Phase 2: Auto-Suggested (Post-MVP)**

Same flow, but interface auto-suggests top 3 based on scoring algorithm:

```typescript
// Scoring algorithm (simplified)
function scoreMatch(professional: Professional, lead: Lead): number {
  let score = 0;

  // Tag overlap (highest weight)
  const tagOverlap = intersection(professional.specialties, lead.intent_tags).length;
  score += tagOverlap * 10;

  // Style match
  const styleMatch = intersection(professional.style, lead.style_preference).length;
  score += styleMatch * 5;

  // Location preference (online vs local)
  if (lead.online_ok && professional.online_only) score += 3;
  if (!lead.online_ok && professional.city === lead.city) score += 3;

  // Availability
  if (professional.accepting_new_clients) score += 5;

  // Profile quality
  score += professional.bio ? 2 : 0;
  score += professional.legacy_testimonials.length > 0 ? 2 : 0;

  // Performance (once we have data)
  if (professional.avg_response_rating) {
    score += professional.avg_response_rating * 2;
  }

  return score;
}
```

### Complexity & Risk Areas

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **PQL double-counting** | HIGH | UNIQUE constraint on (match_id, professional_id) in pqls table + idempotent event API |
| **Attribution loss** (user clicks without match context) | MEDIUM | Always include match_id in URLs; track as "organic" if missing; show warning in admin dashboard |
| **Supabase free tier limits** | MEDIUM | Monitor usage; upgrade to Pro ($25/mo) proactively before hitting limits |
| **Email deliverability** (to .com.ar, .cl domains) | MEDIUM | Use Resend (good LATAM reputation) + implement SPF/DKIM; test thoroughly |
| **WhatsApp link issues** (mobile vs desktop) | LOW | Use universal `wa.me/{number}` format; test on iOS/Android |
| **Next.js App Router learning curve** | MEDIUM | Use Pages Router instead if App Router feels too new; tradeoff: less optimal performance |
| **Spanish localization** | LOW | Use next-intl from day 1; define all strings in es.json |

---

## Architecture Approach 2: Traditional Full-Stack (Ruby on Rails + PostgreSQL)

### Stack
- **Frontend:** Rails 7 with Hotwire (Turbo + Stimulus) + TailwindCSS
- **Backend:** Ruby on Rails 7.1 (API + server-rendered views)
- **Database:** PostgreSQL 15+ (self-hosted or managed)
- **Analytics:** Custom events table + Ahoy gem for analytics + Metabase for dashboards
- **Email:** Action Mailer + SendGrid/Postmark
- **Jobs:** Sidekiq + Redis
- **Hosting:** Hetzner VPS or Render.com or Fly.io
- **Auth:** Devise

### Key Tradeoffs

**Pros:**
- **Mature ecosystem:** Decades of battle-tested gems for every need (billing, jobs, admin UI)
- **Convention over configuration:** Rails scaffolding generates CRUD in minutes
- **Excellent admin tools:** ActiveAdmin or Avo for instant admin dashboard
- **Better for complex business logic:** Ruby's expressiveness + ActiveRecord makes complex queries readable
- **No vendor lock-in:** Standard PostgreSQL + Redis, portable anywhere
- **Strong LATAM developer community:** Easier to find Rails devs for future hiring

**Cons:**
- **Slower initial setup:** Need to configure more pieces manually
- **Server management:** Even with managed hosting, more DevOps than serverless
- **Slightly dated reputation:** Harder to attract modern frontend talent (though Hotwire helps)
- **Mobile performance:** Server-rendered HTML is heavier than RSC; need to optimize aggressively

**Cost Estimate (MVP → 6 months):**
- Render.com: $7/mo (starter Postgres) + $7/mo (starter Redis) + $7/mo (web service) = $21/mo
- OR Fly.io: ~$15/mo (1GB RAM + 3GB storage)
- SendGrid: $0 (free tier) → $15/mo
- **Total:** $15–$35/mo

### Data Model

(Same as Approach 1, but using ActiveRecord migrations)

Key differences in implementation:
- Use ActiveRecord callbacks for PQL creation
- Use ActiveRecord validations for business rules
- Use Rails concerns for shared behavior

```ruby
# app/models/event.rb
class Event < ApplicationRecord
  belongs_to :match, optional: true
  belongs_to :lead, optional: true
  belongs_to :professional, optional: true

  after_create :create_pql_if_contact_click

  private

  def create_pql_if_contact_click
    return unless event_type == 'contact_click'

    Pql.create_from_event!(self)
  end
end

# app/models/pql.rb
class Pql < ApplicationRecord
  belongs_to :match
  belongs_to :lead
  belongs_to :professional
  belongs_to :event

  validates :match_id, uniqueness: { scope: :professional_id }

  def self.create_from_event!(event)
    create!(
      match_id: event.match_id,
      lead_id: event.lead_id,
      professional_id: event.professional_id,
      event_id: event.id,
      tracking_code: event.tracking_code,
      billing_month: event.created_at.beginning_of_month
    )
  rescue ActiveRecord::RecordNotUnique
    # Already exists, this is fine (idempotent)
    Rails.logger.info "PQL already exists for match #{event.match_id}, professional #{event.professional_id}"
  end
end
```

### Event Tracking Implementation

**Client-side (Stimulus controller):**

```javascript
// app/javascript/controllers/tracking_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    matchId: String,
    professionalId: String,
    trackingCode: String,
  }

  connect() {
    this.trackProfileView()
  }

  trackProfileView() {
    this.track('profile_view')
  }

  trackContactClick() {
    this.track('contact_click')
  }

  track(eventType) {
    fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
      },
      body: JSON.stringify({
        event_type: eventType,
        match_id: this.matchIdValue,
        professional_id: this.professionalIdValue,
        tracking_code: this.trackingCodeValue,
        session_id: this.getSessionId(),
        referrer: document.referrer,
      }),
    })
  }

  getSessionId() {
    let sessionId = localStorage.getItem('session_id')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      localStorage.setItem('session_id', sessionId)
    }
    return sessionId
  }
}
```

**Usage in view:**

```erb
<!-- app/views/professionals/show.html.erb -->
<div data-controller="tracking"
     data-tracking-match-id-value="<%= params[:match] %>"
     data-tracking-professional-id-value="<%= @professional.id %>"
     data-tracking-tracking-code-value="<%= params[:tc] %>">

  <h1><%= @professional.full_name %></h1>

  <%= link_to "Contact on WhatsApp",
      whatsapp_url(@professional.whatsapp),
      target: "_blank",
      data: { action: "click->tracking#trackContactClick" },
      class: "btn btn-primary" %>
</div>
```

### Recommendation Workflow

**Admin interface using ActiveAdmin:**

```ruby
# app/admin/leads.rb
ActiveAdmin.register Lead do
  action_item :create_match, only: :show do
    link_to 'Create Match', new_admin_match_path(lead_id: lead.id), class: 'button'
  end
end

# app/admin/matches.rb
ActiveAdmin.register Match do
  form do |f|
    f.inputs 'Match Details' do
      f.input :lead, collection: Lead.unmatched
      f.input :recommendations, as: :jsonb # Use formtastic-jsonb gem
    end

    f.actions
  end

  controller do
    def create
      @match = Match.new(permitted_params[:match])
      @match.tracking_code = Match.generate_tracking_code
      @match.created_by = current_admin_user

      if @match.save
        MatchMailer.send_recommendations(@match).deliver_later
        redirect_to admin_match_path(@match), notice: 'Match created and sent!'
      else
        render :new
      end
    end
  end
end
```

**Matching helper service:**

```ruby
# app/services/professional_matcher.rb
class ProfessionalMatcher
  def initialize(lead)
    @lead = lead
  end

  def suggest_professionals(limit: 10)
    Professional
      .active
      .accepting_new_clients
      .where_modality_matches(@lead.modality_preference)
      .where_location_matches(@lead)
      .where_budget_matches(@lead)
      .where_specialties_overlap(@lead.intent_tags)
      .select('professionals.*, score_match(professionals, ?) as match_score', @lead.id)
      .order('match_score DESC')
      .limit(limit)
  end

  private

  # Custom PostgreSQL function for scoring
  def self.install_scoring_function
    execute <<-SQL
      CREATE OR REPLACE FUNCTION score_match(pro professionals, lead_id uuid)
      RETURNS integer AS $$
      DECLARE
        score integer := 0;
        lead_record leads;
      BEGIN
        SELECT * INTO lead_record FROM leads WHERE id = lead_id;

        -- Tag overlap (10 points per matching tag)
        score := score + (
          SELECT COUNT(*) * 10
          FROM unnest(pro.specialties) AS spec
          WHERE spec = ANY(lead_record.intent_tags)
        );

        -- Add other scoring logic...

        RETURN score;
      END;
      $$ LANGUAGE plpgsql;
    SQL
  end
end
```

### Complexity & Risk Areas

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Rails version upgrade treadmill** | LOW | Rails is stable; security updates are straightforward |
| **Sidekiq queue management** | MEDIUM | Use Sidekiq Web UI; set up alerts for queue depth |
| **Server scaling** | MEDIUM | Start with single dyno/VM; vertical scale first; horizontal scale when needed |
| **Frontend feels dated** | LOW | Hotwire + TailwindCSS provides modern feel; use Turbo Frames for SPA-like interactions |

---

## Architecture Approach 3: Lean Serverless (Astro + Cloudflare Workers + Turso)

### Stack
- **Frontend:** Astro 4 + Svelte islands + TailwindCSS
- **Backend:** Hono (on Cloudflare Workers) + Turso (LibSQL/SQLite edge)
- **Auth:** Clerk or WorkOS
- **Analytics:** Custom events + Tinybird or ClickHouse Cloud
- **Email:** Loops.so or Resend
- **Jobs:** Cloudflare Queues + Durable Objects
- **Hosting:** Cloudflare Pages + Workers

### Key Tradeoffs

**Pros:**
- **Lowest cost:** Cloudflare Workers free tier is generous (100k requests/day); Turso free: 9GB storage
- **Best performance:** Edge compute + edge database = lowest latency globally (including LATAM)
- **Infinite scale:** Serverless edge scales to millions of requests without config
- **Modern DX:** Astro is fast to build with; Hono is lightweight and fast
- **Best mobile performance:** Astro generates minimal JS; lightning-fast page loads

**Cons:**
- **Bleeding edge:** Turso and edge-hosted SQLite are newer; fewer community resources
- **Limited query capabilities:** LibSQL is SQLite (not PostgreSQL); missing some advanced features (full-text search, PostGIS)
- **Complexity in distributed data:** Edge databases require thinking about eventual consistency
- **Admin UI requires building:** No ActiveAdmin equivalent; need to build dashboard from scratch
- **Job scheduling is harder:** Cloudflare Queues + Durable Objects have learning curve

**Cost Estimate (MVP → 6 months):**
- Cloudflare Workers: $0 (free tier covers MVP easily)
- Turso: $0 (free: 9GB storage, 1B row reads/mo) → $29/mo (scaler plan)
- Clerk: $0 (free: 10k MAU) → $25/mo
- Resend: $0 → $10/mo
- **Total:** $0–$65/mo

### Data Model

(Same tables as Approach 1, adapted for SQLite syntax)

Key SQLite differences:
- Use `TEXT` for UUIDs (stored as strings)
- Use `INTEGER` for booleans (0/1)
- Use `JSON` type (supported in LibSQL)
- Array columns stored as JSON arrays

```sql
-- Example: professionals table for SQLite
CREATE TABLE professionals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'active', 'paused')),

  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  online_only INTEGER DEFAULT 0,

  modality TEXT NOT NULL, -- JSON array: '["therapy","coaching"]'
  specialties TEXT NOT NULL, -- JSON array
  style TEXT, -- JSON array

  price_range_min INTEGER,
  price_range_max INTEGER,
  currency TEXT DEFAULT 'USD',

  accepting_new_clients INTEGER DEFAULT 1,
  response_time_expectation TEXT,

  bio TEXT,
  profile_image_url TEXT,
  legacy_testimonials TEXT DEFAULT '[]', -- JSON array

  total_pqls INTEGER DEFAULT 0,
  avg_response_rating REAL,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  approved_at TEXT,
  approved_by TEXT
);

-- Indexes
CREATE INDEX idx_professionals_status ON professionals(status);
CREATE INDEX idx_professionals_country ON professionals(country, city);
```

### Event Tracking Implementation

**Cloudflare Worker API:**

```typescript
// src/api/events.ts (Hono route)
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

const app = new Hono()

app.post('/api/events', async (c) => {
  const body = await c.req.json()

  const db = drizzle(createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  }))

  // Insert event
  const event = await db.insert(events).values({
    event_type: body.event_type,
    match_id: body.match_id,
    professional_id: body.professional_id,
    tracking_code: body.tracking_code,
    event_data: JSON.stringify(body.event_data || {}),
    session_id: body.session_id,
    user_agent: c.req.header('user-agent'),
    ip_address: c.req.header('cf-connecting-ip'),
    referrer: body.referrer,
  }).returning()

  // If contact_click, create PQL via queue (async)
  if (body.event_type === 'contact_click') {
    await c.env.PQL_QUEUE.send({
      event_id: event[0].id,
      match_id: body.match_id,
      professional_id: body.professional_id,
    })
  }

  return c.json({ success: true })
})

export default app
```

**PQL creation (Cloudflare Queue consumer):**

```typescript
// src/workers/pql-consumer.ts
export default {
  async queue(batch, env) {
    const db = drizzle(createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    }))

    for (const message of batch.messages) {
      const { event_id, match_id, professional_id } = message.body

      try {
        await db.insert(pqls).values({
          match_id,
          professional_id,
          event_id,
          billing_month: startOfMonth(new Date()).toISOString().split('T')[0],
        }).onConflictDoNothing() // SQLite upsert

        message.ack()
      } catch (err) {
        message.retry()
      }
    }
  }
}
```

### Recommendation Workflow

**Admin UI (Astro + Svelte):**

Build custom admin dashboard with Svelte islands for interactivity:

```astro
---
// src/pages/admin/leads/[id]/match.astro
import MatchingInterface from '@/components/admin/MatchingInterface.svelte'
import { getLead, getProfessionals } from '@/lib/db'

const lead = await getLead(Astro.params.id)
const professionals = await getProfessionals({
  filters: {
    country: lead.country,
    modality: lead.modality_preference,
    // ... other filters
  }
})
---

<MatchingInterface
  client:load
  lead={lead}
  professionals={professionals}
/>
```

**Matching interface component:**

```svelte
<!-- src/components/admin/MatchingInterface.svelte -->
<script>
  export let lead
  export let professionals

  let selected = []
  let reasons = {}

  async function createMatch() {
    const match = {
      lead_id: lead.id,
      recommendations: selected.map((pro, i) => ({
        pro_id: pro.id,
        rank: i + 1,
        reasons: reasons[pro.id] || []
      })),
      tracking_code: generateTrackingCode()
    }

    await fetch('/api/admin/matches', {
      method: 'POST',
      body: JSON.stringify(match)
    })
  }
</script>

<div class="matching-interface">
  <div class="lead-details">
    <h2>{lead.intent_tags.join(', ')}</h2>
    <p>{lead.country} | {lead.budget_min}-{lead.budget_max}</p>
  </div>

  <div class="professionals-list">
    {#each professionals as pro}
      <ProfessionalCard
        professional={pro}
        selected={selected.includes(pro)}
        on:select={() => selected = [...selected, pro]}
      />
    {/each}
  </div>

  <div class="selected-panel">
    {#each selected as pro, i}
      <RecommendationEditor
        professional={pro}
        rank={i + 1}
        bind:reasons={reasons[pro.id]}
      />
    {/each}

    <button on:click={createMatch} disabled={selected.length !== 3}>
      Create Match
    </button>
  </div>
</div>
```

### Complexity & Risk Areas

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Turso/LibSQL maturity** | MEDIUM | Have PostgreSQL migration path ready; Turso has backup/restore |
| **Building admin UI from scratch** | HIGH | Use Svelte + TailwindUI components; budget 2-3 weeks for admin UI |
| **Cloudflare Workers cold starts** | LOW | Workers have <10ms cold start; acceptable for API |
| **Limited SQL features** | MEDIUM | SQLite lacks some Postgres features (arrays, full-text search); use JSON columns + filtering in JS |
| **Debugging serverless** | MEDIUM | Use Cloudflare Wrangler local dev; add extensive logging; use Sentry |

---

## Recommended Approach: Approach 1 (Next.js + Supabase)

### Justification

For a solo builder launching Hará Match MVP, **Approach 1 (Next.js + Supabase)** is the optimal choice:

**Why it wins for your constraints:**

1. **Speed to market (CRITICAL):** Supabase provides auth, database, and storage out of the box. You can focus 100% on business logic rather than infrastructure. You need to be operational before lead acquisition—every week matters.

2. **Solo builder ergonomics:** Supabase Studio gives you a production-ready admin interface for direct DB access. You can manually review leads, test attribution, and debug PQLs without building admin UI first.

3. **PQL attribution reliability:** PostgreSQL with UNIQUE constraints + Supabase realtime ensures bulletproof PQL tracking. The `UNIQUE(match_id, professional_id)` constraint prevents double-charging even if events are duplicated.

4. **LATAM performance:** Vercel has South America edge locations. Next.js App Router with React Server Components delivers fast page loads even on 3G mobile connections (common in LATAM).

5. **Cost-effective launch:** $0 to start, ~$50/mo at scale. Rails requires $21/mo minimum (Render); Cloudflare approach saves money but costs weeks of admin UI development.

6. **Type safety end-to-end:** Supabase generates TypeScript types from your database schema. Zero runtime errors from typos in column names.

7. **Future-proof:** When you need to hire, Next.js + TypeScript has the largest talent pool (especially in LATAM). Easier to find contractors for feature additions.

**Why Approach 2 (Rails) doesn't win:**

- Rails is excellent for complex business logic, but Hará's core complexity is attribution tracking + analytics, which PostgreSQL handles natively. Rails' strengths (ActiveRecord, convention-over-configuration) don't offset the setup overhead for a solo builder.
- Hotwire is great but Next.js RSC is faster for mobile-first experiences.
- You'd need to configure Sidekiq, Redis, deployment, etc. before writing business logic.

**Why Approach 3 (Cloudflare) doesn't win:**

- Building admin UI from scratch adds 2-3 weeks before you can process leads.
- SQLite limitations (no array columns, limited JSON query capabilities) will slow down recommendation logic.
- Cloudflare Workers are perfect for high scale, but premature optimization for MVP.

---

## Implementation Plan: 4-Week Timeline

### Week 1: Foundation + Professional Profiles

**Goal:** Professional onboarding is live, first profiles are viewable.

**Milestones:**

1. **Day 1-2: Project setup**
   - `npx create-next-app@latest hara --typescript --tailwind --app`
   - Set up Supabase project, link to local dev with `supabase link`
   - Create database schema (professionals, leads, matches, events, pqls tables)
   - Generate TypeScript types: `supabase gen types typescript`
   - Set up environment variables

2. **Day 3-4: Professional application flow**
   - Create `/apply` page with form (Shadcn UI components)
   - Form fields: name, email, WhatsApp, country/city, modality, specialties, price, bio
   - Submit → inserts into `professionals` table with status='submitted'
   - Build `/admin/professionals` page in Supabase Studio (SQL view with filters)

3. **Day 5-7: Professional profile pages**
   - Create `/p/[slug]` dynamic route
   - Fetch professional data from Supabase
   - Design mobile-first profile layout: photo, bio, specialties, price, testimonials, contact button
   - Implement WhatsApp contact button: `https://wa.me/{whatsapp_number}?text=Hi, I found you on Hará`
   - Deploy to Vercel, test on mobile

**Deliverable:** First 3 professionals can apply and have live profile pages.

---

### Week 2: Lead Intake + Matching Workflow

**Goal:** Leads can submit requests, admin can create matches.

**Milestones:**

1. **Day 8-9: Lead intake form**
   - Create `/recommend` page with multi-step form
   - Step 1: Location (country, city, online ok?)
   - Step 2: Modality preference (therapy, coaching, reiki, etc.)
   - Step 3: Budget range
   - Step 4: Intent tags (anxiety, relationships, trauma, etc.)
   - Step 5: Style preference + urgency
   - Step 6: Optional contact info (email/WhatsApp)
   - Submit → inserts into `leads` table, redirect to confirmation page

2. **Day 10-11: Admin matching interface**
   - Build `/admin/matches/new` page
   - Fetch unmatched leads from Supabase
   - For selected lead, show filtered professionals:
     ```sql
     SELECT * FROM professionals
     WHERE status = 'active'
       AND accepting_new_clients = true
       AND country = lead.country
       AND modality && lead.modality_preference
       AND price_range_min <= lead.budget_max
       AND price_range_max >= lead.budget_min
     ORDER BY (
       SELECT COUNT(*) FROM unnest(specialties) WHERE value = ANY(lead.intent_tags)
     ) DESC
     ```
   - Admin selects 3 professionals, writes reasons
   - Generate tracking code: `M-${date}-${randomString(4)}`
   - Insert into `matches` table with recommendations JSON

3. **Day 12-14: Recommendation delivery**
   - Create `/r/[tracking_code]` page (recommendation view)
   - Display 3 recommended professionals with custom reasons
   - Each profile link includes match context: `/p/{slug}?match={match_id}&tc={tracking_code}`
   - Build email template with Resend (React Email)
   - Send email via API route: `/api/matches/[id]/send`
   - Test end-to-end flow with test lead

**Deliverable:** Admin can process leads and send recommendations.

---

### Week 3: Attribution + PQL Billing

**Goal:** PQL tracking is bulletproof, billing reports are exportable.

**Milestones:**

1. **Day 15-16: Event tracking implementation**
   - Create `/api/events` route (POST handler)
   - Implement client-side tracking hook (`useTrackEvent`)
   - Add tracking to profile pages:
     - `profile_view` on mount (if match_id in URL)
     - `contact_click` on WhatsApp button click
   - Test with console logs, verify events appear in Supabase table

2. **Day 17-18: PQL creation logic**
   - Create database function/trigger to auto-create PQL on `contact_click` event
   - Implement idempotency: `UNIQUE(match_id, professional_id)` constraint
   - Test double-click scenarios (user clicks contact twice)
   - Verify PQL appears in `pqls` table with correct attribution

3. **Day 19-21: Billing dashboard**
   - Build `/admin/billing` page
   - Show PQL summary by professional, grouped by month:
     ```sql
     SELECT
       p.full_name,
       p.email,
       COUNT(*) as pql_count,
       pqls.billing_month
     FROM pqls
     JOIN professionals p ON p.id = pqls.professional_id
     WHERE pqls.billed = false
     GROUP BY p.id, pqls.billing_month
     ORDER BY pqls.billing_month DESC, pql_count DESC
     ```
   - Drill-down: click professional → see list of PQLs with date, match_id, lead details
   - Export to CSV button (client-side CSV generation)
   - "Mark as Billed" button (updates pqls.billed = true)

**Deliverable:** PQL tracking is live, billing reports are ready.

---

### Week 4: Analytics + Follow-up Automation

**Goal:** Funnel visibility, automated follow-ups, system is production-ready.

**Milestones:**

1. **Day 22-23: Analytics dashboard**
   - Build `/admin/analytics` page with charts (Recharts library)
   - Metrics:
     - Leads submitted (per week)
     - Matches created (per week)
     - Profile views (per match, per professional)
     - Contact clicks / PQLs (per match, per professional)
     - Conversion rates: match→view, view→contact
   - Filters: date range, country, modality, intent tag
   - Use SQL aggregations on `events` table

2. **Day 24-25: Follow-up automation**
   - Install Inngest: `npm install inngest`
   - Create follow-up function:
     ```typescript
     inngest.createFunction(
       { id: 'send-contact-check' },
       { event: 'match.sent' },
       async ({ event, step }) => {
         await step.sleep('2 days')
         await step.run('send-email', () =>
           sendFollowUpEmail(event.data.lead_id, 'contact-check')
         )
       }
     )
     ```
   - Create feedback form: `/feedback/[tracking_code]`
   - Form fields: contacted? booked session? suitability rating 1-5, comments
   - Submit → inserts into `feedback` table, triggers `feedback_submitted` event
   - Test with test lead (use Inngest dev server to skip waiting)

3. **Day 26-28: Polish + testing**
   - Spanish localization (es.json with next-intl)
   - Mobile testing on iOS/Android (Chrome DevTools device emulation)
   - WhatsApp link testing (different formats for mobile vs desktop)
   - Email deliverability testing (send to Gmail, Outlook, .com.ar domains)
   - Load testing: simulate 100 concurrent profile views (Vercel handles this)
   - Security review:
     - Add rate limiting to `/api/events` (Upstash Redis + Vercel rate limit)
     - Add CSRF protection (Next.js automatic)
     - Add CSP headers (next.config.js)
   - Write deployment runbook (Notion doc with rollback procedure)
   - Set up monitoring: Sentry for errors, Vercel Analytics for performance

**Deliverable:** System is live, monitored, and ready for first real leads.

---

## Post-Launch: First 30 Days

**Focus:** Validate attribution, gather feedback, iterate.

**Week 5-6: Validation**
- Process first 10 real leads manually
- Verify every PQL is correctly attributed (audit events → pqls join)
- Interview first 3 users who provided feedback (20-min calls)
- Check mobile performance on real devices in LATAM (ask beta testers for network speed)

**Week 7-8: Iteration**
- Fix top 3 UX issues from user feedback
- Improve recommendation quality based on feedback suitability ratings
- Build automated matching suggestions (Phase 2 of recommendation workflow)
- Add professional dashboard: `/dashboard` (show PQL count, feedback, profile views)

---

## Key Success Metrics (MVP)

Track these weekly to validate the system:

1. **Attribution integrity:** 100% of PQLs must have valid match_id + professional_id
2. **Conversion funnel:**
   - Lead submitted → Match created: >90% (admin bottleneck)
   - Match created → Profile viewed: >60% (delivery success)
   - Profile viewed → Contact clicked: >30% (recommendation quality)
3. **Follow-up engagement:** >40% of users respond to +2 day email
4. **Professional satisfaction:** NPS >40 from first 10 professionals
5. **System uptime:** >99.5% (Vercel + Supabase SLA)

---

## Appendix: Alternative Considerations

### If you need to minimize vendor lock-in:
Use **Approach 2 (Rails)** instead. Trade 1-2 extra weeks of setup for full portability.

### If you expect massive scale (100k+ leads/mo):
Use **Approach 3 (Cloudflare)** instead. Edge compute + edge DB will be cheaper and faster at scale. But build admin UI in Month 2.

### If recommendation logic becomes very complex:
Consider adding a Python microservice for ML-based matching (scikit-learn for scoring). Deploy on Fly.io ($5/mo), call from Next.js API route.

### If you need real-time professional availability:
Add WebSocket connection with Supabase Realtime. Professionals can update `accepting_new_clients` and it reflects immediately in admin matching interface.

---

**Total estimated build time:** 4 weeks full-time (160 hours)
**Minimum viable team:** 1 full-stack engineer (you)
**Recommended launch approach:** Soft launch with 5 professionals, 20 leads, 1 week validation, then scale content acquisition.
