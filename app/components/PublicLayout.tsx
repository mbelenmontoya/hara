// Hará UI v2 - Public Layout
// Warm, calm frame for public pages

import { ReactNode } from 'react'
import Link from 'next/link'

interface PublicLayoutProps {
  children: ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-outline">
        <div className="container-public py-5">
          <Link href="/" className="text-xl font-semibold text-foreground hover:text-brand transition-colors duration-150">
            Hará
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-outline mt-auto">
        <div className="container-public py-8 text-center">
          <p className="text-sm text-muted">
            © 2026 Hará Match · Conectamos con bienestar
          </p>
        </div>
      </footer>
    </div>
  )
}
