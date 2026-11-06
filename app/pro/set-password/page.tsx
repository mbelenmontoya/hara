'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'

const MIN_PASSWORD_LENGTH = 8
const INPUT_CLASS = 'w-full rounded-[14px] bg-background px-3.5 py-[13px] text-base text-foreground outline-none placeholder:text-gray-700 focus-visible:ring-2 focus-visible:ring-brand'

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

  const error = matchError ?? saveError

  return (
    <main className="min-h-screen bg-background font-almanac text-foreground">
      <div className="mx-auto w-full max-w-md px-5 pb-12 pt-6 md:max-w-xl">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
          <Link href="/pro/login" className="justify-self-start py-3 text-sm font-medium text-brand-dark focus-visible:outline-brand">
            ← Volver
          </Link>
          <Image src="/assets/logo/logoreduccion.png" alt="Hara" width={66} height={53} className="h-[38px] w-auto object-contain" priority />
          <span />
        </div>

        <div className="mt-10">
          <p className="almanac-label mb-0 text-gray-700!">Profesionales</p>
          <h1 className="font-almanac-serif mb-0 mt-3 text-[44px] leading-[1.05]">
            {pageState === 'invalid' ? (
              <>Enlace inválido o <em className="text-brand">vencido</em></>
            ) : (
              <>{type === 'recovery' ? 'Elegí tu nueva ' : 'Creá tu '}<em className="text-brand">contraseña</em></>
            )}
          </h1>
          <p className="mt-3 text-[15px] leading-normal text-gray-700">
            {pageState === 'invalid'
              ? 'El enlace ya fue usado o venció. Podés pedir uno nuevo desde la pantalla de inicio de sesión.'
              : 'Usala para acceder a tu perfil en Hara.'}
          </p>
        </div>

        <div className="mt-6 rounded-3xl bg-gray-50 px-5 py-6 sm:px-6">
          {pageState === 'verifying' && (
            <p role="status" className="text-sm text-gray-700">Verificando enlace…</p>
          )}

          {pageState === 'invalid' && (
            <Link href="/pro/login" className="block min-h-12 rounded-2xl bg-brand-dark px-6 py-3.5 text-center text-base font-medium text-gray-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
              Ir al inicio de sesión
            </Link>
          )}

          {(pageState === 'form' || pageState === 'saving') && (
            <form onSubmit={handleSubmit} aria-label="Establecer contraseña" className="space-y-5">
              <div>
                <label htmlFor="pro-new-password" className="mb-2 block text-sm font-medium">Nueva contraseña</label>
                <input
                  id="pro-new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'pro-password-error' : 'pro-password-hint'}
                  className={INPUT_CLASS}
                />
                <p id="pro-password-hint" className="mt-2 text-xs text-gray-700">Al menos 8 caracteres.</p>
              </div>
              <div>
                <label htmlFor="pro-confirm-password" className="mb-2 block text-sm font-medium">Repetí la contraseña</label>
                <input
                  id="pro-confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repetí tu nueva contraseña"
                  required
                  autoComplete="new-password"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'pro-password-error' : undefined}
                  className={INPUT_CLASS}
                />
              </div>
              {error && (
                <p id="pro-password-error" role="alert" className="rounded-2xl bg-danger-weak p-4 text-sm text-danger-dark">{error}</p>
              )}
              <button
                type="submit"
                disabled={pageState === 'saving'}
                className="min-h-12 w-full rounded-2xl bg-brand-dark px-6 py-3.5 text-base font-medium text-gray-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:opacity-50"
              >
                {pageState === 'saving' ? 'Guardando…' : 'Guardar contraseña'}
              </button>
              {pageState === 'saving' && <p role="status" className="sr-only">Guardando contraseña…</p>}
            </form>
          )}
        </div>
      </div>
    </main>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<p role="status" className="min-h-screen bg-background p-6 font-almanac text-muted">Verificando enlace…</p>}>
      <SetPasswordForm />
    </Suspense>
  )
}
