// Hará Match — Admin Practices: Create
// Server shell. Renders the shared <PracticeForm> in create mode.

import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { PracticeForm } from '../components/PracticeForm'

export const dynamic = 'force-dynamic'

export default function NewPracticePage() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground">Nueva práctica</h1>
          <Link href="/admin/practices" className="text-sm text-muted hover:text-foreground">
            ← Volver al catálogo
          </Link>
        </div>
        <GlassCard>
          <div className="p-6">
            <PracticeForm mode="create" />
          </div>
        </GlassCard>
      </div>
    </AdminLayout>
  )
}
