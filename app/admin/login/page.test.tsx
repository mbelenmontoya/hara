import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminLoginPage from './page'

let params = new URLSearchParams()
const push = vi.fn()
const signInWithPassword = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => params,
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword } }),
}))

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('AdminLoginPage', () => {
  beforeEach(() => {
    params = new URLSearchParams()
    push.mockReset()
    signInWithPassword.mockReset()
  })

  it('shows the no-access message when middleware sends a non-admin back', () => {
    params = new URLSearchParams('error=no-access')
    render(<AdminLoginPage />)
    expect(screen.getByText('Esta cuenta no tiene acceso al admin.')).toBeInTheDocument()
  })

  it('does not show the no-access message on a normal visit', () => {
    render(<AdminLoginPage />)
    expect(screen.queryByText('Esta cuenta no tiene acceso al admin.')).not.toBeInTheDocument()
  })

  it('asks for both fields without calling Supabase when one is missing', () => {
    render(<AdminLoginPage />)
    fill('hola@haravital.com', '')
    expect(screen.getByText('Completá tu email y tu contraseña.')).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('shows the wrong-credentials error when Supabase rejects the login', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    render(<AdminLoginPage />)
    fill('hola@haravital.com', 'secreta123')
    expect(await screen.findByText('Email o contraseña incorrectos.')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('signs in with the typed email and goes to the leads', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    render(<AdminLoginPage />)
    fill(' hola@haravital.com ', 'secreta123')
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/leads'))
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'hola@haravital.com', password: 'secreta123' })
  })
})
