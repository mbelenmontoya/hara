'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'

const INPUT_CLASS = 'w-full rounded-[14px] bg-background px-3.5 py-[13px] text-base text-foreground outline-none placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-brand'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/pro/perfil'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Forgot-password state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'loading' | 'sent'>('idle')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setLoginError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotStatus('loading')

    try {
      await fetch('/api/pro/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      })
    } catch {
      // Ignore network errors: show generic success regardless
    }

    setForgotStatus('sent')
  }

  return (
    <main className="min-h-screen bg-background font-almanac text-foreground">
      <div className="mx-auto w-full max-w-md px-5 pb-12 pt-6 md:max-w-xl">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
          <Link href="/" className="justify-self-start py-2.5 text-[13.5px] font-medium text-brand-dark">
            ← Volver
          </Link>
          <Image src="/assets/logo/logoreduccion.png" alt="Hara" width={66} height={53} className="h-[38px] w-auto object-contain" priority />
          <span />
        </div>

        <div className="mt-10">
          <p className="almanac-label mb-0 text-brand">Profesionales</p>
          <h1 className="font-almanac-serif mb-0 mt-3 text-[44px] leading-[1.05]">
            Entrá a tu <em className="text-brand">perfil</em>
          </h1>
          <p className="mt-3 text-[15px] leading-normal text-gray-700">
            Revisá tu solicitud o actualizá tu información.
          </p>
        </div>

        <div className="mt-6 rounded-3xl bg-gray-50 px-[18px] py-6">
          <form onSubmit={handleLogin} aria-label="Ingresar a mi perfil" className="space-y-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="pro-email" className="text-[14px] font-medium">Email</label>
              <input
                id="pro-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                aria-invalid={!!loginError}
                aria-describedby={loginError ? 'pro-login-error' : undefined}
                className={INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="pro-password" className="text-[14px] font-medium">Contraseña</label>
              <input
                id="pro-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
                aria-invalid={!!loginError}
                aria-describedby={loginError ? 'pro-login-error' : undefined}
                className={INPUT_CLASS}
              />
            </div>

            {loginError && (
              <p id="pro-login-error" role="alert" className="rounded-[14px] bg-danger-weak px-3.5 py-3 text-[13.5px] leading-normal text-danger-dark">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full rounded-2xl bg-brand-dark px-6 py-[15px] text-[15px] font-medium text-gray-50 disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
            <button
              type="button"
              aria-expanded={showForgot}
              aria-controls="pro-recovery"
              onClick={() => { setShowForgot(v => !v); setForgotStatus('idle') }}
              className="min-h-11 w-full text-center text-[13px] text-brand-dark underline underline-offset-4"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>

          {showForgot && (
            <section id="pro-recovery" aria-labelledby="pro-recovery-title" className="mt-5 border-t border-outline pt-5">
              <h2 id="pro-recovery-title" className="font-almanac-serif mb-3 text-[28px] leading-tight">Recuperá tu acceso</h2>
              {forgotStatus === 'sent' ? (
                <p role="status" className="text-[14px] leading-normal text-gray-700">
                  Si hay una cuenta con ese email, te enviamos un enlace en breve.
                </p>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-[13.5px] leading-normal text-gray-700">Te mandamos un enlace para crear una nueva contraseña.</p>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="pro-recovery-email" className="text-[14px] font-medium">Email de tu cuenta</label>
                    <input
                      id="pro-recovery-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoFocus
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className={INPUT_CLASS}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotStatus === 'loading'}
                    className="w-full rounded-2xl bg-surface-2 px-6 py-[15px] text-[15px] font-medium text-brand-dark disabled:opacity-50"
                  >
                    {forgotStatus === 'loading' ? 'Enviando...' : 'Enviar enlace'}
                  </button>
                </form>
              )}
            </section>
          )}
        </div>

        <div className="mt-7 border-t border-outline pt-5">
          <p className="text-[14px] text-gray-700">¿Querés sumarte a Hara?</p>
          <Link href="/registro" className="mt-1 inline-flex min-h-11 items-center text-[14px] font-medium text-brand-dark underline underline-offset-4">
            Completar mi solicitud
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function ProLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
