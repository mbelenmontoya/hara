import { describe, it, expect } from 'vitest'
import { roleOf } from './admin-auth'

describe('roleOf', () => {
  it('should read the role from app_metadata', () => {
    expect(roleOf({ app_metadata: { role: 'admin' } })).toBe('admin')
    expect(roleOf({ app_metadata: { role: 'professional' } })).toBe('professional')
  })

  it('should ignore user_metadata, which the user can edit themselves', () => {
    expect(roleOf({ app_metadata: {}, user_metadata: { role: 'admin' } })).toBeNull()
  })

  it('should give no role to unknown values, a missing role or no user', () => {
    expect(roleOf({ app_metadata: { role: 'superuser' } })).toBeNull()
    expect(roleOf({ app_metadata: { role: 'ADMIN' } })).toBeNull()
    expect(roleOf({ app_metadata: {} })).toBeNull()
    expect(roleOf({})).toBeNull()
    expect(roleOf(null)).toBeNull()
  })
})
