// Unit tests for POST /api/blog
// Tests validation, sanitization, slug generation, professional email-link, and rate-limiting.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const {
  mockRateLimit,
  mockInsertSelect,
  mockInsert,
  mockSlugSingle,
  mockProSingle,
  mockUpdateEq,
  mockUpdate,
  mockSanitize,
  mockExcerpt,
  mockUploadBlogImage,
  mockNotifyNewBlogPost,
} = vi.hoisted(() => ({
  mockRateLimit:        vi.fn(),
  mockInsertSelect:     vi.fn(),
  mockInsert:           vi.fn(),
  mockSlugSingle:       vi.fn(),
  mockProSingle:        vi.fn(),
  mockUpdateEq:         vi.fn(),
  mockUpdate:           vi.fn(),
  mockSanitize:         vi.fn((html: string) => html),
  mockExcerpt:          vi.fn((html: string) => html.slice(0, 200)),
  mockUploadBlogImage:  vi.fn(),
  mockNotifyNewBlogPost: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  ratelimit: { limit: mockRateLimit },
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeBlogHtml: mockSanitize,
  htmlToExcerpt: mockExcerpt,
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'blog_posts') {
        return {
          // Slug uniqueness check: .select('slug').eq('slug', x).maybeSingle()
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: mockSlugSingle }),
          }),
          insert: mockInsert,
          update: mockUpdate,
        }
      }
      if (table === 'professionals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ maybeSingle: mockProSingle }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    }),
  },
}))

vi.mock('@/lib/storage', () => ({
  uploadBlogImage: mockUploadBlogImage,
}))

vi.mock('@/lib/email', () => ({
  notifyNewBlogPost: mockNotifyNewBlogPost,
}))

vi.mock('@/lib/monitoring', () => ({
  logError: vi.fn(),
}))

import { POST } from './route'

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_BODY_HTML = '<p>This is a well-written blog post about holistic wellness.</p>'
const COVER_FILE = new File(['img'], 'cover.jpg', { type: 'image/jpeg' })

function makeRequest(fields: Record<string, string | File | undefined>): NextRequest {
  const req = new NextRequest('http://localhost/api/blog', { method: 'POST' })
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) fd.append(k, v)
  }
  // Stub formData() — File doesn't survive FormData serialization in jsdom
  req.formData = vi.fn().mockResolvedValue(fd)
  return req
}

function validFields(overrides: Record<string, string | File | undefined> = {}) {
  return {
    title: 'Mi nota sobre bienestar',
    body_html: VALID_BODY_HTML,
    author_name: 'María García',
    author_email: 'maria@example.com',
    cover_image: COVER_FILE,
    ...overrides,
  }
}

