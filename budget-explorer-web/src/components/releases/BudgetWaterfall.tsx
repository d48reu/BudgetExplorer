import type { SerializedBudgetRelease } from '@/types/budget'

type BudgetWaterfallProps = {
  release: SerializedBudgetRelease
}

function dollars(cents: string) {
  return Number(cents) / 100
}

function shortBillions(value: number) {
  return `$${(value / 1_000_000_000).toFixed(2)}B`
}

export function BudgetWaterfall({ release }: BudgetWaterfallProps) {
  const gross = dollars(release.grossOperating)
  const transfers = dollars(release.interagencyTransfers)
  const net = dollars(release.netOperating)
  const capital = dollars(release.capital)
  const total = dollars(release.total)
  const max = Math.max(total, gross, 1)

  const marks = [
    {
      label: 'Gross operating',
      value: gross,
      display: shortBillions(gross),
      bottom: 0,
      color: '#111827',
    },
    {
      label: 'Internal transfers',
      value: transfers,
      display: `−${shortBillions(transfers)}`,
      bottom: net,
      color: '#F7941D',
    },
    {
      label: 'Net operating',
      value: net,
      display: shortBillions(net),
      bottom: 0,
      color: '#0057B8',
    },
    {
      label: 'Capital program',
      value: capital,
      display: `+${shortBillions(capital)}`,
      bottom: net,
      color: '#00A651',
    },
    {
      label: 'Total budget',
      value: total,
      display: shortBillions(total),
      bottom: 0,
      color: '#0057B8',
    },
  ]

  return (
    <figure>
      <div
        className="relative grid h-72 grid-cols-5 gap-2 border-b-2 border-text-primary sm:h-80 sm:gap-5"
        role="img"
        aria-label={`${release.fiscalYear} budget waterfall: gross operating ${shortBillions(gross)}, less internal transfers ${shortBillions(transfers)}, equals net operating ${shortBillions(net)}, plus capital ${shortBillions(capital)}, equals total budget ${shortBillions(total)}.`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/4 border-t border-border" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-border" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 top-3/4 border-t border-border" aria-hidden="true" />
        {marks.map((mark) => (
          <div key={mark.label} className="relative h-full" aria-hidden="true">
            <div
              className="absolute inset-x-0 min-h-2"
              style={{
                bottom: `${(mark.bottom / max) * 100}%`,
                height: `${(mark.value / max) * 100}%`,
                backgroundColor: mark.color,
              }}
            >
              <span className="absolute inset-x-0 -top-6 text-center font-heading text-[0.65rem] font-bold tabular-nums text-text-primary sm:text-sm">
                {mark.display}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2 pt-3 sm:gap-5">
        {marks.map((mark, index) => (
          <div key={mark.label} className="text-center">
            <p className="text-[0.65rem] font-bold uppercase leading-4 tracking-[0.08em] text-text-secondary sm:text-xs">
              {mark.label}
            </p>
            {index < marks.length - 1 && (
              <p className="mt-1 font-heading text-base font-light text-text-muted sm:text-xl" aria-hidden="true">
                {index === 0 ? '−' : index === 1 ? '=' : index === 2 ? '+' : '='}
              </p>
            )}
          </div>
        ))}
      </div>
      <figcaption className="mt-6 max-w-3xl text-sm leading-6 text-text-secondary">
        Operating detail is published gross. Removing payments between county agencies produces the net operating figure used in the total budget.
      </figcaption>
    </figure>
  )
}
