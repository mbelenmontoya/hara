// Hará Match — Admin Practices: Edit
// Server shell. Fetches the practice by key and renders <PracticeForm>
// in edit mode with prefilled values. notFound() if the key doesn't exist.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'
import { PracticeForm } from '../../components/PracticeForm'

export const dynamic = 'force-dynamic'

export default async function EditPracticePage({ params }: { params: { key: string } }) {
  const { data, error } = await supabaseAdmin
    .from('practices')
    .select('key, label, slug, sort_order, active')
    .eq('key', params.key)
    .single()

  // Distinguish "no rows" (PGRST116 → 404) from real backend errors (throw → 500
  // error boundary). Mapping every error to notFound() would hide DB outages /
  // RLS regressions / auth failures behind a misleading "practice not found" page.
  if (error?.code === 'PGRST116' || (!error && !data)) {
    notFound()
  }
  if (error) {
    logError(new Error(error.message), {
      source: 'GET /admin/practices/[key]/edit',
      key: params.key,
    })
    throw new Error('Error al cargar la práctica')
  }
  if (!data) {
    notFound()
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground">
            Editar: {data.label}
          </h1>
          <Link href="/admin/practices" className="text-sm text-muted hover:text-foreground">
            ← Volver al catálogo
          </Link>
        </div>
        <GlassCard>
          <div className="p-6">
            <PracticeForm mode="edit" initial={data} />
          </div>
        </GlassCard>
      </div>
    </AdminLayout>
  )
}
