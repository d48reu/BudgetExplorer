import Link from 'next/link'
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
      <p className="text-center text-text-muted py-12">
        Enter a keyword to search across the Miami-Dade County budget.
      </p>
    )
  }

  // Query entered but no results -- show empty state with suggestions
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary text-lg">
          No results for &ldquo;{query}&rdquo;
        </p>
        <p className="text-text-muted mt-2">
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
      <p className="text-text-muted text-sm">
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
        <ResultSection title="Strategic Areas">
          {areas.map(r => (
            <StrategicAreaCard key={`area-${r.entity_id}`} result={r} />
          ))}
        </ResultSection>
      )}

      {glossary.length > 0 && (
        <ResultSection title="Glossary Terms">
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
      <h2 className="text-lg font-heading font-semibold text-text-primary mb-3 border-b border-border pb-2">
        {title}
      </h2>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  )
}

function DepartmentCard({ result }: { result: SearchResult }) {
  return (
    <Link
      href={`/department/${result.slug}`}
      className="block rounded-lg border border-border p-4 hover:border-mdc-blue hover:shadow-sm transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-text-primary truncate">{result.title}</h3>
          {result.area_name && (
            <span
              className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full border"
              style={{
                borderColor: result.area_color ?? undefined,
                color: result.area_color ?? undefined,
              }}
            >
              {result.area_name}
            </span>
          )}
          {result.snippet && (
            <p className="mt-2 text-sm text-text-secondary line-clamp-2">{result.snippet}</p>
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
      className="block rounded-lg border-l-4 border border-border p-4 hover:shadow-sm transition-colors"
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
          <span className="shrink-0 px-2 py-1 text-xs font-medium bg-surface-secondary rounded-full">
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
      className="block rounded-lg border border-border p-4 hover:border-mdc-blue hover:shadow-sm transition-colors"
    >
      <h3 className="font-semibold text-text-primary">{result.title}</h3>
      <p className="mt-1 text-sm text-text-secondary">{result.snippet}</p>
    </Link>
  )
}
