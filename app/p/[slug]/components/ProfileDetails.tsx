// Specialty tiles ("Para cuando llegas con") and the facts rows (service, modality, place).
// Each piece only renders when it has data; both return null when empty.

import { SPECIALTY_MAP, SPECIALTY_COLORS } from '@/lib/design-constants'

function TriangleGlyph({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 18" className={`w-[19px] h-[18px] flex-none ${className}`} fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
      <path strokeLinejoin="round" d="M10 2 18 16H2z" />
    </svg>
  )
}

function Tile({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <li className={`flex items-center gap-2.5 rounded-2xl py-2.5 pl-3 pr-3.5 ${bg}`}>
      <TriangleGlyph className={text} />
      <span className="font-almanac text-sm font-medium text-foreground">{label}</span>
    </li>
  )
}

interface ProfileDetailsProps {
  /** Curated specialty keys (see SPECIALTY_MAP), already resolved from the professional's practices. */
  specialties: string[]
}

export function ProfileDetails({ specialties }: ProfileDetailsProps) {
  if (specialties.length === 0) return null

  return (
    <section>
      <h2 className="almanac-label">PARA CUANDO LLEGAS CON</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {specialties.map((key) => {
          const colors = SPECIALTY_COLORS[key]
          return <Tile key={key} label={SPECIALTY_MAP[key] ?? key} bg={colors?.bg ?? 'bg-surface-2'} text={colors?.text ?? 'text-brand-dark'} />
        })}
      </ul>
    </section>
  )
}

interface ProfileDetailRowsProps {
  serviceTypeLabels: string[]
  modalityLabels: string[]
  location: string
}

export function ProfileDetailRows({ serviceTypeLabels, modalityLabels, location }: ProfileDetailRowsProps) {
  const rows = [
    { label: 'Servicio', value: serviceTypeLabels.join(' y ') },
    { label: 'Modalidad', value: modalityLabels.join(', ') },
    { label: 'Dónde', value: location },
  ].filter((row) => row.value)

  if (rows.length === 0) return null

  return (
    <dl className="border-t border-outline font-almanac text-[14.5px]">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-3 border-b border-outline py-3.5">
          <dt className="text-muted">{row.label}</dt>
          <dd className="text-right text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
