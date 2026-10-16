import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// A Redis that never answers, like a deleted or unreachable Upstash database.
vi.mock('@upstash/redis', () => ({
  Redis: class {
    evalsha = () => new Promise(() => {})
    eval = () => new Promise(() => {})
    scriptLoad = () => new Promise(() => {})
    get = () => new Promise(() => {})
    set = () => new Promise(() => {})
    zadd = () => new Promise(() => {})
    hincrby = () => new Promise(() => {})
    pipeline = () => ({ exec: () => new Promise(() => {}) })
    multi = () => ({ exec: () => new Promise(() => {}) })
  },
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

import { ratelimit } from './rate-limit'

beforeEach(() => {
  vi.useFakeTimers()
  process.env.UPSTASH_REDIS_REST_URL = 'https://hang.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
})

afterEach(() => { vi.useRealTimers() })

describe('ratelimit', () => {
  it('lets the request through within a second when Redis does not answer', async () => {
    let settled: { success: boolean } | null = null
    void ratelimit.limit('test:hang', { limit: 5, window: '1 m' }).then((r) => { settled = r })

    await vi.advanceTimersByTimeAsync(1000)

    expect(settled).not.toBeNull()
    expect(settled!.success).toBe(true)
  })
})
