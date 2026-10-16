'use client'

// Review link form (design 9d): stars, "¿Qué fue cierto?" tags, the person's words and name,
// an anonymous switch, and a sticky "Publicar reseña" bar. After sending it shows ReviewThanks,
// and "Editar mi reseña" brings the form back to update the same review.
// No auth required: the token from the URL gates it.

import { useState } from 'react'
import { Alert } from '@/app/components/ui/Alert'
import { ALMANAC_INPUT_CLASS } from '@/app/solicitar/ConciergeSteps'
import { SPECIALTY_COLORS } from '@/lib/design-constants'
import { logError } from '@/lib/monitoring'
import { REVIEW_TAGS, STAR_LABELS, publicReviewerName } from '@/lib/review-form'
import { ReviewThanks } from './ReviewThanks'

const ANONYMOUS = 'Anónimo'
const STARS = [1, 2, 3, 4, 5] as const

export interface ReviewProfessional {
  name: string
  photoUrl: string | null
  practice: string | null
  specialtyKey: string | null
}

export interface SavedReview {
  rating: number
  text: string | null
  reviewerName: string | null
  tags: string[]
}

interface ReviewSubmitFormProps {
  token: string
  professional: ReviewProfessional
  savedReview: SavedReview | null
}

export function ReviewSubmitForm({ token, professional, savedReview }: ReviewSubmitFormProps) {
  const [rating, setRating] = useState(savedReview?.rating ?? 0)
  const [tags, setTags] = useState<string[]>(savedReview?.tags ?? [])
  const [text, setText] = useState(savedReview?.text ?? '')
  const [name, setName] = useState(savedReview?.reviewerName ?? '')
  const [anonymous, setAnonymous] = useState(savedReview ? savedReview.reviewerName == null : false)
  const [sent, setSent] = useState(savedReview != null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const who = anonymous ? ANONYMOUS : publicReviewerName(name) ?? ANONYMOUS
  const firstName = publicReviewerName(name)?.split(' ')[0] ?? null
  const toggleTag = (key: string) => setTags((t) => (t.includes(key) ? t.filter((k) => k !== key) : [...t, key]))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0 || loading) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          rating,
          text: text.trim() || null,
          reviewer_name: anonymous ? null : name.trim() || null,
          tags,
        }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const body = (await res.json()) as { error?: string }
        setError(body?.error ?? 'No se pudo enviar la reseña. Probá de nuevo.')
      }
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'ReviewSubmitForm' })
      setError('No se pudo conectar. Probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <ReviewThanks
        firstName={anonymous ? null : firstName}
        professionalFirstName={professional.name.split(/\s+/)[0]}
        rating={rating}
        text={text}
        who={who}
        tags={tags}
        onEdit={() => setSent(false)}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-[22px] pb-[130px] pt-6">
        <div className="flex justify-center">
          <img src="/assets/logo/isotipo.png" alt="Hara" className="h-8 w-7 object-contain" />
        </div>
        <ProfessionalCard professional={professional} />

        <h1 className="font-almanac-serif mb-0 mt-[26px] text-[40px]" style={{ lineHeight: 1.02, letterSpacing: '-0.5px' }}>
          ¿Cómo te <em className="text-brand">fue</em>?
        </h1>
        <StarPicker rating={rating} onPick={setRating} />
        <span className="font-almanac-serif mt-2 block text-xl italic text-brand-dark">{STAR_LABELS[rating]}</span>

        <span className="almanac-label mt-[26px] block text-muted">¿Qué fue cierto?</span>
        <TagChips selected={tags} onToggle={toggleTag} />

        <label htmlFor="review-text" className="almanac-label mt-6 block text-muted">En tus palabras</label>
        <textarea
          id="review-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Lo que le serviría leer a alguien que llega como llegaste vos."
          className={`${ALMANAC_INPUT_CLASS} mt-2.5 block min-h-[110px] w-full resize-none p-[15px] text-base leading-[1.55]`}
        />

        <label htmlFor="reviewer-name" className="almanac-label mt-6 block text-muted">Tu nombre</label>
        <input
          id="reviewer-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoComplete="given-name"
          className={`${ALMANAC_INPUT_CLASS} mt-2.5 block w-full px-[15px] py-3.5 text-base`}
        />

        <AnonymousRow anonymous={anonymous} who={who} onToggle={() => setAnonymous((a) => !a)} />
        {error && <div className="mt-4"><Alert variant="error">{error}</Alert></div>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-foreground/8 bg-background/95 px-5 pb-7 pt-3 backdrop-blur-lg">
        <div className="mx-auto max-w-md md:max-w-xl">
          <button
            type="submit"
            disabled={rating === 0 || loading}
            className="btn-press-glow w-full rounded-2xl bg-brand-dark p-[15px] text-[15px] font-medium text-gray-50 transition-colors disabled:bg-brand-dark/30"
          >
            Publicar reseña
          </button>
        </div>
      </div>
    </form>
  )
}

