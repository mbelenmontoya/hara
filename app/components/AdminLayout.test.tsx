import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AdminLayout } from './AdminLayout'

const push = vi.fn()
const refresh = vi.fn()
const signOut = vi.fn().mockResolvedValue({ error: null })

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/leads',
  useRouter: () => ({ push, refresh }),
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: 'hola@haravital.com' } } }),
      signOut,
    },
  }),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  push.mockReset()
  fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(init?.method === 'POST' ? { ok: true } : { leads: 3, professionals: 0, blog: 1, reviews: 0 }),
    })
  )
  vi.stubGlobal('fetch', fetchMock)
})

// Desktop sidebar and phone pills both render (CSS hides one), so take the first nav
function sidebar() {
  return screen.getAllByRole('navigation', { name: 'Admin' })[0]
}

describe('AdminLayout', () => {
  it('should link every admin section, including PQLs and Reseñas', () => {
    render(<AdminLayout><div /></AdminLayout>)
    const links = Array.from(sidebar().querySelectorAll('a')).map((a) => [a.textContent?.replace(/\d+$/, ''), a.getAttribute('href')])
    expect(links).toEqual([
      ['Leads', '/admin/leads'],
      ['Profesionales', '/admin/professionals'],
      ['Prácticas', '/admin/practices'],
      ['PQLs', '/admin/pqls'],
      ['Analíticas', '/admin/analytics'],
      ['Blog', '/admin/blog'],
      ['Reseñas', '/admin/reviews'],
    ])
  })

  it('should mark the current link as the current page', () => {
    render(<AdminLayout><div /></AdminLayout>)
    expect(sidebar().querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('/admin/leads')
  })

  it('should show unread numbers above zero and hide zeros', async () => {
    render(<AdminLayout><div /></AdminLayout>)
    expect(await screen.findAllByLabelText('3 sin leer')).toHaveLength(2)
    expect(screen.getAllByLabelText('1 sin leer')).toHaveLength(2)
    expect(screen.queryByLabelText('0 sin leer')).not.toBeInTheDocument()
  })

  it('should show no numbers when the unread request fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'x' }) })
    render(<AdminLayout><div /></AdminLayout>)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.queryByLabelText(/sin leer/)).not.toBeInTheDocument()
  })

  it('should wait for the mark-read to finish before loading the numbers', async () => {
    let finishPost: (v: unknown) => void = () => {}
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? new Promise((resolve) => { finishPost = resolve })
        : Promise.resolve({ ok: true, json: () => Promise.resolve({ leads: 0, professionals: 0, blog: 0, reviews: 0 }) })
    )
    render(<AdminLayout markRead={{ kind: 'leads', id: 'abc' }}><div /></AdminLayout>)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [first] = fetchMock.mock.calls
    expect(first[1]?.method).toBe('POST')
    expect(JSON.parse(first[1]?.body as string)).toEqual({ kind: 'leads', id: 'abc' })
    await new Promise((r) => setTimeout(r, 20))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    finishPost({ ok: true, json: () => Promise.resolve({ ok: true }) })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls[1][1]?.method).toBeUndefined()
  })

  it('should show the admin email and sign out with Salir', async () => {
    render(<AdminLayout><div /></AdminLayout>)
    expect(await screen.findByText('hola@haravital.com')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Salir' })[0])
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/login'))
    expect(signOut).toHaveBeenCalled()
  })
})
