'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import {
  CLAIM_STATUSES,
  type ClaimStatus,
  STAFF_BRIEF_SLUG,
} from '@/lib/staff-workspace'
import {
  clearStaffSession,
  requireStaffSession,
  setStaffSession,
  verifyStaffAccessCode,
} from '@/lib/staff-auth'
import {
  STAFF_ROLES,
  type StaffRole,
  type StaffSession,
} from '@/lib/staff-types'

export type SignInState = { error: string | null }

function textField(formData: FormData, key: string, maximum = 4_000) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim().slice(0, maximum) : ''
}

function integerField(formData: FormData, key: string) {
  const value = Number.parseInt(textField(formData, key, 20), 10)
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid ${key}.`)
  return value
}

function staffRole(value: string): StaffRole | null {
  return STAFF_ROLES.includes(value as StaffRole) ? (value as StaffRole) : null
}

function claimStatus(value: string): ClaimStatus | null {
  return CLAIM_STATUSES.includes(value as ClaimStatus) ? (value as ClaimStatus) : null
}

function optionalHttpsUrl(value: string) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function recordActivity(
  briefId: number,
  action: string,
  details: string,
  session: StaffSession
) {
  return prisma.staff_activity.create({
    data: {
      brief_id: briefId,
      action,
      details,
      actor_name: session.name,
      actor_role: session.role,
    },
  })
}

export async function signInAction(
  _state: SignInState,
  formData: FormData
): Promise<SignInState> {
  const name = textField(formData, 'name', 100)
  const role = staffRole(textField(formData, 'role', 80))
  const accessCode = textField(formData, 'accessCode', 200)

  if (name.length < 2 || !role || !accessCode) {
    return { error: 'Enter your name, role, and office access code.' }
  }

  if (!verifyStaffAccessCode(accessCode)) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return { error: 'That access code was not accepted.' }
  }

  await setStaffSession(name, role)
  redirect('/staff')
}

export async function signOutAction() {
  await clearStaffSession()
  redirect('/staff/sign-in')
}

export async function updateClaimAction(formData: FormData) {
  const session = await requireStaffSession()
  const id = integerField(formData, 'claimId')
  const status = claimStatus(textField(formData, 'status', 30))
  const assignedTo = textField(formData, 'assignedTo', 80)
  const staffNote = textField(formData, 'staffNote')
  if (!status) throw new Error('Invalid claim status.')

  const claim = await prisma.staff_claims.findUnique({
    where: { id },
    select: { brief_id: true, claim_text: true },
  })
  if (!claim) throw new Error('Claim not found.')

  await prisma.$transaction([
    prisma.staff_claims.update({
      where: { id },
      data: {
        verification_status: status,
        assigned_to: assignedTo || null,
        staff_note: staffNote || null,
        updated_at: new Date(),
      },
    }),
    recordActivity(
      claim.brief_id,
      'claim-updated',
      `${claim.claim_text.slice(0, 120)} — ${status}`,
      session
    ),
  ])
  revalidatePath('/staff')
}

export async function addClaimAction(formData: FormData) {
  const session = await requireStaffSession()
  const brief = await prisma.staff_issue_briefs.findUnique({
    where: { slug: STAFF_BRIEF_SLUG },
    select: { id: true },
  })
  if (!brief) throw new Error('Issue brief not found.')

  const claimText = textField(formData, 'claimText')
  const sourceName = textField(formData, 'sourceName', 200)
  const status = claimStatus(textField(formData, 'status', 30))
  if (!claimText || !sourceName || !status) {
    throw new Error('Claim, source, and status are required.')
  }

  const sourceUrlValue = textField(formData, 'sourceUrl', 2_000)
  const sourceUrl = optionalHttpsUrl(sourceUrlValue)
  if (sourceUrlValue && !sourceUrl) throw new Error('Source URL must use HTTPS.')

  const maximumOrder = await prisma.staff_claims.aggregate({
    where: { brief_id: brief.id },
    _max: { display_order: true },
  })

  await prisma.$transaction([
    prisma.staff_claims.create({
      data: {
        brief_id: brief.id,
        display_value: textField(formData, 'displayValue', 80) || null,
        claim_text: claimText,
        source_name: sourceName,
        source_url: sourceUrl,
        source_locator: textField(formData, 'sourceLocator', 160) || null,
        verification_status: status,
        scope_note: textField(formData, 'scopeNote') || null,
        assigned_to: textField(formData, 'assignedTo', 80) || null,
        display_order: (maximumOrder._max.display_order ?? 0) + 10,
      },
    }),
    recordActivity(brief.id, 'claim-added', claimText.slice(0, 180), session),
  ])
  revalidatePath('/staff')
}

export async function updateTaskAction(formData: FormData) {
  const session = await requireStaffSession()
  const id = integerField(formData, 'taskId')
  const task = await prisma.staff_tasks.findUnique({
    where: { id },
    select: { brief_id: true, task_text: true, status: true },
  })
  if (!task) throw new Error('Task not found.')

  const nextStatus = task.status === 'done' ? 'open' : 'done'
  await prisma.$transaction([
    prisma.staff_tasks.update({
      where: { id },
      data: {
        status: nextStatus,
        completed_at: nextStatus === 'done' ? new Date() : null,
      },
    }),
    recordActivity(
      task.brief_id,
      nextStatus === 'done' ? 'task-completed' : 'task-reopened',
      task.task_text.slice(0, 180),
      session
    ),
  ])
  revalidatePath('/staff')
}

export async function addTaskAction(formData: FormData) {
  const session = await requireStaffSession()
  const brief = await prisma.staff_issue_briefs.findUnique({
    where: { slug: STAFF_BRIEF_SLUG },
    select: { id: true },
  })
  if (!brief) throw new Error('Issue brief not found.')

  const taskText = textField(formData, 'taskText')
  const ownerRole = textField(formData, 'ownerRole', 80)
  const dueDateValue = textField(formData, 'dueDate', 10)
  if (!taskText || !ownerRole) throw new Error('Task and owner are required.')

  const dueDate = dueDateValue ? new Date(`${dueDateValue}T00:00:00Z`) : null
  if (dueDate && Number.isNaN(dueDate.getTime())) throw new Error('Invalid due date.')

  await prisma.$transaction([
    prisma.staff_tasks.create({
      data: {
        brief_id: brief.id,
        task_text: taskText,
        owner_role: ownerRole,
        due_date: dueDate,
      },
    }),
    recordActivity(brief.id, 'task-added', taskText.slice(0, 180), session),
  ])
  revalidatePath('/staff')
}

export async function updatePostureAction(formData: FormData) {
  const session = await requireStaffSession()
  const brief = await prisma.staff_issue_briefs.findUnique({
    where: { slug: STAFF_BRIEF_SLUG },
    select: { id: true },
  })
  if (!brief) throw new Error('Issue brief not found.')

  const posture = textField(formData, 'officePosture')
  if (!posture) throw new Error('Office posture cannot be blank.')

  await prisma.$transaction([
    prisma.staff_issue_briefs.update({
      where: { id: brief.id },
      data: { office_posture: posture, updated_at: new Date() },
    }),
    recordActivity(brief.id, 'posture-updated', 'Updated the office posture.', session),
  ])
  revalidatePath('/staff')
}
