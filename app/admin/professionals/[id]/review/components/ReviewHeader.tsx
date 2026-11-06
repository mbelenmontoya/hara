// Header card of the admin professional review (design 13): photo, name, status, meta, score ring
// and the action bar for the current status. Presentational: the page owns every fetch.

'use client'

import { useRef, type ChangeEvent } from 'react'
import { ADMIN_BTN_PRIMARY, ADMIN_BTN_SECONDARY, StatusBadge, formatAdminDate } from '@/app/admin/components/AdminUI'
import { PRO_STATUS_OPTIONS } from '@/app/admin/professionals/components/ProfessionalCard'
import { isEffectivelyDestacado } from '@/lib/ranking'

const STATUS_LABEL: Record<string, string> = Object.fromEntries(PRO_STATUS_OPTIONS.map((o) => [o.value, o.label]))

export interface ReviewHeaderProfessional {
  slug: string
  status: string
  full_name: string
  profile_image_url: string | null
  subscription_tier: string
  tier_expires_at: string | null
  ranking_score: number
  rating_average: number
  rating_count: number
  created_at: string
  rejection_reason: string | null
}

interface ReviewHeaderProps {
  pro: ReviewHeaderProfessional
  total: number
  imageUploading: boolean
  busy: boolean
  onPhoto: (file: File) => void
  onApprove: () => void
  onReject: () => void
  onResend: () => void
}

/** Conic ring with the profile score, as in the design. */
function AdminScoreRing({ total }: { total: number }) {
  return (
    <div
      className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-full"
      style={{ background: `conic-gradient(var(--color-brand) ${total}%, color-mix(in srgb, var(--color-foreground) 10%, transparent) 0)` }}
      aria-label={`Puntaje ${total} de 100`}
    >
      <div className="flex h-[70px] w-[70px] flex-col items-center justify-center rounded-full bg-gray-50">
        <span className="font-almanac-serif text-[28px] leading-none">{total}</span>
        <span className="mt-0.5 text-[8.5px] font-medium tracking-[1.5px] text-muted">DE 100</span>
      </div>
    </div>
  )
}

function Photo({ pro, uploading, onPhoto }: { pro: ReviewHeaderProfessional; uploading: boolean; onPhoto: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const hasPhoto = !!pro.profile_image_url?.startsWith('http')

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onPhoto(file)
    if (input.current) input.current.value = ''
  }

  return (
    <div className="flex flex-none flex-col items-center gap-2">
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-weak">
        {hasPhoto ? (
          <img src={pro.profile_image_url ?? ''} alt={pro.full_name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-almanac-serif text-[36px] text-brand-dark">{pro.full_name.charAt(0)}</span>
        )}
      </div>
      <label className="cursor-pointer text-[12.5px] font-medium text-brand-dark hover:underline">
        {uploading ? 'Subiendo…' : hasPhoto ? 'Reemplazar foto' : 'Subir foto'}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handle} disabled={uploading} />
      </label>
    </div>
  )
}

function ActionBar({ pro, busy, onApprove, onReject, onResend }: Pick<ReviewHeaderProps, 'pro' | 'busy' | 'onApprove' | 'onReject' | 'onResend'>) {
  const text = 'text-[13.5px] leading-[1.45] text-gray-700'
  if (pro.status === 'submitted') {
    return (
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3.5">
        <p className={`flex-1 ${text}`}>Al aprobar, el perfil se vuelve público y le mandamos un email para crear su contraseña.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="inline-flex flex-none rounded-[14px] border-[1.5px] border-danger-dark/35 px-[15px] py-[9.5px] text-[14px] font-medium text-danger-dark"
          >
            Rechazar
          </button>
          <button type="button" onClick={onApprove} disabled={busy} className={ADMIN_BTN_PRIMARY}>
            {busy ? 'Aprobando…' : 'Aprobar perfil'}
          </button>
        </div>
      </div>
    )
  }
  if (pro.status === 'active') {
    return (
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3.5">
        <p className={`flex-1 ${text}`}>El perfil es público. Si perdió el acceso, le mandamos un enlace nuevo para crear su contraseña.</p>
        <button type="button" onClick={onResend} disabled={busy} className={ADMIN_BTN_SECONDARY}>
          {busy ? 'Enviando…' : 'Reenviar acceso'}
        </button>
      </div>
    )
  }
  if (pro.status === 'rejected') {
    return (
      <div className="flex items-start gap-2.5 rounded-[14px] bg-danger-weak px-3.5 py-3">
        <span className="h-[18px] w-[18px] flex-none rounded-full bg-danger-dark text-center text-[12px] font-semibold leading-[18px] text-gray-50" aria-hidden="true">
          !
        </span>
        <p className="text-[13.5px] leading-[1.45] text-danger-dark">
          <span className="font-medium">Rechazado.</span> {pro.rejection_reason ?? 'Sin motivo registrado.'}
        </p>
      </div>
    )
  }
  return (
    <p className={text}>
      {pro.status === 'draft' ? 'Todavía no terminó de completar el formulario.' : 'El perfil está pausado y no aparece en el directorio.'}
    </p>
  )
}

export function ReviewHeader(props: ReviewHeaderProps) {
  const { pro, total, imageUploading, onPhoto } = props
  const destacado = isEffectivelyDestacado(pro.subscription_tier, pro.tier_expires_at)
  const rating = pro.rating_count > 0 ? `${pro.rating_average.toFixed(1)} (${pro.rating_count})` : 'Sin reseñas'

  return (
    <div className="min-w-0 rounded-[22px] bg-gray-50 px-6 py-[22px]">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-[22px]">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Photo pro={pro} uploading={imageUploading} onPhoto={onPhoto} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-almanac-serif mb-0 text-[40px] leading-[1.02]">{pro.full_name}</h1>
              <StatusBadge label={STATUS_LABEL[pro.status] ?? pro.status} />
            </div>
            <p className="mt-1.5 break-words text-[13px] text-muted">
              Registrado el {formatAdminDate(pro.created_at)} · haravital.app/p/{pro.slug}
            </p>
            <p className="mt-2 flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13.5px]">
              <span>
                <span className="text-muted">Tier</span> {destacado ? 'Destacado' : 'Básico'}
              </span>
              <span>
                <span className="text-muted">Ranking</span> {pro.ranking_score ? String(pro.ranking_score) : 'Sin ranking'}
              </span>
              <span>
                <span className="text-muted">Rating</span> <span className="text-warning-dark">★</span> {rating}
              </span>
            </p>
          </div>
        </div>
        <AdminScoreRing total={total} />
      </div>
      <div className="mt-[18px] border-t border-foreground/8 pt-4">
        <ActionBar {...props} />
      </div>
    </div>
  )
}
