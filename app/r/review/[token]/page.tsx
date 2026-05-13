// Review submission page — public, gated by single-use token.
// Three render states: valid (show form), consumed, expired/invalid.

import { supabaseAdmin } from '@/lib/supabase-admin'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { ReviewSubmitForm } from './ReviewSubmitForm'

interface ReviewRequest {
  token:             string
  consumed_at:       string | null
  expires_at:        string
  professional_name: string
  professional_slug: string
}

async function getReviewRequest(token: string): Promise<ReviewRequest | null> {
  const { data, error } = await supabaseAdmin
    .from('review_requests')
    .select('token, consumed_at, expires_at, professionals(full_name, slug)')
    .eq('token', token)
    .single()

  if (error || !data) return null

  const prof = Array.isArray(data.professionals)
    ? data.professionals[0]
    : data.professionals as { full_name: string; slug: string } | null

  if (!prof) return null

  return {
    token:             data.token,
    consumed_at:       data.consumed_at,
    expires_at:        data.expires_at,
    professional_name: prof.full_name,
    professional_slug: prof.slug,
  }
}

type TokenState = 'valid' | 'consumed' | 'expired' | 'invalid'

function getTokenState(request: ReviewRequest | null): TokenState {
  if (!request) return 'invalid'
  if (request.consumed_at) return 'consumed'
  if (new Date(request.expires_at) < new Date()) return 'expired'
  return 'valid'
}

const STATE_MESSAGES: Record<Exclude<TokenState, 'valid'>, { title: string; body: string }> = {
  consumed: {
    title: 'Ya compartiste tu reseña.',
    body: 'Gracias por tomarte el tiempo. Tu opinión ayuda a que otros encuentren al profesional indicado.',
  },
  expired: {
    title: 'Este enlace ya no está activo.',
    body: 'El tiempo para dejar tu reseña venció. Si querés compartir tu experiencia, escribinos a centrovitalhara@gmail.com.',
  },
  invalid: {
    title: 'No encontramos este enlace.',
    body: 'Puede que el link esté incompleto o haya cambiado. Si necesitás ayuda, escribinos a centrovitalhara@gmail.com.',
  },
}

export default async function ReviewPage({ params }: { params: { token: string } }) {
  const request = await getReviewRequest(params.token)
  const state   = getTokenState(request)

  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 max-w-md md:max-w-[960px] mx-auto px-4 pt-8 pb-12">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Tu reseña</h1>
          {state === 'valid' && request && (
            <p className="text-sm text-muted mt-1">sobre {request.professional_name}</p>
          )}
        </div>

        <GlassCard>
          {state === 'valid' && request ? (
            <ReviewSubmitForm
              token={request.token}
              professionalName={request.professional_name}
            />
          ) : (
            <div className="text-center py-6">
              <p className="text-xl mb-2">🔒</p>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {STATE_MESSAGES[state as keyof typeof STATE_MESSAGES]?.title}
              </h2>
              <p className="text-sm text-muted">{STATE_MESSAGES[state as keyof typeof STATE_MESSAGES]?.body}</p>
            </div>
          )}
        </GlassCard>

        <p className="text-xs text-muted text-center mt-6">
          Hara Vital — bienestar holístico con profesionales verificados.
        </p>
      </div>
    </div>
  )
}
