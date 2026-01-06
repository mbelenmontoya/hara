// Hará Match - Admin Leads Page
// Functional admin interface with consistent rhythm

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { AdminLayout } from '@/app/components/AdminLayout'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'
import { EmptyState } from '@/app/components/ui/EmptyState'

export const runtime = 'nodejs'

export default async function AdminLeadsPage() {
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, country, intent_tags, status, created_at, email')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Leads</h2>
        <p className="text-sm text-muted mt-2">
          {leads?.length || 0} leads en la bandeja
        </p>
      </div>

      {!leads?.length ? (
        <Card>
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            title="No hay leads para procesar"
            description="Los nuevos leads aparecerán aquí cuando se registren desde el formulario público."
          />
        </Card>
      ) : (
        <div className="stack-tight">
          {leads.map((lead) => {
            const isMatched = lead.status !== 'new'
            const primaryNeed = lead.intent_tags?.[0] || 'General'

            return (
              <Card key={lead.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="font-semibold text-foreground">
                        {lead.email || `Lead ${lead.id.slice(0, 8)}`}
                      </span>
                      <Badge variant={isMatched ? 'matched' : 'new'}>
                        {lead.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted flex-wrap">
                      <span>{lead.country}</span>
                      <span className="text-outline">•</span>
                      <span>{primaryNeed}</span>
                      <span className="text-outline">•</span>
                      <time>
                        {new Date(lead.created_at).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </time>
                    </div>
                  </div>

                  {!isMatched && (
                    <Link href={`/admin/leads/${lead.id}/match`} className="flex-shrink-0">
                      <Button variant="primary" size="sm">
                        Crear match
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </AdminLayout>
  )
}
