// Score display components for the admin review page
// ScoreRing: circular progress indicator showing total score
// ScoreBreakdown: per-criterion breakdown with editable scores

'use client'

import { useState } from 'react'
import { type ProfileScore } from '@/lib/profile-score'

const SCORE_THRESHOLDS = {
  strong: 80,
  acceptable: 50,
} as const

export function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40
  const filled = (score / 100) * circumference
  const color =
    score >= SCORE_THRESHOLDS.strong
      ? 'text-success'
      : score >= SCORE_THRESHOLDS.acceptable
        ? 'text-warning'
        : 'text-danger'

  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-surface-2"
        />
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
        <span className="text-xs text-muted">/ 100</span>
      </div>
    </div>
  )
}

const CRITERION_HINTS: Record<string, string> = {
  profileImage:           'Foto de perfil cargada (URL válida desde el bucket)',
  shortDescription:       'Descripción corta completada (al menos 1 caracter)',
  bio:                    'Biografía de al menos 50 caracteres',
  experienceDescription:  'Descripción de experiencia completada (al menos 1 caracter)',
  practices:              'Al menos 1 práctica holística seleccionada del catálogo',
  serviceType:            'Al menos 1 tipo de servicio seleccionado',
  locationClarity:        'Ciudad ingresada, o marcado como "solo online"',
  instagram:              'Usuario o URL de Instagram ingresado',
  whatsapp:               'Número de WhatsApp ingresado',
  modality:               'Modalidad de atención seleccionada (online / presencial)',
}

function dotColor(earned: number, weight: number) {
  if (earned === weight)  return 'bg-success-weak text-success'
  if (earned === 0)       return 'bg-danger-weak text-danger'
  return 'bg-warning-weak text-warning'
}

function dotIcon(earned: number, weight: number) {
  if (earned === weight) {
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )
  }
  if (earned === 0) {
    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
  // Partial — show a dash
  return <span className="text-[10px] font-bold leading-none">~</span>
}

function barColor(earned: number, weight: number) {
  if (earned === weight) return 'bg-success'
  if (earned === 0)      return 'bg-danger/30'
  return 'bg-warning'
}

interface ScoreBreakdownProps {
  breakdown: ProfileScore['breakdown']
  onOverride?: (key: string, value: number) => void
}

export function ScoreBreakdown({ breakdown, onOverride }: ScoreBreakdownProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [inputVal, setInputVal] = useState('')

  function startEdit(key: string, current: number) {
    setEditing(key)
    setInputVal(String(current))
  }

  function commit(key: string, weight: number) {
    const parsed = parseInt(inputVal, 10)
    const value = isNaN(parsed) ? 0 : Math.min(weight, Math.max(0, parsed))
    onOverride?.(key, value)
    setEditing(null)
  }

  return (
    <div className="space-y-3">
      {breakdown.map((criterion) => (
        <div key={criterion.key} className="flex items-start gap-3">
          {/* Status dot */}
          <div className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 ${dotColor(criterion.earned, criterion.weight)}`}>
            {dotIcon(criterion.earned, criterion.weight)}
          </div>

          <div className="flex-1 min-w-0">
            {/* Label + info tooltip */}
            <div className="flex items-center gap-1">
              <span className="text-sm text-foreground">{criterion.label}</span>
              {CRITERION_HINTS[criterion.key] && (
                <span className="relative group flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-muted/50 group-hover:text-muted cursor-default" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 rounded-xl bg-foreground px-3 py-2 text-xs text-surface leading-relaxed shadow-elevated z-20">
                    {CRITERION_HINTS[criterion.key]}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                  </span>
                </span>
              )}
            </div>

            {/* Score — click to edit when onOverride provided */}
            <div className="flex items-center gap-1 mt-0.5">
              {onOverride && editing === criterion.key ? (
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={criterion.weight}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onBlur={() => commit(criterion.key, criterion.weight)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commit(criterion.key, criterion.weight)
                      if (e.key === 'Escape') setEditing(null)
                    }}
                    className="w-10 text-xs font-medium text-center border border-brand rounded px-1 py-0 focus:outline-none"
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                  />
                  <span className="text-xs text-muted">/ {criterion.weight}</span>
                </span>
              ) : (
                <span
                  className={`text-xs font-medium ${
                    criterion.earned === criterion.weight ? 'text-success'
                    : criterion.earned === 0 ? 'text-muted'
                    : 'text-warning'
                  } ${onOverride ? 'cursor-pointer hover:underline' : ''}`}
                  onClick={() => onOverride && startEdit(criterion.key, criterion.earned)}
                  title={onOverride ? 'Clic para editar puntaje' : undefined}
                >
                  {criterion.earned}/{criterion.weight}
                </span>
              )}
            </div>

            <div className="mt-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor(criterion.earned, criterion.weight)}`}
                style={{ width: `${(criterion.earned / criterion.weight) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
