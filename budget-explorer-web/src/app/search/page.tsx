import { searchBudget } from '@/lib/db/queries'
import { SearchForm } from '@/components/search/SearchForm'
import { SearchResults } from '@/components/search/SearchResults'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search',
  description:
    'Search across Miami-Dade County budget departments, strategic areas, and glossary terms.',
}

export const dynamic = 'force-dynamic'

type PageProps = {
  // Repeated query params (?q=a&q=b) arrive as string[] at runtime.
  searchParams: Promise<{ q?: string | string[] }>
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const query = (Array.isArray(q) ? q[0] : q) ?? ''
  const results = query ? await searchBudget(query) : []

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <h1 className="text-3xl font-heading font-bold text-text-primary mb-6">
        Search the Budget
      </h1>
      <SearchForm initialQuery={query} />
      <SearchResults query={query} results={results} />
    </div>
  )
}
