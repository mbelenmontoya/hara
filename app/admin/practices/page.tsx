// Hará Match — Admin Practices Catalog (list)
// Server component. Fetches all practices (active + inactive) with usage
// counts via loadAdminPracticesView, renders the client list + toggle UI.

import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import { Button } from '@/app/components/ui/Button'
import { loadAdminPracticesView } from '@/lib/admin-practices'
import { PracticesList } from './PracticesList'

export const dynamic = 'force-dynamic'

export default async function AdminPracticesPage() {
  const practices = await loadAdminPracticesView()

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Prácticas</h1>
            <p className="text-sm text-muted">Catálogo holístico</p>
          </div>
          <Link href="/admin/practices/new">
            <Button>Nueva práctica</Button>
          </Link>
        </div>
        <PracticesList practices={practices} />
      </div>
    </AdminLayout>
  )
}
