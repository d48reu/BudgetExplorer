import Link from 'next/link'
import { formatDollarsAbbreviated, formatYoYChange } from '@/lib/format'
import type { SerializedDepartmentChange } from '@/types/budget'

type DepartmentProposalSnapshotProps = {
  change: SerializedDepartmentChange
}

export function DepartmentProposalSnapshot({
  change,
}: DepartmentProposalSnapshotProps) {
  const operatingChange = formatYoYChange(
    change.proposedOperating,
    change.baselineOperating
  )
  const changeColor =
    operatingChange.direction === 'increase'
      ? 'text-change-increase'
      : operatingChange.direction === 'decrease'
        ? 'text-change-decrease'
        : 'text-text-secondary'

  return (
    <div>
      <dl className="grid border-y border-text-primary md:grid-cols-3">
        <div className="py-5 md:pr-6">
          <dt className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
            Operating
          </dt>
          <dd className="mt-2 font-heading text-2xl font-bold tabular-nums text-text-primary">
            {formatDollarsAbbreviated(change.baselineOperating)}
            <span className="mx-2 text-text-muted" aria-hidden="true">
              →
            </span>
            {formatDollarsAbbreviated(change.proposedOperating)}
          </dd>
          <p className={`mt-2 text-sm font-bold tabular-nums ${changeColor}`}>
            {operatingChange.value} from the restated adopted baseline
          </p>
        </div>
        <div className="border-t border-text-primary py-5 md:border-l md:border-t-0 md:px-6">
          <dt className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
            Funded positions
          </dt>
          <dd className="mt-2 font-heading text-2xl font-bold tabular-nums text-text-primary">
            {change.baselineEmployees?.toLocaleString('en-US') ?? '—'}
            <span className="mx-2 text-text-muted" aria-hidden="true">
              →
            </span>
            {change.proposedEmployees?.toLocaleString('en-US') ?? '—'}
          </dd>
          <p className="mt-2 text-sm text-text-secondary">
            {change.employeeChange == null
              ? 'Comparable position count unavailable'
              : `${change.employeeChange > 0 ? '+' : ''}${change.employeeChange.toLocaleString('en-US')} positions`}
          </p>
        </div>
        <div className="border-t border-text-primary py-5 md:border-l md:border-t-0 md:pl-6">
          <dt className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
            Proposed capital
          </dt>
          <dd className="mt-2 font-heading text-2xl font-bold tabular-nums text-text-primary">
            {formatDollarsAbbreviated(change.proposedCapital)}
          </dd>
          <p className="mt-2 text-sm text-text-secondary">
            Proposal only; no restated capital baseline is published.
          </p>
        </div>
      </dl>
      <Link
        href={`/compare?department=${encodeURIComponent(change.slug)}`}
        className="mt-5 inline-block font-heading text-sm font-bold underline decoration-mdc-blue decoration-2 underline-offset-4 hover:text-mdc-blue"
      >
        View in the full release comparison <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}
