import Link from 'next/link'
import { formatDollarsAbbreviated } from '@/lib/format'

type AllocationItem = {
  id: number
  name: string
  slug: string
  color: string | null
  centsPerDollar: number | null
  operatingBudget: string
}

type BudgetAllocationRibbonProps = {
  items: AllocationItem[]
  linkItems?: boolean
}

export function BudgetAllocationRibbon({
  items,
  linkItems = false,
}: BudgetAllocationRibbonProps) {
  const visibleItems = items.filter(
    (item): item is AllocationItem & { centsPerDollar: number } =>
      item.centsPerDollar != null && item.centsPerDollar > 0
  )
  const totalCents = visibleItems.reduce(
    (sum, item) => sum + item.centsPerDollar,
    0
  )

  return (
    <figure>
      <div
        className="flex h-20 overflow-hidden border-y-2 border-text-primary sm:h-24"
        role="img"
        aria-label={visibleItems
          .map((item) => `${item.name}: ${item.centsPerDollar} cents per dollar`)
          .join('; ')}
      >
        {visibleItems.map((item) => {
          const width = (item.centsPerDollar / totalCents) * 100
          return (
            <div
              key={item.id}
              className="flex min-w-0 items-center justify-center border-r border-white/60 px-1 text-center text-[0.65rem] font-bold leading-3 text-white last:border-r-0 sm:text-xs"
              style={{
                backgroundColor: item.color ?? '#6B7280',
                width: `${width}%`,
              }}
              aria-hidden="true"
            >
              {item.centsPerDollar >= 8 ? `${item.centsPerDollar}¢` : ''}
            </div>
          )
        })}
      </div>

      <ol className="mt-6 grid border-t-2 border-text-primary md:grid-cols-2 md:gap-x-10">
        {visibleItems.map((item, index) => {
          const content = (
            <>
              <span className="text-xs font-bold tabular-nums text-text-muted">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0">
                <span className="block font-heading font-semibold text-text-primary">
                  {item.name}
                </span>
                <span className="mt-1 block text-xs text-text-secondary">
                  {formatDollarsAbbreviated(item.operatingBudget)} operating
                </span>
              </span>
              <span className="font-heading text-xl font-bold tabular-nums text-text-primary">
                {item.centsPerDollar}¢
              </span>
            </>
          )

          return (
            <li key={item.id} className="border-b border-border-strong">
              {linkItems ? (
                <Link
                  href={`/explorer/${item.slug}`}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4 transition-colors hover:text-mdc-blue"
                >
                  {content}
                </Link>
              ) : (
                <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4">
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ol>
      <figcaption className="mt-5 text-sm leading-6 text-text-secondary">
        Each cent represents one percent of the gross operating budget. Published values may be rounded.
      </figcaption>
    </figure>
  )
}
