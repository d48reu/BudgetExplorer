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
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="divide-y divide-border md:hidden">
        {priorities.map((priority) => {
          const share =
            Number(grossOperating) > 0
              ? (Number(priority.operatingBudget) / Number(grossOperating)) * 100
              : 0
          return (
            <article key={priority.id} className="p-5">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: priority.color ?? '#6B7280' }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-text-primary">{priority.name}</h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    {priority.description}
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-text-secondary">Operating</dt>
                  <dd className="mt-1 font-semibold">
                    {formatDollarsAbbreviated(priority.operatingBudget)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Capital</dt>
                  <dd className="mt-1 font-semibold">
                    {formatDollarsAbbreviated(priority.capitalBudget)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Share</dt>
                  <dd className="mt-1 font-semibold">{share.toFixed(1)}%</dd>
                </div>
              </dl>
            </article>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Proposed gross operating and capital budgets by priority
          </caption>
          <thead className="bg-surface-secondary text-text-secondary">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">Priority</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Operating</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Capital</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Operating share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {priorities.map((priority) => {
              const share =
                Number(grossOperating) > 0
                  ? (Number(priority.operatingBudget) / Number(grossOperating)) * 100
                  : 0
              return (
                <tr key={priority.id}>
                  <th scope="row" className="px-5 py-4 font-normal">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1 h-3 w-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: priority.color ?? '#6B7280' }}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-semibold text-text-primary">{priority.name}</p>
                        <p className="mt-1 max-w-xl text-xs text-text-secondary">
                          {priority.description}
                        </p>
                      </div>
                    </div>
                  </th>
                  <td className="whitespace-nowrap px-5 py-4 text-right font-medium">
                    {formatDollarsFull(priority.operatingBudget)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right text-text-secondary">
                    {formatDollarsFull(priority.capitalBudget)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right text-text-secondary">
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
