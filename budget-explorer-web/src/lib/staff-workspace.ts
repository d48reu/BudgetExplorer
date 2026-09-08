import prisma from '@/lib/prisma'

export const STAFF_BRIEF_SLUG = 'early-morning-metrobus-service'

export const CLAIM_STATUSES = [
  'verified',
  'reported',
  'pending',
  'conflicting',
] as const

export type ClaimStatus = (typeof CLAIM_STATUSES)[number]

export async function getStaffWorkspace(slug = STAFF_BRIEF_SLUG) {
  return prisma.staff_issue_briefs.findUnique({
    where: { slug },
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

export async function getStaffIssueSummaries() {
  return prisma.staff_issue_briefs.findMany({
    orderBy: [{ status: 'asc' }, { priority: 'asc' }, { decision_date: 'asc' }],
    include: {
      staff_claims: { select: { verification_status: true } },
      staff_tasks: { select: { status: true } },
    },
  })
}
