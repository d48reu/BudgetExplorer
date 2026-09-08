import prisma from '@/lib/prisma'

export const STAFF_BRIEF_SLUG = 'early-morning-metrobus-service'

export const CLAIM_STATUSES = [
  'verified',
  'reported',
  'pending',
  'conflicting',
] as const

export type ClaimStatus = (typeof CLAIM_STATUSES)[number]

export async function getStaffWorkspace() {
  return prisma.staff_issue_briefs.findUnique({
    where: { slug: STAFF_BRIEF_SLUG },
    include: {
      staff_claims: {
        orderBy: [{ display_order: 'asc' }, { id: 'asc' }],
      },
      staff_tasks: {
        orderBy: [{ status: 'asc' }, { due_date: 'asc' }, { id: 'asc' }],
      },
      staff_activity: {
        orderBy: { created_at: 'desc' },
        take: 12,
      },
    },
  })
}
