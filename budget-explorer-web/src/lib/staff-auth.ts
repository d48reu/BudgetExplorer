import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { STAFF_ROLES, type StaffRole, type StaffSession } from '@/lib/staff-types'

const COOKIE_NAME = 'budget_explorer_staff'
const SESSION_SECONDS = 60 * 60 * 12
const HASH_PREFIX = 'scrypt'

function sessionSecret() {
  const secret = process.env.STAFF_SESSION_SECRET
  if (!secret || secret.length < 32) return null
  return secret
}

function signature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createStaffSessionToken(
  session: Omit<StaffSession, 'expiresAt'>,
  secret: string,
  now = Date.now()
) {
  const payload = Buffer.from(
    JSON.stringify({
      ...session,
      expiresAt: now + SESSION_SECONDS * 1000,
    })
  ).toString('base64url')
  return `${payload}.${signature(payload, secret)}`
}

export function verifyStaffSessionToken(
  token: string,
  secret: string,
  now = Date.now()
): StaffSession | null {
  const [payload, suppliedSignature, extra] = token.split('.')
  if (!payload || !suppliedSignature || extra) return null

  const expected = Buffer.from(signature(payload, secret), 'base64url')
  const supplied = Buffer.from(suppliedSignature, 'base64url')
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return null
  }

  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (
      typeof value.name !== 'string' ||
      !STAFF_ROLES.includes(value.role) ||
      typeof value.expiresAt !== 'number' ||
      value.expiresAt <= now
    ) {
      return null
    }
    return value as StaffSession
  } catch {
    return null
  }
}

export function verifyStaffAccessCode(code: string, storedHash?: string) {
  const encoded = storedHash ?? process.env.STAFF_ACCESS_CODE_HASH
  if (!encoded) return false

  const [prefix, saltHex, hashHex, extra] = encoded.split(':')
  if (prefix !== HASH_PREFIX || !saltHex || !hashHex || extra) return false

  try {
    const expected = Buffer.from(hashHex, 'hex')
    const actual = scryptSync(code, Buffer.from(saltHex, 'hex'), expected.length)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

export function staffAuthConfigured() {
  return Boolean(process.env.STAFF_ACCESS_CODE_HASH && sessionSecret())
}

export async function setStaffSession(name: string, role: StaffRole) {
  const secret = sessionSecret()
  if (!secret) throw new Error('Staff authentication is not configured.')

  const token = createStaffSessionToken({ name, role }, secret)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_SECONDS,
  })
}

export async function clearStaffSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const secret = sessionSecret()
  if (!secret) return null
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  return token ? verifyStaffSessionToken(token, secret) : null
}

export async function requireStaffSession(): Promise<StaffSession> {
  const session = await getStaffSession()
  if (!session) redirect('/staff/sign-in')
  return session
}
