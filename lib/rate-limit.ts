// Hará Match - Rate Limiting
// Purpose: Prevent PQL spam via Upstash Redis
// Security: Two-tier (IP + fingerprint) with fallbacks
// Production: REQUIRED (fail-closed) - server won't start without it
// Development: Permissive (fail-open with warning)

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

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

    // Production: FAIL-CLOSED (required)
    if (process.env.NODE_ENV === 'production') {
      if (!url || !token) {
        throw new Error('PRODUCTION ERROR: Rate limiting not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN')
      }
    }

    // Dev/test: Check for missing or placeholder
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
      // Production: FAIL-CLOSED (propagate error, /api/events returns 500)
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Rate limiting failure: ' + (err as Error).message)
      }

      // Development: FAIL-OPEN (permissive with loud warning once)
      if (!configWarningShown) {
        console.warn('\n⚠️  ⚠️  ⚠️  RATE LIMITING DISABLED ⚠️  ⚠️  ⚠️')
        console.warn('Configure Upstash Redis to enable rate limiting:')
        console.warn('1. Create account at https://upstash.com (free tier)')
        console.warn('2. Create Redis database (REST API mode)')
        console.warn('3. Copy REST URL and token to .env.local:')
        console.warn('   UPSTASH_REDIS_REST_URL=https://...')
        console.warn('   UPSTASH_REDIS_REST_TOKEN=...')
        console.warn('See WEEK_2_SUMMARY.md "Local Setup" for details\n')
        configWarningShown = true
      }

      return { success: true, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve() }
    }
  },
}
