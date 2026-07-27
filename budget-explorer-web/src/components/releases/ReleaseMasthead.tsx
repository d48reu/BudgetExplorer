type ReleaseMastheadProps = {
  stage: 'adopted' | 'proposed'
  fiscalYear: string
  totalBudget: string
  title: string
  description: string
  context: string
}

function formatBillions(cents: string) {
  return `$${(Number(cents) / 100 / 1_000_000_000).toFixed(2)}B`
}

export function ReleaseMasthead({
  stage,
  fiscalYear,
  totalBudget,
  title,
  description,
  context,
}: ReleaseMastheadProps) {
  const status = stage === 'adopted' ? 'Adopted · Current budget' : 'Proposed · Under review'

  return (
    <header className="border-t-[6px] border-text-primary">
      <div className="flex flex-col gap-2 border-b border-text-primary py-3 text-xs font-bold uppercase tracking-[0.14em] sm:flex-row sm:items-center sm:justify-between">
        <p>Miami-Dade County · Budget Explorer</p>
        <p className="text-text-secondary">{fiscalYear}</p>
      </div>
      <div className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.65fr)] lg:gap-16 lg:py-20">
        <div>
          <p className="font-heading text-sm font-bold uppercase tracking-[0.18em] text-mdc-blue">
            {fiscalYear} county budget
          </p>
          <h1 className="mt-5 font-heading font-bold tracking-[-0.055em] text-text-primary">
            <span className="block text-[clamp(4rem,11vw,8.5rem)] leading-[0.78] tabular-nums">
              {formatBillions(totalBudget)}
            </span>
            <span className="mt-5 block max-w-3xl text-2xl leading-[1.05] tracking-[-0.035em] sm:text-4xl lg:text-5xl">
              {title}
            </span>
          </h1>
        </div>
        <div className="border-l-4 border-mdc-orange pl-5 lg:self-end lg:pl-7">
          <p className="font-heading text-sm font-extrabold uppercase tracking-[0.15em] text-text-primary">
            {status}
          </p>
          <p className="mt-4 text-base leading-7 text-text-secondary">{description}</p>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.12em] text-text-muted">
            {context}
          </p>
        </div>
      </div>
    </header>
  )
}
