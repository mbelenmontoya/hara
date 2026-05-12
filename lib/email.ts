// Hara Vital — Email utility
// Uses Resend for transactional emails
// Fails gracefully — email failures never block the main operation

import { Resend } from 'resend'

const ADMIN_EMAIL = 'centrovitalhara@gmail.com'
const FROM_EMAIL = 'Hara Vital <hola@haravital.app>'
const REPLY_TO   = 'centrovitalhara@gmail.com'

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

// Resolves the base URL for links in transactional emails. Replaces the
// previous inline pattern which had an operator-precedence bug
// (`A || B ? X : Y` parses as `(A || B) ? X : Y`, so NEXT_PUBLIC_SITE_URL
// was read but never used).
function emailBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  )
}

// Minimal HTML-escape for dynamic strings rendered into email bodies.
// Defense-in-depth: admin-typed text (rejection_reason, full_name) crosses
// a trust boundary into the pro's email client.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
      from:    FROM_EMAIL,
      to:      options.to,
      replyTo: REPLY_TO,
      subject: options.subject,
      html:    options.html,
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
        <h2 style="color: #1F1A24;">Nueva solicitud en Hara</h2>
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
  const baseUrl = emailBaseUrl()
  const reviewPath = `/admin/professionals/${professional.id}/review`
  const reviewUrl = `${baseUrl}/admin/login?redirect=${encodeURIComponent(reviewPath)}`

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `Nuevo profesional registrado — ${professional.full_name}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1F1A24;">Nuevo profesional en Hara</h2>
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

// ─── Review request email ─────────────────────────────────────────────────────

export async function notifyReviewRequest({
  to,
  professionalName,
  link,
}: {
  to: string
  professionalName: string
  link: string
}): Promise<boolean> {
  return sendEmail({
    to,
    subject: `¿Qué tal tu experiencia con ${professionalName}?`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #1F1A24;">
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">
          ¿Cómo te fue con ${professionalName}?
        </h2>
        <p style="font-size: 15px; color: #6B6374; margin-bottom: 24px; line-height: 1.6;">
          Hace una semana contactaste a ${professionalName} a través de Hara Vital.
          Si tuviste una sesión, nos ayudaría mucho conocer tu experiencia.
        </p>
        <a href="${link}"
           style="display: inline-block; padding: 14px 28px; background-color: #4B2BBF; color: #ffffff;
                  text-decoration: none; border-radius: 9999px; font-size: 15px; font-weight: 600;">
          Calificar mi experiencia
        </a>
        <p style="margin-top: 20px; font-size: 12px; color: #6B6374;">
          Solo lleva un minuto. Si no tuviste una sesión, ignorá este mensaje.
          <br />
          O copiá el enlace: ${link}
        </p>
      </div>
    `,
  })
}

// ─── Pro-facing: registration received ────────────────────────────────────────

