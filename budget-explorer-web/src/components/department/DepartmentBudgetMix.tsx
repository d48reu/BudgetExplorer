import { formatDollarsAbbreviated } from '@/lib/format'

type DepartmentBudgetMixProps = {
  operatingBudget: string
  capitalBudget: string
  accentColor: string | null
}

export function DepartmentBudgetMix({
  operatingBudget,
  capitalBudget,
  accentColor,
}: DepartmentBudgetMixProps) {
  const operating = Number(operatingBudget)
  const capital = Number(capitalBudget)
  const total = operating + capital
  const operatingShare = total > 0 ? (operating / total) * 100 : 0
  const capitalShare = total > 0 ? (capital / total) * 100 : 0

  return (
    <figure>
      <div
        className="flex h-9 w-full border-y border-text-primary"
        role="img"
        aria-label={`${operatingShare.toFixed(1)} percent operating and ${capitalShare.toFixed(1)} percent capital`}
      >
        <span
          className="h-full"
          style={{
            width: `${operatingShare}%`,
            backgroundColor: accentColor ?? 'var(--color-mdc-blue)',
          }}
          aria-hidden="true"
        />
        <span
          className="h-full bg-mdc-green"
          style={{ width: `${capitalShare}%` }}
          aria-hidden="true"
        />
      </div>
      <figcaption className="grid border-b border-text-primary sm:grid-cols-2">
        <div className="py-4 sm:pr-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
            Operating
          </p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums text-text-primary">
            {formatDollarsAbbreviated(operatingBudget)}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {operatingShare.toFixed(1)}% of department total
          </p>
        </div>
        <div className="border-t border-text-primary py-4 sm:border-l sm:border-t-0 sm:pl-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
            Capital
          </p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums text-text-primary">
            {formatDollarsAbbreviated(capitalBudget)}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {capitalShare.toFixed(1)}% of department total
          </p>
        </div>
      </figcaption>
    </figure>
  )
}
