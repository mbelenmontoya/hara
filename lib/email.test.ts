// Unit tests for the three pro-facing email functions added in
// docs/plans/2026-05-08-pro-approval-rejection-emails.md (Task 2).
// Asserts subject lines, body content, escape-regression coverage on
// admin-typed text (rejection_reason, full_name), and graceful-fail
// behavior when RESEND_API_KEY is unset or the send call rejects.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock the Resend module ────────────────────────────────────────────────────
//
// `lib/email.ts` lazy-loads the Resend client the first time `sendEmail` runs.
// We replace the constructor with a vi.fn that returns an object exposing a
// `emails.send` mock — this is the only thing the production code touches.

const mockSend = vi.fn()

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const ORIGINAL_KEY = process.env.RESEND_API_KEY

function getSentEmail(): { to: string; subject: string; html: string } {
  expect(mockSend).toHaveBeenCalledTimes(1)
  const callArg = mockSend.mock.calls[0][0]
  return callArg
}

beforeEach(async () => {
  vi.resetModules()
  mockSend.mockReset()
  mockSend.mockResolvedValue({ data: { id: 'mock-id' }, error: null })
  process.env.RESEND_API_KEY = 'test-key' // ensure resend client constructs
})

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.RESEND_API_KEY
  } else {
    process.env.RESEND_API_KEY = ORIGINAL_KEY
  }
})

// ── notifyRegistrationReceived ───────────────────────────────────────────────

describe('notifyRegistrationReceived', () => {
  it('sends an email with the PRD subject', async () => {
    const { notifyRegistrationReceived } = await import('./email')

    const ok = await notifyRegistrationReceived({
      to: 'pro@example.com',
      full_name: 'Laura Giraudo',
    })

    expect(ok).toBe(true)
    expect(getSentEmail().subject).toBe('Recibimos tu solicitud en Hara')
  })

  it('addresses the recipient by name (escaped)', async () => {
    const { notifyRegistrationReceived } = await import('./email')

    await notifyRegistrationReceived({
      to: 'pro@example.com',
      full_name: 'María <Test> Pérez',
    })

    const { html } = getSentEmail()
    expect(html).toContain('María &lt;Test&gt; Pérez')
    expect(html).not.toContain('María <Test> Pérez')
  })
})

// ── notifyProfessionalApproved ───────────────────────────────────────────────

describe('notifyProfessionalApproved', () => {
  it('sends an email with the PRD subject', async () => {
    const { notifyProfessionalApproved } = await import('./email')

    await notifyProfessionalApproved({
      to: 'pro@example.com',
      full_name: 'Laura Giraudo',
      slug: 'laura-giraudo',
    })

    expect(getSentEmail().subject).toBe('¡Tu perfil en Hara está activo!')
  })

  it('includes a link to /p/{slug} and the three explainer headings (no setupUrl = fallback)', async () => {
    const { notifyProfessionalApproved } = await import('./email')

    await notifyProfessionalApproved({
      to: 'pro@example.com',
      full_name: 'Laura',
      slug: 'laura-giraudo',
    })

    const { html } = getSentEmail()
    expect(html).toMatch(/<a [^>]*href="[^"]*\/p\/laura-giraudo"/)
    expect(html).toContain('¿Cómo te encuentran?')
    expect(html).toContain('¿Cómo te contactan?')
    expect(html).toContain('¿Querés actualizar algo?')
    // no setupUrl → no access-setup CTA
    expect(html).not.toContain('Configurá tu acceso')
  })

  it('renders "Configurá tu acceso" button when setupUrl is provided', async () => {
    const { notifyProfessionalApproved } = await import('./email')

    const setupUrl = 'https://haravital.app/pro/set-password?token_hash=abc&type=invite'
    await notifyProfessionalApproved({
      to: 'pro@example.com',
      full_name: 'Laura',
      slug: 'laura-giraudo',
      setupUrl,
    })

    const { html } = getSentEmail()
    expect(html).toContain('Configurá tu acceso')
    expect(html).toContain(setupUrl)
    // fallback copy is replaced by the CTA
    expect(html).not.toContain('¿Querés actualizar algo?')
  })
})

// ── notifyProfessionalRejected ───────────────────────────────────────────────

