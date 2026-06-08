'use client'

// Hara UI v2 - Public Layout
// Desktop nav links (≥1024px) with active-route highlighting via usePathname

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface PublicLayoutProps {
  children: ReactNode
}

const NAV_LINKS = [
  { href: '/profesionales', label: 'Profesionales' },
  { href: '/solicitar', label: 'Pedí recomendación' },
  { href: '/que-es-hara', label: 'Qué es Hara' },
]

export function PublicLayout({ children }: PublicLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-outline">
        <div className="container-public py-5 flex items-center">
          <Link href="/" className="text-xl font-semibold text-foreground hover:text-brand transition-colors duration-150">
            Hara
          </Link>

          {/* Desktop nav — hidden below 1024px */}
          <nav className="hidden lg:flex items-center gap-6 ml-auto" aria-label="Navegación principal">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm transition-colors duration-150 ${
                    isActive
                      ? 'text-foreground font-medium underline underline-offset-4 decoration-brand/50'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
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
            © 2026 Hara Vital · Conectamos con bienestar
          </p>
          <Link href="/que-es-hara" className="text-sm text-muted hover:text-foreground transition-colors mt-2 inline-block">
            Qué es Hara
          </Link>
        </div>
      </footer>
    </div>
  )
}
