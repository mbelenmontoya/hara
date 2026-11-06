import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfessionalReviewPage from './page'
import * as monitoring from '@/lib/monitoring'

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    useParams: () => ({ id: 'pro-1' }),
    usePathname: () => '/admin/professionals/pro-1/review',
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  }
})

// AdminLayout reads the signed-in email
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getUser: () => Promise.resolve({ data: { user: null } }), signOut: vi.fn() } }),
}))

const PENDING = {
  id: 'pro-1',
  slug: 'sol-luna',
  status: 'submitted',
  full_name: 'Sol Luna',
  email: 'sol@test.com',
  whatsapp: '+5491100000000',
  country: 'AR',
  city: 'Rosario',
  online_only: false,
  modality: ['presencial'],
  specialties: [],
  practices: [],
  needs_practice_review: false,
  bio: null,
  short_description: null,
  experience_description: null,
  instagram: null,
  service_type: [],
  price_range_min: null,
  price_range_max: null,
  currency: 'ARS',
  accepting_new_clients: true,
  offers_courses_online: false,
  courses_presencial_location: null,
  profile_image_url: null,
  subscription_tier: 'basico',
  tier_expires_at: null,
  ranking_score: 0,
  rating_average: 0,
  rating_count: 0,
  created_at: '2026-10-01T12:00:00.000Z',
  rejection_reason: null,
  score_overrides: {},
}

function stub() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) =>
    Promise.resolve({
      ok: true,
      json: async () =>
        url === '/api/admin/professionals/pro-1' && !init?.method ? { professional: PENDING, practices: [] } : { leads: 0, professionals: 0, blog: 0, reviews: 0 },
    })
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const patches = (fetchMock: ReturnType<typeof stub>) => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')

describe('ProfessionalReviewPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(monitoring, 'logError').mockImplementation(() => {})
  })

  it('will not reject without a reason, and sends the reason once it is written', async () => {
    const fetchMock = stub()
    render(<ProfessionalReviewPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))

    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog.querySelector('button:last-of-type') as HTMLButtonElement)
    expect(screen.getByText('Escribí el motivo antes de rechazar.')).toBeInTheDocument()
    expect(patches(fetchMock)).toHaveLength(0)

    fireEvent.change(screen.getByLabelText('Motivo del rechazo'), { target: { value: '  Falta la biografía  ' } })
    fireEvent.click(dialog.querySelector('button:last-of-type') as HTMLButtonElement)
    await waitFor(() => expect(patches(fetchMock)).toHaveLength(1))
    expect(JSON.parse(patches(fetchMock)[0][1]?.body as string)).toEqual({ action: 'reject', rejection_reason: 'Falta la biografía' })
  })

  it('marks the professional read when the review opens', async () => {
    const fetchMock = stub()
    render(<ProfessionalReviewPage />)
    await screen.findByRole('heading', { name: 'Sol Luna' })
    const post = fetchMock.mock.calls.find(([url, init]) => url === '/api/admin/unread' && init?.method === 'POST')
    expect(JSON.parse(post?.[1]?.body as string)).toEqual({ kind: 'professionals', id: 'pro-1' })
  })
})
