import { formatDollarsAbbreviated } from '@/lib/format'
import type { SerializedDepartmentChange } from '@/types/budget'

type DepartmentChangePlotProps = {
  changes: SerializedDepartmentChange[]
  limit?: number
}

function signedDollars(cents: string) {
  const amount = Number(cents)
  const prefix = amount > 0 ? '+' : amount < 0 ? '−' : ''
  return `${prefix}${formatDollarsAbbreviated(Math.abs(amount))}`
}

export function DepartmentChangePlot({
  changes,
  limit = 12,
}: DepartmentChangePlotProps) {
  const movers = changes
    .filter((change) => Number(change.operatingChange) !== 0)
    .slice(0, limit)
  const maxChange = Math.max(
    ...movers.map((change) => Math.abs(Number(change.operatingChange))),
    1
  )

  return (
    <figure>
      <div className="grid grid-cols-[minmax(7rem,1fr)_minmax(8rem,1.4fr)_4.5rem] items-end gap-3 border-b border-text-primary pb-3 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-text-secondary sm:grid-cols-[minmax(13rem,1.2fr)_minmax(16rem,2fr)_6rem] sm:text-xs">
        <span>Department</span>
        <span className="grid grid-cols-2">
          <span>Decrease</span>
          <span className="text-right">Increase</span>
        </span>
        <span className="text-right">Change</span>
      </div>
      <ol>
        {movers.map((change) => {
          const amount = Number(change.operatingChange)
          const width = (Math.abs(amount) / maxChange) * 50
          const employeeText =
            change.employeeChange == null
              ? null
              : `${change.employeeChange > 0 ? '+' : ''}${change.employeeChange} positions`

          return (
            <li
              key={change.id}
              className="grid grid-cols-[minmax(7rem,1fr)_minmax(8rem,1.4fr)_4.5rem] items-center gap-3 border-b border-border-strong py-4 sm:grid-cols-[minmax(13rem,1.2fr)_minmax(16rem,2fr)_6rem]"
              aria-label={`${change.name}: ${formatDollarsAbbreviated(change.baselineOperating)} restated adopted to ${formatDollarsAbbreviated(change.proposedOperating)} proposed, ${signedDollars(change.operatingChange)} change${employeeText ? `, ${employeeText}` : ''}`}
            >
              <div className="min-w-0">
                <p className="truncate font-heading text-sm font-semibold text-text-primary sm:text-base">
                  {change.name}
                </p>
                <p className="mt-1 truncate text-[0.65rem] tabular-nums text-text-muted sm:text-xs">
                  {formatDollarsAbbreviated(change.baselineOperating)} →{' '}
                  {formatDollarsAbbreviated(change.proposedOperating)}
                  {employeeText ? ` · ${employeeText}` : ''}
                </p>
              </div>
              <div className="relative h-5" aria-hidden="true">
                <div className="absolute inset-y-0 left-1/2 w-px bg-text-muted" />
                <div
                  className="absolute top-1/2 h-3 -translate-y-1/2"
                  style={{
                    backgroundColor: amount >= 0 ? '#0057B8' : '#F7941D',
                    left: amount >= 0 ? '50%' : `${50 - width}%`,
                    width: `${width}%`,
                  }}
                />
              </div>
              <p className="text-right font-heading text-sm font-bold tabular-nums text-text-primary sm:text-base">
                {signedDollars(change.operatingChange)}
              </p>
            </li>
          )
        })}
      </ol>
      <figcaption className="mt-5 text-sm leading-6 text-text-secondary">
        Largest absolute operating changes. The baseline is the FY 2025–26 adopted budget restated in the proposal’s department and priority structure.
      </figcaption>
    </figure>
  )
}
