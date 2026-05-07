// Unit tests for PracticeForm shared client component.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PracticeForm, normalizeSlug } from './PracticeForm'

// Mock next/navigation router
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

// Mock global fetch
const mockFetch = vi.fn()
beforeEach(() => {
  mockPush.mockReset()
  mockRefresh.mockReset()
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

describe('normalizeSlug', () => {
  it('lowercases', () => {
    expect(normalizeSlug('Reiki')).toBe('reiki')
  })
  it('replaces spaces and special chars with hyphens', () => {
    expect(normalizeSlug('Reiki!')).toBe('reiki')
    expect(normalizeSlug('Constelaciones Familiares')).toBe('constelaciones-familiares')
    expect(normalizeSlug('a/b//c')).toBe('a-b-c')
  })
  it('strips leading/trailing hyphens', () => {
    expect(normalizeSlug('-reiki-')).toBe('reiki')
    expect(normalizeSlug('!!!hello!!!')).toBe('hello')
  })
})

describe('PracticeForm — create mode', () => {
  it('renders empty fields by default', () => {
    render(<PracticeForm mode="create" />)
    expect(screen.getByLabelText(/clave/i)).toHaveValue('')
    expect(screen.getByLabelText(/etiqueta/i)).toHaveValue('')
    expect(screen.getByLabelText(/slug/i)).toHaveValue('')
  })

  it('auto-derives slug from key while slug is untouched', () => {
    render(<PracticeForm mode="create" />)
    const keyInput = screen.getByLabelText(/clave/i) as HTMLInputElement
    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement

    fireEvent.change(keyInput, { target: { value: 'reiki' } })
    expect(slugInput.value).toBe('reiki')
  })

  it('normalizes uppercase + special chars in auto-derived slug', () => {
    render(<PracticeForm mode="create" />)
    const keyInput = screen.getByLabelText(/clave/i) as HTMLInputElement
    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement

    fireEvent.change(keyInput, { target: { value: 'Reiki!' } })
    expect(slugInput.value).toBe('reiki')
  })

  it('stops auto-deriving once user edits the slug manually', () => {
    render(<PracticeForm mode="create" />)
    const keyInput = screen.getByLabelText(/clave/i) as HTMLInputElement
    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement

    fireEvent.change(keyInput, { target: { value: 'reiki' } })
    expect(slugInput.value).toBe('reiki')

    fireEvent.change(slugInput, { target: { value: 'custom-slug' } })
    expect(slugInput.value).toBe('custom-slug')

    fireEvent.change(keyInput, { target: { value: 'reiki-pro' } })
    // slug stays as user-entered value
    expect(slugInput.value).toBe('custom-slug')
  })

  it('disables submit when fields are invalid', () => {
    render(<PracticeForm mode="create" />)
    const submit = screen.getByRole('button', { name: /crear/i })
    expect(submit).toBeDisabled()
  })

  it('POSTs to /api/admin/practices on submit', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, practice: {} }),
    })

    render(<PracticeForm mode="create" />)
    fireEvent.change(screen.getByLabelText(/clave/i), { target: { value: 'reiki' } })
    fireEvent.change(screen.getByLabelText(/etiqueta/i), { target: { value: 'Reiki' } })
    fireEvent.change(screen.getByLabelText(/orden/i), { target: { value: '10' } })

    const submit = screen.getByRole('button', { name: /crear/i })
    await waitFor(() => expect(submit).not.toBeDisabled())
    fireEvent.click(submit)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/practices',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})

describe('PracticeForm — edit mode', () => {
  const INITIAL = {
    key: 'reiki',
    label: 'Reiki',
    slug: 'reiki-original',
    sort_order: 10,
    active: true,
  }

  it('renders prefilled fields with key disabled', () => {
    render(<PracticeForm mode="edit" initial={INITIAL} />)
    const keyInput = screen.getByLabelText(/clave/i) as HTMLInputElement
    expect(keyInput.value).toBe('reiki')
    expect(keyInput).toBeDisabled()
    expect(screen.getByLabelText(/etiqueta/i)).toHaveValue('Reiki')
    expect(screen.getByLabelText(/slug/i)).toHaveValue('reiki-original')
  })

  it('PATCHes /api/admin/practices/[key] on submit', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    })

    render(<PracticeForm mode="edit" initial={INITIAL} />)
    fireEvent.change(screen.getByLabelText(/etiqueta/i), { target: { value: 'Reiki Updated' } })

    const submit = screen.getByRole('button', { name: /guardar/i })
    await waitFor(() => expect(submit).not.toBeDisabled())
    fireEvent.click(submit)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/practices/reiki',
        expect.objectContaining({ method: 'PATCH' })
      )
    })
  })

  it('shows server error in alert when API returns 400', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Ya existe otra práctica con el slug "x".' }),
    })

    render(<PracticeForm mode="edit" initial={INITIAL} />)
    fireEvent.change(screen.getByLabelText(/etiqueta/i), { target: { value: 'New Label' } })
    const submit = screen.getByRole('button', { name: /guardar/i })
    await waitFor(() => expect(submit).not.toBeDisabled())
    fireEvent.click(submit)

    await waitFor(() => {
      expect(screen.getByText(/ya existe otra práctica/i)).toBeInTheDocument()
    })
  })
})
