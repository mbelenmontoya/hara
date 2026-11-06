// Hara Vital, Admin Practices Catalog (list, design 13)
// Server component. Fetches all practices (active + inactive) with usage
// counts via loadAdminPracticesView, renders the client list + toggle UI.

import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import { ADMIN_BTN_PRIMARY, AdminTitle } from '@/app/admin/components/AdminUI'
import { loadAdminPracticesView, loadPracticeSuggestions } from '@/lib/admin-practices'
import { PracticesList } from './PracticesList'
import { SuggestedPractices } from './SuggestedPractices'

export const dynamic = 'force-dynamic'

export default async function AdminPracticesPage() {
  const [practices, suggestions] = await Promise.all([
    loadAdminPracticesView(),
    loadPracticeSuggestions(),
  ])

  const activeCount = practices.filter((p) => p.active).length

  return (
    <AdminLayout>
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3.5">
        <AdminTitle sub={`Catálogo holístico · ${practices.length} prácticas · ${activeCount} activas`}>Prácticas</AdminTitle>
        <Link href="/admin/practices/new" className={`${ADMIN_BTN_PRIMARY} mb-[18px]`}>
          Nueva práctica
        </Link>
      </div>
      <SuggestedPractices suggestions={suggestions} practices={practices} />
      <PracticesList practices={practices} />
    </AdminLayout>
  )
}
