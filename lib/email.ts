// Hará Match — Email utility
// Uses Resend for transactional emails
// Fails gracefully — email failures never block the main operation

import { Resend } from 'resend'

const ADMIN_EMAIL = 'mariabmontoya@gmail.com'
const FROM_EMAIL = 'onboarding@resend.dev' // Change to your domain after verification

let resend: Resend | null = null

function getResend(): Resend | null {
  if (!resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) {
      console.warn('RESEND_API_KEY not set — emails disabled')
      return null
    }
    resend = new Resend(key)
  }
  return resend
}

interface EmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  const client = getResend()
  if (!client) return false

  try {
    await client.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
    return true
  } catch (error) {
    console.error('Email send failed:', error)
    return false
  }
}

// ============================================================================
// NOTIFICATION EMAILS
// ============================================================================

/** Notify admin when a new lead submits the intake form */
export async function notifyNewLead(lead: {
  intent_tags: string[]
  country: string
  city?: string
  whatsapp: string
  urgency?: string
  modality_preference?: string[]
}): Promise<boolean> {
  const urgencyLabel = lead.urgency === 'high' ? '🔴 URGENTE' : lead.urgency === 'medium' ? '🟡 Pronto' : '🟢 Explorando'
  const locationParts = [lead.city, lead.country].filter(Boolean).join(', ')
  const modalityText = lead.modality_preference?.join(', ') || 'No especificó'
  const intentText = lead.intent_tags.join(', ')

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `${urgencyLabel} Nueva solicitud — ${intentText}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1F1A24;">Nueva solicitud en Hará</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6B6374; font-size: 14px;">Busca ayuda con</td>
            <td style="padding: 8px 0; color: #1F1A24; font-size: 14px; font-weight: 500;">${intentText}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6374; font-size: 14px;">Ubicación</td>
            <td style="padding: 8px 0; color: #1F1A24; font-size: 14px;">${locationParts}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6374; font-size: 14px;">Modalidad</td>
            <td style="padding: 8px 0; color: #1F1A24; font-size: 14px;">${modalityText}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6374; font-size: 14px;">Urgencia</td>
            <td style="padding: 8px 0; color: #1F1A24; font-size: 14px;">${urgencyLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6374; font-size: 14px;">WhatsApp</td>
            <td style="padding: 8px 0; color: #1F1A24; font-size: 14px;">${lead.whatsapp}</td>
          </tr>
        </table>
        <p style="margin-top: 24px; font-size: 13px; color: #6B6374;">
          Revisá la solicitud en el panel de admin y creá un match.
        </p>
      </div>
    `,
  })
}

/** Notify admin when a new professional registers */
export async function notifyNewProfessional(professional: {
  id: string
  full_name: string
  email: string
  whatsapp: string
  country: string
  specialties: string[]
}): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
  const reviewPath = `/admin/professionals/${professional.id}/review`
  const reviewUrl = `${baseUrl}/admin/login?redirect=${encodeURIComponent(reviewPath)}`

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `Nuevo profesional registrado — ${professional.full_name}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1F1A24;">Nuevo profesional en Hará</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6B6374; font-size: 14px;">Nombre</td>
            <td style="padding: 8px 0; color: #1F1A24; font-size: 14px; font-weight: 500;">${professional.full_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6374; font-size: 14px;">Email</td>
            <td style="padding: 8px 0; color: #1F1A24; font-size: 14px;">${professional.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6374; font-size: 14px;">WhatsApp</td>
            <td style="padding: 8px 0; color: #1F1A24; font-size: 14px;">${professional.whatsapp}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6374; font-size: 14px;">País</td>
            <td style="padding: 8px 0; color: #1F1A24; font-size: 14px;">${professional.country}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6374; font-size: 14px;">Especialidades</td>
            <td style="padding: 8px 0; color: #1F1A24; font-size: 14px;">${professional.specialties.join(', ')}</td>
          </tr>
        </table>
        <div style="margin-top: 24px;">
          <a href="${reviewUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4B2BBF; color: #ffffff; text-decoration: none; border-radius: 9999px; font-size: 14px; font-weight: 600;">
            Revisar perfil
          </a>
        </div>
        <p style="margin-top: 16px; font-size: 13px; color: #6B6374;">
          O copiá este enlace: ${reviewUrl}
        </p>
      </div>
    `,
  })
}
