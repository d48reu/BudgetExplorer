type ExplorationMastheadProps = {
  eyebrow: string
  title: string
  description: string
  metricLabel: string
  metricValue: string
  metricNote: string
  accentColor?: string | null
}

export function ExplorationMasthead({
  eyebrow,
  title,
  description,
  metricLabel,
  metricValue,
  metricNote,
  accentColor,
}: ExplorationMastheadProps) {
  return (
    <header className="border-t-[6px] border-text-primary">
      <div className="flex flex-col gap-2 border-b border-text-primary py-3 text-xs font-bold uppercase tracking-[0.14em] sm:flex-row sm:items-center sm:justify-between">
        <p>Miami-Dade County · Budget Explorer</p>
        <p className="text-text-secondary">FY 2025–26 adopted</p>
      </div>
      <div className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.65fr)] lg:gap-16 lg:py-16">
        <div>
          <p className="font-heading text-sm font-bold uppercase tracking-[0.18em] text-mdc-blue">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl font-heading text-[clamp(3rem,7vw,6rem)] font-bold leading-[0.88] tracking-[-0.055em] text-text-primary">
            {title}
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">
            {description}
          </p>
        </div>
        <div
          className="border-l-4 pl-5 lg:self-end lg:pl-7"
          style={{ borderColor: accentColor ?? 'var(--color-mdc-orange)' }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
            {metricLabel}
          </p>
          <p className="mt-3 font-heading text-4xl font-bold tabular-nums text-text-primary sm:text-5xl">
            {metricValue}
          </p>
          <p className="mt-4 text-sm leading-6 text-text-secondary">
            {metricNote}
          </p>
        </div>
      </div>
    </header>
  )
}
