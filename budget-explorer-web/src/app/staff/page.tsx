import { StaffWorkspace } from '@/components/staff/StaffWorkspace'
import { requireStaffSession } from '@/lib/staff-auth'
import { getStaffWorkspace } from '@/lib/staff-workspace'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StaffPage() {
  const session = await requireStaffSession()
  const workspace = await getStaffWorkspace()
  if (!workspace) throw new Error('The staff workspace has not been initialized.')

  return <StaffWorkspace workspace={workspace} session={session} />
}
