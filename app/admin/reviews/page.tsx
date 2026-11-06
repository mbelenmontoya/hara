// Admin, Reviews Moderation (design 13)
// Lists all reviews (visible + hidden). Hiding asks first; it fires the DB trigger, so the
// professional's rating and ranking recompute. Opening the page marks every review read.

'use client'

import { useState, useEffect, useMemo } from 'react'
import { AdminLayout } from '@/app/components/AdminLayout'
import { Modal } from '@/app/components/ui/Modal'
import { AdminFilterBar } from '@/app/admin/components/AdminFilterBar'
import { useAdminToast } from '@/app/admin/components/AdminToast'
import {
  ADMIN_BTN_SECONDARY,
  AdminEmpty,
  AdminNoResults,
  AdminSkeleton,
  AdminTitle,
  EmptyText,
  StatusBadge,
  formatAdminDate,
} from '@/app/admin/components/AdminUI'
import { logError } from '@/lib/monitoring'

interface Review {
  id: string
  professional_id: string
  professional_name: string
  rating: number
  text: string | null
  reviewer_name: string | null
  submitted_at: string
  is_hidden: boolean
}

const MAX_STARS = 5

export default function AdminReviewsPage() {
  // The toast lives inside AdminLayout, so the page body is a child of it
  return (
    <AdminLayout markRead={{ kind: 'reviews' }}>
      <ReviewsBody />
    </AdminLayout>
  )
}

function ReviewsBody() {
  const toast = useAdminToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [statusValue, setStatusValue] = useState('visible')
  const [toggling, setToggling] = useState<string | null>(null)
  const [hiding, setHiding] = useState<Review | null>(null)

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch('/api/admin/reviews')
        if (!res.ok) throw new Error('Error al cargar reseñas')
        const data = await res.json()
        setReviews(data.reviews || [])
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), { source: 'AdminReviewsPage' })
      } finally {
        setLoading(false)
      }
    }
    fetchReviews()
  }, [])

  async function toggleHidden(review: Review) {
    setToggling(review.id)
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: !review.is_hidden }),
      })
      if (!res.ok) return toast.show('No pudimos cambiar la reseña. Intentá de nuevo.', 'err')
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, is_hidden: !r.is_hidden } : r)))
      toast.show(review.is_hidden ? 'Reseña visible otra vez.' : 'Reseña oculta.')
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'AdminReviewsPage.toggleHidden' })
      toast.show('Error de red al cambiar la reseña.', 'err')
    } finally {
      setToggling(null)
      setHiding(null)
    }
  }

  const inStatus = useMemo(() => reviews.filter((r) => (statusValue === 'hidden' ? r.is_hidden : !r.is_hidden)), [reviews, statusValue])
  const filtered = useMemo(() => {
    const q = searchValue.toLowerCase()
    return inStatus.filter(
      (r) =>
        !q ||
        r.professional_name.toLowerCase().includes(q) ||
        (r.reviewer_name ?? '').toLowerCase().includes(q) ||
        (r.text ?? '').toLowerCase().includes(q)
    )
  }, [inStatus, searchValue])

  const visibleCount = reviews.filter((r) => !r.is_hidden).length
  const options = [
    { value: 'visible', label: `Visibles (${visibleCount})` },
    { value: 'hidden', label: `Ocultas (${reviews.length - visibleCount})` },
  ]

  return (
    <>
      <AdminTitle sub="Ocultar una reseña recalcula el rating y el ranking del profesional.">Reseñas</AdminTitle>

      <AdminFilterBar
        searchPlaceholder="Buscar por nombre, profesional o texto..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        statusOptions={options}
        statusValue={statusValue}
        onStatusChange={setStatusValue}
        resultCount={filtered.length}
        allLabel={null}
      />

      {loading ? (
        <AdminSkeleton />
      ) : inStatus.length === 0 ? (
        <AdminEmpty title={statusValue === 'hidden' ? 'Sin reseñas ocultas' : 'Sin reseñas visibles'} text="No hay reseñas en este estado." />
      ) : filtered.length === 0 ? (
        <AdminNoResults text="Ninguna reseña coincide con esa búsqueda." onClear={() => setSearchValue('')} />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {filtered.map((review) => (
            <div key={review.id} className="flex min-w-0 flex-col gap-2 rounded-[20px] bg-gray-50 px-5 py-[18px]">
              <div className="flex items-center gap-2">
                <span className="text-[14.5px] font-medium">{review.reviewer_name || <EmptyText>Sin nombre</EmptyText>}</span>
                <span className="min-w-0 truncate text-[13px] text-muted">→ {review.professional_name}</span>
                <span className="flex-1" />
                <StatusBadge label={review.is_hidden ? 'Oculta' : 'Visible'} />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] tracking-[1.5px]" aria-label={`${review.rating} de ${MAX_STARS} estrellas`}>
                  <span className="text-warning-dark">{'★'.repeat(review.rating)}</span>
                  <span className="text-foreground/15">{'★'.repeat(MAX_STARS - review.rating)}</span>
                </span>
                <span className="text-[12.5px] text-muted">{formatAdminDate(review.submitted_at)}</span>
              </div>
              {review.text ? (
                <p className="font-almanac-serif text-[18px] italic leading-[1.4] text-gray-800">“{review.text}”</p>
              ) : (
                <EmptyText className="text-[14px]">Sin comentario</EmptyText>
              )}
              <div className="mt-0.5 flex justify-end">
                <button
                  type="button"
                  disabled={toggling === review.id}
                  onClick={() => (review.is_hidden ? toggleHidden(review) : setHiding(review))}
                  className={ADMIN_BTN_SECONDARY}
                >
                  {review.is_hidden ? 'Mostrar' : 'Ocultar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hiding && (
        <Modal
          open
          onClose={() => !toggling && setHiding(null)}
          title="¿Ocultar esta reseña?"
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setHiding(null)} disabled={!!toggling} className={ADMIN_BTN_SECONDARY}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => toggleHidden(hiding)}
                disabled={!!toggling}
                className="inline-flex flex-none rounded-[14px] bg-danger-dark px-[17px] py-[11px] text-[14px] font-medium text-gray-50 disabled:opacity-60"
              >
                Ocultar
              </button>
            </div>
          }
        >
          <p className="text-[14px] leading-normal text-gray-700">
            Deja de verse en el perfil de {hiding.professional_name}, y su rating y su ranking se recalculan. Podés volver a mostrarla cuando quieras.
          </p>
        </Modal>
      )}
    </>
  )
}
