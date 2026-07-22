import { formatDollarsAbbreviated, formatYoYChange } from '@/lib/format'

type ComparisonRow = {
  label: string
  description: string
  proposed: string
  adopted: string | null
}

type BudgetComparisonTableProps = {
  rows: ComparisonRow[]
}

export function BudgetComparisonTable({ rows }: BudgetComparisonTableProps) {
  return (
    <div className="border-t-2 border-text-primary">
      <div className="hidden grid-cols-[minmax(0,1.8fr)_1fr_1fr_0.7fr] gap-6 border-b border-text-primary py-3 text-xs font-bold uppercase tracking-[0.12em] text-text-secondary md:grid">
        <span>Budget</span>
        <span className="text-right">Adopted</span>
        <span className="text-right">Proposed</span>
        <span className="text-right">Change</span>
      </div>
      {rows.map((row) => {
        const change = row.adopted
          ? formatYoYChange(row.proposed, row.adopted)
          : null
        const changeColor =
          change?.direction === 'increase'
            ? 'text-change-increase'
            : change?.direction === 'decrease'
              ? 'text-change-decrease'
              : 'text-text-secondary'

        return (
          <div
            key={row.label}
            className="grid gap-4 border-b border-border-strong py-5 md:grid-cols-[minmax(0,1.8fr)_1fr_1fr_0.7fr] md:items-baseline md:gap-6"
          >
            <div>
              <p className="font-heading text-lg font-semibold text-text-primary">
                {row.label}
              </p>
              <p className="mt-1 max-w-md text-sm leading-5 text-text-secondary">
                {row.description}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-3 md:contents">
              <div className="md:text-right">
                <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-text-muted md:sr-only">
                  Adopted
                </dt>
                <dd className="mt-1 font-heading text-lg font-medium tabular-nums text-text-secondary md:mt-0 md:text-xl">
                  {row.adopted ? formatDollarsAbbreviated(row.adopted) : '—'}
                </dd>
              </div>
              <div className="md:text-right">
                <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-text-muted md:sr-only">
                  Proposed
                </dt>
                <dd className="mt-1 font-heading text-lg font-bold tabular-nums text-text-primary md:mt-0 md:text-2xl">
                  {formatDollarsAbbreviated(row.proposed)}
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-text-muted md:sr-only">
                  Change
                </dt>
                <dd
                  className={`mt-1 font-heading text-lg font-bold tabular-nums md:mt-0 md:text-xl ${changeColor}`}
                >
                  {change?.value ?? '—'}
                </dd>
              </div>
            </dl>
          </div>
        )
      })}
    </div>
  )
}
