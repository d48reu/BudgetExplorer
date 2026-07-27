'use client'

import { useState } from 'react'

type AiDescriptionProps = {
  summary: string
  detailedDescription: string | null
  fiscalYear: string
  generatedAt: string | null
}

export function AiDescription({
  summary,
  detailedDescription,
  fiscalYear,
  generatedAt,
}: AiDescriptionProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <p className="text-text-primary leading-relaxed">{summary}</p>
      {detailedDescription && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-sm text-mdc-blue hover:underline"
            aria-expanded={expanded}
          >
            {expanded ? 'Read less' : 'Read more'}
          </button>
          {expanded && (
            <div className="mt-3 text-text-primary leading-relaxed">
              {detailedDescription}
            </div>
          )}
        </>
      )}
      <p className="mt-2 text-xs text-text-tertiary">
        Based on {fiscalYear} adopted budget.
        {generatedAt &&
          ` Generated ${new Date(generatedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}.`}
      </p>
    </div>
  )
}
