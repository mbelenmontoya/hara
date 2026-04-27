// Unit tests for DestacadoPaymentModal
// Verifies form validation, submit payload shape, info banner, and modal callbacks.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DestacadoPaymentModal } from './DestacadoPaymentModal'

// Stub next/* — vitest unit env uses component-setup.ts which already mocks next/navigation
// and next/link, but we need fetch too.

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

const BASICO_PROFESSIONAL = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Ana García',
  subscription_tier: 'basico' as const,
  tier_expires_at: null,
}

const DESTACADO_PROFESSIONAL = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'Luis Torres',
  subscription_tier: 'destacado' as const,
  tier_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
}

type ProfessionalArg = { id: string; name: string; subscription_tier: string; tier_expires_at: string | null }

function renderModal(professional: ProfessionalArg = BASICO_PROFESSIONAL, opts?: { onClose?: () => void; onSuccess?: () => void }) {
  const onClose   = opts?.onClose   ?? vi.fn()
  const onSuccess = opts?.onSuccess ?? vi.fn()
  render(
    <DestacadoPaymentModal
      open
      onClose={onClose}
      onSuccess={onSuccess}
      professional={professional}
    />
  )
  return { onClose, onSuccess }
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.clear(screen.getByLabelText(/monto/i))
  await user.type(screen.getByLabelText(/monto/i), '5000')
  // Select 30-day preset
  await user.click(screen.getByRole('button', { name: /30 días/i }))
  // Payment method — select mp_link
  const methodSelect = screen.getByLabelText(/método de pago/i)
  await user.selectOptions(methodSelect, 'mp_link')
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── (d) Info banner ──────────────────────────────────────────────────────────

describe('info banner', () => {
  it('does NOT show banner for basico professional', () => {
    renderModal(BASICO_PROFESSIONAL)
    expect(screen.queryByText(/ya es destacado/i)).toBeNull()
  })

  it('shows banner when professional is currently destacado with future expiry', () => {
    renderModal(DESTACADO_PROFESSIONAL)
    expect(screen.getByText(/ya es destacado/i)).toBeInTheDocument()
  })
})

// ─── (a) amount validation ────────────────────────────────────────────────────

describe('validation — amount', () => {
  it('shows error when amount is zero and does not call fetch', async () => {
    const user = userEvent.setup()
    renderModal()
    const amountInput = screen.getByLabelText(/monto/i)
    await user.clear(amountInput)
    await user.type(amountInput, '0')
    await user.click(screen.getByRole('button', { name: /guardar/i }))
    expect(screen.getByText(/mayor que 0/i)).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ─── (b) period validation ────────────────────────────────────────────────────

describe('validation — period', () => {
  it('shows error when period_end is before period_start and does not call fetch', async () => {
    const user = userEvent.setup()
    renderModal()
    // Set amount
    await user.clear(screen.getByLabelText(/monto/i))
    await user.type(screen.getByLabelText(/monto/i), '5000')
    // Choose custom period with end before start
    await user.click(screen.getByRole('button', { name: /personalizado/i }))
    const startInput = screen.getByLabelText(/inicio del período/i)
    const endInput   = screen.getByLabelText(/fin del período/i)
    await user.clear(startInput)
    await user.type(startInput, '2026-05-01')
    await user.clear(endInput)
    await user.type(endInput, '2026-04-01')  // before start
    await user.click(screen.getByRole('button', { name: /guardar/i }))
    expect(screen.getByText(/posterior a/i)).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ─── (c) successful submit payload ───────────────────────────────────────────

describe('successful submit', () => {
  it('calls POST /api/admin/subscriptions with correct payload shape on valid submit', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ payment_id: 'pay-1', tier_expires_at: '2026-05-24T00:00:00Z' }) })
    const user = userEvent.setup()
    const { onSuccess, onClose } = renderModal()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /guardar/i }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/admin/subscriptions')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body as string)
    expect(body).toMatchObject({
      professional_id: BASICO_PROFESSIONAL.id,
      amount: 5000,
      currency: expect.stringMatching(/^(ARS|USD)$/),
      payment_method: 'mp_link',
    })
    expect(body.period_start).toBeDefined()
    expect(body.period_end).toBeDefined()
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})

// ─── (e) Cancelar closes without success ─────────────────────────────────────

describe('Cancelar button', () => {
  it('calls onClose and NOT onSuccess when Cancelar is clicked', async () => {
    const user = userEvent.setup()
    const { onClose, onSuccess } = renderModal()
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ─── (f) fetch error shows alert ─────────────────────────────────────────────

describe('fetch error handling', () => {
  it('shows error alert when API returns non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Error interno' }) })
    const user = userEvent.setup()
    const { onSuccess } = renderModal()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /guardar/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
