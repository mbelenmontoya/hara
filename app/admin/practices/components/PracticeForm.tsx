// PracticeForm (design 13 look): shared client form for create + edit on /admin/practices.
// Mode-aware: in create mode `key` is editable and `slug` auto-derives from
// it (until user edits slug manually); in edit mode `key` is read-only.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ADMIN_BTN_PRIMARY, ADMIN_BTN_SECONDARY, AdminError } from '@/app/admin/components/AdminUI'
import { SPECIALTY_MAP } from '@/lib/design-constants'

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Normalizes a string to kebab-case slug shape: lowercase, alphanumerics
 *  and hyphens only, no leading/trailing hyphens. Used by the slug
 *  auto-derive on create mode so typing "Reiki!" yields "reiki". */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface InitialPractice {
  key: string
  label: string
  slug: string
  sort_order: number
  active: boolean
  specialties?: string[]
  aliases?: string[]
}

interface PracticeFormProps {
  mode: 'create' | 'edit'
  initial?: InitialPractice
}

function isValid(values: {
  key: string
  label: string
  slug: string
  sort_order: number
}): boolean {
  if (values.key.length < 2 || values.key.length > 60 || !KEBAB_RE.test(values.key)) return false
  if (values.label.trim().length < 2 || values.label.trim().length > 80) return false
  if (values.slug.length < 2 || values.slug.length > 60 || !KEBAB_RE.test(values.slug)) return false
  if (!Number.isInteger(values.sort_order) || values.sort_order < 0) return false
  return true
}

export function PracticeForm({ mode, initial }: PracticeFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // In create mode, pre-fill label (and auto-derive key/slug) from ?label= param
  const suggestedLabel = mode === 'create' ? (searchParams.get('label') ?? '') : ''
  const suggestedKey   = mode === 'create' ? normalizeSlug(suggestedLabel) : ''

  const [key, setKey] = useState(initial?.key ?? suggestedKey)
  const [label, setLabel] = useState(initial?.label ?? suggestedLabel)
  const [slug, setSlug] = useState(initial?.slug ?? suggestedKey)
  const [sortOrder, setSortOrder] = useState<number>(initial?.sort_order ?? 0)
  const [active, setActive] = useState(initial?.active ?? true)
  const [specialties, setSpecialties] = useState<string[]>(initial?.specialties ?? [])
  // In edit mode, slug is locked from auto-derive (treat as if user touched it).
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = isValid({ key, label, slug, sort_order: sortOrder })

  function handleKeyChange(value: string) {
    setKey(value)
    if (!slugTouched) {
      setSlug(normalizeSlug(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value)
    setSlugTouched(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || submitting) return
    setSubmitting(true)
    setError(null)

    const body = {
      label: label.trim(),
      slug,
      sort_order: sortOrder,
      active,
      specialties,
      ...(mode === 'create' ? { key } : {}),
    }

    const url = mode === 'create' ? '/api/admin/practices' : `/api/admin/practices/${key}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string }
        setError(errBody.error ?? 'Error al guardar la práctica')
        setSubmitting(false)
        return
      }
      router.push('/admin/practices')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
      setSubmitting(false)
    }
  }

  const field = 'w-full rounded-[13px] bg-background px-[13px] py-3 text-[15px] text-foreground outline-none placeholder:text-gray-500 disabled:opacity-60'
  const mono = `${field} font-mono text-[13.5px]`
  const labelCls = 'text-[13.5px] font-medium'
  const hint = 'text-[12px] leading-[1.4] text-muted'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 font-almanac">
      <div className="flex flex-col gap-[7px]">
        <label htmlFor="practice-label" className={labelCls}>Nombre</label>
        <input id="practice-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej: Reiki" className={field} />
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_90px]">
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="practice-key" className={labelCls}>Key</label>
          <input
            id="practice-key"
            type="text"
            value={key}
            onChange={(e) => handleKeyChange(e.target.value)}
            disabled={mode === 'edit'}
            placeholder="reiki"
            className={mono}
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="practice-slug" className={labelCls}>Slug</label>
          <input id="practice-slug" type="text" value={slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder="reiki" className={mono} />
        </div>
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="practice-sort" className={labelCls}>Orden</label>
          <input
            id="practice-sort"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
            className={field}
          />
        </div>
      </div>
      <p className={`${hint} -mt-1.5`}>
        {mode === 'edit'
          ? 'La key no se puede cambiar después de creada. Para renombrar, desactivá esta y creá una nueva.'
          : 'La key no cambia después. Solo minúsculas, números y guiones.'}
      </p>

      <label className="flex cursor-pointer items-center gap-[11px] text-[14.5px]">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5 flex-none accent-brand-dark" />
        Activa (visible en el picker público)
      </label>

      {mode === 'edit' && (
        <div className="flex flex-col gap-[7px]">
          <p className={labelCls}>Alias mapeados</p>
          {initial?.aliases && initial.aliases.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {initial.aliases.map(alias => (
                <span key={alias} className="rounded-full bg-surface-2 px-[11px] py-[5px] text-[12.5px] font-medium">
                  {alias}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] italic text-gray-500">Sin alias</p>
          )}
          <p className={hint}>Lo que escriben los profesionales y debería contar como esta práctica.</p>
        </div>
      )}

      <fieldset className="flex flex-col gap-[7px]">
        <legend className={`${labelCls} mb-[7px]`}>Especialidades que cubre</legend>
        <div className="grid grid-cols-1 gap-x-3.5 gap-y-1 md:grid-cols-2">
          {Object.entries(SPECIALTY_MAP).map(([sKey, sLabel]) => (
            <label key={sKey} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[14px]">
              <input
                type="checkbox"
                checked={specialties.includes(sKey)}
                onChange={(e) => {
                  setSpecialties(prev =>
                    e.target.checked ? [...prev, sKey] : prev.filter(s => s !== sKey)
                  )
                }}
                className="h-5 w-5 flex-none accent-brand-dark"
              />
              {sLabel}
            </label>
          ))}
        </div>
        <p className={hint}>Definen en qué tarjetas del inicio aparece.</p>
      </fieldset>

      {error && <AdminError text={error} />}

      <div className="mt-1 flex justify-end gap-2">
        <Link href="/admin/practices" className={ADMIN_BTN_SECONDARY}>
          Cancelar
        </Link>
        <button type="submit" disabled={!valid || submitting} className={ADMIN_BTN_PRIMARY}>
          {mode === 'create' ? 'Crear práctica' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
