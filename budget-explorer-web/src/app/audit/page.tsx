import type { Metadata } from 'next'
import audit from '@/data/budget-audit.json'
import { formatDollarsAbbreviated } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Number Audit',
  description:
    'Review the source-to-database checks, official PDF fingerprints, and downloadable evidence behind the Miami-Dade Budget Explorer.',
}

function formattedDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export default function AuditPage() {
  const gatePassed = audit.gate.status === 'PASS'

  return (
    <div className="bg-[#F5F2EA]">
      <section className="border-b border-text-primary">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_0.72fr] md:py-16 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mdc-blue">
              Data integrity / {formattedDate(audit.generatedAt)}
            </p>
            <h1 className="mt-4 max-w-3xl font-heading text-4xl font-black tracking-[-0.04em] text-text-primary sm:text-6xl">
              Every published number has a receipt.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">
              This audit compares official Miami-Dade budget publications to
              the database, then recomputes the totals from the underlying
              department rows. Integer source values must match exactly.
            </p>
          </div>

          <div className="border-t-4 border-text-primary pt-5 md:self-end">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold uppercase tracking-[0.16em] text-text-secondary">
                Release gate
              </span>
              <span
                className={`px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                  gatePassed
                    ? 'bg-mdc-green text-white'
                    : 'bg-mdc-red text-white'
                }`}
              >
                {audit.gate.status}
              </span>
            </div>
            <p className="mt-5 font-heading text-5xl font-black tracking-[-0.05em] text-text-primary">
              {audit.gate.passed.toLocaleString('en-US')}
              <span className="text-2xl text-text-muted">
                {' '}/ {audit.gate.checks.toLocaleString('en-US')}
              </span>
            </p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              exact checks passed with {audit.gate.exactMonetaryVarianceCents}{' '}
              cents of monetary variance and a zero-cent tolerance.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {audit.releases.map((release) => (
            <article
              key={`${release.fiscalYear}-${release.stage}`}
              className="border-t-4 border-text-primary bg-white px-5 py-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-secondary">
                    {release.stage}
                  </p>
                  <h2 className="mt-1 font-heading text-2xl font-black">
                    {release.fiscalYear}
                  </h2>
                </div>
                <span className="bg-text-primary px-2.5 py-1 text-xs font-bold text-white">
                  {release.checks} checks
                </span>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border pt-5">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Net operating</dt>
                  <dd className="mt-1 font-heading text-lg font-bold">
                    {formatDollarsAbbreviated(release.netOperatingCents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Capital</dt>
                  <dd className="mt-1 font-heading text-lg font-bold">
                    {formatDollarsAbbreviated(release.capitalCents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Total</dt>
                  <dd className="mt-1 font-heading text-lg font-bold">
                    {formatDollarsAbbreviated(release.totalBudgetCents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Positions</dt>
                  <dd className="mt-1 font-heading text-lg font-bold">
                    {release.employees.toLocaleString('en-US')}
                  </dd>
                </div>
              </dl>
              <a
                href={release.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block text-sm font-bold text-mdc-blue underline underline-offset-4"
              >
                Open source page {release.sourcePage} ↗
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-text-primary bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <div className="grid gap-6 md:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-mdc-orange">Coverage</p>
              <h2 className="mt-3 font-heading text-3xl font-black tracking-[-0.03em]">
                Six numeric families, checked end to end
              </h2>
              <p className="mt-4 text-sm leading-6 text-text-secondary">
                The ledger includes headline totals, every department slice,
                area and priority totals, revenue, millage rates, and release
                equations. Editorial descriptions are outside the numeric gate.
              </p>
            </div>
            <div className="border-t-2 border-text-primary">
              {audit.coverage.map((item) => (
                <div
                  key={item.family}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border py-4"
                >
                  <span className="font-heading font-bold">{item.family}</span>
                  <span className="font-mono text-sm tabular-nums text-text-secondary">
                    {item.checks.toLocaleString('en-US')}
                  </span>
                  <span className="w-12 text-right text-xs font-black text-mdc-green">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-mdc-blue">Method</p>
            <h2 className="mt-3 font-heading text-3xl font-black tracking-[-0.03em]">
              Four ways a number can earn a pass
            </h2>
          </div>
          <ol className="grid gap-px bg-text-primary sm:grid-cols-2">
            {[
              ['01', 'Transcribe', 'Key figures are independently recorded from the official publication.'],
              ['02', 'Extract', 'Department rows are freshly read from the appendices with page references.'],
              ['03', 'Compare', 'Source values and database values must match exactly.'],
              ['04', 'Reconcile', 'Department rows are summed back to release totals and equations.'],
            ].map(([number, title, detail]) => (
              <li key={number} className="bg-[#F5F2EA] p-5">
                <span className="font-mono text-xs font-bold text-mdc-orange">{number}</span>
                <h3 className="mt-3 font-heading text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-text-primary text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-mdc-orange">Source custody</p>
              <h2 className="mt-3 font-heading text-3xl font-black tracking-[-0.03em]">
                Five official PDFs, fingerprinted
              </h2>
              <p className="mt-4 text-sm leading-6 text-white/65">
                A SHA-256 fingerprint makes the exact source edition
                identifiable even if a file at the public URL changes later.
              </p>
            </div>
            <div className="border-t border-white/35">
              {audit.sources.map((source) => (
                <div
                  key={source.id}
                  className="grid gap-2 border-b border-white/20 py-4 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-heading font-bold underline decoration-white/35 underline-offset-4 hover:decoration-white"
                    >
                      {source.label} ↗
                    </a>
                    <p className="mt-1 break-all font-mono text-[11px] text-white/50">
                      SHA-256 {source.sha256}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-white/65">
                    {source.pages} pages
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-mdc-orange">
              Documented distinctions
            </p>
            <div className="mt-4 space-y-5">
              {audit.knownNotes.map((note) => (
                <article key={note.title} className="border-t-2 border-text-primary pt-4">
                  <h2 className="font-heading text-lg font-black">{note.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{note.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="border-t-4 border-mdc-blue bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-mdc-blue">
              Download the evidence
            </p>
            <h2 className="mt-3 font-heading text-2xl font-black">
              Reproduce or review every check
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              The workbook is designed for human review. The CSV and JSON
              files are the machine-readable source for every row and source
              fingerprint.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={audit.downloads.workbook}
                download
                className="bg-text-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-mdc-blue"
              >
                Audit workbook
              </a>
              <a
                href={audit.downloads.ledgerCsv}
                download
                className="border border-text-primary px-4 py-2.5 text-sm font-bold hover:bg-[#F5F2EA]"
              >
                Number ledger (CSV)
              </a>
              <a
                href={audit.downloads.sourceManifest}
                download
                className="border border-text-primary px-4 py-2.5 text-sm font-bold hover:bg-[#F5F2EA]"
              >
                Source manifest (JSON)
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
