import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockSingle, mockEqSelect, mockUpdate, mockEqUpdate, mockFrom, mockUpload } = vi.hoisted(() => ({
  mockSingle:   vi.fn(),
  mockEqSelect: vi.fn(),
  mockUpdate:   vi.fn(),
  mockEqUpdate: vi.fn(),
  mockFrom:     vi.fn(),
  mockUpload:   vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}))
vi.mock('@/lib/monitoring', () => ({ logError: vi.fn() }))
vi.mock('@/lib/storage', () => ({ uploadProfileImage: mockUpload }))

import { POST } from './[id]/image/route'

function makeRequest(file?: File): NextRequest {
  const req = new NextRequest('http://localhost/api/admin/professionals/abc/image', {
    method: 'POST',
  })
  const fd = new FormData()
  if (file) fd.append('profile_image', file)
  // Stub formData() because File doesn't survive FormData serialization in jsdom
  req.formData = vi.fn().mockResolvedValue(fd)
  return req
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSingle.mockResolvedValue({ data: { id: 'abc' }, error: null })
  mockEqSelect.mockReturnValue({ single: mockSingle })
  mockEqUpdate.mockResolvedValue({ error: null })
  mockUpdate.mockReturnValue({ eq: mockEqUpdate })
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({ eq: mockEqSelect }),
    update: mockUpdate,
  })
})

describe('POST /api/admin/professionals/[id]/image', () => {
  it('returns 400 when no file provided', async () => {
    const res = await POST(makeRequest(), { params: { id: 'abc' } })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/imagen/i)
  })

  it('returns 404 when professional not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file), { params: { id: 'abc' } })
    expect(res.status).toBe(404)
  })

  it('returns 400 when uploadProfileImage fails', async () => {
    mockUpload.mockResolvedValue({ error: 'Formato no soportado' })
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file), { params: { id: 'abc' } })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Formato no soportado')
  })

  it('returns url on success', async () => {
    mockUpload.mockResolvedValue({ url: 'https://example.com/storage/abc.jpg' })
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file), { params: { id: 'abc' } })
    expect(res.status).toBe(200)
    expect((await res.json()).url).toBe('https://example.com/storage/abc.jpg')
  })
})