function setupHappyPath() {
  mockRateLimit.mockResolvedValue({ success: true })
  mockSanitize.mockReturnValue(VALID_BODY_HTML)
  mockExcerpt.mockReturnValue('This is a well-written blog post about holistic wellness.')
  mockSlugSingle.mockResolvedValue({ data: null, error: null }) // base slug not taken
  mockProSingle.mockResolvedValue({ data: null, error: null })
  mockInsert.mockReturnValue({
    select: vi.fn().mockReturnValue({ single: mockInsertSelect }),
  })
  mockInsertSelect.mockResolvedValue({
    data: { id: 'post-uuid-1', slug: 'mi-nota-sobre-bienestar' },
    error: null,
  })
  mockUpdate.mockReturnValue({ eq: mockUpdateEq })
  mockUpdateEq.mockResolvedValue({ error: null })
  mockUploadBlogImage.mockResolvedValue({ url: 'https://cdn.example.com/cover.jpg' })
  mockNotifyNewBlogPost.mockResolvedValue(true)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/blog', () => {
  describe('rate limiting', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      mockRateLimit.mockResolvedValue({ success: false })
      const res = await POST(makeRequest(validFields()))
      expect(res.status).toBe(429)
    })
  })

  describe('validation — 400 cases', () => {
    beforeEach(() => {
      mockRateLimit.mockResolvedValue({ success: true })
      mockSanitize.mockReturnValue(VALID_BODY_HTML)
    })

    it('returns 400 when cover_image is missing', async () => {
      const res = await POST(makeRequest(validFields({ cover_image: undefined })))
      expect(res.status).toBe(400)
      const body = await res.json() as { error: string }
      expect(body.error).toMatch(/portada|cover/i)
    })

    it('returns 400 when title is too short (< 4 chars)', async () => {
      const res = await POST(makeRequest(validFields({ title: 'Hi' })))
      expect(res.status).toBe(400)
      const body = await res.json() as { error: string }
      expect(body.error).toMatch(/título|title/i)
    })

    it('returns 400 when title exceeds 140 chars', async () => {
      const res = await POST(makeRequest(validFields({ title: 'a'.repeat(141) })))
      expect(res.status).toBe(400)
    })

    it('returns 400 when body_html is empty after sanitize', async () => {
      mockSanitize.mockReturnValue('')
      const res = await POST(makeRequest(validFields({ body_html: '<script>bad</script>' })))
      expect(res.status).toBe(400)
    })

    it('returns 400 when body_html exceeds MAX_BODY_CHARS', async () => {
      const bigBody = '<p>' + 'a'.repeat(50_001) + '</p>'
      const res = await POST(makeRequest(validFields({ body_html: bigBody })))
      expect(res.status).toBe(400)
      const body = await res.json() as { error: string }
      expect(body.error).toMatch(/largo|large|limit|tamaño/i)
    })

    it('returns 400 when email is invalid', async () => {
      const res = await POST(makeRequest(validFields({ author_email: 'not-an-email' })))
      expect(res.status).toBe(400)
    })

    it('returns 400 when author_name is empty', async () => {
      const res = await POST(makeRequest(validFields({ author_name: '' })))
      expect(res.status).toBe(400)
    })
  })

  describe('happy path', () => {
    it('returns 201 with slug when submission is valid', async () => {
      setupHappyPath()
      const res = await POST(makeRequest(validFields()))
      expect(res.status).toBe(201)
      const body = await res.json() as { success: boolean; slug: string }
      expect(body.success).toBe(true)
      expect(body.slug).toBe('mi-nota-sobre-bienestar')
    })

    it('inserts post with status=submitted and sanitized body_html', async () => {
      setupHappyPath()
      await POST(makeRequest(validFields()))
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'submitted',
          body_html: VALID_BODY_HTML,
        })
      )
    })

    it('leaves professional_id null when no email match', async () => {
      setupHappyPath()
      mockProSingle.mockResolvedValue({ data: null, error: null })
      await POST(makeRequest(validFields()))
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          professional_id: null,
          professional_link_confirmed: false,
        })
      )
    })

    it('sets professional_id + professional_link_confirmed=false when email matches active pro', async () => {
      setupHappyPath()
      mockProSingle.mockResolvedValue({ data: { id: 'pro-uuid-123' }, error: null })
      await POST(makeRequest(validFields({ author_email: 'active-pro@example.com' })))
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          professional_id: 'pro-uuid-123',
          professional_link_confirmed: false,
        })
      )
    })

    it('appends a nanoid suffix when base slug is already taken', async () => {
      setupHappyPath()
      // Simulate slug collision on first check
      mockSlugSingle.mockResolvedValueOnce({ data: { slug: 'mi-nota-sobre-bienestar' }, error: null })
      await POST(makeRequest(validFields()))
      const insertCall = vi.mocked(mockInsert).mock.calls[0]?.[0] as { slug?: string }
      const insertedSlug: string = insertCall?.slug ?? ''
      // Base slug was taken → should have a suffix appended
      expect(insertedSlug).toMatch(/^mi-nota-sobre-bienestar-.+/)
    })

    it('fires admin notification email', async () => {
      setupHappyPath()
      await POST(makeRequest(validFields()))
      // Fire-and-forget; the mock is called synchronously before the async .catch()
      expect(mockNotifyNewBlogPost).toHaveBeenCalledTimes(1)
    })
  })
})
