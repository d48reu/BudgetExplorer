import { notFound } from 'next/navigation'
import { StaffWorkspace } from '@/components/staff/StaffWorkspace'
import { requireStaffSession } from '@/lib/staff-auth'
import { getStaffWorkspace } from '@/lib/staff-workspace'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StaffIssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, session] = await Promise.all([params, requireStaffSession()])
  const workspace = await getStaffWorkspace(slug)
  if (!workspace) notFound()

  return <StaffWorkspace workspace={workspace} session={session} />
}
