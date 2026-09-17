'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { GlassCard } from '@/app/components/ui/GlassCard'
import Link from 'next/link'

const MIN_PASSWORD_LENGTH = 8

type PageState = 'verifying' | 'invalid' | 'form' | 'saving' | 'done'

function SetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Read token_hash and type from URL — both required.
  // NOTE: Supabase generates the link using field name `hashed_token`; the URL
  // query param and verifyOtp argument are both `token_hash` (different names,
  // same value on either side of the wire).
  const token_hash = searchParams.get('token_hash') ?? ''
  const type = (searchParams.get('type') ?? 'invite') as 'invite' | 'recovery'

  const [pageState, setPageState] = useState<PageState>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [matchError, setMatchError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!token_hash) {
      setPageState('invalid')
      return
    }

    const supabase = createClient()
    // type from URL param must be forwarded exactly — hardcoding would break
    // recovery links (type='recovery') when the default was 'invite'
    supabase.auth.verifyOtp({ token_hash, type }).then(({ error }) => {
      if (error) {
        setPageState('invalid')
      } else {
        setPageState('form')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount — token_hash and type are stable URL params

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMatchError(null)
    setSaveError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setMatchError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
      return
    }
    if (password !== confirm) {
      setMatchError('Las contraseñas no coinciden')
      return
    }

    setPageState('saving')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setSaveError('No pudimos guardar la contraseña. Intentá de nuevo.')
      setPageState('form')
      return
    }

    router.push('/pro/perfil')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">

          {pageState === 'verifying' && (
            <p className="text-center text-muted text-sm">Verificando enlace…</p>
          )}

          {pageState === 'invalid' && (
            <GlassCard>
              <div className="text-center space-y-4">
                <h1 className="text-xl font-semibold text-foreground">
                  Enlace inválido o vencido
                </h1>
                <p className="text-sm text-muted leading-relaxed">
                  El enlace ya fue usado o venció. Podés pedir uno nuevo desde la pantalla de inicio de sesión.
                </p>
                <Link
                  href="/pro/login"
                  className="inline-block mt-2 px-6 py-3 bg-brand text-white text-sm font-semibold rounded-full hover:shadow-elevated transition-all"
                >
                  Ir al inicio de sesión
                </Link>
              </div>
            </GlassCard>
          )}

          {(pageState === 'form' || pageState === 'saving') && (
            <>
              <h1 className="text-2xl font-semibold text-foreground text-center mb-2">
                Creá tu contraseña
              </h1>
              <p className="text-sm text-muted text-center mb-8">
                Usala para acceder a tu perfil en Hara.
              </p>

              <GlassCard>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      autoComplete="new-password"
                      className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Repetí la contraseña
                    </label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                    />
                  </div>

                  {(matchError || saveError) && (
                    <div className="p-3 bg-danger-weak border border-danger/20 rounded-xl text-sm text-danger">
                      {matchError ?? saveError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={pageState === 'saving'}
                    className="w-full px-6 py-3.5 bg-brand text-white font-semibold rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all disabled:opacity-50"
                  >
                    {pageState === 'saving' ? 'Guardando…' : 'Guardar contraseña'}
                  </button>
                </form>
              </GlassCard>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  )
}
