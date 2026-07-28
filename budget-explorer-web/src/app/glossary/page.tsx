import { GLOSSARY_TERMS } from '@/lib/glossary'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Budget Terms',
  description:
    'Definitions of Miami-Dade County budget and property-tax terms used on this site.',
}

export default function GlossaryPage() {
  const sortedTerms = [...GLOSSARY_TERMS].sort((a, b) =>
    a.term.localeCompare(b.term)
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-(--spacing-section)">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Glossary' },
        ]}
      />

      <header className="mt-6 mb-8">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary">
          Budget terms
        </h1>
        <p className="mt-2 text-text-secondary text-lg">
          Definitions for budget and property-tax terms used on this site.
        </p>
      </header>

      <dl>
        {sortedTerms.map((item, index) => (
          <div
            key={item.slug}
            id={item.slug}
            className={`py-5 ${index < sortedTerms.length - 1 ? 'border-b border-border' : ''}`}
          >
            <dt className="font-heading font-semibold text-lg text-text-primary">
              {item.term}
            </dt>
            <dd className="mt-1 text-text-secondary leading-relaxed">
              {item.definition}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
