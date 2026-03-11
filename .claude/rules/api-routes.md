---
description: Supabase service-role patterns, rate limiting, and locked backend file warnings
globs: app/api/**/*.ts
---

# API Route Rules

## Locked Files — Do Not Modify

These files are production-tested and billing-critical. Do not edit without explicit user approval:

| File | Why it's locked |
|------|----------------|
| `app/api/events/route.ts` | Billing-critical event ingestion — triggers PQL creation |
| `app/api/admin/matches/route.ts` | Atomic match creation with attribution tokens |
| `app/api/admin/pqls/*/route.ts` | PQL adjustment endpoints |
| `lib/attribution-tokens.ts` | JWT security — tampering breaks billing |
| `lib/rate-limit.ts` | Rate limiting config — changes affect abuse protection |
| `lib/supabase-admin.ts` | Service role client — single point of DB access |
| `lib/validation.ts` | IP/fingerprint/session validators |
| `middleware.ts` | Auth gating — fail-closed security model |

If you need to change a locked file, **stop and ask the user first**. Explain what you want to change and why.

## Supabase Patterns

### Always use service role for writes

```typescript
// ✅ Correct — service role client
import { supabaseAdmin } from '@/lib/supabase-admin';

const { data, error } = await supabaseAdmin
  .from('professionals')
  .insert({ ... })
  .select()
  .single();
```

### Never expose service role to client

```typescript
// ❌ WRONG — service role key in client code
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// ✅ Correct — use the shared admin client
import { supabaseAdmin } from '@/lib/supabase-admin';
```

### Handle errors, don't swallow them

```typescript
// ❌ WRONG
const { data } = await supabaseAdmin.from('professionals').select();

// ✅ Correct
const { data, error } = await supabaseAdmin.from('professionals').select();
if (error) {
  console.error('Query failed:', error);
  return NextResponse.json({ error: 'Database error' }, { status: 500 });
}
```

## Rate Limiting

All public endpoints must be rate-limited. Use the existing `ratelimit` from `lib/rate-limit.ts`:

```typescript
import { ratelimit } from '@/lib/rate-limit';

const ip = request.headers.get('x-forwarded-for') || 'unknown';
const { success } = await ratelimit.limit(`endpoint:ip:${ip}`);
if (!success) {
  return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
}
```

## New API Route Checklist

When creating a new API route:

1. Use `supabaseAdmin` for all DB operations (RLS blocks anon writes)
2. Validate all input before DB operations
3. Add rate limiting for public endpoints
4. Return proper HTTP status codes (400, 403, 429, 500)
5. Log errors with context (but never log secrets or tokens)
6. Use `lib/monitoring.ts` for error logging, not `console.log`

## Attribution Token Flow

```
Client clicks WhatsApp → ContactButton fires sendBeacon → /api/events
  → verifyAttributionToken(token)
  → supabaseAdmin.from('events').insert(...)
  → DB trigger creates PQL automatically
```

Do not create alternative paths for event ingestion. The single write-path through `/api/events` is intentional — it prevents billing fraud.
