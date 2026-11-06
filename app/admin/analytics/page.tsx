'use client'

// Admin Analytics (design 13): profile views, WhatsApp and Instagram clicks per professional,
// with a per-professional daily chart that can be downloaded as an image.
// Data sourced from the events table via /api/admin/analytics (migration 019 RPC functions).

import { useState, useEffect, useRef, useCallback, type RefObject } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { AdminLayout } from '@/app/components/AdminLayout'
import { useAdminToast } from '@/app/admin/components/AdminToast'
import { ADMIN_BTN_SECONDARY, AdminPill, AdminSkeleton, AdminTitle, formatAdminDate } from '@/app/admin/components/AdminUI'
import { logError } from '@/lib/monitoring'

// Recharts stroke props need real color values, so the tokens are read at runtime.
// The chart only renders in the browser (after a professional is picked), so document is always there.
function cssVar(variable: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
}

const SERIES = [
  { key: 'profile_view', label: 'Vistas', token: '--color-foreground', dot: 'bg-foreground' },
  { key: 'whatsapp_click', label: 'WhatsApp', token: '--color-success', dot: 'bg-success' },
  { key: 'instagram_click', label: 'Instagram', token: '--color-brand', dot: 'bg-brand' },
] as const

const DAY_OPTIONS = [7, 30, 90] as const
const MS_PER_DAY = 86_400_000
const COLS = 'grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.8fr))] items-center gap-2.5'

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

type Days = (typeof DAY_OPTIONS)[number]

export default function AdminAnalyticsPage() {
  // The toast lives inside AdminLayout, so the page body is a child of it
  return (
    <AdminLayout>
      <AnalyticsBody />
    </AdminLayout>
  )
}

