// Hara Vital — Shared Design Constants
// Easing curves and shared data maps (specialties, colors, recommendation reasons)

// ============================================================================
// ANIMATION EASING
// ============================================================================

/** iOS spring-like easing — for slides, sheets, card snaps */
export const EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'

/** Smooth feel — for transitions, fades, crossfades */
export const TRANSITION_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

// ============================================================================
// SHARED DATA MAPS
// ============================================================================

/** Holistic specialty keys → Spanish display labels (all 12 curated specialties) */
export const SPECIALTY_MAP: Record<string, string> = {
  'estres-ansiedad':      'Estrés y ansiedad',
  'bloqueos-emocionales': 'Bloqueos emocionales',
  'autoconocimiento':     'Autoconocimiento',
  'duelo-perdidas':       'Duelo y pérdidas',
  'vinculos-relaciones':  'Vínculos y relaciones',
  'pareja':               'Pareja',
  'familia-linaje':       'Familia y linaje',
  'miedos-creencias':     'Miedos y creencias limitantes',
  'proposito-vida':       'Propósito y dirección vital',
  'equilibrio-energetico':'Equilibrio energético',
  'transiciones-vitales': 'Transiciones vitales',
  'trauma-heridas':       'Heridas del pasado',
}

/** All curated specialty keys — use to distinguish curated vs custom */
export const CURATED_SPECIALTY_KEYS = Object.keys(SPECIALTY_MAP)

/** Specialty key → Tailwind color classes (using sp-* tokens from globals.css) */
export const SPECIALTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'estres-ansiedad':       { bg: 'bg-sp-teal-weak',    text: 'text-sp-teal',    border: 'border-sp-teal/20' },
  'bloqueos-emocionales':  { bg: 'bg-sp-indigo-weak',  text: 'text-sp-indigo',  border: 'border-sp-indigo/20' },
  'autoconocimiento':      { bg: 'bg-sp-cyan-weak',    text: 'text-sp-cyan',    border: 'border-sp-cyan/20' },
  'duelo-perdidas':        { bg: 'bg-sp-slate-weak',   text: 'text-sp-slate',   border: 'border-sp-slate/20' },
  'vinculos-relaciones':   { bg: 'bg-sp-violet-weak',  text: 'text-sp-violet',  border: 'border-sp-violet/20' },
  'pareja':                { bg: 'bg-sp-pink-weak',    text: 'text-sp-pink',    border: 'border-sp-pink/20' },
  'familia-linaje':        { bg: 'bg-sp-emerald-weak', text: 'text-sp-emerald', border: 'border-sp-emerald/20' },
  'miedos-creencias':      { bg: 'bg-sp-amber-weak',   text: 'text-sp-amber',   border: 'border-sp-amber/20' },
  'proposito-vida':        { bg: 'bg-sp-orange-weak',  text: 'text-sp-orange',  border: 'border-sp-orange/20' },
  'equilibrio-energetico': { bg: 'bg-sp-fuchsia-weak', text: 'text-sp-fuchsia', border: 'border-sp-fuchsia/20' },
  'transiciones-vitales':  { bg: 'bg-sp-rose-weak',    text: 'text-sp-rose',    border: 'border-sp-rose/20' },
  'trauma-heridas':        { bg: 'bg-sp-sky-weak',     text: 'text-sp-sky',     border: 'border-sp-sky/20' },
}

/** Modality key → Spanish display label (merged from all display surfaces) */
export const MODALITY_MAP: Record<string, string> = {
  online: 'Online',
  presencial: 'Presencial',
  ambos: 'Online y presencial',
  'in-person': 'Presencial',
  both: 'Online y presencial',
}

/** Service type key → Spanish display label */
export const SERVICE_TYPE_MAP: Record<string, string> = {
  individual: 'Sesiones individuales',
  grupal: 'Sesiones grupales',
}

/** Professional status → badge label + variant */
export const STATUS_CONFIG: Record<string, { label: string; variant: 'new' | 'converted' | 'closed' | 'default' }> = {
  submitted: { label: 'Pendiente de revisión', variant: 'new' },
  active:    { label: 'Activo', variant: 'converted' },
  rejected:  { label: 'Rechazado', variant: 'closed' },
  draft:     { label: 'Borrador', variant: 'default' },
  paused:    { label: 'Pausado', variant: 'default' },
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
