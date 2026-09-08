export const STAFF_ROLES = [
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
