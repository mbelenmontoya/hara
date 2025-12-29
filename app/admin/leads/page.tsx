// Hará Match - Admin Leads Inbox
// Mobile-first, Server Component (no client JS)

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export default async function AdminLeadsPage() {
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, country, intent_tags, status, created_at, email')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Leads Inbox</h1>
          <p className="text-sm text-gray-600 mt-1">
            {leads?.length || 0} leads • Most recent first
          </p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {leads?.map((lead) => {
              const isMatched = lead.status !== 'new'
              const primaryNeed = lead.intent_tags?.[0] || 'General'

              return (
                <div
                  key={lead.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {lead.email || `Lead #${lead.id.slice(0, 8)}`}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            isMatched
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                        <span>🌍 {lead.country}</span>
                        <span>💭 {primaryNeed}</span>
                        <span className="text-gray-400">
                          {new Date(lead.created_at).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                    </div>

                    {!isMatched && (
                      <Link
                        href={`/admin/leads/${lead.id}/match`}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        Create Match
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}

            {!leads?.length && (
              <div className="p-8 text-center text-gray-500">
                No leads yet. Run{' '}
                <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                  npx tsx scripts/qa-seed.ts
                </code>{' '}
                to create test data.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
