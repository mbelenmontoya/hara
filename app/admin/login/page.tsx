// Admin Login Page
// Uses Supabase Auth with email + password. Almanac design 13 ("Entrá al panel").

'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LOGO_SRC = '/assets/logo/isotipo.png'
const INPUT_CLASS =
  'w-full rounded-[13px] bg-background px-[13px] py-3 text-[16px] text-foreground placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-brand/40'

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="mt-3.5 flex items-center gap-2.5 rounded-[13px] bg-danger-weak px-[13px] py-[11px]">
      <span aria-hidden="true" className="h-[18px] w-[18px] flex-none rounded-full bg-danger-dark text-center text-[12px] font-semibold leading-[18px] text-gray-50">!</span>
      <span className="text-[13.5px] text-danger-dark">{children}</span>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/admin/leads'
  // Set by middleware.ts when a signed-in user who is not the admin tries to open /admin
  const noAccess = searchParams.get('error') === 'no-access'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (!EMAIL_RE.test(email.trim()) || !password) {
      setError('Completá tu email y tu contraseña.')
      return
    }
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 font-almanac text-foreground">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center gap-2.5">
          <img src={LOGO_SRC} alt="Hara" className="h-12 w-11 object-contain" />
          <span className="text-[10.5px] font-medium tracking-[0.21em] text-brand">ADMIN</span>
        </div>

        <form onSubmit={handleLogin} noValidate className="mt-[26px] rounded-[26px] bg-gray-50 px-6 py-[26px]">
          <h1 className="font-almanac-serif text-[34px] leading-[1.05] tracking-[-0.3px]">
            Entrá al <em className="text-brand">panel</em>
          </h1>

          <div className="mt-5 flex flex-col gap-3.5">
            <label className="flex flex-col gap-[7px]">
              <span className="text-[13.5px] font-medium">Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null) }}
                placeholder="tu@email.com"
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-[7px]">
              <span className="text-[13.5px] font-medium">Contraseña</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null) }}
                placeholder="••••••••"
                className={INPUT_CLASS}
              />
            </label>
          </div>

          {error && <ErrorLine>{error}</ErrorLine>}
          {noAccess && !error && <ErrorLine>Esta cuenta no tiene acceso al admin.</ErrorLine>}

          <button
            type="submit"
            disabled={loading}
            className="btn-press-glow mt-[18px] w-full rounded-[15px] bg-brand-dark p-3.5 text-[15px] font-medium text-gray-50 disabled:bg-brand-dark/55"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-4 text-center text-[12.5px] text-gray-500">Solo para el equipo de Hara.</p>
      </div>
    </main>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
