// Hará Match - Admin Match Creation Page
// Purpose: Select 3 professionals and create match with ranks + reasons
// Security: Admin-only via middleware

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
      if (!res.ok) throw new Error('Failed to fetch professionals')
      const data = await res.json()
      setProfessionals(data.professionals || [])
    } catch (err) {
      setError('Failed to load professionals')
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

    // Validate 3 distinct professionals
    const professionalIds = selected.map(s => s.professional_id).filter(Boolean)
    if (professionalIds.length !== 3) {
      setError('Please select 3 professionals')
      return
    }
    if (new Set(professionalIds).size !== 3) {
      setError('Please select 3 DISTINCT professionals')
      return
    }

    // Validate reasons
    for (const sel of selected) {
      const filledReasons = sel.reasons.filter(r => r.trim().length > 0)
      if (filledReasons.length === 0) {
        setError('Please provide at least one reason for each professional')
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
          recommendations: selected.map(s => ({
            professional_id: s.professional_id,
            rank: s.rank,
            reasons: s.reasons.filter(r => r.trim().length > 0),
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create match')
      }

      const data = await res.json()
      alert(`Match created! Tracking code: ${data.tracking_code}`)
      router.push('/admin/leads')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" data-testid="create-match-page">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create Match for Lead {params.id}</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {selected.map((sel, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow" data-testid={`rank-${sel.rank}-section`}>
              <h2 className="text-xl font-semibold mb-4">Rank {sel.rank}</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Professional
                </label>
                <select
                  value={sel.professional_id}
                  onChange={(e) => updateProfessional(index, e.target.value)}
                  data-testid={`professional-select-${sel.rank}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">-- Select Professional --</option>
                  {professionals
                    .filter(p => p.status === 'active')
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.specialty})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Reasons (at least 1 required)
                </label>
                {sel.reasons.map((reason, reasonIndex) => (
                  <input
                    key={reasonIndex}
                    type="text"
                    value={reason}
                    onChange={(e) => updateReason(index, reasonIndex, e.target.value)}
                    data-testid={`reason-${sel.rank}-${reasonIndex}`}
                    placeholder={`Reason ${reasonIndex + 1}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ))}
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            data-testid="submit-match-button"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
          >
            {submitting ? 'Creating Match...' : 'Create Match'}
          </button>
        </form>
      </div>
    </div>
  )
}
