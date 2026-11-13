// Body cards of the admin professional review (design 13): Sobre, Perfil profesional,
// Puntaje del perfil (editable criteria) and Datos de contacto. Presentational only.

'use client'

import { useState, type ReactNode } from 'react'
import { AdminCard, AdminCardTitle, EmptyText } from '@/app/admin/components/AdminUI'
import { MODALITY_MAP, SERVICE_TYPE_MAP } from '@/lib/design-constants'
import type { Practice } from '@/lib/practices'
import type { ProfileScore } from '@/lib/profile-score'
import { PracticeMapper } from './PracticeMapper'

export interface ReviewProfessional {
  email: string
  whatsapp: string | null
  show_email: boolean
  show_whatsapp: boolean
  country: string
  city: string | null
  online_only: boolean
  modality: string[]
  specialties: string[]
  practices: string[]
  bio: string | null
  short_description: string | null
  experience_description: string | null
  instagram: string | null
  service_type: string[]
  price_range_min: number | null
  price_range_max: number | null
  currency: string
  accepting_new_clients: boolean
  offers_courses_online: boolean
  courses_presencial_location: string | null
  latitude?: number | null
  longitude?: number | null
}

const LABEL = 'text-[12.5px] text-muted'

/** Value or the muted italic empty text. */
function Val({ v, empty }: { v: string | null | undefined; empty: string }) {
  return v ? <>{v}</> : <EmptyText>{empty}</EmptyText>
}

function KeyRow({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-foreground/8 py-[11px] text-[14.5px] leading-[1.45]">
      <span className="flex-none text-muted">{k}</span>
      <span className="min-w-0 break-words text-right">{children}</span>
    </div>
  )
}

function Chips({ items, tone }: { items: string[]; tone: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className={`rounded-full px-[11px] py-[5px] text-[12.5px] font-medium ${tone}`}>
          {t}
        </span>
      ))}
    </div>
  )
}

export function AboutCard({ pro }: { pro: ReviewProfessional }) {
  const rows: Array<[string, string | null, string]> = [
    ['Descripción corta', pro.short_description, 'Sin descripción corta'],
    ['Biografía', pro.bio, 'Sin biografía'],
    ['Experiencia', pro.experience_description, 'No completó su experiencia'],
  ]
  const services = (pro.service_type ?? []).map((s) => SERVICE_TYPE_MAP[s] || s)
  return (
    <AdminCard>
      <AdminCardTitle>
        Sobre el/la <span className="italic">profesional</span>
      </AdminCardTitle>
      {rows.map(([k, v, empty]) => (
        <div key={k} className="border-b border-foreground/8 py-3">
          <p className={LABEL}>{k}</p>
          <p className="mt-[3px] whitespace-pre-line text-[15px] leading-[1.55]">
            <Val v={v} empty={empty} />
          </p>
        </div>
      ))}
      <p className={`${LABEL} mb-[7px] mt-3`}>Tipo de servicio</p>
      {services.length > 0 ? <Chips items={services} tone="bg-surface-2" /> : <EmptyText className="text-[14px]">No indicó</EmptyText>}
    </AdminCard>
  )
}

function priceRange(pro: ReviewProfessional): string {
  const { price_range_min: min, price_range_max: max, currency } = pro
  if (min && max) return `${currency} ${min.toLocaleString('es-AR')} a ${max.toLocaleString('es-AR')}`
  if (min) return `${currency} desde ${min.toLocaleString('es-AR')}`
  if (max) return `${currency} hasta ${max.toLocaleString('es-AR')}`
  return ''
}

interface ProfileCardProps {
  pro: ReviewProfessional
  catalog: Practice[]
  onPractices: (keys: string[]) => void
}

export function ProfileCard({ pro, catalog, onPractices }: ProfileCardProps) {
  const labels = Object.fromEntries(catalog.map((p) => [p.key, p.label]))
  const saved = pro.practices.map((k) => labels[k] ?? k)
  const modality = pro.modality.map((m) => MODALITY_MAP[m] || m).join(', ')
  return (
    <AdminCard>
      <AdminCardTitle>Perfil profesional</AdminCardTitle>
      <p className={`${LABEL} mb-2 mt-1`}>Prácticas que escribió</p>
      <PracticeMapper freeTextEntries={pro.specialties} catalogPractices={catalog} initialPractices={pro.practices} onChange={onPractices} />
      <p className={`${LABEL} mb-[7px] mt-4`}>Prácticas guardadas</p>
      {saved.length > 0 ? <Chips items={saved} tone="bg-brand-weak text-brand-dark" /> : <EmptyText className="text-[14px]">Ninguna todavía</EmptyText>}
      <div className="mt-3">
        <KeyRow k="Modalidad">
          <Val v={modality} empty="No indicó" />
        </KeyRow>
        <KeyRow k="Acepta nuevos clientes">{pro.accepting_new_clients ? 'Sí' : 'No'}</KeyRow>
        <KeyRow k="Cursos online">{pro.offers_courses_online ? 'Sí' : 'No'}</KeyRow>
        <KeyRow k="Rango de precios">
          <Val v={priceRange(pro)} empty="Sin precio" />
        </KeyRow>
        <KeyRow k="Cursos presenciales en">
          <Val v={pro.courses_presencial_location} empty="No indicó" />
        </KeyRow>
      </div>
    </AdminCard>
  )
}

