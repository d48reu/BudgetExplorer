export const DEFAULT_STAFF_ROLE = 'Staff' as const

export const STAFF_ROLES = [
  DEFAULT_STAFF_ROLE,
  'Chief of Staff',
  'Legislative team',
  'Policy staff',
  'Communications',
] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export type StaffSession = {
  name: string
  role: StaffRole
  expiresAt: number
}
