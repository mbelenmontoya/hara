// Almanac date line for the home page: today's date and the moon phase, in Spanish.
// The phase is an approximation (mean synodic month), accurate to about a day, which is enough
// for a decorative line.

const SYNODIC_MONTH_DAYS = 29.530588
// A known new moon: 2000-01-06 18:14 UTC.
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14)
const MS_PER_DAY = 86_400_000
const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

// Eight equal slices of the cycle, centred on new, first quarter, full and last quarter.
const PHASES = [
  'Luna nueva',
  'Luna creciente',
  'Cuarto creciente',
  'Gibosa creciente',
  'Luna llena',
  'Gibosa menguante',
  'Cuarto menguante',
  'Luna menguante',
] as const
const WAXING_CRESCENT_INDEX = 1

export interface MoonPhase {
  label: string
  /** True only for the waxing crescent, the one phase the design has artwork for. */
  crescent: boolean
}

export function getMoonPhase(date: Date): MoonPhase {
  const daysSince = (date.getTime() - REFERENCE_NEW_MOON_MS) / MS_PER_DAY
  const age = ((daysSince % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS
  const index = Math.floor((age / SYNODIC_MONTH_DAYS) * PHASES.length + 0.5) % PHASES.length
  return { label: PHASES[index], crescent: index === WAXING_CRESCENT_INDEX }
}

/** "JUEVES 2 · OCTUBRE" in Argentina time. */
export function formatAlmanacDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('weekday')} ${get('day')} · ${get('month')}`.toUpperCase()
}
