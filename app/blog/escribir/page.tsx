// Blog — Submission form page
// Server shell; the form is loaded client-side only (TipTap requires the DOM).

import dynamic from 'next/dynamic'
import { PageBackground } from '@/app/components/ui/PageBackground'

export const metadata = {
  title: 'Escribí una nota | Hara Vital',
  description: 'Compartí tu perspectiva sobre bienestar holístico. Revisamos tu nota antes de publicarla.',
}

const EscribirForm = dynamic(
  () => import('./EscribirForm').then(m => m.EscribirForm),
  { ssr: false, loading: () => <div className="container-public pt-16 text-center text-muted text-sm">Cargando editor...</div> }
)

export default function EscribirPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageBackground />
      <EscribirForm />
    </div>
  )
}
