// Hará Match - Admin Leads Page
// Shows leads grouped by status with glass card styling

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
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
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Solicitudes</h2>
          <p className="text-sm text-muted mt-1">
            {leads?.length || 0} solicitudes en la bandeja
          </p>
        </div>

        {!leads?.length ? (
          <GlassCard>
            <EmptyState
              title="Sin solicitudes"
              description="Las nuevas solicitudes aparecerán aquí cuando se registren desde el formulario público."
            />
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => {
              const isMatched = lead.status !== 'new'
              const primaryNeed = lead.intent_tags?.[0] || 'General'

              return (
                <GlassCard key={lead.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold text-foreground text-sm">
                          {lead.email || `Solicitud ${lead.id.slice(0, 8)}`}
                        </span>
                        <Badge variant={isMatched ? 'matched' : 'new'}>
                          {lead.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted flex-wrap">
                        <span>{lead.country}</span>
                        <span className="text-outline">·</span>
                        <span>{primaryNeed}</span>
                        <span className="text-outline">·</span>
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
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