interface ContactCardProps {
  pro: ReviewProfessional
  savingVisibility: boolean
  onVisibilityChange: (field: 'show_email' | 'show_whatsapp', visible: boolean) => void
}

export function ContactCard({ pro, savingVisibility, onVisibilityChange }: ContactCardProps) {
  const coords = pro.latitude != null && pro.longitude != null ? `${pro.latitude.toFixed(4)}, ${pro.longitude.toFixed(4)}` : ''
  const ig = pro.instagram ? `@${pro.instagram.replace(/^@/, '')}` : ''
  return (
    <AdminCard>
      <AdminCardTitle>Datos de contacto</AdminCardTitle>
      <KeyRow k="Email">
        <Val v={pro.email} empty="Sin email" />
      </KeyRow>
      <KeyRow k="WhatsApp">
        <Val v={pro.whatsapp} empty="Sin WhatsApp" />
      </KeyRow>
      <fieldset className="space-y-2 border-b border-foreground/8 pb-3" disabled={savingVisibility}>
        <legend className="mb-2 pt-3 text-sm font-medium">Contacto público</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pro.show_email}
            onChange={(event) => onVisibilityChange('show_email', event.target.checked)}
          />
          Mostrar email
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pro.show_whatsapp}
            onChange={(event) => onVisibilityChange('show_whatsapp', event.target.checked)}
          />
          Mostrar WhatsApp
        </label>
      </fieldset>
      <KeyRow k="Ubicación">
        <Val v={pro.city ? `${pro.city}, ${pro.country}` : ''} empty="Sin ubicación" />
      </KeyRow>
      <KeyRow k="Dirección exacta">
        <Val v={coords} empty="Sin dirección: usamos el centro de la ciudad" />
      </KeyRow>
      <KeyRow k="Solo online">{pro.online_only ? 'Sí' : 'No'}</KeyRow>
      <KeyRow k="Instagram">
        <Val v={ig} empty="Sin Instagram" />
      </KeyRow>
    </AdminCard>
  )
}

interface CriteriaCardProps {
  score: ProfileScore
  overrides: Record<string, number>
  onSet: (key: string, value: number) => void
  onReset: (key: string) => void
}

const ROUND_BTN = 'flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-surface-2 text-[18px] leading-none'

/** Score criteria; tap one to adjust it by hand with − and +, "Auto" clears the manual value. */
export function CriteriaCard({ score, overrides, onSet, onReset }: CriteriaCardProps) {
  const [editing, setEditing] = useState<string | null>(null)
  return (
    <AdminCard>
      <div className="flex items-baseline gap-2.5">
        <AdminCardTitle>Puntaje del perfil</AdminCardTitle>
        <span className="text-[12px] text-gray-500">preliminar</span>
      </div>
      <p className={LABEL}>Tocá un criterio para ajustarlo a mano.</p>
      <div className="mt-1.5">
        {score.breakdown.map((c) => (
          <div key={c.key} className="border-b border-foreground/8 py-[9px]">
            {editing === c.key ? (
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-[14px] font-medium">{c.label}</span>
                <button type="button" aria-label={`Bajar ${c.label}`} onClick={() => onSet(c.key, Math.max(0, c.earned - 1))} className={ROUND_BTN}>
                  −
                </button>
                <span className="font-almanac-serif w-11 text-center text-[22px]" data-testid={`criterion-${c.key}-points`}>
                  {c.earned}
                </span>
                <button type="button" aria-label={`Subir ${c.label}`} onClick={() => onSet(c.key, Math.min(c.weight, c.earned + 1))} className={ROUND_BTN}>
                  +
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReset(c.key)
                    setEditing(null)
                  }}
                  className="px-1 text-[12.5px] font-medium text-muted"
                >
                  Auto
                </button>
                <button type="button" onClick={() => setEditing(null)} className="text-[13px] font-medium text-brand-dark">
                  Listo
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditing(c.key)} className="flex w-full items-center gap-3 text-left">
                <span className="flex min-w-0 flex-1 items-center gap-[7px] text-[14px]">
                  {c.label}
                  {overrides[c.key] != null && (
                    <span className="rounded-md bg-brand-weak px-1.5 py-px text-[10.5px] font-medium text-brand-dark">manual</span>
                  )}
                </span>
                <span className="h-1 w-16 flex-none overflow-hidden rounded-sm bg-foreground/10">
                  <span className="block h-full bg-brand" style={{ width: `${(c.earned / c.weight) * 100}%` }} />
                </span>
                <span className="w-12 flex-none text-right text-[14px] font-medium">
                  {c.earned}
                  <span className="text-gray-500">/{c.weight}</span>
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="flex justify-between pt-3 text-[14.5px] font-medium">
        <span>Total</span>
        <span>{score.total} / 100</span>
      </p>
    </AdminCard>
  )
}
