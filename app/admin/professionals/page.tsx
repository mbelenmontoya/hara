// Hará Match - Admin Professionals List Page
// Purpose: View all professionals
// Security: Admin-only via middleware

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Professional {
  id: string
  slug: string
  name: string // Will be mapped from full_name
  specialty: string
  status: string
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)

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
      console.error('Failed to load professionals:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" data-testid="professionals-page">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Professionals</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Specialty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {professionals.map((pro) => (
                <tr key={pro.id} data-testid={`professional-${pro.slug}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pro.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Link href={`/p/${pro.slug}`} className="text-blue-600 hover:text-blue-900">
                      {pro.slug}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pro.specialty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      pro.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pro.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
