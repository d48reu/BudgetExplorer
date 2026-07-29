import Link from 'next/link'
import { getServiceSummary } from '@/lib/department-copy'
import { formatDollarsAbbreviated } from '@/lib/format'
import { POPULAR_SEARCH_SUGGESTIONS } from '@/lib/constants'
import type { SearchResult } from '@/lib/db/queries'

type SearchResultsProps = {
  query: string
  results: SearchResult[]
}

export function SearchResults({ query, results }: SearchResultsProps) {
  // No query entered yet -- show initial state
  if (!query) {
    return (
      <div className="border-t-2 border-text-primary py-7">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
          Start with
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
          {POPULAR_SEARCH_SUGGESTIONS.map((suggestion) => (
            <Link
              key={suggestion}
              href={`/search?q=${encodeURIComponent(suggestion)}`}
              className="border-b border-text-primary pb-1 font-heading font-bold text-text-primary transition-colors hover:border-mdc-blue hover:text-mdc-blue"
            >
              {suggestion}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // Query entered but no results -- show empty state with suggestions
  if (results.length === 0) {
    return (
      <div className="border-y-2 border-text-primary py-8">
        <p className="font-heading text-2xl font-bold text-text-primary">
          No results for &ldquo;{query}&rdquo;
        </p>
        <p className="mt-3 text-text-secondary">
          Try:{' '}
          {POPULAR_SEARCH_SUGGESTIONS.map((suggestion, i) => (
            <span key={suggestion}>
              {i > 0 && ', '}
              <Link
                href={`/search?q=${encodeURIComponent(suggestion)}`}
                className="text-mdc-blue hover:underline"
              >
                {suggestion}
              </Link>
            </span>
          ))}
        </p>
      </div>
    )
  }

  // Group results by entity type
  const departments = results.filter(r => r.entity_type === 'department')
  const areas = results.filter(r => r.entity_type === 'strategic_area')
  const glossary = results.filter(r => r.entity_type === 'glossary')

  return (
    <div className="space-y-8">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-text-secondary">
        {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
      </p>

      {departments.length > 0 && (
        <ResultSection title="Departments">
          {departments.map(r => (
            <DepartmentCard key={`dept-${r.entity_id}`} result={r} />
          ))}
        </ResultSection>
      )}

      {areas.length > 0 && (
        <ResultSection title="Strategic areas">
          {areas.map(r => (
            <StrategicAreaCard key={`area-${r.entity_id}`} result={r} />
          ))}
        </ResultSection>
      )}

      {glossary.length > 0 && (
        <ResultSection title="Budget terms">
          {glossary.map(r => (
            <GlossaryCard key={`glossary-${r.slug}`} result={r} />
          ))}
        </ResultSection>
      )}
    </div>
  )
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="border-t-2 border-text-primary py-4 font-heading text-xl font-bold text-text-primary">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  )
}

function DepartmentCard({ result }: { result: SearchResult }) {
  return (
    <Link
      href={`/department/${result.slug}`}
      className="block border-b border-text-primary px-1 py-5 transition-colors hover:bg-white/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-text-primary truncate">{result.title}</h3>
          {result.area_name && (
            <span
              className="mt-2 inline-block border-l-2 pl-2 text-xs font-bold uppercase tracking-[0.08em]"
              style={{
                borderColor: result.area_color ?? undefined,
                color: result.area_color ?? undefined,
              }}
            >
              {result.area_name}
            </span>
          )}
          {result.snippet && (
            <p className="mt-2 text-sm text-text-secondary line-clamp-2">
              {getServiceSummary(result.snippet, result.slug)}
            </p>
          )}
        </div>
        {result.operating_budget != null && (
          <span className="shrink-0 text-sm font-medium text-text-secondary">
            {formatDollarsAbbreviated(result.operating_budget)}
          </span>
        )}
      </div>
    </Link>
  )
}

function StrategicAreaCard({ result }: { result: SearchResult }) {
  return (
    <Link
      href={`/explorer/${result.area_slug}`}
      className="block border-b border-l-4 border-text-primary px-4 py-5 transition-colors hover:bg-white/60"
      style={{ borderLeftColor: result.area_color ?? undefined }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-text-primary">{result.title}</h3>
          {result.snippet && (
            <p className="mt-1 text-sm text-text-secondary line-clamp-2">{result.snippet}</p>
          )}
        </div>
        {result.cents_per_dollar != null && (
          <span className="shrink-0 border border-text-primary px-2 py-1 text-xs font-bold">
            {result.cents_per_dollar}&cent; per dollar
          </span>
        )}
      </div>
    </Link>
  )
}

function GlossaryCard({ result }: { result: SearchResult }) {
  return (
    <Link
      href={`/glossary#${result.slug}`}
      className="block border-b border-text-primary px-1 py-5 transition-colors hover:bg-white/60"
    >
      <h3 className="font-semibold text-text-primary">{result.title}</h3>
      <p className="mt-1 text-sm text-text-secondary">{result.snippet}</p>
    </Link>
  )
}
