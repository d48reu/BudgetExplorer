const DATA_SENTENCE =
  /(?:\bFY\s*\d{4}[-–]\d{2}\b|\$\s?\d|\b\d[\d,]*\s+(?:employees|people)\b|\bstaff of \d|\bteam of \d|\b\d+-person workforce\b|\bemployee count\b|\boperates? with\b|\bshows? (?:an? |no )?budget\b)/i

const SERVICE_SUMMARY_OVERRIDES: Record<string, string> = {
  sheriff:
    'The Miami-Dade Sheriff’s Office provides police services, specialized law-enforcement support, and countywide sheriff services.',
}

export function getServiceSummary(summary: string, slug?: string): string {
  if (slug && SERVICE_SUMMARY_OVERRIDES[slug]) {
    return SERVICE_SUMMARY_OVERRIDES[slug]
  }

  const sentences = summary.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [summary]
  const serviceSentences = sentences
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !DATA_SENTENCE.test(sentence))

  return serviceSentences.join(' ').trim() || summary.trim()
}
