// Unit tests for GET /api/admin/analytics

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn() },
}))
vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase-admin'
import { GET } from './route'

const mockRpc = supabaseAdmin.rpc as ReturnType<typeof vi.fn>
const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/admin/analytics')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString())
}

beforeEach(() => { vi.clearAllMocks() })

describe('GET /api/admin/analytics', () => {
  describe('summary mode (no professional_id)', () => {
    it('returns 200 with professionals array', async () => {
      // RPC returns (professional_id, event_type, event_count) rows
      mockRpc.mockResolvedValue({
        data: [
          { professional_id: VALID_UUID, event_type: 'profile_view', event_count: 10 },
          { professional_id: VALID_UUID, event_type: 'whatsapp_click', event_count: 3 },
        ],
        error: null,
      })
      // .from('professionals') join returns name + slug
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockEq2 = vi.fn(() => ({ single: mockSingle }))
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }))
      const mockLimit = vi.fn(() => ({ single: mockSingle }))
      const mockSelect = vi.fn(() => ({
        in: vi.fn().mockResolvedValue({
          data: [{ id: VALID_UUID, full_name: 'Ana García', slug: 'ana-garcia' }],
          error: null,
        }),
      }))
      mockFrom.mockReturnValue({ select: mockSelect })

      const res = await GET(makeGet())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body.professionals)).toBe(true)
      expect(body.professionals[0].id).toBe(VALID_UUID)
      expect(body.professionals[0].profile_views).toBe(10)
      expect(body.professionals[0].whatsapp_clicks).toBe(3)
      expect(body.professionals[0].instagram_clicks).toBe(0)
    })

    it('returns 500 when RPC fails', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'DB err' } })
      const res = await GET(makeGet())
      expect(res.status).toBe(500)
    })
  })

  describe('detail mode (with professional_id)', () => {
    it('returns 200 with timeSeries and professional', async () => {
      // Professionals lookup
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: VALID_UUID, full_name: 'Ana García', slug: 'ana-garcia' },
                error: null,
              }),
            })),
          })),
        })),
      })
      // Timeseries RPC
      mockRpc.mockResolvedValue({
        data: [
          { event_date: '2026-06-01', event_type: 'profile_view', event_count: 5 },
          { event_date: '2026-06-01', event_type: 'whatsapp_click', event_count: 2 },
        ],
        error: null,
      })

      const res = await GET(makeGet({ professional_id: VALID_UUID, days: '30' }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body.timeSeries)).toBe(true)
      expect(body.timeSeries[0].date).toBe('2026-06-01')
      expect(body.timeSeries[0].profile_view).toBe(5)
      expect(body.timeSeries[0].whatsapp_click).toBe(2)
      expect(body.timeSeries[0].instagram_click).toBe(0)
      expect(body.professional.id).toBe(VALID_UUID)
    })

    it('returns 400 for malformed professional_id', async () => {
      const res = await GET(makeGet({ professional_id: 'not-a-uuid' }))
      expect(res.status).toBe(400)
    })

    it('returns 404 when professional not found', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
            })),
          })),
        })),
      })
      const res = await GET(makeGet({ professional_id: VALID_UUID }))
      expect(res.status).toBe(404)
    })
  })
})
