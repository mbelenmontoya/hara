// Unit tests for /admin/analytics page
// Chart rendering (Recharts) and PNG export (html2canvas) are library behaviors
// tested by E2E scenarios TS-004 and TS-005: unit tests cover data flow only.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/analytics' }))
vi.mock('@/app/components/ui/PageBackground', () => ({ PageBackground: () => null }))
vi.mock('@/app/components/ui/GlassCard', () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))
vi.mock('html2canvas', () => ({ default: vi.fn().mockResolvedValue({ toDataURL: () => 'data:image/png;base64,fake' }) }))
vi.mock('@/app/components/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const SUMMARY_DATA = {
  professionals: [
    { id: 'pro-1', name: 'Ana García', slug: 'ana-garcia', profile_views: 50, whatsapp_clicks: 10, instagram_clicks: 5 },
    { id: 'pro-2', name: 'Carlos López', slug: 'carlos-lopez', profile_views: 30, whatsapp_clicks: 4, instagram_clicks: 2 },
  ],
}
const DETAIL_DATA = {
  professional: { id: 'pro-1', name: 'Ana García', slug: 'ana-garcia' },
  timeSeries: [
    { date: '2026-06-01', profile_view: 10, whatsapp_click: 2, instagram_click: 1 },
  ],
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  ;(fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.includes('professional_id')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(DETAIL_DATA) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(SUMMARY_DATA) })
  })
})

describe('AdminAnalyticsPage', () => {
  it('renders the page heading and fetches summary on mount', async () => {
    const { default: AnalyticsPage } = await import('./page')
    render(<AnalyticsPage />)

    expect(screen.getByText(/analíticas/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument()
      expect(screen.getByText('Carlos López')).toBeInTheDocument()
    })
    expect(fetch).toHaveBeenCalledWith('/api/admin/analytics?days=30')
    expect(screen.getByText('Elegí a alguien de la lista')).toBeInTheDocument()
  })

  it('refetches the summary and the open chart with the picked period', async () => {
    const user = userEvent.setup()
    const { default: AnalyticsPage } = await import('./page')
    render(<AnalyticsPage />)

    await user.click(await screen.findByText('Ana García'))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/admin/analytics?professional_id=pro-1&days=30'))

    await user.click(screen.getByRole('button', { name: '7 días' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/admin/analytics?days=7'))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/admin/analytics?professional_id=pro-1&days=7'))
  })

  it('shows detail charts when a professional row is clicked', async () => {
    const user = userEvent.setup()
    const { default: AnalyticsPage } = await import('./page')
    render(<AnalyticsPage />)

    await waitFor(() => screen.getByText('Ana García'))
    // The whole row picks the professional
    await user.click(screen.getByText('50'))

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
    expect(fetch).toHaveBeenCalledWith('/api/admin/analytics?professional_id=pro-1&days=30')
    // Totals per series above the chart
    expect(screen.getByText('Vistas').nextSibling).toHaveTextContent('10')
  })
})