function StarPicker({ rating, onPick }: { rating: number; onPick: (stars: number) => void }) {
  return (
    <div className="mt-[18px] flex gap-1.5" role="group" aria-label="Calificación">
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          aria-label={star === 1 ? '1 estrella' : `${star} estrellas`}
          aria-pressed={rating === star}
          onClick={() => onPick(star)}
          className={`text-[40px] leading-none transition-colors ${star <= rating ? 'text-warning-dark' : 'text-foreground/16'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function TagChips({ selected, onToggle }: { selected: string[]; onToggle: (key: string) => void }) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-[7px]">
      {REVIEW_TAGS.map((tag) => {
        const on = selected.includes(tag.key)
        return (
          <button
            key={tag.key}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(tag.key)}
            className={`rounded-full border-[1.5px] px-[15px] py-[9px] text-[13.5px] font-medium transition-colors ${
              on ? 'border-foreground bg-foreground text-background' : 'border-foreground/14 bg-gray-50 text-foreground'
            }`}
          >
            {tag.label}
          </button>
        )
      })}
    </div>
  )
}

function ProfessionalCard({ professional }: { professional: ReviewProfessional }) {
  const dot = (professional.specialtyKey && SPECIALTY_COLORS[professional.specialtyKey]?.text) || 'text-brand'
  return (
    <div className="mt-[22px] flex items-center gap-3.5 rounded-[22px] bg-gray-50 p-3.5">
      {professional.photoUrl ? (
        <img src={professional.photoUrl} alt="" className="h-14 w-14 flex-none rounded-full object-cover" />
      ) : (
        <span className="font-almanac-serif flex h-14 w-14 flex-none items-center justify-center rounded-full bg-brand-weak text-2xl text-brand-dark" aria-hidden="true">
          {professional.name.charAt(0)}
        </span>
      )}
      <div>
        <span className="almanac-label block text-muted">Tu sesión</span>
        <span className="font-almanac-serif mt-1 block text-[23px] leading-[1.1]">{professional.name}</span>
        {professional.practice && (
          <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-gray-700">
            <span className={`h-[7px] w-[7px] rounded-full bg-current ${dot}`} aria-hidden="true" />
            {professional.practice}
          </span>
        )}
      </div>
    </div>
  )
}

function AnonymousRow({ anonymous, who, onToggle }: { anonymous: boolean; who: string; onToggle: () => void }) {
  return (
    <div className="mt-[18px] flex items-center gap-3 border-y border-foreground/12 py-3.5">
      <div className="flex-1">
        <span id="anonymous-label" className="block text-[15px]">Publicar sin mi nombre</span>
        <span className="mt-0.5 block text-[12.5px] text-muted">Se mostrará como “{who}”</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={anonymous}
        aria-labelledby="anonymous-label"
        onClick={onToggle}
        className={`relative h-[26px] w-11 flex-none rounded-[13px] transition-colors ${anonymous ? 'bg-brand-dark' : 'bg-foreground/18'}`}
      >
        <span
          className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-gray-50 shadow-soft transition-all ${anonymous ? 'left-5' : 'left-0.5'}`}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
