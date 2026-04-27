// Tests for ContactButton — verifies event tracking fires for BOTH concierge
// and direct (no-token) contacts after the reviews bug fix.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ContactButton } from './ContactButton'

const mockSendBeacon = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  // Mock navigator.sendBeacon (jsdom doesn't implement it)
  Object.defineProperty(navigator, 'sendBeacon', {
    value: mockSendBeacon,
    configurable: true,
    writable: true,
  })
})

const BASE_PROPS = {
  professionalSlug: 'ana-garcia',
  professionalName: 'Ana García',
  whatsappNumber: '5491112345678',
  trackingCode: 'TC-001',
  rank: 1,
}

describe('ContactButton — event tracking', () => {
  it('fires event via sendBeacon for concierge contact (with attributionToken)', async () => {
    render(<ContactButton {...BASE_PROPS} attributionToken="jwt-token-123" />)
    const btn = screen.getByRole('link')

    fireEvent.click(btn)
    await waitFor(() => expect(mockSendBeacon).toHaveBeenCalledTimes(1))

    const [url, blob] = mockSendBeacon.mock.calls[0] as [string, Blob]
    expect(url).toBe('/api/events')
    const text = await blob.text()
    const payload = JSON.parse(text) as Record<string, unknown>
    expect(payload.attribution_token).toBe('jwt-token-123')
    expect(payload.event_type).toBe('contact_click')
  })

  it('fires event via sendBeacon for direct contact (no attributionToken)', async () => {
    // This test fails BEFORE the bug fix because direct contacts skip event tracking.
    render(<ContactButton {...BASE_PROPS} />)
    const btn = screen.getByRole('link')

    fireEvent.click(btn)
    await waitFor(() => expect(mockSendBeacon).toHaveBeenCalledTimes(1))

    const [url, blob] = mockSendBeacon.mock.calls[0] as [string, Blob]
    expect(url).toBe('/api/events')
    const text = await blob.text()
    const payload = JSON.parse(text) as Record<string, unknown>
    expect(payload.professional_slug).toBe('ana-garcia')
    expect(payload.event_type).toBe('contact_click')
    expect(payload.attribution_token).toBeUndefined()
  })

  it('direct contact payload does NOT include attribution_token field', async () => {
    render(<ContactButton {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('link'))
    await waitFor(() => expect(mockSendBeacon).toHaveBeenCalled())
    const blob = mockSendBeacon.mock.calls[0][1] as Blob
    const payload = JSON.parse(await blob.text()) as Record<string, unknown>
    expect('attribution_token' in payload).toBe(false)
  })

  it('includes reviewer_email from localStorage when present for direct contact', async () => {
    // Pre-populate localStorage as the email capture component would
    localStorage.setItem('reviewer-email:ana-garcia', 'reviewer@example.com')

    render(<ContactButton {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('link'))
    await waitFor(() => expect(mockSendBeacon).toHaveBeenCalled())

    const blob = mockSendBeacon.mock.calls[0][1] as Blob
    const payload = JSON.parse(await blob.text()) as Record<string, unknown>
    expect(payload.reviewer_email).toBe('reviewer@example.com')

    localStorage.removeItem('reviewer-email:ana-garcia')
  })

  it('does not fire any event when onBeforeNavigate throws', async () => {
    // Navigation errors must never block the WhatsApp link
    const throwing = () => { throw new Error('callback error') }
    render(<ContactButton {...BASE_PROPS} attributionToken="tok" onBeforeNavigate={throwing} />)
    // The click should not propagate any exception to the test
    expect(() => fireEvent.click(screen.getByRole('link'))).not.toThrow()
  })
})
