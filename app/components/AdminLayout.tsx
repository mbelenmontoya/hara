// Hará UI v2 - Admin Layout
// Functional admin frame with consistent spacing

import { ReactNode } from 'react'
import Link from 'next/link'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-outline">
        <div className="container-admin py-4">
          <h1 className="text-xl font-semibold text-foreground mb-4">Administración</h1>

          {/* Navigation */}
          <nav className="flex gap-1 overflow-x-auto -mx-1">
            <Link
              href="/admin/leads"
              className="px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors duration-150 whitespace-nowrap"
            >
              Leads
            </Link>
            <Link
              href="/admin/professionals"
              className="px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors duration-150 whitespace-nowrap"
            >
              Profesionales
            </Link>
            <Link
              href="/admin/pqls"
              className="px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors duration-150 whitespace-nowrap"
            >
              PQLs
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 section-admin">
        <div className="container-admin">
          {children}
        </div>
      </main>
    </div>
  )
}
