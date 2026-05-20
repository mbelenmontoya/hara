'use client'

// Global site header — desktop nav (≥1024px) with active-route highlighting.
// Excluded from admin, concierge, and review routes (they have their own navigation).

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/profesionales', label: 'Profesionales' },
  { href: '/solicitar', label: 'Pedí recomendación' },
  { href: '/ayuda', label: 'Ayuda' },
]

const EXCLUDED_PREFIXES = ['/admin', '/r/', '/r/review']

export function SiteHeader() {
  const pathname = usePathname()

  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null

  return (
    <header className="bg-surface border-b border-outline">
      <div className="container-public py-4 flex items-center">
        <Link
          href="/"
          className="text-xl font-semibold text-foreground hover:text-brand transition-colors duration-150"
        >
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
  )
}
