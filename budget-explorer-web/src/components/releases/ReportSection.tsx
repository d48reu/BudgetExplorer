type ReportSectionProps = {
  number: string
  label: string
  title: string
  description: string
  children: React.ReactNode
}

export function ReportSection({
  number,
  label,
  title,
  description,
  children,
}: ReportSectionProps) {
  return (
    <section className="grid border-t-2 border-text-primary py-10 sm:py-14 lg:grid-cols-[8rem_1fr] lg:gap-10">
      <div className="mb-6 lg:mb-0">
        <p className="font-heading text-3xl font-bold tabular-nums text-mdc-blue">{number}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">{label}</p>
      </div>
      <div>
        <div className="mb-8 max-w-3xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
          <p className="mt-4 text-base leading-7 text-text-secondary">{description}</p>
        </div>
        {children}
      </div>
    </section>
  )
}
