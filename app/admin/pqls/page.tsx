// Hará Match - Admin PQL Ledger Page
// Purpose: View ledger entries and make adjustments
// Security: Admin-only via middleware

'use client'

import { useState, useEffect } from 'react'

interface PQLEntry {
  id: string
  professional_id: string
  month: string
  balance: number
  created_at: string
  professionals: {
    name: string
    slug: string
  }
}

export default function PQLsPage() {
  const [entries, setEntries] = useState<PQLEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [adjustAmount, setAdjustAmount] = useState(0)
  const [adjustReason, setAdjustReason] = useState('')

  useEffect(() => {
    fetchEntries()
  }, [])

  async function fetchEntries() {
    try {
      const res = await fetch('/api/debug/pqls')
      if (!res.ok) throw new Error('Failed to fetch PQLs')
      const data = await res.json()
      setEntries(data.entries || [])
    } catch (err) {
      console.error('Failed to load PQL entries:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdjust(entryId: string) {
    if (!adjustReason.trim()) {
      alert('Please provide a reason')
      return
    }

    try {
      const res = await fetch(`/api/admin/pqls/${entryId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: adjustAmount,
          reason: adjustReason,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to adjust')
      }

      alert('Adjustment successful')
      setAdjusting(null)
      setAdjustAmount(0)
      setAdjustReason('')
      fetchEntries()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" data-testid="pqls-page">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">PQL Ledger</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Professional
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => (
                <tr key={entry.id} data-testid={`pql-entry-${entry.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.professionals.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.balance}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setAdjusting(entry.id)}
                      data-testid={`adjust-button-${entry.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Adjustment Modal */}
        {adjusting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-96" data-testid="adjustment-modal">
              <h2 className="text-xl font-semibold mb-4">Adjust PQL Balance</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  data-testid="adjust-amount-input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  data-testid="adjust-reason-input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAdjust(adjusting)}
                  data-testid="submit-adjustment-button"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Submit
                </button>
                <button
                  onClick={() => {
                    setAdjusting(null)
                    setAdjustAmount(0)
                    setAdjustReason('')
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
