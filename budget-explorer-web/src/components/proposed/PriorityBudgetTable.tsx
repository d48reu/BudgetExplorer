import { formatDollarsAbbreviated, formatDollarsFull } from '@/lib/format'
import type { SerializedProposedPriority } from '@/types/budget'

type PriorityBudgetTableProps = {
  priorities: SerializedProposedPriority[]
  grossOperating: string
}

export function PriorityBudgetTable({
  priorities,
  grossOperating,
}: PriorityBudgetTableProps) {
  return (
    <div className="border-t-2 border-text-primary">
      <div className="md:hidden">
        {priorities.map((priority, index) => {
          const share =
            Number(grossOperating) > 0
              ? (Number(priority.operatingBudget) / Number(grossOperating)) * 100
              : 0
          return (
            <article key={priority.id} className="border-b border-border-strong py-6">
              <div className="grid grid-cols-[2.5rem_1fr] gap-3">
                <p className="font-heading text-sm font-bold tabular-nums text-mdc-blue">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <div>
                  <h3 className="font-heading text-xl font-bold leading-tight text-text-primary">
                    {priority.name}
                  </h3>
                  <p className="mt-2 text-sm leading-5 text-text-secondary">{priority.description}</p>
                  <div className="mt-4 h-1 bg-border" aria-hidden="true">
                    <div
                      className="h-full"
                      style={{
                        backgroundColor: priority.color ?? '#6B7280',
                        width: `${share}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 border-l-[2.5rem] border-transparent text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Operating</dt>
                  <dd className="mt-1 font-heading font-bold tabular-nums">
                    {formatDollarsAbbreviated(priority.operatingBudget)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Capital</dt>
                  <dd className="mt-1 font-heading font-bold tabular-nums">
                    {formatDollarsAbbreviated(priority.capitalBudget)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Share</dt>
                  <dd className="mt-1 font-heading font-bold tabular-nums">{share.toFixed(1)}%</dd>
                </div>
              </dl>
            </article>
          )
        })}
      </div>

      <div className="hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Proposed gross operating and capital budgets by priority
          </caption>
          <thead className="border-b border-text-primary text-text-secondary">
            <tr>
              <th scope="col" className="w-14 py-3 pr-4 text-xs font-bold uppercase tracking-wider">No.</th>
              <th scope="col" className="py-3 pr-5 text-xs font-bold uppercase tracking-wider">Priority</th>
              <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider">Operating</th>
              <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider">Capital</th>
              <th scope="col" className="py-3 pl-5 text-right text-xs font-bold uppercase tracking-wider">Share</th>
            </tr>
          </thead>
          <tbody>
            {priorities.map((priority, index) => {
              const share =
                Number(grossOperating) > 0
                  ? (Number(priority.operatingBudget) / Number(grossOperating)) * 100
                  : 0
              return (
                <tr key={priority.id} className="border-b border-border-strong align-top">
                  <td className="py-5 pr-4 font-heading font-bold tabular-nums text-mdc-blue">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <th scope="row" className="py-5 pr-5 font-normal">
                    <div>
                      <p className="font-heading text-base font-bold text-text-primary">{priority.name}</p>
                      <p className="mt-1 max-w-xl text-xs leading-5 text-text-secondary">
                        {priority.description}
                      </p>
                      <div className="mt-3 h-1 max-w-xs bg-border" aria-hidden="true">
                        <div
                          className="h-full"
                          style={{
                            backgroundColor: priority.color ?? '#6B7280',
                            width: `${share}%`,
                          }}
                        />
                      </div>
                    </div>
                  </th>
                  <td className="whitespace-nowrap px-5 py-5 text-right font-heading font-bold tabular-nums">
                    {formatDollarsFull(priority.operatingBudget)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-5 text-right tabular-nums text-text-secondary">
                    {formatDollarsFull(priority.capitalBudget)}
                  </td>
                  <td className="whitespace-nowrap py-5 pl-5 text-right font-heading font-bold tabular-nums text-text-primary">
                    {share.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
