// Hará Match — Admin Match Creation
// Purpose: Select 3 professionals and create a match with ranks + reasons
// Security: Admin-only via middleware

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { Button } from '@/app/components/ui/Button'
import { Alert } from '@/app/components/ui/Alert'
import { SectionHeader } from '@/app/components/ui/SectionHeader'
import { logError } from '@/lib/monitoring'

interface Professional {
  id: string
  slug: string
  name: string
  specialty: string
  status: string
}

interface SelectedProfessional {
  professional_id: string
  rank: number
  reasons: string[]
}

export default function CreateMatchPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successCode, setSuccessCode] = useState<string | null>(null)

  const [selected, setSelected] = useState<SelectedProfessional[]>([
    { professional_id: '', rank: 1, reasons: ['', '', ''] },
    { professional_id: '', rank: 2, reasons: ['', '', ''] },
    { professional_id: '', rank: 3, reasons: ['', '', ''] },
  ])

  useEffect(() => {
    fetchProfessionals()
  }, [])

  async function fetchProfessionals() {
    try {
      const res = await fetch('/api/debug/professionals')
      if (!res.ok) throw new Error('Error al cargar profesionales')
      const data = await res.json()
      setProfessionals(data.professionals || [])
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'CreateMatchPage.fetchProfessionals' })
      setError('Error al cargar profesionales')
    } finally {
      setLoading(false)
    }
  }

  function updateProfessional(index: number, professionalId: string) {
    const newSelected = [...selected]
    newSelected[index].professional_id = professionalId
    setSelected(newSelected)
  }

  function updateReason(index: number, reasonIndex: number, value: string) {
    const newSelected = [...selected]
    newSelected[index].reasons[reasonIndex] = value
    setSelected(newSelected)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const professionalIds = selected.map((s) => s.professional_id).filter(Boolean)
    if (professionalIds.length !== 3) {
      setError('Seleccioná 3 profesionales')
      return
    }
    if (new Set(professionalIds).size !== 3) {
      setError('Los 3 profesionales deben ser distintos')
      return
    }
    for (const sel of selected) {
      const filled = sel.reasons.filter((r) => r.trim().length > 0)
      if (filled.length === 0) {
        setError('Agregá al menos una razón para cada profesional')
        return
      }
    }

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

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear el match')
      }

      const data = await res.json()
      setSuccessCode(data.tracking_code)
    } catch (err: unknown) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'CreateMatchPage.handleSubmit' })
      setError(err instanceof Error ? err.message : 'Error al crear el match')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-muted">Cargando...</div>
      </AdminLayout>
    )
  }

  if (successCode) {
    return (
      <AdminLayout>
        <div className="max-w-lg mx-auto space-y-4">
          <Alert variant="success" title="Match creado">
            Código de seguimiento: <span className="font-mono font-medium">{successCode}</span>
          </Alert>
          <Button variant="secondary" onClick={() => router.push('/admin/leads')}>
            Volver a solicitudes
          </Button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-4" data-testid="create-match-page">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Crear match para solicitud
          </h2>
          <p className="text-xs text-muted mt-1 font-mono">{params.id}</p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {selected.map((sel, index) => (
            <div key={index} data-testid={`rank-${sel.rank}-section`}>
            <GlassCard>
              <SectionHeader className="mb-4">{`Posición ${sel.rank}`}</SectionHeader>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Seleccionar profesional
                  </label>
                  <select
                    value={sel.professional_id}
                    onChange={(e) => updateProfessional(index, e.target.value)}
                    data-testid={`professional-select-${sel.rank}`}
                    className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                    required
                  >
                    <option value="">-- Seleccionar profesional --</option>
                    {professionals
                      .filter((p) => p.status === 'active')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.specialty})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Razones de recomendación (al menos 1)
                  </label>
                  {sel.reasons.map((reason, reasonIndex) => (
                    <input
                      key={reasonIndex}
                      type="text"
                      value={reason}
                      onChange={(e) => updateReason(index, reasonIndex, e.target.value)}
                      data-testid={`reason-${sel.rank}-${reasonIndex}`}
                      placeholder={`Razón ${reasonIndex + 1}`}
                      className="w-full px-4 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                    />
                  ))}
                </div>
              </div>
            </GlassCard>
            </div>
          ))}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={submitting}
            data-testid="submit-match-button"
          >
            {submitting ? 'Creando match...' : 'Crear match'}
          </Button>
        </form>
      </div>
    </AdminLayout>
  )
}
