type ReleaseFact = {
  label: string
  value: string
  note?: string
}

type ReleaseFactsProps = {
  facts: ReleaseFact[]
}

export function ReleaseFacts({ facts }: ReleaseFactsProps) {
  return (
    <dl className="grid border-y border-text-primary sm:grid-cols-2 lg:grid-cols-4">
      {facts.map((fact, index) => (
        <div
          key={fact.label}
          className={`py-5 sm:px-6 ${
            index > 0 ? 'border-t border-text-primary sm:border-t-0' : ''
          } ${
            index > 1 ? 'sm:border-t sm:border-text-primary lg:border-t-0' : ''
          } ${index % 2 === 1 ? 'sm:border-l sm:border-text-primary' : ''} ${
            index > 0 ? 'lg:border-l lg:border-text-primary' : ''
          }`}
        >
          <dt className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
            {fact.label}
          </dt>
          <dd className="mt-2 font-heading text-3xl font-bold tabular-nums text-text-primary">
            {fact.value}
          </dd>
          {fact.note && <p className="mt-1 text-xs text-text-muted">{fact.note}</p>}
        </div>
      ))}
    </dl>
  )
}
