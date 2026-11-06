// Hara Vital, Admin Practices: Create
// Server shell. Renders the shared <PracticeForm> in create mode.

import { Suspense } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import { ADMIN_BACK_LINK, AdminTitle } from '@/app/admin/components/AdminUI'
import { PracticeForm } from '../components/PracticeForm'

export const dynamic = 'force-dynamic'

export default function NewPracticePage() {
  return (
    <AdminLayout>
      <Link href="/admin/practices" className={ADMIN_BACK_LINK}>
        ← Prácticas
      </Link>
      <AdminTitle>Nueva <span className="italic text-brand">práctica</span></AdminTitle>
      <div className="max-w-[640px] rounded-[22px] bg-gray-50 px-[30px] pb-[26px] pt-7">
        <Suspense fallback={<p className="text-[12.5px] text-gray-500">Cargando…</p>}>
          <PracticeForm mode="create" />
        </Suspense>
      </div>
    </AdminLayout>
  )
}
