// Hará Match — Shared Design Constants
// Animation timing, easing curves, card layout, and shared data maps
// Used by: recommendations page, BottomSheet, and future components

// ============================================================================
// ANIMATION EASING
// ============================================================================

/** iOS spring-like easing — for slides, sheets, card snaps */
export const EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'

/** Smooth feel — for transitions, fades, crossfades */
export const TRANSITION_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

// ============================================================================
// ANIMATION TIMING
// ============================================================================

/** Bottom sheet slide up/down */
export const SHEET_ANIMATION_MS = 250

/** Reveal screen fade out */
export const REVEAL_EXIT_DURATION_MS = 320

/** Card deck fade in */
export const DECK_ENTER_DURATION_MS = 380

/** Card position change on swipe */
export const CARD_SWIPE_DURATION_MS = 500

// ============================================================================
// CARD DECK LAYOUT
// ============================================================================

/** Spacing between cards (88% = 12% visible peek of next card) */
export const CARD_SPACING_PERCENT = 88

/** Maximum card height as viewport percentage */
export const CARD_HEIGHT_VH = 70

/** Minimum card height for small screens */
export const CARD_MIN_HEIGHT_VH = 60

/** Absolute minimum card height in pixels */
export const CARD_MIN_HEIGHT_PX = 400

// ============================================================================
// CARD SCALING & OPACITY
// ============================================================================

/** Current card scale (no scaling) */
export const ACTIVE_CARD_SCALE = 1

/** Adjacent card scale (slightly smaller for depth) */
export const PEEK_CARD_SCALE = 0.985

/** Non-adjacent card scale (more noticeable reduction) */
export const FAR_CARD_SCALE = 0.90

/** Current card fully visible */
export const ACTIVE_CARD_OPACITY = 1

/** Adjacent cards semi-transparent */
export const PEEK_CARD_OPACITY = 0.65

/** Far cards very faint */
export const FAR_CARD_OPACITY = 0.25

// ============================================================================
// SWIPE BEHAVIOR
// ============================================================================

/** Reduces drag sensitivity for smoother feel */
export const DRAG_RESISTANCE_FACTOR = 3.5

// ============================================================================
// SHARED DATA MAPS
// ============================================================================

/** English specialty keys → Spanish display labels (all 12 curated specialties) */
export const SPECIALTY_MAP: Record<string, string> = {
  anxiety: 'Ansiedad',
  depression: 'Depresión',
  stress: 'Estrés',
  trauma: 'Trauma',
  relationships: 'Relaciones',
  'self-esteem': 'Autoestima',
  grief: 'Duelo',
  addiction: 'Adicciones',
  'eating-disorders': 'Trastornos alimentarios',
  couples: 'Terapia de pareja',
  family: 'Terapia familiar',
  children: 'Niños y adolescentes',
}

/** All curated specialty keys — use to distinguish curated vs custom */
export const CURATED_SPECIALTY_KEYS = Object.keys(SPECIALTY_MAP)

/** Specialty key → Tailwind color classes (using sp-* tokens from globals.css) */
export const SPECIALTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  anxiety:          { bg: 'bg-sp-teal-weak',    text: 'text-sp-teal',    border: 'border-sp-teal/20' },
  depression:       { bg: 'bg-sp-indigo-weak',  text: 'text-sp-indigo',  border: 'border-sp-indigo/20' },
  stress:           { bg: 'bg-sp-amber-weak',   text: 'text-sp-amber',   border: 'border-sp-amber/20' },
  trauma:           { bg: 'bg-sp-rose-weak',    text: 'text-sp-rose',    border: 'border-sp-rose/20' },
  relationships:    { bg: 'bg-sp-violet-weak',  text: 'text-sp-violet',  border: 'border-sp-violet/20' },
  'self-esteem':    { bg: 'bg-sp-cyan-weak',    text: 'text-sp-cyan',    border: 'border-sp-cyan/20' },
  grief:            { bg: 'bg-sp-slate-weak',   text: 'text-sp-slate',   border: 'border-sp-slate/20' },
  addiction:        { bg: 'bg-sp-orange-weak',  text: 'text-sp-orange',  border: 'border-sp-orange/20' },
  'eating-disorders': { bg: 'bg-sp-fuchsia-weak', text: 'text-sp-fuchsia', border: 'border-sp-fuchsia/20' },
  couples:          { bg: 'bg-sp-pink-weak',    text: 'text-sp-pink',    border: 'border-sp-pink/20' },
  family:           { bg: 'bg-sp-emerald-weak', text: 'text-sp-emerald', border: 'border-sp-emerald/20' },
  children:         { bg: 'bg-sp-sky-weak',     text: 'text-sp-sky',     border: 'border-sp-sky/20' },
}

/** Rank number → Spanish label for recommendations */
export const RANK_LABELS: Record<number, string> = {
  1: 'Mejor ajuste para vos',
  2: 'Muy compatible',
  3: 'Alternativa sólida',
}

// ============================================================================
// SHARED VALIDATORS
// ============================================================================

/** Validates that a recommendation reason is meaningful (≥10 chars) */
export function isValidReason(reason: string | null | undefined): boolean {
  return !!reason && reason.trim().length >= 10
}
