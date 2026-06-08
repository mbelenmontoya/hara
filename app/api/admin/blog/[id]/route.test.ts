// Unit tests for PATCH /api/admin/blog/[id]
// Covers: approve/reject state transitions, 409 idempotency, professional link semantics,
//         invalid action/id/professional_id cases.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const {
  mockSelectSingle,
  mockProSelectSingle,
  mockUpdateEq,
  mockUpdate,
  mockPublished,
  mockRejected,
} = vi.hoisted(() => ({
  mockSelectSingle:    vi.fn(),
  mockProSelectSingle: vi.fn(),
  mockUpdateEq:        vi.fn(),
  mockUpdate:          vi.fn(),
  mockPublished:       vi.fn(),
  mockRejected:        vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'blog_posts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: mockSelectSingle }),
          }),
          update: mockUpdate,
        }
      }
      if (table === 'professionals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: mockProSelectSingle }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    }),
  },
}))

vi.mock('@/lib/email', () => ({
  notifyBlogPostPublished: mockPublished,
  notifyBlogPostRejected:  mockRejected,
}))

vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

import { PATCH } from './route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/blog/post-id-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const SUBMITTED_POST = {
  id: 'post-id-1',
  slug: 'mi-nota',
  title: 'Mi nota',
  status: 'submitted',
  author_email: 'autor@example.com',
  professional_id: null,
  professional_link_confirmed: false,
  is_hara_editorial: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateEq.mockResolvedValue({ error: null })
  mockUpdate.mockReturnValue({ eq: mockUpdateEq })
  mockPublished.mockResolvedValue(true)
  mockRejected.mockResolvedValue(true)
})

const PARAMS = { params: { id: 'post-id-1' } }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/admin/blog/[id]', () => {
  describe('approve', () => {
    it('sets status=published + published_at when post is submitted', async () => {
      mockSelectSingle.mockResolvedValue({ data: SUBMITTED_POST, error: null })
      const res = await PATCH(makeReq({ action: 'approve' }), PARAMS)
      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published' })
      )
    })

    it('returns 409 when post is already published', async () => {
      mockSelectSingle.mockResolvedValue({
        data: { ...SUBMITTED_POST, status: 'published' },
        error: null,
      })
      const res = await PATCH(makeReq({ action: 'approve' }), PARAMS)
      expect(res.status).toBe(409)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('sets professional_id + professional_link_confirmed=true when UUID provided', async () => {
      mockSelectSingle.mockResolvedValue({ data: SUBMITTED_POST, error: null })
      mockProSelectSingle.mockResolvedValue({ data: { id: 'pro-uuid' }, error: null })
      const res = await PATCH(
        makeReq({ action: 'approve', professional_id: 'pro-uuid' }),
        PARAMS
      )
      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          professional_id: 'pro-uuid',
          professional_link_confirmed: true,
        })
      )
    })

    it('clears professional link when professional_id is explicitly null', async () => {
      mockSelectSingle.mockResolvedValue({
        data: { ...SUBMITTED_POST, professional_id: 'pro-uuid', professional_link_confirmed: true },
        error: null,
      })
      const res = await PATCH(
        makeReq({ action: 'approve', professional_id: null }),
        PARAMS
      )
      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          professional_id: null,
          professional_link_confirmed: false,
        })
      )
    })

    it('fires notifyBlogPostPublished after approve', async () => {
      mockSelectSingle.mockResolvedValue({ data: SUBMITTED_POST, error: null })
      await PATCH(makeReq({ action: 'approve' }), PARAMS)
      expect(mockPublished).toHaveBeenCalledTimes(1)
    })

    it('sets author_name=Hara Vital, is_hara_editorial=true, professional_id=null when hara-vital sentinel', async () => {
      mockSelectSingle.mockResolvedValue({ data: SUBMITTED_POST, error: null })
      const res = await PATCH(
        makeReq({ action: 'approve', professional_id: 'hara-vital' }),
        PARAMS
      )
      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          author_name: 'Hara Vital',
          is_hara_editorial: true,
          professional_id: null,
          professional_link_confirmed: false,
        })
      )
      // professionals table must NOT be queried for the sentinel
      expect(mockProSelectSingle).not.toHaveBeenCalled()
      // email must NOT fire even on first assignment (post.is_hara_editorial=false in DB at fetch time)
      expect(mockPublished).not.toHaveBeenCalled()
    })

    it('does NOT call notifyBlogPostPublished when is_hara_editorial is true', async () => {
      mockSelectSingle.mockResolvedValue({
        data: { ...SUBMITTED_POST, is_hara_editorial: true },
        error: null,
      })
      await PATCH(makeReq({ action: 'approve' }), PARAMS)
      expect(mockPublished).not.toHaveBeenCalled()
    })
  })

  describe('reject', () => {
    it('sets status=rejected + rejection_reason when post is submitted', async () => {
      mockSelectSingle.mockResolvedValue({ data: SUBMITTED_POST, error: null })
      const res = await PATCH(
        makeReq({ action: 'reject', rejection_reason: 'Off-topic' }),
        PARAMS
      )
      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'rejected', rejection_reason: 'Off-topic' })
      )
    })

    it('returns 409 when post is already rejected', async () => {
      mockSelectSingle.mockResolvedValue({
        data: { ...SUBMITTED_POST, status: 'rejected' },
        error: null,
      })
      const res = await PATCH(
        makeReq({ action: 'reject', rejection_reason: 'Off-topic' }),
        PARAMS
      )
      expect(res.status).toBe(409)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('fires notifyBlogPostRejected after reject', async () => {
      mockSelectSingle.mockResolvedValue({ data: SUBMITTED_POST, error: null })
      await PATCH(makeReq({ action: 'reject', rejection_reason: 'Off-topic' }), PARAMS)
      expect(mockRejected).toHaveBeenCalledTimes(1)
    })
  })

  describe('error cases', () => {
    it('returns 404 when post not found', async () => {
      mockSelectSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      const res = await PATCH(makeReq({ action: 'approve' }), PARAMS)
      expect(res.status).toBe(404)
    })

    it('returns 400 for invalid action', async () => {
      mockSelectSingle.mockResolvedValue({ data: SUBMITTED_POST, error: null })
      const res = await PATCH(makeReq({ action: 'invalid' }), PARAMS)
      expect(res.status).toBe(400)
    })

    it('returns 400 when professional_id UUID does not exist', async () => {
      mockSelectSingle.mockResolvedValue({ data: SUBMITTED_POST, error: null })
      mockProSelectSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      const res = await PATCH(
        makeReq({ action: 'approve', professional_id: 'nonexistent-uuid' }),
        PARAMS
      )
      expect(res.status).toBe(400)
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })
})
