// PracticeForm — shared client form for create + edit on /admin/practices.
// Mode-aware: in create mode `key` is editable and `slug` auto-derives from
// it (until user edits slug manually); in edit mode `key` is read-only.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/app/components/ui/Alert'
import { Button } from '@/app/components/ui/Button'

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
  const [key, setKey] = useState(initial?.key ?? '')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [sortOrder, setSortOrder] = useState<number>(initial?.sort_order ?? 0)
  const [active, setActive] = useState(initial?.active ?? true)
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="practice-key" className="text-sm font-medium text-foreground">
          Clave (key)
        </label>
        <input
          id="practice-key"
          type="text"
          value={key}
          onChange={(e) => handleKeyChange(e.target.value)}
          disabled={mode === 'edit'}
          placeholder="ej: reiki"
          className="rounded-xl border border-outline bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
        />
        <span className="text-xs text-muted">
          {mode === 'edit'
            ? 'No se puede modificar después de creada. Para renombrar: desactivá esta y creá una nueva.'
            : 'Identificador inmutable. Solo minúsculas, dígitos y guiones.'}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="practice-label" className="text-sm font-medium text-foreground">
          Etiqueta
        </label>
        <input
          id="practice-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="ej: Reiki"
          className="rounded-xl border border-outline bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="practice-slug" className="text-sm font-medium text-foreground">
          Slug
        </label>
        <input
          id="practice-slug"
          type="text"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="ej: reiki"
          className="rounded-xl border border-outline bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="practice-sort" className="text-sm font-medium text-foreground">
          Orden (sort_order)
        </label>
        <input
          id="practice-sort"
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
          className="rounded-xl border border-outline bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <span className="text-sm text-foreground">Activa (visible en el picker público)</span>
      </label>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={!valid || submitting}>
          {mode === 'create' ? 'Crear' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