export async function notifyRegistrationReceived({
  to,
  full_name,
}: {
  to: string
  full_name: string
}): Promise<boolean> {
  const safeName = escapeHtml(full_name)
  return sendEmail({
    to,
    subject: 'Recibimos tu solicitud en Hara',
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #1F1A24;">
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">
          Hola ${safeName},
        </h2>
        <p style="font-size: 15px; color: #1F1A24; line-height: 1.6; margin-bottom: 16px;">
          Recibimos tu solicitud para sumarte como profesional a Hara. Vamos a revisar tu perfil con calma — esto suele tomar unos pocos días.
        </p>
        <p style="font-size: 15px; color: #1F1A24; line-height: 1.6; margin-bottom: 16px;">
          Te escribimos en cuanto tengamos una respuesta. Si necesitás cambiar algo en tu solicitud mientras tanto, escribinos a ${ADMIN_EMAIL}.
        </p>
        <p style="font-size: 15px; color: #6B6374; line-height: 1.6; margin-top: 24px;">
          Gracias por confiar en Hara.
        </p>
      </div>
    `,
  })
}

// ─── Pro-facing: profile approved ─────────────────────────────────────────────

export async function notifyProfessionalApproved({
  to,
  full_name,
  slug,
}: {
  to: string
  full_name: string
  slug: string
}): Promise<boolean> {
  const safeName = escapeHtml(full_name)
  // slug is URL-safe by construction (app/api/professionals/register/route.ts:22-30
  // produces [a-z0-9-] only). No encoding needed.
  const profileUrl = `${emailBaseUrl()}/p/${slug}`
  return sendEmail({
    to,
    subject: '¡Tu perfil en Hara está activo!',
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #1F1A24;">
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">
          Hola ${safeName},
        </h2>
        <p style="font-size: 15px; color: #1F1A24; line-height: 1.6; margin-bottom: 24px;">
          Tu perfil ya está activo en Hara. Las personas que entren al directorio o reciban tus recomendaciones a través de nuestro sistema concierge pueden ver tu información y contactarte.
        </p>
        <div style="margin: 24px 0;">
          <a href="${profileUrl}" target="_blank" rel="noopener"
             style="display: inline-block; padding: 14px 28px; background-color: #4B2BBF; color: #ffffff;
                    text-decoration: none; border-radius: 9999px; font-size: 15px; font-weight: 600;">
            Ver mi perfil
          </a>
        </div>
        <p style="margin-top: 12px; font-size: 13px; color: #6B6374;">
          O copiá el enlace: ${profileUrl}
        </p>

        <h3 style="font-size: 16px; font-weight: 600; margin-top: 32px; margin-bottom: 8px; color: #1F1A24;">
          ¿Cómo te encuentran?
        </h3>
        <p style="font-size: 14px; color: #1F1A24; line-height: 1.6; margin-bottom: 16px;">
          Tu perfil aparece en <strong>/profesionales</strong>. También podemos recomendarte cuando alguien que busca ayuda holística llene el formulario de solicitud y vos seas un buen match.
        </p>

        <h3 style="font-size: 16px; font-weight: 600; margin-top: 24px; margin-bottom: 8px; color: #1F1A24;">
          ¿Cómo te contactan?
        </h3>
        <p style="font-size: 14px; color: #1F1A24; line-height: 1.6; margin-bottom: 16px;">
          Cuando alguien hace click en el botón de contacto de tu perfil, se abre un chat de WhatsApp directo a tu número. No filtramos ni intermediamos — la conversación es entre vos y el cliente.
        </p>

        <h3 style="font-size: 16px; font-weight: 600; margin-top: 24px; margin-bottom: 8px; color: #1F1A24;">
          ¿Querés actualizar algo?
        </h3>
        <p style="font-size: 14px; color: #1F1A24; line-height: 1.6; margin-bottom: 24px;">
          Por ahora, escribinos a ${ADMIN_EMAIL} y te lo cambiamos. Pronto vas a poder editarlo vos directamente.
        </p>

        <p style="font-size: 15px; color: #6B6374; line-height: 1.6; margin-top: 24px;">
          Te damos la bienvenida a Hara.
        </p>
      </div>
    `,
  })
}

// ─── Pro-facing: profile rejected ─────────────────────────────────────────────

export async function notifyProfessionalRejected({
  to,
  full_name,
  rejection_reason,
  resubmit_after,
}: {
  to: string
  full_name: string
  rejection_reason: string
  resubmit_after: string | Date
}): Promise<boolean> {
  const safeName = escapeHtml(full_name)
  // Trim before escape so the verbatim block doesn't carry leading/trailing
  // whitespace into the pro's inbox. Newlines INSIDE the text are preserved
  // because the wrapping <blockquote> uses `white-space: pre-line`.
  const safeReason = escapeHtml(rejection_reason.trim())
  const resubmitDate = new Date(resubmit_after).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return sendEmail({
    to,
    subject: 'Sobre tu solicitud en Hara',
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #1F1A24;">
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">
          Hola ${safeName},
        </h2>
        <p style="font-size: 15px; color: #1F1A24; line-height: 1.6; margin-bottom: 16px;">
          Gracias por aplicar a Hara. Después de revisar tu perfil, decidimos no avanzar con tu solicitud por ahora.
        </p>

        <p style="font-size: 14px; color: #6B6374; margin-top: 24px; margin-bottom: 8px;">
          <strong style="color: #1F1A24;">Razón:</strong>
        </p>
        <blockquote style="margin: 0 0 24px 0; padding: 12px 16px; border-left: 3px solid #4B2BBF; background-color: #F6F0E8; font-style: italic; color: #1F1A24; white-space: pre-line; font-size: 15px; line-height: 1.6;">${safeReason}</blockquote>

        <p style="font-size: 15px; color: #1F1A24; line-height: 1.6; margin-bottom: 16px;">
          Si querés volver a aplicar después de ajustar lo anterior, podés hacerlo a partir del <strong>${resubmitDate}</strong>.
        </p>
        <p style="font-size: 15px; color: #1F1A24; line-height: 1.6; margin-bottom: 16px;">
          Si tenés preguntas, escribinos a ${ADMIN_EMAIL}.
        </p>

        <p style="font-size: 15px; color: #6B6374; line-height: 1.6; margin-top: 24px;">
          Gracias de nuevo por tu interés.
        </p>
      </div>
    `,
  })
}
