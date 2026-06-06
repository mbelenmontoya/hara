'use client'

// Admin Analytics — professional interaction metrics dashboard
// Shows profile views, WhatsApp clicks, and Instagram clicks per professional.
// Data sourced from the events table via /api/admin/analytics (migration 019 RPC functions).

import { useState, useEffect, useRef, useCallback } from 'react'
import { AdminLayout } from '@/app/components/AdminLayout'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { EmptyState } from '@/app/components/ui/EmptyState'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/app/components/ui/Table'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { logError } from '@/lib/monitoring'

// Chart colors mirror CSS tokens from globals.css @theme.
// Recharts stroke props require actual color values, not Tailwind classes.
// Read at runtime from CSS variables; fall back to hex when document is unavailable (SSR).
function getCssVar(variable: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback
}

const CHART_COLORS = {
  views:     () => getCssVar('--color-brand',   '#B87060'),
  whatsapp:  () => getCssVar('--color-success', '#1A7060'),
  instagram: () => getCssVar('--color-warning', '#F0A030'),
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfessionalSummary {
  id: string
  name: string
  slug: string
  profile_views: number
  whatsapp_clicks: number
  instagram_clicks: number
}

interface TimeSeriesRow {
  date: string
  profile_view: number
  whatsapp_click: number
  instagram_click: number
}

type Days = 7 | 30 | 90

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState<Days>(30)
  const [summary, setSummary] = useState<ProfessionalSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string>('')
  const [selectedSlug, setSelectedSlug] = useState<string>('')
  const [timeSeries, setTimeSeries] = useState<TimeSeriesRow[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  const fetchSummary = useCallback(async (d: Days) => {
    setLoadingSummary(true)
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`)
      if (!res.ok) throw new Error('Error al cargar datos')
      const data = await res.json()
      setSummary(data.professionals ?? [])
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'AdminAnalyticsPage' })
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary(days)
  }, [days, fetchSummary])

  async function handleRowClick(pro: ProfessionalSummary) {
    setSelectedId(pro.id)
    setSelectedName(pro.name)
    setSelectedSlug(pro.slug)
    setLoadingDetail(true)
    setTimeSeries([])
    try {
      const res = await fetch(`/api/admin/analytics?professional_id=${pro.id}&days=${days}`)
      if (!res.ok) throw new Error('Error al cargar detalle')
      const data = await res.json()
      setTimeSeries(data.timeSeries ?? [])
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'AdminAnalyticsPage.detail' })
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleDownload() {
    if (!chartRef.current) return
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(chartRef.current, { useCORS: true, scale: 2 })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `analytics-${selectedSlug}-${days}d.png`
    a.click()
  }

  return (
    <AdminLayout>
      <div className="max-w-[960px] mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Analíticas</h1>

          {/* Date range selector */}
          <div className="flex gap-2">
            {([7, 30, 90] as Days[]).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 text-sm rounded-full transition-all ${
                  days === d
                    ? 'bg-brand text-white font-medium shadow-soft'
                    : 'text-muted hover:text-foreground hover:bg-surface-2'
                }`}
              >
                {d} días
              </button>
            ))}
          </div>
        </div>

        {/* Summary table */}
        <GlassCard>
          {loadingSummary ? (
            <div className="space-y-3 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-8 bg-surface-2 rounded-xl" />
              ))}
            </div>
          ) : summary.length === 0 ? (
            <EmptyState
              title="Sin datos todavía"
              description="Cuando los profesionales reciban visitas, las métricas aparecerán acá."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profesional</TableHead>
                  <TableHead className="text-right">Vistas de perfil</TableHead>
                  <TableHead className="text-right">Clics WhatsApp</TableHead>
                  <TableHead className="text-right">Clics Instagram</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((pro) => (
                  <TableRow
                    key={pro.id}
                    onClick={() => handleRowClick(pro)}
                    className={`cursor-pointer transition-colors hover:bg-brand-weak ${
                      selectedId === pro.id ? 'bg-brand-weak' : ''
                    }`}
                  >
                    <TableCell>
                      <a
                        href={`/p/${pro.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-brand hover:underline font-medium"
                      >
                        {pro.name}
                      </a>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{pro.profile_views}</TableCell>
                    <TableCell className="text-right tabular-nums">{pro.whatsapp_clicks}</TableCell>
                    <TableCell className="text-right tabular-nums">{pro.instagram_clicks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCard>

        {/* Per-professional detail */}
        {selectedId && (
          <GlassCard>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{selectedName}</h2>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 text-sm rounded-full bg-surface border border-outline text-foreground hover:bg-surface-2 transition-all"
                >
                  Descargar imagen
                </button>
              </div>

              {loadingDetail ? (
                <div className="animate-pulse h-64 bg-surface-2 rounded-xl" />
              ) : timeSeries.length === 0 ? (
                <EmptyState
                  title="Sin datos en este período"
                  description="Este profesional no tiene eventos registrados en los últimos días seleccionados."
                />
              ) : (
                <div ref={chartRef} className="bg-surface rounded-xl p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeries} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="profile_view"
                        name="Vistas"
                        stroke={CHART_COLORS.views()}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="whatsapp_click"
                        name="WhatsApp"
                        stroke={CHART_COLORS.whatsapp()}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="instagram_click"
                        name="Instagram"
                        stroke={CHART_COLORS.instagram()}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </GlassCard>
        )}

      </div>
    </AdminLayout>
  )
}
