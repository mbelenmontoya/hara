'use client'

// Global site header — desktop nav (≥1024px) + hamburger dropdown (<1024px).
// Excluded from admin, concierge, and review routes (they have their own navigation).

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/profesionales', label: 'Profesionales' },
  { href: '/solicitar', label: 'Pedí recomendación' },
  { href: '/profesionales/registro', label: 'Soy profesional' },
  { href: '/ayuda', label: 'Ayuda' },
]

const EXCLUDED_PREFIXES = ['/admin', '/r/', '/r/review']
const EXCLUDED_EXACT = ['/']

export function SiteHeader() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  if (EXCLUDED_EXACT.includes(pathname)) return null
  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null

  return (
    <header className="relative z-10 bg-transparent">
      <div className="container-public py-3 flex items-center">
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0"
          aria-label="Hara — inicio"
        >
          <Image
            src="/assets/logo/isotipo.png"
            alt="Hara"
            width={34}
            height={36}
            className="object-contain"
            priority
          />
          <span className="font-semibold text-foreground text-xl tracking-wide font-display">
            Hara
          </span>
        </Link>

        {/* Desktop nav — hidden below 1024px */}
        <nav className="hidden lg:flex items-center gap-6 ml-auto" aria-label="Navegación principal">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || (
              pathname.startsWith(href + '/') &&
              !NAV_LINKS.some(other => other.href !== href && pathname.startsWith(other.href))
            )
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

        {/* Hamburger button — visible below 1024px */}
        <button
          className="lg:hidden ml-auto p-2 text-foreground hover:text-brand transition-colors duration-150"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown — conditionally rendered, uses liquid-glass design system */}
      {isOpen && (
        <nav
          className="lg:hidden absolute left-0 right-0 z-20 mx-4 mt-1 liquid-glass rounded-2xl shadow-elevated border border-outline/30 overflow-hidden"
          aria-label="Navegación móvil"
          data-testid="mobile-nav"
        >
          <div className="liquid-glass-content px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href || (
                pathname.startsWith(href + '/') &&
                !NAV_LINKS.some(other => other.href !== href && pathname.startsWith(other.href))
              )
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-3 text-sm rounded-xl transition-all ${
                    isActive
                      ? 'bg-brand text-white font-medium'
                      : 'text-foreground hover:bg-surface-2'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </header>
  )
}
