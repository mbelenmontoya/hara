// Score display components for the admin review page
// ScoreRing: circular progress indicator showing total score
// ScoreBreakdown: per-criterion breakdown with pass/fail icons

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

export function ScoreBreakdown({ breakdown }: { breakdown: ProfileScore['breakdown'] }) {
  return (
    <div className="space-y-3">
      {breakdown.map((criterion) => (
        <div key={criterion.key} className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
            criterion.met ? 'bg-success-weak text-success' : 'bg-danger-weak text-danger'
          }`}>
            {criterion.met ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{criterion.label}</span>
              <span className={`text-xs font-medium ${criterion.met ? 'text-success' : 'text-muted'}`}>
                {criterion.earned}/{criterion.weight}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${criterion.met ? 'bg-success' : 'bg-danger/30'}`}
                style={{ width: `${(criterion.earned / criterion.weight) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
