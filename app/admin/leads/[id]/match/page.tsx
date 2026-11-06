// Hara Vital - Admin Match Creation (design 13, Crear match)
// Purpose: Select 3 professionals and create a match with ranks + reasons
// Security: Admin-only via middleware

'use client'

import { useState, useEffect, type FormEvent } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import { ADMIN_BACK_LINK, ADMIN_BTN_PRIMARY, ADMIN_BTN_SECONDARY, AdminError, AdminSkeleton } from '@/app/admin/components/AdminUI'
import { type Lead, leadTitle } from '@/app/admin/leads/shared'
import { logError } from '@/lib/monitoring'

interface Professional {
  id: string
  slug: string
  name: string
  specialties: string[]
  status: string
  city: string | null
}

interface SelectedProfessional {
  professional_id: string
  rank: number
  reasons: string[]
}

const RANKS = [1, 2, 3]
const FIELD_CLASS = 'w-full rounded-[13px] bg-background px-[13px] py-3 text-[14px] text-foreground outline-none placeholder:text-gray-500'

/** First validation error for the picked professionals and reasons, or '' when the form is ready. */
function validateSelection(selected: SelectedProfessional[]): string {
  const ids = selected.map((s) => s.professional_id).filter(Boolean)
  if (ids.length !== 3) return 'Seleccioná 3 profesionales.'
  if (new Set(ids).size !== 3) return 'Los 3 profesionales deben ser distintos.'
  if (selected.some((s) => !s.reasons.some((r) => r.trim()))) return 'Agregá al menos una razón para cada profesional.'
  return ''
}

export default function CreateMatchPage({ params }: { params: { id: string } }) {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successCode, setSuccessCode] = useState<string | null>(null)
  const [selected, setSelected] = useState<SelectedProfessional[]>(
    RANKS.map((rank) => ({ professional_id: '', rank, reasons: ['', '', ''] }))
  )

  useEffect(() => {
    async function load() {
      try {
        const [prosRes, leadRes] = await Promise.all([fetch('/api/admin/professionals'), fetch(`/api/admin/leads/${params.id}`)])
        if (!prosRes.ok) throw new Error('Error al cargar profesionales')
        setProfessionals((await prosRes.json()).professionals || [])
        // The lead only feeds the title line; the form works without it
        if (leadRes.ok) setLead((await leadRes.json()).lead ?? null)
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), { source: 'CreateMatchPage.load' })
        setError('Error al cargar profesionales')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  function update(index: number, change: (s: SelectedProfessional) => SelectedProfessional) {
    setSelected((prev) => prev.map((s, i) => (i === index ? change(s) : s)))
    setError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const problem = validateSelection(selected)
    if (problem) return setError(problem)

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: params.id,
          recommendations: selected.map((s) => ({
            professional_id: s.professional_id,
            rank: s.rank,
            reasons: s.reasons.filter((r) => r.trim().length > 0),
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear el match')
      setSuccessCode(data.tracking_code)
    } catch (err: unknown) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'CreateMatchPage.handleSubmit' })
      setError(err instanceof Error ? err.message : 'Error al crear el match')
    } finally {
      setSubmitting(false)
    }
  }

  const active = professionals.filter((p) => p.status === 'active')
  const backTitle = lead ? leadTitle(lead) : 'Solicitud'

  return (
    <AdminLayout>
      <Link href={`/admin/leads/${params.id}`} className={ADMIN_BACK_LINK}>
        ← {backTitle}
      </Link>
      <div className="mb-[18px]">
        <h1 className="font-almanac-serif mb-0 text-[46px] leading-none tracking-[-0.5px]">
          Crear <span className="italic text-brand">match</span>
        </h1>
        {lead && lead.intent_tags.length > 0 && <p className="mt-[7px] text-[14px] text-muted">{lead.intent_tags.join(' · ')}</p>}
      </div>

      {loading ? (
        <AdminSkeleton />
      ) : successCode ? (
        <MatchCreated code={successCode} />
      ) : (
        <form onSubmit={handleSubmit} data-testid="create-match-page">
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-3">
            {selected.map((sel, index) => (
              <PositionCard
                key={sel.rank}
                sel={sel}
                professionals={active}
                onPick={(id) => update(index, (s) => ({ ...s, professional_id: id }))}
                onReason={(j, v) => update(index, (s) => ({ ...s, reasons: s.reasons.map((r, k) => (k === j ? v : r)) }))}
              />
            ))}
          </div>

          {error && <AdminError text={error} />}

          <div className="mt-4 flex justify-end gap-2">
            <Link href={`/admin/leads/${params.id}`} className={ADMIN_BTN_SECONDARY}>
              Cancelar
            </Link>
            <button type="submit" disabled={submitting} className={ADMIN_BTN_PRIMARY} data-testid="submit-match-button">
              {submitting ? 'Creando match…' : 'Crear match'}
            </button>
          </div>
        </form>
      )}
    </AdminLayout>
  )
}

