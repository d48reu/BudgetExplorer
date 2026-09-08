export type AnswerCitation = {
  id: string
  label: string
  locator: string
  url: string
}

export type AnswerClaim = {
  text: string
  citationIds: string[]
}

export type AnswerFact = {
  label: string
  value: string
  detail?: string
  citationIds: string[]
}

export type AnswerCalculation = {
  label: string
  expression: string
  citationIds: string[]
}

export type BudgetAnswer = {
  status: 'answered' | 'needs-evidence'
  eyebrow: string
  title: string
  claims: AnswerClaim[]
  facts: AnswerFact[]
  calculations: AnswerCalculation[]
  citations: AnswerCitation[]
  caveats: string[]
  relatedHref?: string
  relatedLabel?: string
}
