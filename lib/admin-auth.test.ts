import { describe, it, expect, afterEach } from 'vitest'
import { isAdminEmail } from './admin-auth'

describe('isAdminEmail', () => {
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
  })

  it('should accept an email in the list regardless of case and spaces', () => {
    process.env.ADMIN_EMAILS = ' Hola@HaraVital.com , otra@hara.com'
    expect(isAdminEmail('hola@haravital.com')).toBe(true)
    expect(isAdminEmail('OTRA@hara.com')).toBe(true)
  })

  it('should reject an email that is not in the list', () => {
    process.env.ADMIN_EMAILS = 'hola@haravital.com'
    expect(isAdminEmail('pro@example.com')).toBe(false)
  })

  it('should reject everyone when the list is missing or empty', () => {
    expect(isAdminEmail('hola@haravital.com')).toBe(false)
    process.env.ADMIN_EMAILS = ' , '
    expect(isAdminEmail('hola@haravital.com')).toBe(false)
  })

  it('should reject a missing email', () => {
    process.env.ADMIN_EMAILS = 'hola@haravital.com'
    expect(isAdminEmail(null)).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
    expect(isAdminEmail('')).toBe(false)
  })
})