function AnalyticsBody() {
  const toast = useAdminToast()
  const [days, setDays] = useState<Days>(30)
  const [summary, setSummary] = useState<ProfessionalSummary[]>([])
  const [selected, setSelected] = useState<ProfessionalSummary | null>(null)
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

  const fetchDetail = useCallback(async (pro: ProfessionalSummary, d: Days) => {
    setLoadingDetail(true)
    setTimeSeries([])
    try {
      const res = await fetch(`/api/admin/analytics?professional_id=${pro.id}&days=${d}`)
      if (!res.ok) throw new Error('Error al cargar detalle')
      const data = await res.json()
      setTimeSeries(data.timeSeries ?? [])
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'AdminAnalyticsPage.detail' })
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary(days)
  }, [days, fetchSummary])

  // A new period also reloads the chart of whoever is selected
  useEffect(() => {
    if (selected) fetchDetail(selected, days)
  }, [selected, days, fetchDetail])

  async function handleDownload() {
    if (!chartRef.current || !selected) return
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(chartRef.current, { useCORS: true, scale: 2 })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `analytics-${selected.slug}-${days}d.png`
    a.click()
    toast.show(`Descargamos la imagen de ${selected.name}.`)
  }

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3.5">
        <AdminTitle sub="Vistas y clics por profesional activo">Analíticas</AdminTitle>
        <div className="mb-[18px] flex gap-1.5">
          {DAY_OPTIONS.map((d) => (
            <AdminPill key={d} label={`${d} días`} active={days === d} onClick={() => setDays(d)} />
          ))}
        </div>
      </div>

      {loadingSummary ? (
        <AdminSkeleton />
      ) : (
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <SummaryTable rows={summary} selectedId={selected?.id ?? null} onPick={setSelected} />
          <div className="min-w-0 rounded-[22px] bg-gray-50 p-[22px]">
            {!selected ? (
              <div className="px-1.5 py-[30px] text-center">
                <p className="font-almanac-serif text-[24px] leading-[1.15]">Elegí a alguien de la lista</p>
                <p className="mt-2 text-[14px] leading-normal text-gray-700">
                  Vas a ver sus vistas y clics día por día, y podés descargar la imagen para mandársela.
                </p>
              </div>
            ) : (
              <DetailPanel
                name={selected.name}
                days={days}
                rows={timeSeries}
                loading={loadingDetail}
                chartRef={chartRef}
                onDownload={handleDownload}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}

interface SummaryTableProps {
  rows: ProfessionalSummary[]
  selectedId: string | null
  onPick: (pro: ProfessionalSummary) => void
}

function SummaryTable({ rows, selectedId, onPick }: SummaryTableProps) {
  return (
    <div className="min-w-0 rounded-[22px] bg-gray-50 px-3.5 py-4">
      <div className={`${COLS} border-b border-foreground/10 px-2.5 pb-2.5 pt-1 text-[10.5px] font-medium tracking-[1.4px] text-muted`}>
        <span>PROFESIONAL</span>
        <span className="text-right">VISTAS</span>
        <span className="text-right">WHATSAPP</span>
        <span className="text-right">INSTAGRAM</span>
      </div>
      {rows.length === 0 ? (
        <p className="font-almanac-serif py-[26px] text-center text-[22px]">Sin datos todavía</p>
      ) : (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {rows.map((pro) => {
            const active = pro.id === selectedId
            return (
              <button
                key={pro.id}
                type="button"
                aria-pressed={active}
                onClick={() => onPick(pro)}
                className={`${COLS} rounded-xl px-2.5 py-3 text-left transition-colors ${
                  active ? 'bg-background shadow-[inset_3px_0_0] shadow-brand' : 'hover:bg-foreground/5'
                }`}
              >
                <span className="font-almanac-serif min-w-0 text-[19px]">{pro.name}</span>
                <span className="text-right text-[14px] font-medium tabular-nums">{pro.profile_views}</span>
                <span className="text-right text-[14px] font-medium tabular-nums">{pro.whatsapp_clicks}</span>
                <span className="text-right text-[14px] font-medium tabular-nums">{pro.instagram_clicks}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface DetailPanelProps {
  name: string
  days: Days
  rows: TimeSeriesRow[]
  loading: boolean
  chartRef: RefObject<HTMLDivElement>
  onDownload: () => void
}

function DetailPanel({ name, days, rows, loading, chartRef, onDownload }: DetailPanelProps) {
  const to = formatAdminDate(new Date().toISOString())
  const from = formatAdminDate(new Date(Date.now() - (days - 1) * MS_PER_DAY).toISOString())
  const hasData = !loading && rows.length > 0
  const totals = SERIES.map((s) => ({ ...s, n: rows.reduce((sum, r) => sum + r[s.key], 0) }))

  return (
    <div ref={chartRef} className="bg-gray-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-almanac-serif mb-0 text-[28px] leading-[1.05]">{name}</h2>
          <p className="mt-1 text-[12.5px] text-muted">
            Últimos {days} días · {from} al {to}
          </p>
        </div>
        {hasData && (
          <button type="button" onClick={onDownload} className={ADMIN_BTN_SECONDARY} data-html2canvas-ignore>
            Descargar imagen
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-4 h-64 animate-pulse rounded-xl bg-surface-2" />
      ) : !hasData ? (
        <div className="pb-5 pt-10 text-center">
          <p className="font-almanac-serif text-[24px]">Sin datos en este período</p>
          <p className="mt-1.5 text-[14px] text-gray-700">Probá con un período más largo.</p>
        </div>
      ) : (
        <>
          <div className="mb-2 mt-4 flex flex-wrap gap-x-[18px] gap-y-2">
            {totals.map((t) => (
              <span key={t.key} className="flex items-center gap-2">
                <span className={`h-[3px] w-2.5 rounded-sm ${t.dot}`} aria-hidden="true" />
                <span className="text-[13px] text-gray-700">{t.label}</span>
                <span className="font-almanac-serif text-[20px]">{t.n}</span>
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              {SERIES.map((s) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={cssVar(s.token)} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
