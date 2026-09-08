import audit from '@/data/budget-audit.json'
import { StaffResearchDesk } from '@/components/staff/StaffResearchDesk'
import { requireStaffSession } from '@/lib/staff-auth'
import { getStaffIssueSummaries } from '@/lib/staff-workspace'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StaffPage() {
  const session = await requireStaffSession()
  const issues = await getStaffIssueSummaries()

  return (
    <StaffResearchDesk
      session={session}
      issues={issues.map((issue) => ({
        slug: issue.slug,
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        decisionDate: issue.decision_date?.toISOString() ?? null,
        openTasks: issue.staff_tasks.filter((task) => task.status === 'open').length,
        pendingClaims: issue.staff_claims.filter((claim) => claim.verification_status === 'pending').length,
      }))}
      auditStatus={{ checks: audit.gate.passed, generatedAt: audit.generatedAt }}
    />
  )
}
