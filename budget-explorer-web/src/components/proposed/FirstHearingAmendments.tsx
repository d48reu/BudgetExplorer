import amendments from '@/data/fy-2026-27-first-hearing-amendments.json'
import { formatDollarsFull } from '@/lib/format'

type SourceDocument = (typeof amendments.sourceDocuments)[number]

const sources = new Map(
  amendments.sourceDocuments.map((source) => [source.id, source] as const)
)

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

function signedAmount(
  cents: number | null,
  direction: string
): string {
  if (cents == null) return '—'
  const value = formatDollarsFull(cents)
  if (direction === 'increase') return `+${value}`
  if (direction === 'decrease') return `−${value}`
  return value
}

function signedPositions(value: number | null) {
  if (value == null) return '—'
  if (value > 0) return `+${value}`
  return value.toString()
}

function sourceHref(source: SourceDocument, page?: number) {
  if (source.kind === 'pdf' && page) {
    return `${source.sourceUrl}#page=${page}`
  }
  return source.sourceUrl
}

export function AmendmentStatusNotice() {
  const memo = sources.get('first-hearing-memo')

  return (
    <aside className="border-y-2 border-text-primary bg-white">
      <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-mdc-orange">
            Budget update · {formatDate(amendments.hearingDate)}
          </p>
          <h2 className="mt-2 font-heading text-2xl font-black tracking-[-0.025em] sm:text-3xl">
            The Commission amended this proposal at the first hearing.
          </h2>
          <p className="mt-3 text-base leading-7 text-text-secondary">
            The headline figures below remain the County’s July 15 release. Later
            changes are recorded separately so the original proposal and the
            tentative amendments are not mixed together.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <a
            href="#first-hearing-amendments"
            className="bg-text-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-mdc-blue"
          >
            Review the changes ↓
          </a>
          {memo && (
            <a
              href={memo.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-text-primary px-4 py-2.5 text-sm font-bold hover:bg-[#F5F2EA]"
            >
              County memo ↗
            </a>
          )}
        </div>
      </div>
    </aside>
  )
}

export function FirstHearingAmendments() {
  const memo = sources.get('first-hearing-memo')
  const hearing = sources.get('first-hearing-recording')
  const processPage = sources.get('budget-process-page')
  const caveat = amendments.sourceCaveats[0]

  return (
    <div id="first-hearing-amendments" className="scroll-mt-24">
      <div className="grid gap-px border border-text-primary bg-text-primary sm:grid-cols-3">
        {[
          ['Status', amendments.statusLabel],
          ['Last verified', formatDate(amendments.lastVerifiedDate)],
          ['Final hearing', formatDate(amendments.finalHearingDate)],
        ].map(([label, value]) => (
          <div key={label} className="bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">
              {label}
            </p>
            <p className="mt-2 font-heading text-lg font-black leading-6">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-x-auto border-t-2 border-text-primary">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-text-primary text-xs uppercase tracking-[0.12em] text-text-secondary">
              <th className="py-3 pr-5 font-bold">Change</th>
              <th className="px-3 py-3 text-right font-bold">Amount</th>
              <th className="px-3 py-3 text-right font-bold">Positions</th>
              <th className="px-3 py-3 font-bold">Treatment</th>
              <th className="py-3 pl-3 text-right font-bold">Source</th>
            </tr>
          </thead>
          <tbody>
            {amendments.memoChanges.map((change) => {
              const source = sources.get(change.sourceId)
              return (
                <tr key={change.id} className="border-b border-border-strong align-top">
                  <td className="py-4 pr-5">
                    <p className="font-heading font-black">{change.title}</p>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
                      {change.summary}
                    </p>
                    {'offsets' in change && change.offsets && (
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer font-bold text-mdc-blue">
                          Show the five offsets
                        </summary>
                        <ul className="mt-2 grid gap-1.5 border-l-2 border-mdc-blue pl-3 text-text-secondary sm:grid-cols-2">
                          {change.offsets.map((offset) => (
                            <li key={offset.department}>
                              {offset.department}: {formatDollarsFull(offset.amountCents)} ·{' '}
                              {offset.positions} positions
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </td>
                  <td className="px-3 py-4 text-right font-mono text-sm font-bold tabular-nums">
                    {signedAmount(change.amountCents, change.amountDirection)}
                  </td>
                  <td className="px-3 py-4 text-right font-mono text-sm font-bold tabular-nums">
                    {signedPositions(change.positionChange)}
                  </td>
                  <td className="px-3 py-4">
                    <span className="inline-block border border-text-primary px-2 py-1 text-xs font-black uppercase tracking-[0.08em]">
                      {change.classification}
                    </span>
                  </td>
                  <td className="py-4 pl-3 text-right text-sm">
                    {source && (
                      <a
                        href={sourceHref(source, change.sourcePages[0])}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-mdc-blue underline underline-offset-4"
                      >
                        pp. {change.sourcePages.join(', ')} ↗
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex items-end justify-between gap-4 border-b-2 border-text-primary pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-mdc-blue">
                Hearing actions
              </p>
              <h3 className="mt-1 font-heading text-2xl font-black">What the Board decided</h3>
            </div>
            {hearing && (
              <a
                href={hearing.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-sm font-bold text-mdc-blue underline underline-offset-4"
              >
                Recording ↗
              </a>
            )}
          </div>
          <div>
            {amendments.hearingActions.map((action) => (
              <article key={action.id} className="border-b border-border-strong py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="font-heading text-lg font-black">{action.title}</h4>
                  <span className="font-mono text-sm font-bold tabular-nums text-mdc-blue">
                    {'amountCents' in action && action.amountCents != null
                      ? formatDollarsFull(action.amountCents)
                      : `${action.rateChangePercent}% · ${action.vote}`}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{action.summary}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-text-muted">
                  {action.status} · Recording {action.sourceTime}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div>
          <p className="border-b-2 border-text-primary pb-3 text-xs font-bold uppercase tracking-[0.14em] text-mdc-orange">
            Still open
          </p>
          <div>
            {amendments.pendingItems.map((item) => (
              <article key={item.id} className="border-b border-border-strong py-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-heading font-black">{item.title}</h3>
                  {'amountCents' in item && item.amountCents != null && (
                    <span className="shrink-0 font-mono text-sm font-bold tabular-nums">
                      {formatDollarsFull(item.amountCents)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{item.summary}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-text-muted">
                  {item.status}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <aside className="mt-8 border-l-4 border-mdc-orange bg-white p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-mdc-orange">
          Source discrepancy
        </p>
        <h3 className="mt-2 font-heading text-xl font-black">{caveat.title}</h3>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-text-secondary">
          {caveat.summary}
        </p>
        {memo && (
          <a
            href={sourceHref(memo, caveat.sourcePages[0])}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-bold text-mdc-blue underline underline-offset-4"
          >
            Compare pages {caveat.sourcePages.join(' and ')} ↗
          </a>
        )}
      </aside>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border-strong pt-4 text-sm text-text-secondary">
        <p>
          Countywide General Fund control total:{' '}
          <strong className="text-text-primary">
            {formatDollarsFull(amendments.publishedControlTotals.countywideGeneralFundCents)}
          </strong>{' '}
          · unchanged in the first memorandum.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="/api/audit/first-hearing-amendments"
            className="font-bold text-mdc-blue underline underline-offset-4"
          >
            Download amendment data
          </a>
          {processPage && (
            <a
              href={processPage.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-mdc-blue underline underline-offset-4"
            >
              County budget calendar ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
