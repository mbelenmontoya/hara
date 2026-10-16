import { describe, it, expect } from 'vitest'
import { getMoonPhase, formatAlmanacDate } from './moon-phase'

describe('getMoonPhase', () => {
  it.each([
    ['2000-01-06T18:14:00Z', 'Luna nueva'],
    ['2000-01-09T18:14:00Z', 'Luna creciente'],
    ['2024-01-18T03:53:00Z', 'Cuarto creciente'],
    ['2024-01-25T17:54:00Z', 'Luna llena'],
    ['2024-01-31T20:00:00Z', 'Cuarto menguante'],
    ['2024-02-07T00:00:00Z', 'Luna menguante'],
  ])('%s is %s', (iso, label) => {
    expect(getMoonPhase(new Date(iso)).label).toBe(label)
  })

  it('flags only the waxing crescent, the one phase the design has artwork for', () => {
    expect(getMoonPhase(new Date('2000-01-09T18:14:00Z')).crescent).toBe(true)
    expect(getMoonPhase(new Date('2024-01-25T17:54:00Z')).crescent).toBe(false)
  })
})

describe('formatAlmanacDate', () => {
  it('formats weekday, day and month in capitals', () => {
    expect(formatAlmanacDate(new Date('2025-10-02T15:00:00Z'))).toBe('JUEVES 2 · OCTUBRE')
  })

  it('uses Argentina time, so 23:30 in Buenos Aires is still the previous day', () => {
    expect(formatAlmanacDate(new Date('2025-10-02T02:30:00Z'))).toBe('MIÉRCOLES 1 · OCTUBRE')
  })
})