interface PositionCardProps {
  sel: SelectedProfessional
  professionals: Professional[]
  onPick: (id: string) => void
  onReason: (index: number, value: string) => void
}

function PositionCard({ sel, professionals, onPick, onReason }: PositionCardProps) {
  const picked = professionals.find((p) => p.id === sel.professional_id)
  const info = picked ? [picked.city, ...picked.specialties.slice(0, 2)].filter(Boolean).join(' · ') : ''

  return (
    <div className="min-w-0 rounded-[22px] bg-gray-50 px-[22px] py-5" data-testid={`rank-${sel.rank}-section`}>
      <label htmlFor={`professional-select-${sel.rank}`} className="text-[10.5px] font-medium tracking-[2.2px] text-brand">
        POSICIÓN {sel.rank}
      </label>
      <select
        id={`professional-select-${sel.rank}`}
        value={sel.professional_id}
        onChange={(e) => onPick(e.target.value)}
        data-testid={`professional-select-${sel.rank}`}
        className={`${FIELD_CLASS} mt-2.5 cursor-pointer text-[14.5px]`}
      >
        <option value="">Elegí un profesional</option>
        {professionals.map((p) => (
          <option key={p.id} value={p.id}>
            {p.specialties[0] ? `${p.name} · ${p.specialties[0]}` : p.name}
          </option>
        ))}
      </select>
      {info && <p className="mt-2 text-[12.5px] text-gray-700">{info}</p>}

      <p className="mb-2 mt-4 text-[13px] font-medium">Razones</p>
      <div className="flex flex-col gap-[7px]">
        {sel.reasons.map((reason, j) => (
          <input
            key={j}
            type="text"
            value={reason}
            onChange={(e) => onReason(j, e.target.value)}
            data-testid={`reason-${sel.rank}-${j}`}
            aria-label={`Razón ${j + 1} para la posición ${sel.rank}`}
            placeholder={j === 0 ? 'Por qué pensaste en esta persona' : 'Otra razón (opcional)'}
            className={FIELD_CLASS}
          />
        ))}
      </div>
    </div>
  )
}

function MatchCreated({ code }: { code: string }) {
  return (
    <div className="relative max-w-[560px] overflow-hidden rounded-[26px] bg-foreground p-7 text-background">
      <img src="/assets/almanac/tres_puntos-cream.svg" alt="" className="h-[29px] w-[30px] object-contain" />
      <h2 className="font-almanac-serif mb-0 mt-3.5 text-[36px] leading-[1.05]">
        Match <span className="italic">creado</span>
      </h2>
      <p className="font-almanac-serif mt-2.5 text-[30px] text-brand-weak">{code}</p>
      <p className="mt-1.5 text-[14px] leading-normal text-background/80">
        La carta ya está en{' '}
        <a href={`/r/${code}`} target="_blank" rel="noopener noreferrer" className="underline">
          haravital.app/r/{code}
        </a>
      </p>
      <div className="mt-[18px] flex">
        <Link href="/admin/leads" className="rounded-[13px] bg-brand-weak px-[18px] py-[11px] text-[14px] font-medium text-brand-dark">
          Volver a solicitudes
        </Link>
      </div>
    </div>
  )
}
