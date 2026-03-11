---
name: supabase-patterns
description: Hará Match Supabase patterns — service-role client, RLS policies, attribution tokens, event tracking, and PQL billing flow. Triggers on "supabase", "database", "query", "API route", "service role", "RLS", "attribution", "token", "event", "PQL", "billing".
---

# Supabase Patterns for Hará Match

## Architecture Overview

```
Client (browser) → API Route (Next.js) → supabaseAdmin (service role) → PostgreSQL
                                          ↓
                                     RLS blocks anon writes
                                     Service role bypasses RLS
```

**Key principle:** All database writes go through API routes using the service-role client. RLS blocks all direct writes from anon/authenticated roles on billing-critical tables.

## Service Role Client

Always use the shared client from `lib/supabase-admin.ts`:

```typescript
import { supabaseAdmin } from '@/lib/supabase-admin';

// ✅ Correct — service role for writes
const { data, error } = await supabaseAdmin
  .from('professionals')
  .insert({ full_name: 'María González', ... })
  .select()
  .single();

// ❌ NEVER create your own client
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
```

## RLS Policy Model

| Table | Anon/Auth Can Read? | Anon/Auth Can Write? | Service Role? |
|-------|-------------------|---------------------|--------------|
| `professionals` | Only `status = 'active'` | No | Full access |
| `leads` | No | No | Full access |
| `matches` | No | No | Full access |
| `match_recommendations` | No | No | Full access |
| `events` | No | No | Full access |
| `pqls` | No | No | Full access |
| `pql_adjustments` | No | No | Full access |

**Fail-closed:** Everything is denied by default. Only explicit policies allow access.

## The Billing Pipeline (DO NOT MODIFY)

This is the single write-path for billing. It's tested and locked:

```
1. User clicks WhatsApp → ContactButton fires sendBeacon
2. POST /api/events receives attribution_token
3. verifyAttributionToken() validates JWT (signature + expiration + claims)
4. supabaseAdmin inserts into events table
5. DB trigger (create_pql_from_contact_click) auto-creates PQL
6. PQL is idempotent: UNIQUE(match_id, professional_id) prevents duplicates
```

**Files involved (all locked):**
- `app/components/ContactButton.tsx` — sendBeacon + keepalive fetch
- `app/api/events/route.ts` — token validation + event insert
- `lib/attribution-tokens.ts` — JWT creation + verification
- DB trigger `create_pql_from_contact_click` — auto PQL creation

## Attribution Tokens

JWT tokens that sign events to prevent billing fraud:

```typescript
import { createAttributionToken, verifyAttributionToken } from '@/lib/attribution-tokens';

// Creating (done during match creation — locked)
const token = await createAttributionToken({
  match_id: 'uuid',
  professional_id: 'uuid',
  lead_id: 'uuid',
  tracking_code: 'M-1704067200000-A1B2C3',
  rank: 1,
});

// Verifying (done during event ingestion — locked)
const payload = await verifyAttributionToken(token);
// Returns null if invalid/expired
// Returns AttributionPayload if valid
```

## Common Query Patterns

### Read with filters

```typescript
// Get active professionals by country
const { data, error } = await supabaseAdmin
  .from('professionals')
  .select('id, full_name, slug, specialties, city')
  .eq('status', 'active')
  .eq('country', 'AR')
  .order('created_at', { ascending: false });
```

### Insert with select

```typescript
// Insert and return the created row
const { data, error } = await supabaseAdmin
  .from('professionals')
  .insert({
    slug: generatedSlug,
    full_name: formData.name,
    email: formData.email,
    status: 'submitted',
    // ...
  })
  .select()
  .single();

if (error) {
  // Always handle errors
  return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
}
```

### Check for duplicates

```typescript
// Check if professional email already exists
const { data: existing } = await supabaseAdmin
  .from('professionals')
  .select('id')
  .eq('email', formData.email)
  .maybeSingle(); // Returns null if not found, no error

if (existing) {
  return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
}
```

## Rate Limiting

All public API routes must be rate-limited:

```typescript
import { ratelimit } from '@/lib/rate-limit';

// In API route handler
const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
const { success } = await ratelimit.limit(`endpoint:ip:${ip}`);
if (!success) {
  return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
}
```

Current limits:
- `/api/events`: 10 req/min per IP
- `/api/public/recommendations`: 30 req/5min per IP

## Database Schema Reference

See `FINAL_SPEC.md` for the complete schema. Key tables:

- `professionals` — Profile directory with slug routing
- `leads` — User inquiries with intent tags
- `matches` — Connect leads to professionals (1-to-many)
- `match_recommendations` — Individual recommendations (rank 1-3)
- `events` — Partitioned by month, tracks all user actions
- `pqls` — Credit ledger (append-only billing records)
- `pql_adjustments` — Manual corrections with audit trail

## Error Handling Pattern

```typescript
const { data, error } = await supabaseAdmin.from('table').select();

if (error) {
  // Log with context (use monitoring.ts, not console.log)
  logError('Failed to query table', { error, context: 'relevant info' });
  return NextResponse.json({ error: 'Database error' }, { status: 500 });
}

// data is now guaranteed non-null
```

## New API Route Checklist

1. Use `supabaseAdmin` for all DB operations
2. Validate all input before DB queries
3. Add rate limiting for public endpoints
4. Return proper HTTP status codes
5. Log errors with `lib/monitoring.ts`
6. Never expose service role key or internal errors to client
