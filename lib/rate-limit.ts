// Hará Match - Rate Limiting
// Purpose: Anti-spam on public endpoints via Upstash Redis (sliding window per IP).
// Behavior: FAIL OPEN — when Redis is unavailable or misconfigured, requests are
// allowed through and the failure is logged. Rationale: pre-launch the cost of a
// rare flooded endpoint is far smaller than the cost of an Upstash hiccup taking
// every public POST down. The loud log gives us visibility to fix the root cause.
// (Legacy: this used to fail closed in production for PQL billing fraud concerns;
// PQL is now optional infrastructure post-pivot, so the calculus changed.)

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { logError } from '@/lib/monitoring'

interface RateLimitOptions {
  limit: number
  window: '1 m' | '5 m' | '10 m' | '1 h'
}

let redis: Redis | null = null
let configWarningShown = false

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token || url.includes('your-redis') || token.includes('your-token')) {
      throw new Error('Upstash Redis not configured')
    }

    redis = new Redis({ url, token })
  }

  return redis
}

export const ratelimit = {
  limit: async (key: string, options?: RateLimitOptions) => {
    try {
      // Test isolation: Add namespace prefix if env var is set
      // This allows consecutive test runs to use separate Redis buckets
      const namespace = process.env.RATE_LIMIT_NAMESPACE
      const namespacedKey = namespace ? `${namespace}:${key}` : key

      const limiter = new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(
          options?.limit || 10,
          (options?.window || '1 m') as '1 m'
        ),
        analytics: true,
      })

      return await limiter.limit(namespacedKey)
    } catch (err) {
      // FAIL OPEN: rate limiter unavailable → allow the request, log loudly so
      // the root cause (Redis down, env vars missing, network blip) is visible.
      // The handler that called us treats success=true as "let through".
      logError(err instanceof Error ? err : new Error(String(err)), {
        source: 'lib/rate-limit',
        key,
        note:   'Rate limiter failed; failing open (request allowed)',
      })

      if (!configWarningShown && process.env.NODE_ENV !== 'production') {
        console.warn('⚠️  Rate limiting disabled (Upstash unreachable). See logs.')
        configWarningShown = true
      }

      return { success: true, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve() }
    }
  },
}
