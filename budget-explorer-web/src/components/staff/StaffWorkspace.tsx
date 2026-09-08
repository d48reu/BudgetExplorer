import clsx from 'clsx'
import type { StaffSession } from '@/lib/staff-types'
import { CLAIM_STATUSES, getStaffWorkspace } from '@/lib/staff-workspace'
import {
  addClaimAction,
  addTaskAction,
  signOutAction,
  updateClaimAction,
  updatePostureAction,
  updateTaskAction,
} from '@/app/staff/actions'
import { StatusBadge } from '@/components/staff/StatusBadge'

type Workspace = NonNullable<Awaited<ReturnType<typeof getStaffWorkspace>>>

const statusLabels: Record<string, string> = {
  verified: 'Verified',
  reported: 'Reported',
  pending: 'Pending evidence',
  conflicting: 'Conflicting sources',
}

function formatDate(value: Date | null | undefined, includeYear = true) {
  if (!value) return 'No date set'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: includeYear ? 'numeric' : undefined,
    timeZone: 'UTC',
  }).format(value)
}

function formatActivityDate(value: Date | null | undefined) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  }).format(value)
}

function safeSourceUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function StaffWorkspace({
  workspace,
  session,
}: {
  workspace: Workspace
  session: StaffSession
}) {
  const claims = workspace.staff_claims
  const tasks = workspace.staff_tasks
  const openTasks = tasks.filter((task) => task.status === 'open')
  const counts = Object.fromEntries(
    CLAIM_STATUSES.map((status) => [
      status,
      claims.filter((claim) => claim.verification_status === status).length,
    ])
  )
  const keyClaims = claims.slice(0, 4)

  return (
    <div className="-mb-16 min-h-screen bg-[#E9EDF0] text-slate-950 md:-mt-16">
      <header className="border-b border-slate-700 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline gap-3">
            <p className="font-heading text-lg font-black">Budget Explorer</p>
            <span className="border-l border-slate-600 pl-3 text-sm font-bold uppercase tracking-[0.14em] text-sky-300">
              Staff
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{session.name}</p>
              <p className="text-xs text-slate-400">{session.role}</p>
            </div>
            <form action={signOutAction}>
              <button className="border border-slate-500 px-3 py-2 text-sm font-bold hover:border-white hover:bg-white hover:text-slate-950">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="border border-slate-950 bg-white">
          <div className="grid lg:grid-cols-[1fr_17rem]">
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-3 text-sm font-bold uppercase tracking-[0.1em]">
                <span className="bg-red-700 px-2.5 py-1 text-white">High priority</span>
                <span className="text-slate-500">Active review</span>
                <span className="text-slate-500">Internal only</span>
              </div>
              <h1 className="mt-5 max-w-4xl font-heading text-3xl font-black tracking-[-0.035em] sm:text-5xl">
                {workspace.title}
              </h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
                {workspace.summary}
              </p>
            </div>
            <div className="border-t border-slate-950 bg-[#FFF4E6] p-5 lg:border-l lg:border-t-0 lg:p-7">
              <p className="text-sm font-black uppercase tracking-[0.12em] text-orange-800">Decision date</p>
              <p className="mt-2 font-heading text-3xl font-black">{formatDate(workspace.decision_date, false)}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">Final FY 2026-27 budget hearing</p>
              <div className="mt-6 border-t border-orange-300 pt-4">
                <p className="text-sm font-bold text-slate-700">{openTasks.length} open follow-ups</p>
                <p className="mt-1 text-sm text-slate-600">{counts.pending ?? 0} claims still need evidence</p>
              </div>
            </div>
          </div>

          <div className="grid border-t border-slate-950 sm:grid-cols-2 lg:grid-cols-4">
            {keyClaims.map((claim, index) => (
              <div
                key={claim.id}
                className={clsx(
                  'p-5',
                  index > 0 && 'border-t border-slate-300 sm:border-l sm:border-t-0',
                  index === 2 && 'sm:border-l-0 lg:border-l',
                  index >= 2 && 'sm:border-t lg:border-t-0'
                )}
              >
                <p className="font-mono text-2xl font-black tabular-nums">{claim.display_value}</p>
                <p className="mt-2 text-sm leading-5 text-slate-600">{claim.claim_text}</p>
                <div className="mt-3"><StatusBadge status={claim.verification_status} /></div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.75fr)]">
          <div className="space-y-6">
            <section className="grid border border-slate-950 bg-white lg:grid-cols-2">
              <div className="p-5 sm:p-6">
                <p className="text-sm font-black uppercase tracking-[0.12em] text-mdc-blue">Decision in front of us</p>
                <p className="mt-3 text-base leading-7 text-slate-700">{workspace.decision_needed}</p>
              </div>
              <div className="border-t border-slate-950 bg-slate-50 p-5 sm:p-6 lg:border-l lg:border-t-0">
                <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">Current office posture</p>
                <p className="mt-3 text-base leading-7 text-slate-700">{workspace.office_posture}</p>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold text-mdc-blue underline underline-offset-4">Edit posture</summary>
                  <form action={updatePostureAction} className="mt-3">
                    <textarea
                      name="officePosture"
                      defaultValue={workspace.office_posture}
                      rows={5}
                      required
                      className="w-full border border-slate-400 bg-white p-3 text-base leading-6"
                    />
                    <button className="mt-2 bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-mdc-blue">
                      Save posture
                    </button>
                  </form>
                </details>
              </div>
            </section>

            <section className="border border-slate-950 bg-white">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-950 p-5 sm:p-6">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.12em] text-mdc-blue">Source review</p>
                  <h2 className="mt-1 font-heading text-2xl font-black">Claim ledger</h2>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="font-bold text-emerald-800">{counts.verified ?? 0} verified</span>
                  <span className="text-slate-300">/</span>
                  <span className="font-bold text-blue-800">{counts.reported ?? 0} reported</span>
                  <span className="text-slate-300">/</span>
                  <span className="font-bold text-amber-800">{counts.pending ?? 0} pending</span>
                </div>
              </div>

              <div>
                {claims.map((claim) => {
                  const sourceUrl = safeSourceUrl(claim.source_url)
                  return (
                    <article key={claim.id} className="border-b border-slate-300 p-5 last:border-b-0 sm:p-6">
                      <div className="grid gap-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
                        <div>
                          <p className="font-mono text-xl font-black tabular-nums">{claim.display_value || 'Claim'}</p>
                          <div className="mt-2"><StatusBadge status={claim.verification_status} /></div>
                        </div>
                        <div>
                          <p className="text-base font-semibold leading-7">{claim.claim_text}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                            {sourceUrl ? (
                              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-mdc-blue underline underline-offset-4">
                                {claim.source_name} ↗
                              </a>
                            ) : (
                              <span className="font-bold">{claim.source_name}</span>
                            )}
                            {claim.source_locator && <span>{claim.source_locator}</span>}
                            {claim.assigned_to && <span>Owner: {claim.assigned_to}</span>}
                          </div>
                          {claim.scope_note && (
                            <p className="mt-3 border-l-2 border-slate-400 pl-3 text-sm leading-6 text-slate-600">{claim.scope_note}</p>
                          )}
                          {claim.staff_note && (
                            <p className="mt-3 bg-[#FFF4E6] px-3 py-2 text-sm leading-6 text-slate-800"><strong>Staff note:</strong> {claim.staff_note}</p>
                          )}
                          <details className="mt-4">
                            <summary className="cursor-pointer text-sm font-bold text-mdc-blue underline underline-offset-4">Review claim</summary>
                            <form action={updateClaimAction} className="mt-3 grid gap-3 border border-slate-300 bg-slate-50 p-4 sm:grid-cols-2">
                              <input type="hidden" name="claimId" value={claim.id} />
                              <label className="text-sm font-bold text-slate-700">
                                Status
                                <select name="status" defaultValue={claim.verification_status} className="mt-1.5 w-full border border-slate-400 bg-white px-3 py-2.5 text-base font-normal">
                                  {CLAIM_STATUSES.map((status) => (
                                    <option key={status} value={status}>{statusLabels[status]}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="text-sm font-bold text-slate-700">
                                Assigned to
                                <input name="assignedTo" defaultValue={claim.assigned_to ?? ''} className="mt-1.5 w-full border border-slate-400 bg-white px-3 py-2.5 text-base font-normal" />
                              </label>
                              <label className="text-sm font-bold text-slate-700 sm:col-span-2">
                                Staff note
                                <textarea name="staffNote" defaultValue={claim.staff_note ?? ''} rows={3} className="mt-1.5 w-full border border-slate-400 bg-white p-3 text-base font-normal leading-6" />
                              </label>
                              <div className="sm:col-span-2">
                                <button className="bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-mdc-blue">Save review</button>
                              </div>
                            </form>
                          </details>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              <details className="border-t border-slate-950 bg-slate-50 p-5 sm:p-6">
                <summary className="cursor-pointer font-heading text-lg font-black">Add a claim</summary>
                <form action={addClaimAction} className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold text-slate-700 sm:col-span-2">
                    Claim
                    <textarea name="claimText" required rows={3} className="mt-1.5 w-full border border-slate-400 bg-white p-3 text-base font-normal leading-6" />
                  </label>
                  <label className="text-sm font-bold text-slate-700">
                    Display value
                    <input name="displayValue" placeholder="$4.2M" className="mt-1.5 w-full border border-slate-400 bg-white px-3 py-2.5 text-base font-normal" />
                  </label>
                  <label className="text-sm font-bold text-slate-700">
                    Status
                    <select name="status" defaultValue="pending" className="mt-1.5 w-full border border-slate-400 bg-white px-3 py-2.5 text-base font-normal">
                      {CLAIM_STATUSES.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-bold text-slate-700">
                    Source name
                    <input name="sourceName" required className="mt-1.5 w-full border border-slate-400 bg-white px-3 py-2.5 text-base font-normal" />
                  </label>
                  <label className="text-sm font-bold text-slate-700">
                    Source locator
                    <input name="sourceLocator" placeholder="Memo, p. 4" className="mt-1.5 w-full border border-slate-400 bg-white px-3 py-2.5 text-base font-normal" />
                  </label>
                  <label className="text-sm font-bold text-slate-700 sm:col-span-2">
                    Source URL
                    <input name="sourceUrl" type="url" placeholder="https://" className="mt-1.5 w-full border border-slate-400 bg-white px-3 py-2.5 text-base font-normal" />
                  </label>
                  <label className="text-sm font-bold text-slate-700 sm:col-span-2">
                    Scope or caveat
                    <textarea name="scopeNote" rows={2} className="mt-1.5 w-full border border-slate-400 bg-white p-3 text-base font-normal leading-6" />
                  </label>
                  <label className="text-sm font-bold text-slate-700">
                    Assigned to
                    <input name="assignedTo" className="mt-1.5 w-full border border-slate-400 bg-white px-3 py-2.5 text-base font-normal" />
                  </label>
                  <div className="self-end">
                    <button className="bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-mdc-blue">Add to ledger</button>
                  </div>
                </form>
              </details>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="border border-slate-950 bg-white">
              <div className="border-b border-slate-950 p-5">
                <p className="text-sm font-black uppercase tracking-[0.12em] text-mdc-blue">Follow-up</p>
                <h2 className="mt-1 font-heading text-2xl font-black">Before the hearing</h2>
              </div>
              <div>
                {tasks.map((task) => (
                  <div key={task.id} className="flex gap-3 border-b border-slate-300 p-4 last:border-b-0">
                    <form action={updateTaskAction}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        aria-label={task.status === 'done' ? `Reopen: ${task.task_text}` : `Complete: ${task.task_text}`}
                        className={clsx(
                          'mt-0.5 flex h-6 w-6 items-center justify-center border-2 text-sm font-black',
                          task.status === 'done' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-500 hover:border-mdc-blue'
                        )}
                      >
                        {task.status === 'done' ? '✓' : ''}
                      </button>
                    </form>
                    <div>
                      <p className={clsx('text-sm font-semibold leading-6', task.status === 'done' && 'text-slate-500 line-through')}>{task.task_text}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                        {task.owner_role} · {formatDate(task.due_date, false)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <details className="border-t border-slate-950 bg-slate-50 p-4">
                <summary className="cursor-pointer text-sm font-bold text-mdc-blue underline underline-offset-4">Add follow-up</summary>
                <form action={addTaskAction} className="mt-3 space-y-3">
                  <label className="block text-sm font-bold text-slate-700">
                    Task
                    <textarea name="taskText" required rows={2} className="mt-1.5 w-full border border-slate-400 bg-white p-3 text-base font-normal" />
                  </label>
                  <label className="block text-sm font-bold text-slate-700">
                    Owner
                    <input name="ownerRole" required className="mt-1.5 w-full border border-slate-400 bg-white px-3 py-2.5 text-base font-normal" />
                  </label>
                  <label className="block text-sm font-bold text-slate-700">
                    Due date
                    <input name="dueDate" type="date" className="mt-1.5 w-full border border-slate-400 bg-white px-3 py-2.5 text-base font-normal" />
                  </label>
                  <button className="bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-mdc-blue">Add task</button>
                </form>
              </details>
            </section>

            <section className="border border-slate-950 bg-slate-950 p-5 text-white">
              <p className="text-sm font-black uppercase tracking-[0.12em] text-sky-300">Publication gate</p>
              <p className="mt-3 font-heading text-xl font-black">Nothing moves automatically.</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Reported and pending claims remain internal. Public language requires verified evidence and staff approval.
              </p>
            </section>

            <section className="border border-slate-950 bg-white">
              <div className="border-b border-slate-950 p-5">
                <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">Activity</p>
                <h2 className="mt-1 font-heading text-xl font-black">Recent changes</h2>
              </div>
              <ol>
                {workspace.staff_activity.map((item) => (
                  <li key={item.id} className="border-b border-slate-300 p-4 last:border-b-0">
                    <p className="text-sm font-bold">{item.details || item.action}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {item.actor_name} · {item.actor_role}<br />{formatActivityDate(item.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
