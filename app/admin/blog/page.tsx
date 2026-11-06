// Admin, Blog Queue (design 13)
// Client page. Fetches every blog_posts row; pills switch between pending, published and rejected
// (each with its count) and the search matches title or author.

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/app/components/AdminLayout'
import { AdminFilterBar } from '@/app/admin/components/AdminFilterBar'
import { AdminEmpty, AdminNoResults, AdminSkeleton, AdminTitle, StatusBadge, formatAdminDate } from '@/app/admin/components/AdminUI'
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

const STATUSES = [
  { value: 'submitted', label: 'Pendientes', badge: 'Pendiente' },
  { value: 'published', label: 'Publicadas', badge: 'Publicada' },
  { value: 'rejected', label: 'Rechazadas', badge: 'Rechazada' },
] as const

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [statusValue, setStatusValue] = useState<string>('submitted')

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch('/api/admin/blog')
        if (!res.ok) throw new Error('Error al cargar notas')
        const data = (await res.json()) as { posts: BlogPost[] }
        setPosts(data.posts ?? [])
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), { source: 'AdminBlogPage' })
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  const inStatus = useMemo(() => posts.filter((p) => p.status === statusValue), [posts, statusValue])
  const filtered = useMemo(() => {
    const q = searchValue.toLowerCase()
    return inStatus.filter((p) => !q || p.title.toLowerCase().includes(q) || p.author_name.toLowerCase().includes(q))
  }, [inStatus, searchValue])

  const options = STATUSES.map((s) => ({ value: s.value, label: `${s.label} (${posts.filter((p) => p.status === s.value).length})` }))
  const current = STATUSES.find((s) => s.value === statusValue) ?? STATUSES[0]

  return (
    <AdminLayout>
      <AdminTitle sub="Notas que llegan desde /blog/escribir">Blog</AdminTitle>

      <AdminFilterBar
        searchPlaceholder="Buscar por título o autor..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        statusOptions={options}
        statusValue={statusValue}
        onStatusChange={setStatusValue}
        resultCount={filtered.length}
        allLabel={null}
      />

      {loading ? (
        <AdminSkeleton />
      ) : inStatus.length === 0 ? (
        <AdminEmpty title={`Sin notas ${current.label.toLowerCase()}`} text="Cuando haya notas en este estado, aparecen acá." />
      ) : filtered.length === 0 ? (
        <AdminNoResults text="Ninguna nota coincide con esa búsqueda." onClear={() => setSearchValue('')} />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {filtered.map((post) => (
            <Link
              key={post.id}
              href={`/admin/blog/${post.id}`}
              prefetch={false}
              className="flex min-w-0 flex-col gap-2 rounded-[20px] bg-gray-50 px-5 py-[18px] transition-shadow hover:shadow-soft"
            >
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge label={STATUSES.find((s) => s.value === post.status)?.badge ?? post.status} />
                {post.is_hara_editorial && <StatusBadge label="Hara Vital" />}
                {post.professional_id && !post.professional_link_confirmed && (
                  <span className="rounded-full bg-warning-weak px-2.5 py-1 text-[11.5px] font-medium text-warning-dark">Vínculo sin confirmar</span>
                )}
                <span className="flex-1" />
                <span className="text-[12.5px] text-muted">{formatAdminDate(post.created_at)}</span>
              </span>
              <span className="font-almanac-serif text-[23px] leading-[1.12]">{post.title}</span>
              <span className="text-[13px] text-gray-700">
                {post.author_name} · {post.author_email}
              </span>
            </Link>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