describe('notifyProfessionalRejected', () => {
  const futureDate = new Date('2026-07-15T12:00:00Z')

  it('sends an email with the PRD subject', async () => {
    const { notifyProfessionalRejected } = await import('./email')

    await notifyProfessionalRejected({
      to: 'pro@example.com',
      full_name: 'Laura',
      rejection_reason: 'El perfil necesita más detalle.',
      resubmit_after: futureDate,
    })

    expect(getSentEmail().subject).toBe('Sobre tu solicitud en Hara')
  })

  it('renders the rejection_reason inside a blockquote with white-space: pre-line', async () => {
    const { notifyProfessionalRejected } = await import('./email')

    await notifyProfessionalRejected({
      to: 'pro@example.com',
      full_name: 'Laura',
      rejection_reason: 'El perfil necesita más detalle.',
      resubmit_after: futureDate,
    })

    const { html } = getSentEmail()
    expect(html).toMatch(/<blockquote[^>]*white-space:\s*pre-line[^>]*>[\s\S]*El perfil necesita más detalle\./)
  })

  it('includes the resubmit date formatted in Spanish', async () => {
    const { notifyProfessionalRejected } = await import('./email')

    await notifyProfessionalRejected({
      to: 'pro@example.com',
      full_name: 'Laura',
      rejection_reason: 'reason',
      resubmit_after: futureDate,
    })

    const { html } = getSentEmail()
    // toLocaleDateString('es-AR', ...) on 2026-07-15 produces "15 de julio de 2026"
    expect(html).toContain('15 de julio de 2026')
  })

  it('escapes <script> tags in rejection_reason', async () => {
    const { notifyProfessionalRejected } = await import('./email')

    await notifyProfessionalRejected({
      to: 'pro@example.com',
      full_name: 'Laura',
      rejection_reason: '<script>alert(1)</script>',
      resubmit_after: futureDate,
    })

    const { html } = getSentEmail()
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it('escapes <img onerror="..."> in rejection_reason', async () => {
    const { notifyProfessionalRejected } = await import('./email')

    await notifyProfessionalRejected({
      to: 'pro@example.com',
      full_name: 'Laura',
      rejection_reason: '<img src=x onerror="alert(1)">',
      resubmit_after: futureDate,
    })

    const { html } = getSentEmail()
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    expect(html).not.toContain('<img src=x onerror="alert(1)">')
  })

  it('escapes HTML in full_name too', async () => {
    const { notifyProfessionalRejected } = await import('./email')

    await notifyProfessionalRejected({
      to: 'pro@example.com',
      full_name: '<b>Spammy</b>',
      rejection_reason: 'reason',
      resubmit_after: futureDate,
    })

    const { html } = getSentEmail()
    expect(html).toContain('&lt;b&gt;Spammy&lt;/b&gt;')
    expect(html).not.toContain('<b>Spammy</b>')
  })

  it('preserves multi-line rejection_reason with newline characters intact', async () => {
    const { notifyProfessionalRejected } = await import('./email')

    await notifyProfessionalRejected({
      to: 'pro@example.com',
      full_name: 'Laura',
      rejection_reason: 'Línea 1\nLínea 2',
      resubmit_after: futureDate,
    })

    const { html } = getSentEmail()
    // Both lines present
    expect(html).toContain('Línea 1')
    expect(html).toContain('Línea 2')
    // Newline survives (not converted to <br> — relies on white-space: pre-line)
    expect(html).toMatch(/Línea 1\nLínea 2/)
  })
})

// ── notifyProPasswordReset ────────────────────────────────────────────────────

describe('notifyProPasswordReset', () => {
  const SETUP_URL = 'https://haravital.app/pro/set-password?token_hash=abc&type=recovery'

  it('sends an email with the reset subject', async () => {
    const { notifyProPasswordReset } = await import('./email')

    const ok = await notifyProPasswordReset({ to: 'pro@example.com', setupUrl: SETUP_URL })

    expect(ok).toBe(true)
    expect(getSentEmail().subject).toContain('Restablecé')
  })

  it('includes the setupUrl as a CTA button in the email body', async () => {
    const { notifyProPasswordReset } = await import('./email')

    await notifyProPasswordReset({ to: 'pro@example.com', setupUrl: SETUP_URL })

    const { html } = getSentEmail()
    expect(html).toContain(SETUP_URL)
    expect(html).toContain('Crear nueva contraseña')
  })
})

// ── Graceful failure (parameterized) ─────────────────────────────────────────

describe('graceful-fail contract', () => {
  it('returns false (does not throw) when RESEND_API_KEY is unset — all 4 functions', async () => {
    delete process.env.RESEND_API_KEY
    vi.resetModules()

    const email = await import('./email')

    const a = await email.notifyRegistrationReceived({ to: 'x@y.com', full_name: 'X' })
    const b = await email.notifyProfessionalApproved({ to: 'x@y.com', full_name: 'X', slug: 'x' })
    const c = await email.notifyProfessionalRejected({
      to: 'x@y.com',
      full_name: 'X',
      rejection_reason: 'r',
      resubmit_after: new Date('2026-07-15T12:00:00Z'),
    })
    const d = await email.notifyProPasswordReset({ to: 'x@y.com', setupUrl: 'https://x/pro/set-password' })

    expect(a).toBe(false)
    expect(b).toBe(false)
    expect(c).toBe(false)
    expect(d).toBe(false)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('returns false (does not throw) when resend.emails.send rejects — all 4 functions', async () => {
    mockSend.mockReset()
    mockSend.mockRejectedValue(new Error('Resend API down'))

    const email = await import('./email')

    const a = await email.notifyRegistrationReceived({ to: 'x@y.com', full_name: 'X' })
    const b = await email.notifyProfessionalApproved({ to: 'x@y.com', full_name: 'X', slug: 'x' })
    const c = await email.notifyProfessionalRejected({
      to: 'x@y.com',
      full_name: 'X',
      rejection_reason: 'r',
      resubmit_after: new Date('2026-07-15T12:00:00Z'),
    })
    const d = await email.notifyProPasswordReset({ to: 'x@y.com', setupUrl: 'https://x/pro/set-password' })

    expect(a).toBe(false)
    expect(b).toBe(false)
    expect(c).toBe(false)
    expect(d).toBe(false)
  })
})
