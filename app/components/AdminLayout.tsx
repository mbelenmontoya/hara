// Hara: Admin Layout (almanac design 13)
// Desktop: sidebar with logo, nav with unread numbers, email and Salir. Phone: top bar and nav pills.
// Also marks the page's item read (markRead) before it loads the unread numbers.

'use client'

import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logError } from '@/lib/monitoring'
import { AdminToastProvider } from '@/app/admin/components/AdminToast'
import type { UnreadCounts, UnreadKind } from '@/lib/admin-unread'

const LOGO_SRC = '/assets/logo/isotipo.png'

const NAV_ITEMS: { href: string; label: string; unread?: UnreadKind }[] = [
  { href: '/admin/leads', label: 'Leads', unread: 'leads' },
  { href: '/admin/professionals', label: 'Profesionales', unread: 'professionals' },
  { href: '/admin/practices', label: 'Prácticas' },
  { href: '/admin/pqls', label: 'PQLs' },
  { href: '/admin/analytics', label: 'Analíticas' },
  { href: '/admin/blog', label: 'Blog', unread: 'blog' },
  { href: '/admin/reviews', label: 'Reseñas', unread: 'reviews' },
]

interface AdminLayoutProps {
  children: ReactNode
  /** The item this page shows; it stops counting as unread when the page opens. */
  markRead?: { kind: UnreadKind; id?: string }
}

/** Mark the page's item read first, so the numbers that load next already leave it out. */
function useUnread(markRead?: AdminLayoutProps['markRead']): UnreadCounts | null {
  const [unread, setUnread] = useState<UnreadCounts | null>(null)
  const kind = markRead?.kind
  const id = markRead?.id

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (kind) {
          const marked = await fetch('/api/admin/unread', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(id ? { kind, id } : { kind }),
          })
          if (!marked.ok) logError(new Error(`Mark read failed (${marked.status})`), { source: 'AdminLayout.markRead', kind })
        }
        const res = await fetch('/api/admin/unread')
        // Before migration 025 runs this fails; the menu then just shows no numbers
        if (res.ok && !cancelled) setUnread(await res.json())
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), { source: 'AdminLayout.unread' })
      }
    }
    load()
    return () => { cancelled = true }
  }, [kind, id])

  return unread
}

function useAdminEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null)
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])
  return email
}

function UnreadBadge({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      aria-label={`${n} sin leer`}
      className={`min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-semibold leading-5 ${
        active ? 'bg-brand text-gray-50' : 'bg-brand-weak text-brand-dark'
      }`}
    >
      {n}
    </span>
  )
}

export function AdminLayout({ children, markRead }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const unread = useUnread(markRead)
  const email = useAdminEmail()

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  const items = NAV_ITEMS.map((item) => ({
    ...item,
    active: pathname.startsWith(item.href),
    count: item.unread && unread ? unread[item.unread] : 0,
  }))

  return (
    <AdminToastProvider>
      <div className="min-h-screen bg-background font-almanac text-foreground md:flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-[236px] flex-none flex-col border-r border-foreground/10 px-4 pb-5 pt-7 md:sticky md:top-0 md:flex md:h-screen">
          <div className="flex items-center gap-2.5 px-2.5">
            <img src={LOGO_SRC} alt="Hara" className="h-9 w-8 object-contain" />
            <span className="text-[10.5px] font-medium tracking-[0.21em] text-brand">ADMIN</span>
          </div>
          <nav aria-label="Admin" className="mt-[30px] flex flex-col gap-[3px]">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition-colors ${
                  item.active ? 'bg-foreground text-background' : 'hover:bg-foreground/5'
                }`}
              >
                <span className="flex-1">{item.label}</span>
                {item.count > 0 && <UnreadBadge n={item.count} active={item.active} />}
              </Link>
            ))}
          </nav>
          <div className="flex-1" />
          <div className="border-t border-foreground/10 px-2.5 pt-3.5">
            {email && <p className="truncate text-[13px] text-gray-700">{email}</p>}
            <button type="button" onClick={handleLogout} className="mt-1 text-[13px] font-medium text-brand-dark hover:underline">
              Salir
            </button>
          </div>
        </aside>

        {/* Phone top bar and nav pills */}
        <header className="md:hidden">
          <div className="flex items-center gap-2.5 px-4 pb-3 pt-5">
            <img src={LOGO_SRC} alt="Hara" className="h-8 w-7 object-contain" />
            <span className="text-[10.5px] font-medium tracking-[0.21em] text-brand">ADMIN</span>
            <div className="flex-1" />
            <button type="button" onClick={handleLogout} className="min-h-[44px] px-1 text-[13px] font-medium text-brand-dark">
              Salir
            </button>
          </div>
          <nav aria-label="Admin" className="border-b border-foreground/10">
            <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  className={`flex flex-none items-center gap-[7px] rounded-full border-[1.5px] border-foreground/12 px-[13px] py-[7px] text-[13.5px] font-medium ${
                    item.active ? 'bg-foreground text-background' : ''
                  }`}
                >
                  {item.label}
                  {item.count > 0 && <UnreadBadge n={item.count} active={item.active} />}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        <main className="min-w-0 flex-1 px-3.5 pb-16 pt-5 md:px-12 md:pb-[60px] md:pt-10">
          <div className="mx-auto max-w-[1100px]">{children}</div>
        </main>
      </div>
    </AdminToastProvider>
  )
}
