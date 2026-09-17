// Tests for /pro/set-password
// Covers: invalid token error state, password mismatch, type forwarding (invite vs recovery),
// and successful password set → navigation.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockVerifyOtp = vi.fn()
const mockUpdateUser = vi.fn()
const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      verifyOtp: mockVerifyOtp,
      updateUser: mockUpdateUser,
    },
  }),
}))

let mockSearchParams: Record<string, string> = {}

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => mockSearchParams[key] ?? null }),
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSearchParams = { token_hash: 'abc123', type: 'invite' }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function renderSetPassword() {
  // Dynamic import so vi.mock applies cleanly per test
  const { default: SetPasswordPage } = await import('./page')
  return render(<SetPasswordPage />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SetPasswordPage', () => {
  it('shows invalid-link error state when verifyOtp fails', async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: 'Token expired' }, data: { session: null, user: null } })

    await renderSetPassword()

    await waitFor(() => {
      expect(screen.getByText(/enlace inválido/i)).toBeTruthy()
    })

    // Password form should NOT be rendered
    expect(screen.queryByPlaceholderText(/contraseña/i)).toBeNull()
  })

  it('shows password form when verifyOtp succeeds', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null, data: { session: {}, user: { id: 'u1' } } })

    await renderSetPassword()

    await waitFor(() => {
      // Password inputs are present (type=password, not textbox role)
      expect(document.querySelectorAll('input[type="password"]').length).toBe(2)
    })
  })

  it('passes type=invite to verifyOtp when URL param is invite', async () => {
    mockSearchParams = { token_hash: 'tok1', type: 'invite' }
    mockVerifyOtp.mockResolvedValue({ error: null, data: { session: {}, user: { id: 'u1' } } })

    await renderSetPassword()

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({ token_hash: 'tok1', type: 'invite' })
      )
    })
  })

  it('passes type=recovery to verifyOtp when URL param is recovery', async () => {
    mockSearchParams = { token_hash: 'tok2', type: 'recovery' }
    mockVerifyOtp.mockResolvedValue({ error: null, data: { session: {}, user: { id: 'u1' } } })

    await renderSetPassword()

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({ token_hash: 'tok2', type: 'recovery' })
      )
    })
  })

  it('shows inline error when passwords do not match — updateUser is not called', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null, data: { session: {}, user: { id: 'u1' } } })

    await renderSetPassword()

    await waitFor(() => {
      expect(document.querySelector('input[type="password"]')).toBeTruthy()
    })

    const [pw1, pw2] = document.querySelectorAll('input[type="password"]')
    await userEvent.type(pw1, 'Password123!')
    await userEvent.type(pw2, 'Different456!')

    const submitBtn = screen.getByRole('button', { name: /guardar/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/no coinciden/i)).toBeTruthy()
    })

    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('calls updateUser and navigates to /pro/perfil on successful password set', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null, data: { session: {}, user: { id: 'u1' } } })
    mockUpdateUser.mockResolvedValue({ error: null })

    await renderSetPassword()

    await waitFor(() => {
      expect(document.querySelector('input[type="password"]')).toBeTruthy()
    })

    const [pw1, pw2] = document.querySelectorAll('input[type="password"]')
    await userEvent.type(pw1, 'NewPassword123!')
    await userEvent.type(pw2, 'NewPassword123!')

    const submitBtn = screen.getByRole('button', { name: /guardar/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewPassword123!' })
      expect(mockPush).toHaveBeenCalledWith('/pro/perfil')
    })
  })
})
