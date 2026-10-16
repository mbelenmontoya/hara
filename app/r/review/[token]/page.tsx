// Review link page (design 9d): public, gated by the token from the review email.
// Valid link: the form. Link already used (not expired): the saved review with "Editar mi reseña".
// Expired or unknown link: a short message.

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAllPractices } from '@/lib/practices'
import { resolveProfileSpecialties } from '@/lib/profile-specialties'
import { logError } from '@/lib/monitoring'
import { ReviewSubmitForm, type ReviewProfessional, type SavedReview } from './ReviewSubmitForm'

interface ReviewRequestRow {
  token: string
  consumed_at: string | null
  expires_at: string
  contact_event_id: string
  professionals: {
    full_name: string
    profile_image_url: string | null
    practices: string[] | null
    specialties: string[] | null
  } | null
}

type LinkState =
  | { kind: 'open'; professional: ReviewProfessional; savedReview: SavedReview | null }
  | { kind: 'consumed' | 'expired' | 'invalid' }

async function loadProfessional(row: NonNullable<ReviewRequestRow['professionals']>): Promise<ReviewProfessional> {
  const catalog = await getAllPractices()
  const resolved = resolveProfileSpecialties(
    { practiceKeys: row.practices ?? [], specialties: row.specialties ?? [] },
    catalog
  )
  const practiceKey = resolved.practiceKeys[0]
  return {
    name: row.full_name,
    photoUrl: row.profile_image_url?.startsWith('http') ? row.profile_image_url : null,
    practice: practiceKey ? catalog.find((p) => p.key === practiceKey)?.label ?? null : null,
    specialtyKey: resolved.specialtyKeys[0] ?? null,
  }
}

async function loadSavedReview(contactEventId: string): Promise<SavedReview | null> {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('rating, text, reviewer_name, tags')
    .eq('contact_event_id', contactEventId)
    .maybeSingle<{ rating: number; text: string | null; reviewer_name: string | null; tags: string[] | null }>()
  if (error) logError(error, { source: 'review-page.loadSavedReview' })
  if (!data) return null
  return { rating: data.rating, text: data.text, reviewerName: data.reviewer_name, tags: data.tags ?? [] }
}

async function loadLink(token: string): Promise<LinkState> {
  const { data, error } = await supabaseAdmin
    .from('review_requests')
    .select('token, consumed_at, expires_at, contact_event_id, professionals(full_name, profile_image_url, practices, specialties)')
    .eq('token', token)
    .maybeSingle<ReviewRequestRow>()

  if (error) logError(error, { source: 'review-page.loadLink' })
  if (!data?.professionals) return { kind: 'invalid' }
  if (new Date(data.expires_at) < new Date()) return { kind: 'expired' }

  const savedReview = data.consumed_at ? await loadSavedReview(data.contact_event_id) : null
  if (data.consumed_at && !savedReview) return { kind: 'consumed' }

  return { kind: 'open', professional: await loadProfessional(data.professionals), savedReview }
}

const CLOSED_COPY: Record<'consumed' | 'expired' | 'invalid', { title: string; body: string }> = {
  consumed: { title: 'Esta reseña ya fue enviada', body: 'Gracias por tu tiempo.' },
  expired: { title: 'Este link venció', body: 'Si querés dejar tu opinión, escribinos y te mandamos uno nuevo.' },
  invalid: { title: 'Link inválido', body: 'Este link no existe o está incompleto.' },
}

export default async function ReviewPage({ params }: { params: { token: string } }) {
  const link = await loadLink(params.token)

  return (
    <main className="font-almanac relative min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-md md:max-w-xl">
        {link.kind === 'open' ? (
          <ReviewSubmitForm token={params.token} professional={link.professional} savedReview={link.savedReview} />
        ) : (
          <div className="flex min-h-screen flex-col justify-center px-6">
            <img src="/assets/logo/isotipo.png" alt="Hara" className="h-8 w-7 object-contain" />
            <h1 className="font-almanac-serif mb-0 mt-[18px] text-[40px]" style={{ lineHeight: 1.02, letterSpacing: '-0.5px' }}>
              {CLOSED_COPY[link.kind].title}
            </h1>
            <span className="mt-2.5 block text-[15px] leading-[1.55] text-gray-700">{CLOSED_COPY[link.kind].body}</span>
          </div>
        )}
      </div>
    </main>
  )
}
