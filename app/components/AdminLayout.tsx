// Hará — Admin Layout
// Shell for all admin pages: illustration background, glass nav, content area

'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { GlassCard } from '@/app/components/ui/GlassCard'

const ADMIN_BG = '/assets/illustrations/jo-yee-leong-8ekcOvJnLlo-unsplash.svg'

const NAV_ITEMS = [
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/professionals', label: 'Profesionales' },
  { href: '/admin/pqls', label: 'PQLs' },
]

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      <PageBackground image={ADMIN_BG} />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-4 pt-8 pb-2">
          <div className="max-w-3xl mx-auto">
            <GlassCard>
              <h1 className="text-lg font-semibold text-foreground mb-4">Administración</h1>

              <nav className="flex gap-2">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-4 py-2 text-sm rounded-full transition-all ${
                        isActive
                          ? 'bg-brand text-white font-medium shadow-soft'
                          : 'text-muted hover:text-foreground hover:bg-surface-2'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </GlassCard>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6">
          <div className="max-w-3xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
