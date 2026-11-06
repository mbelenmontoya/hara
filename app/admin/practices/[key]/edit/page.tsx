// Hara Vital, Admin Practices: Edit
// Server shell. Fetches the practice by key and renders <PracticeForm>
// in edit mode with prefilled values. notFound() if the key doesn't exist.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminLayout } from '@/app/components/AdminLayout'
import { ADMIN_BACK_LINK, AdminTitle } from '@/app/admin/components/AdminUI'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/monitoring'
import { PracticeForm } from '../../components/PracticeForm'

export const dynamic = 'force-dynamic'

export default async function EditPracticePage({ params }: { params: { key: string } }) {
  const { data, error } = await supabaseAdmin
    .from('practices')
    .select('key, label, slug, sort_order, active, specialties, aliases')
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
      <Link href="/admin/practices" className={ADMIN_BACK_LINK}>
        ← Prácticas
      </Link>
      <AdminTitle>Editar <span className="italic text-brand">{data.label}</span></AdminTitle>
      <div className="max-w-[640px] rounded-[22px] bg-gray-50 px-[30px] pb-[26px] pt-7">
        <PracticeForm mode="edit" initial={data} />
      </div>
    </AdminLayout>
  )
}
