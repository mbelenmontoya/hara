// Hará Match - Tracking Code Generator
// Format: M-<13-digit-timestamp>-<6-uppercase-alphanumeric>
// Alphabet: A-Z0-9 (36 symbols)
// Collision resistance: 36^6 = 2,176,782,336 combinations

import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6)

export function generateTrackingCode(): string {
  const timestamp = Date.now()
  const random = nanoid()
  return `M-${timestamp}-${random}`
}

export const TRACKING_CODE_REGEX = /^M-\d{13}-[A-Z0-9]{6}$/

export function isValidTrackingCode(code: string): boolean {
  return TRACKING_CODE_REGEX.test(code)
}
