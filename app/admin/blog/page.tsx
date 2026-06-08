// Admin — Blog Queue
// Server component. Fetches all blog_posts ordered by created_at DESC.
// Client-side filter bar lets admin switch between submitted / published / rejected.

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { AdminFilterBar } from '@/app/admin/components/AdminFilterBar'
import { logError } from '@/lib/monitoring'

interface BlogPost {
  id: string
  slug: string
  title: string
  author_name: string
  author_email: string
  status: 'submitted' | 'published' | 'rejected'
  created_at: string
  professional_id: string | null
  professional_link_confirmed: boolean
  is_hara_editorial: boolean
}

const STATUS_OPTIONS = [
  { value: 'submitted',  label: 'Pendientes' },
  { value: 'published',  label: 'Publicadas' },
  { value: 'rejected',   label: 'Rechazadas' },
]

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  submitted: { label: 'Pendiente', className: 'bg-warning-weak text-warning' },
  published: { label: 'Publicada', className: 'bg-success-weak text-success' },
  rejected:  { label: 'Rechazada', className: 'bg-danger-weak text-danger' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminBlogPage() {
  const [posts,       setPosts]       = useState<BlogPost[]>([])
  const [loading,     setLoading]     = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [statusValue, setStatusValue] = useState('submitted')

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch('/api/admin/blog')
        if (!res.ok) throw new Error('Error al cargar notas')
        const data = await res.json() as { posts: BlogPost[] }
        setPosts(data.posts ?? [])
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), { source: 'AdminBlogPage' })
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  const filtered = useMemo(() => {
    return posts.filter(p => {
      if (statusValue && p.status !== statusValue) return false
      if (searchValue) {
        const q = searchValue.toLowerCase()
        return p.title.toLowerCase().includes(q) || p.author_name.toLowerCase().includes(q)
      }
      return true
    })
  }, [posts, statusValue, searchValue])

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Blog</h1>
            <p className="text-sm text-muted">Cola de moderación</p>
          </div>
        </div>

        <AdminFilterBar
          searchPlaceholder="Buscar por título o autor..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          statusOptions={STATUS_OPTIONS}
          statusValue={statusValue}
          onStatusChange={setStatusValue}
          resultCount={filtered.length}
        />

        {loading ? (
          <p className="text-sm text-muted">Cargando...</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No hay notas"
            description={statusValue === 'submitted' ? 'No hay notas pendientes de revisión.' : 'No hay notas con este filtro.'}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(post => {
              const statusConfig = STATUS_LABELS[post.status] ?? { label: post.status, className: 'bg-surface-2 text-muted' }
              return (
                <GlassCard key={post.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground font-medium truncate">{post.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig.className}`}>
                          {statusConfig.label}
                        </span>
                        {post.is_hara_editorial && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand bg-brand-weak rounded-full px-2 py-0.5">
                            Hara Vital
                          </span>
                        )}
                        {post.professional_id && !post.professional_link_confirmed && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-info-weak text-info font-medium">
                            Vínculo pendiente
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">
                        {post.author_name} · {post.author_email} · {formatDate(post.created_at)}
                      </div>
                    </div>
                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="text-sm font-medium text-brand hover:underline shrink-0"
                      prefetch={false}
                    >
                      Revisar
                    </Link>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
