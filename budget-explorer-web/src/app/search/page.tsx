import { searchBudget } from '@/lib/db/queries'
import { SearchForm } from '@/components/search/SearchForm'
import { SearchResults } from '@/components/search/SearchResults'
import { UtilityMasthead } from '@/components/layout/UtilityMasthead'
import { ReleaseSwitcher } from '@/components/releases/ReleaseSwitcher'
import { ReportSection } from '@/components/releases/ReportSection'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Budget Data',
  description:
    'Search Miami-Dade County departments, strategic areas, and budget terms.',
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
    <div className="bg-[#F5F2EA]">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <ReleaseSwitcher activeStage="adopted" />
        <div className="mt-5">
          <UtilityMasthead
            eyebrow="Budget lookup"
            title="Search the budget"
            description="Find a department, strategic area, or budget term without knowing where it appears in the County’s publications."
            metricLabel="Search scope"
            metricValue="3 record types"
            metricNote="Departments, strategic areas, and budget terms."
            accentColor="var(--color-mdc-blue)"
          />
        </div>

        <ReportSection
          number="01"
          label="Lookup"
          title={query ? 'Search results' : 'Find a budget record'}
          description={
            query
              ? `Results for “${query},” ranked by relevance.`
              : 'Enter a name or plain-language term. Results link back to the relevant department, strategic area, or definition.'
          }
        >
          <div className="max-w-4xl">
            <SearchForm initialQuery={query} />
            <SearchResults query={query} results={results} />
          </div>
        </ReportSection>
      </div>
    </div>
  )
}
