// Admin — Reviews Moderation
// Lists all reviews (visible + hidden) with an is_hidden toggle.
// Hiding a review fires the DB trigger → aggregates recompute → ranking updates.

'use client'

import { useState, useEffect, useMemo } from 'react'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { Chip } from '@/app/components/ui/Chip'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { AdminFilterBar } from '@/app/admin/components/AdminFilterBar'
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

const VISIBILITY_OPTIONS = [
  { value: 'visible', label: 'Visibles' },
  { value: 'hidden',  label: 'Ocultas' },
]

export default function AdminReviewsPage() {
  const [reviews,     setReviews]     = useState<Review[]>([])
  const [loading,     setLoading]     = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [statusValue, setStatusValue] = useState('')
  const [toggling,    setToggling]    = useState<string | null>(null)

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
      if (res.ok) {
        setReviews(prev => prev.map(r => r.id === review.id ? { ...r, is_hidden: !r.is_hidden } : r))
      }
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'AdminReviewsPage.toggleHidden' })
    } finally {
      setToggling(null)
    }
  }

  const filteredReviews = useMemo(() => {
    const q = searchValue.toLowerCase()
    return reviews.filter(r => {
      const matchesSearch = !q || r.professional_name.toLowerCase().includes(q) || (r.text ?? '').toLowerCase().includes(q)
      const matchesStatus = !statusValue
        || (statusValue === 'visible' && !r.is_hidden)
        || (statusValue === 'hidden' && r.is_hidden)
      return matchesSearch && matchesStatus
    })
  }, [reviews, searchValue, statusValue])

  if (loading) {
    return <AdminLayout><div className="flex items-center justify-center py-20 text-muted">Cargando...</div></AdminLayout>
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Reseñas</h2>
          <p className="text-sm text-muted mt-1">{reviews.length} en total</p>
        </div>

        <AdminFilterBar
          searchPlaceholder="Buscar por profesional o texto..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          statusOptions={VISIBILITY_OPTIONS}
          statusValue={statusValue}
          onStatusChange={setStatusValue}
          resultCount={filteredReviews.length}
        />

        {filteredReviews.length === 0 ? (
          <GlassCard>
            <EmptyState
              title={reviews.length === 0 ? 'Sin reseñas' : 'Sin resultados'}
              description={reviews.length === 0 ? 'Todavía no hay reseñas.' : 'Probá con otra búsqueda.'}
            />
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {filteredReviews.map(review => (
              <GlassCard key={review.id}>
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">{review.professional_name}</p>
                      <span className="text-xs text-muted">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                      {review.reviewer_name && (
                        <span className="text-xs text-muted">— {review.reviewer_name}</span>
                      )}
                    </div>
                    {review.text && (
                      <p className="text-sm text-foreground italic mb-1">"{review.text}"</p>
                    )}
                    <p className="text-xs text-muted">
                      {new Date(review.submitted_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Chip
                      variant={review.is_hidden ? 'warning' : 'success'}
                      label={review.is_hidden ? 'Oculta' : 'Visible'}
                      className="text-[11px] px-2 py-0.5"
                    />
                    <button
                      onClick={() => toggleHidden(review)}
                      disabled={toggling === review.id}
                      className="text-xs text-brand hover:text-brand/80 font-medium disabled:opacity-50"
                    >
                      {toggling === review.id ? '...' : review.is_hidden ? 'Mostrar' : 'Ocultar'}
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
