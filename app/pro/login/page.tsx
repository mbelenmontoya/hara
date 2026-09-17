'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { GlassCard } from '@/app/components/ui/GlassCard'

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
      // Ignore network errors — show generic success regardless
    }

    setForgotStatus('sent')
  }

  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">

          <h1 className="text-2xl font-semibold text-foreground text-center mb-2">
            Tu perfil en Hara
          </h1>
          <p className="text-sm text-muted text-center mb-8">
            Ingresá para editar tu información
          </p>

          <GlassCard>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                />
              </div>

              {loginError && (
                <div className="p-3 bg-danger-weak border border-danger/20 rounded-xl text-sm text-danger">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3.5 bg-brand text-white font-semibold rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all disabled:opacity-50"
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>

              {/* Forgot password toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForgot(v => !v); setForgotStatus('idle') }}
                  className="text-xs text-muted hover:text-foreground transition-colors underline underline-offset-2 w-full text-center"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>

            {/* Forgot-password form — revealed on toggle */}
            {showForgot && (
              <div className="mt-4 pt-4 border-t border-outline">
                {forgotStatus === 'sent' ? (
                  <p className="text-sm text-muted text-center leading-relaxed">
                    Si hay una cuenta con ese email, te enviamos un enlace en breve.
                  </p>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <p className="text-xs text-muted mb-2">
                      Ingresá tu email y te mandamos un enlace para crear una nueva contraseña.
                    </p>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-sm"
                    />
                    <button
                      type="submit"
                      disabled={forgotStatus === 'loading'}
                      className="w-full px-6 py-3 bg-surface-2 text-foreground font-medium rounded-full border border-outline hover:bg-surface transition-all text-sm disabled:opacity-50"
                    >
                      {forgotStatus === 'loading' ? 'Enviando...' : 'Enviar enlace'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </GlassCard>

          <p className="text-xs text-muted text-center mt-6">
            Hara Vital · Portal de profesionales
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ProLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
