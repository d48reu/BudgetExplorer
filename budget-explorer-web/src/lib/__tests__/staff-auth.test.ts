import { randomBytes, scryptSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  createStaffSessionToken,
  verifyStaffAccessCode,
  verifyStaffSessionToken,
} from '@/lib/staff-auth'
import { DEFAULT_STAFF_ROLE, STAFF_ROLES } from '@/lib/staff-types'

function accessCodeHash(code: string) {
  const salt = randomBytes(16)
  const hash = scryptSync(code, salt, 64)
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`
}

describe('staff authentication', () => {
  it('uses a general staff label for the simplified sign-in', () => {
    expect(DEFAULT_STAFF_ROLE).toBe('Staff')
    expect(STAFF_ROLES).toContain(DEFAULT_STAFF_ROLE)
  })

  it('accepts only the access code represented by the stored scrypt hash', () => {
    const encoded = accessCodeHash('correct horse battery staple')

    expect(verifyStaffAccessCode('correct horse battery staple', encoded)).toBe(true)
    expect(verifyStaffAccessCode('incorrect code', encoded)).toBe(false)
    expect(verifyStaffAccessCode('correct horse battery staple', 'malformed')).toBe(false)
  })

  it('signs, verifies, and expires staff sessions', () => {
    const secret = 'a-secure-test-secret-that-is-more-than-32-characters'
    const now = Date.UTC(2026, 8, 8, 14, 0, 0)
    const token = createStaffSessionToken(
      { name: 'Alex Rivera', role: 'Legislative team' },
      secret,
      now
    )

    expect(verifyStaffSessionToken(token, secret, now + 1_000)).toMatchObject({
      name: 'Alex Rivera',
      role: 'Legislative team',
    })
    expect(verifyStaffSessionToken(`${token}tampered`, secret, now)).toBeNull()
    expect(verifyStaffSessionToken(token, `${secret}-wrong`, now)).toBeNull()
    expect(verifyStaffSessionToken(token, secret, now + 13 * 60 * 60 * 1_000)).toBeNull()
  })
})
