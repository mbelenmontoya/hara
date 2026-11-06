import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import ProLoginPage from './page'

const { signIn, push, refresh, getParam } = vi.hoisted(() => ({
  signIn: vi.fn(), push: vi.fn(), refresh: vi.fn(), getParam: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => ({ get: getParam }),
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword: signIn } }),
}))

const fetchMock = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  getParam.mockReturnValue(null)
  signIn.mockResolvedValue({ error: null })
  fetchMock.mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetchMock)
})

async function fillLogin() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email', { exact: true }), 'sol@example.com')
  await user.type(screen.getByLabelText('Contraseña', { exact: true }), 'clave-segura-1')
  return user
}

describe('ProLoginPage', () => {
  it('offers accessible professional sign-in, a way back and an application link', () => {
    render(<ProLoginPage />)
    expect(screen.getByRole('heading', { name: 'Entrá a tu perfil' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Volver' })).toHaveAttribute('href', '/')
    expect(screen.getByLabelText('Email', { exact: true })).toBeRequired()
    expect(screen.getByLabelText('Contraseña', { exact: true })).toBeRequired()
    expect(screen.getByRole('link', { name: 'Completar mi solicitud' })).toHaveAttribute('href', '/registro')
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()
  })

  it('signs in with the entered credentials and opens the professional profile', async () => {
    render(<ProLoginPage />)
    const user = await fillLogin()
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/pro/perfil'))
    expect(signIn).toHaveBeenCalledWith({ email: 'sol@example.com', password: 'clave-segura-1' })
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('preserves the requested destination after successful sign-in', async () => {
    getParam.mockReturnValue('/pro/perfil?from=review')
    render(<ProLoginPage />)
    const user = await fillLogin()
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/pro/perfil?from=review'))
  })

  it('shows invalid credentials and allows retrying without navigating', async () => {
    signIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    render(<ProLoginPage />)
    const user = await fillLogin()
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos')
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled()
    expect(push).not.toHaveBeenCalled()
  })

  it.each([false, true])('keeps password recovery generic when the request fails: %s', async (fails) => {
    if (fails) fetchMock.mockRejectedValueOnce(new Error('network unavailable'))
    render(<ProLoginPage />)
    const user = userEvent.setup()
    const toggle = screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' })
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.type(screen.getByLabelText('Email de tu cuenta'), 'sol@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Si hay una cuenta con ese email, te enviamos un enlace en breve.')
    expect(fetchMock).toHaveBeenCalledWith('/api/pro/forgot-password', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'sol@example.com' }),
    })
    expect(signIn).not.toHaveBeenCalled()
  })
})
