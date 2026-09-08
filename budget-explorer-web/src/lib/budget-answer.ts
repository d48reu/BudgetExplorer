import amendmentsJson from '@/data/fy-2026-27-first-hearing-amendments.json'
import audit from '@/data/budget-audit.json'
import sourceIndexJson from '@/data/answer-source-index.json'
import prisma from '@/lib/prisma'
import {
  getDepartmentDetail,
  getDepartmentProposalChange,
  getDepartmentYoY,
  getProposedBudgetOverview,
} from '@/lib/db/queries'
import { formatDollarsAbbreviated, formatDollarsFull } from '@/lib/format'
import type {
  AnswerCitation,
  AnswerFact,
  BudgetAnswer,
} from '@/lib/budget-answer-types'

type LedgerRow = {
  checkId: string
  release: string
  stage: string
  section: string
  entity: string
  metric: string
  expected: string
  actual: string
  unit: string
  sourceDocument: string
  sourcePage: string
  sourceUrl: string
  notes: string
}

type AmendmentItem = {
  id: string
  title: string
  summary: string
  status: string
  classification?: string
  amountCents?: number | null
  amountDirection?: string
  positionChange?: number | null
  rateChangePercent?: number
  vote?: string
  sourceId: string
  sourcePages?: number[]
  sourceTime?: string
}

type AmendmentSource = {
  id: string
  label: string
  sourceUrl: string
}

type AmendmentData = {
  sourceDocuments: AmendmentSource[]
  memoChanges: AmendmentItem[]
  hearingActions: AmendmentItem[]
  pendingItems: AmendmentItem[]
  sourceCaveats: AmendmentItem[]
}

type DepartmentCandidate = {
  id: number
  name: string
  slug: string
  abbreviation: string | null
  department_aliases: { historical_name: string }[]
}

type AnswerIntent =
  | 'district'
  | 'amendments'
  | 'ranking'
  | 'revenue'
  | 'release'
  | 'department-or-unknown'

const sourceIndex = sourceIndexJson as LedgerRow[]
const amendments = amendmentsJson as unknown as AmendmentData

const STOP_WORDS = new Set([
  'a', 'about', 'and', 'are', 'budget', 'by', 'did', 'does', 'for', 'from',
  'how', 'in', 'is', 'it', 'much', 'of', 'on', 'or', 'the', 'to', 'was',
  'were', 'what', 'which', 'why', 'with',
])

const DEPARTMENT_TERMS: Record<string, string[]> = {
  'transportation-public-works': ['dtpw', 'transit', 'metrobus', 'metrorail', 'metromover'],
  sheriff: ['police', 'mdpd', 'sheriffs office'],
  'management-and-budget': ['omb', 'office of management and budget'],
  'parks-recreation-open-spaces': ['parks', 'pros'],
  'water-and-sewer': ['wasd', 'water sewer'],
  seaport: ['portmiami', 'port miami'],
  aviation: ['mia', 'airport'],
  'housing-community-development': ['hcd', 'housing department'],
  'information-technology': ['itd', 'technology department'],
}

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokens(value: string) {
  return normalize(value)
    .split(' ')
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
}

export function classifyBudgetQuestion(question: string): AnswerIntent {
  const value = normalize(question)
  if (/\bdistrict\s*\d+\b/.test(value) || /\bcommission district\b/.test(value)) return 'district'
  if (/\b(first|second|final) (budget )?hearing\b|\bamend(ed|ment|ments)?\b|\bhearing changes?\b/.test(value)) return 'amendments'
  if ((/\b(largest|biggest|most|top|rank|ranking)\b/.test(value) || /\bwhich (department|departments|agency|agencies)\b/.test(value)) && /\b(department|departments|agency|agencies|position|positions|staff|staffing|increase|decrease|cut|cuts|gain|gained|lose|lost)\b/.test(value)) return 'ranking'
  if (/\brevenue\b|\bproperty tax\b|\bsales tax\b|\bgrants?\b|\bproprietary\b/.test(value)) return 'revenue'
  if (/\b(total|overall|all funds|countywide)\b/.test(value) && /\b(budget|proposal|proposed|adopted|operating|capital|positions|employees)\b/.test(value)) return 'release'
  return 'department-or-unknown'
}

function signedDollars(cents: bigint, full = false) {
  const prefix = cents > BigInt(0) ? '+' : cents < BigInt(0) ? '−' : ''
  const absolute = cents < BigInt(0) ? -cents : cents
  return `${prefix}${full ? formatDollarsFull(absolute.toString()) : formatDollarsAbbreviated(absolute.toString())}`
}

function signedNumber(value: number) {
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toLocaleString('en-US')}`
}

function percentChange(from: bigint, to: bigint) {
  return from === BigInt(0) ? null : (Number(to - from) / Number(from)) * 100
}

function joinPages(rows: LedgerRow[]) {
  const pages = new Set<number>()
  for (const row of rows) {
    for (const page of row.sourcePage.split(',')) {
      const value = Number.parseInt(page.trim(), 10)
      if (Number.isFinite(value)) pages.add(value)
    }
  }
  const sorted = Array.from(pages).sort((left, right) => left - right)
  if (sorted.length === 0) return 'page not specified in the ledger'
  return `${sorted.length === 1 ? 'p.' : 'pp.'} ${sorted.join(', ')}`
}

function citationFromRows(id: string, rows: LedgerRow[]): AnswerCitation | null {
  const first = rows[0]
  if (!first) return null
  return {
    id,
    label: `${first.release} ${first.sourceDocument}`,
    locator: joinPages(rows),
    url: first.sourceUrl,
  }
}

function auditedSum(rows: LedgerRow[], metric: string) {
  const selected = rows.filter((row) => row.metric === metric)
  if (selected.length === 0 || selected.some((row) => !/^-?\d+$/.test(row.actual))) return null
  return selected.reduce((total, row) => total + BigInt(row.actual), BigInt(0))
}

function matchesAudit(rows: LedgerRow[], metric: string, value: bigint | number | null) {
  if (value == null) return false
  const audited = auditedSum(rows, metric)
  return audited != null && audited === BigInt(value)
}

function departmentRows(
  name: string,
  stage: 'adopted' | 'proposed',
  metrics: string[],
  document?: string
) {
  return sourceIndex.filter((row) =>
    row.stage === stage &&
    row.section === 'Department rows' &&
    row.entity.startsWith(`${name} —`) &&
    metrics.includes(row.metric) &&
    (!document || row.sourceDocument.includes(document))
  )
}

function releaseCitation(id: string, stage: 'adopted' | 'proposed'): AnswerCitation | null {
  const release = audit.releases.find((item) => item.stage === stage)
  if (!release) return null
  return {
    id,
    label: release.label,
    locator: `Budget in Brief, p. ${release.sourcePage}`,
    url: release.sourceUrl,
  }
}

function evidenceGap(
  title: string,
  claim: string,
  caveat: string,
  citations: AnswerCitation[] = []
): BudgetAnswer {
  return {
    status: 'needs-evidence',
    eyebrow: 'Evidence gap',
    title,
    claims: [{ text: claim, citationIds: citations.map((citation) => citation.id) }],
    facts: [],
    calculations: [],
    citations,
    caveats: [caveat],
  }
}

function unsupported(question: string): BudgetAnswer {
  return evidenceGap(
    'I could not support an answer from the approved data yet.',
    `The research desk did not find a defensible match for “${question}.” It will not fill the gap with an estimate.`,
    'Try naming a department, fiscal year, budget stage, or metric such as operating budget, positions, revenue, or first-hearing changes.'
  )
}

async function answerRelease(question: string): Promise<BudgetAnswer> {
  const overview = await getProposedBudgetOverview()
  const proposedCitation = releaseCitation('1', 'proposed')
  const adoptedCitation = releaseCitation('2', 'adopted')
  const proposedAudit = audit.releases.find((item) => item.stage === 'proposed')
  const adoptedAudit = audit.releases.find((item) => item.stage === 'adopted')
  if (!overview?.adopted || !proposedCitation || !adoptedCitation || !proposedAudit || !adoptedAudit) return unsupported(question)

  const normalized = normalize(question)
  const metric = /\b(position|positions|employee|employees|staff|staffing)\b/.test(normalized)
    ? 'positions'
    : /\bcapital\b/.test(normalized)
      ? 'capital'
      : /\boperating\b/.test(normalized)
        ? 'operating'
        : 'total'

  if (metric === 'positions') {
    const proposed = overview.proposed.employees
    const adopted = overview.adopted.employees
    if (proposed == null || adopted == null) return unsupported(question)
    if (proposed !== proposedAudit.employees || adopted !== adoptedAudit.employees) {
      return evidenceGap('The live workforce total does not match the approved audit record.', 'No answer was released.', 'Refresh and review the number audit before relying on this result.')
    }
    const change = proposed - adopted
    return {
      status: 'answered',
      eyebrow: 'Published workforce totals',
      title: `The proposal reports ${proposed.toLocaleString('en-US')} County positions.`,
      claims: [{
        text: `That is ${Math.abs(change).toLocaleString('en-US')} ${change < 0 ? 'fewer' : 'more'} than the ${overview.adopted.fiscalYear} adopted total.`,
        citationIds: ['1', '2'],
      }],
      facts: [
        { label: 'FY 2026-27 proposed', value: proposed.toLocaleString('en-US'), citationIds: ['1'] },
        { label: 'FY 2025-26 adopted', value: adopted.toLocaleString('en-US'), citationIds: ['2'] },
      ],
      calculations: [{ label: 'Position change', expression: `${proposed.toLocaleString('en-US')} − ${adopted.toLocaleString('en-US')} = ${signedNumber(change)}`, citationIds: ['1', '2'] }],
      citations: [proposedCitation, adoptedCitation],
      caveats: ['The proposal separately restates the prior-year workforce baseline as 31,998 for department comparisons. This answer uses each release’s published Countywide headline.'],
      relatedHref: '/compare',
      relatedLabel: 'Open the public comparison',
    }
  }

  const key = metric === 'operating' ? 'netOperating' : metric
  const proposed = BigInt(overview.proposed[key])
  const adopted = BigInt(overview.adopted[key])
  const auditKey = metric === 'operating' ? 'netOperatingCents' : metric === 'capital' ? 'capitalCents' : 'totalBudgetCents'
  if (proposed !== BigInt(proposedAudit[auditKey]) || adopted !== BigInt(adoptedAudit[auditKey])) {
    return evidenceGap('The live release total does not match the approved audit record.', 'No answer was released.', 'Refresh and review the number audit before relying on this result.')
  }
  const change = proposed - adopted
  const percentage = percentChange(adopted, proposed)
  const label = metric === 'total' ? 'all-funds budget' : `${metric} budget`

  return {
    status: 'answered',
    eyebrow: 'Published release totals',
    title: `The FY 2026-27 proposed ${label} is ${formatDollarsAbbreviated(proposed.toString())}.`,
    claims: [{
      text: `That is ${signedDollars(change)} compared with the FY 2025-26 adopted ${label}${percentage == null ? '' : `, a ${Math.abs(percentage).toFixed(1)}% ${percentage >= 0 ? 'increase' : 'decrease'}`}.`,
      citationIds: ['1', '2'],
    }],
    facts: [
      { label: 'FY 2026-27 proposed', value: formatDollarsFull(proposed.toString()), citationIds: ['1'] },
      { label: 'FY 2025-26 adopted', value: formatDollarsFull(adopted.toString()), citationIds: ['2'] },
    ],
    calculations: [{
      label: 'Dollar change',
      expression: `${formatDollarsFull(proposed.toString())} − ${formatDollarsFull(adopted.toString())} = ${signedDollars(change, true)}`,
      citationIds: ['1', '2'],
    }],
    citations: [proposedCitation, adoptedCitation],
    caveats: ['This compares the two published releases. First-hearing adjustments remain separate until the County publishes a fully restated all-funds total.'],
    relatedHref: '/compare',
    relatedLabel: 'Open the public comparison',
  }
}

function departmentScore(question: string, department: DepartmentCandidate) {
  const normalizedQuestion = normalize(question)
  const candidates = [
    department.name,
    department.slug,
    department.abbreviation ?? '',
    ...department.department_aliases.map((alias) => alias.historical_name),
    ...(DEPARTMENT_TERMS[department.slug] ?? []),
  ].filter(Boolean)

  let best = 0
  for (const candidate of candidates) {
    const normalizedCandidate = normalize(candidate)
    if (!normalizedCandidate) continue
    if (normalizedQuestion.includes(normalizedCandidate)) {
      best = Math.max(best, 1_000 + normalizedCandidate.length)
      continue
    }
    const candidateTokens = tokens(normalizedCandidate)
    if (candidateTokens.length === 0) continue
    const questionTokens = new Set(tokens(normalizedQuestion))
    const overlap = candidateTokens.filter((token) => questionTokens.has(token)).length
    if (overlap === candidateTokens.length && overlap > 0) {
      best = Math.max(best, 500 + overlap * 10 + normalizedCandidate.length)
    } else if (overlap >= 2) {
      best = Math.max(best, overlap * 10)
    }
  }
  return best
}

async function findDepartment(question: string) {
  const departments = await prisma.departments.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      abbreviation: true,
      department_aliases: { select: { historical_name: true } },
    },
  })
  return departments
    .map((department) => ({ department, score: departmentScore(question, department) }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.department ?? null
}

async function answerDepartmentHistory(
  question: string,
  department: DepartmentCandidate,
  asksWhy: boolean
): Promise<BudgetAnswer> {
  const history = await getDepartmentYoY(department.id)
  const rows = departmentRows(department.name, 'adopted', ['operating budget'], 'Appendix C')
  const citation = citationFromRows('1', rows)
  if (history.length < 2 || !citation) return unsupported(question)

  const first = history[0]
  const last = history.at(-1)!
  const firstValue = BigInt(first.operatingBudget)
  const lastValue = BigInt(last.operatingBudget)
  if (!matchesAudit(rows, 'operating budget', lastValue)) {
    return evidenceGap('The current department value does not match the approved audit record.', 'No trend answer was released.', 'Refresh and review the number audit before relying on this result.')
  }
  const change = lastValue - firstValue
  const percentage = percentChange(firstValue, lastValue)

  return {
    status: asksWhy ? 'needs-evidence' : 'answered',
    eyebrow: asksWhy ? 'Amounts verified; cause not documented' : 'Five-year department record',
    title: asksWhy
      ? `The source tables confirm the change for ${department.name}, but they do not explain its cause.`
      : `${department.name} changed by ${signedDollars(change)} across the available five-year record.`,
    claims: [{
      text: `${department.name} moves from ${formatDollarsFull(firstValue.toString())} in ${first.fiscalYear} to ${formatDollarsFull(lastValue.toString())} in ${last.fiscalYear}${percentage == null ? '' : `, a ${Math.abs(percentage).toFixed(1)}% ${percentage >= 0 ? 'increase' : 'decrease'}`}.`,
      citationIds: ['1'],
    }],
    facts: history.map((year) => ({
      label: `${year.fiscalYear} ${year.stage}`,
      value: formatDollarsFull(year.operatingBudget),
      citationIds: ['1'],
    })),
    calculations: [{
      label: 'Change across the available record',
      expression: `${formatDollarsFull(lastValue.toString())} − ${formatDollarsFull(firstValue.toString())} = ${signedDollars(change, true)}`,
      citationIds: ['1'],
    }],
    citations: [citation],
    caveats: [
      asksWhy
        ? 'Appendix C supplies the amounts and positions, not a program-level explanation. A causal answer requires the department narrative, fee schedule, or supporting memorandum.'
        : 'This trend uses operating amounts. FY 2021-22 through FY 2023-24 are actual spending; later points are adopted budgets. The labels are shown because those figures are not the same accounting stage.',
    ],
    relatedHref: `/department/${department.slug}`,
    relatedLabel: `Open ${department.name}`,
  }
}

async function answerDepartmentProposal(
  question: string,
  department: DepartmentCandidate
): Promise<BudgetAnswer> {
  const [adopted, proposal] = await Promise.all([
    getDepartmentDetail(department.slug),
    getDepartmentProposalChange(department.slug),
  ])
  if (!adopted && !proposal) return unsupported(question)

  const normalized = normalize(question)
  const asksAdoptedOnly = /\b(adopted|2025 26)\b/.test(normalized) && !/\b(proposed|proposal|2026 27)\b/.test(normalized)
  if (adopted && asksAdoptedOnly) {
    const operatingRows = departmentRows(department.name, 'adopted', ['operating budget'], 'Appendix C')
    const capitalRows = departmentRows(department.name, 'adopted', ['capital budget'], 'Appendix J')
    const operatingCitation = citationFromRows('1', operatingRows)
    const capitalCitation = citationFromRows('2', capitalRows)
    if (!operatingCitation) return unsupported(question)
    if (
      !matchesAudit(operatingRows, 'operating budget', BigInt(adopted.operatingBudget)) ||
      (BigInt(adopted.capitalBudget) > BigInt(0) && !matchesAudit(capitalRows, 'capital budget', BigInt(adopted.capitalBudget)))
    ) {
      return evidenceGap('The live adopted department values do not match the approved audit record.', 'No answer was released.', 'Refresh and review the number audit before relying on this result.')
    }
    const hasCapital = BigInt(adopted.capitalBudget) > BigInt(0)
    const citations = [operatingCitation, hasCapital ? capitalCitation : null].filter(Boolean) as AnswerCitation[]
    return {
      status: 'answered',
      eyebrow: 'Adopted department budget',
      title: `${department.name} has a ${formatDollarsAbbreviated(adopted.totalBudget)} FY 2025-26 adopted budget.`,
      claims: [{ text: hasCapital ? `That total combines ${formatDollarsFull(adopted.operatingBudget)} in operating funding and ${formatDollarsFull(adopted.capitalBudget)} in capital.` : `The audited total and operating amount are both ${formatDollarsFull(adopted.operatingBudget)}.`, citationIds: citations.map((citation) => citation.id) }],
      facts: hasCapital
        ? [
            { label: 'Operating', value: formatDollarsFull(adopted.operatingBudget), citationIds: ['1'] },
            { label: 'Capital', value: formatDollarsFull(adopted.capitalBudget), citationIds: ['2'] },
          ]
        : [
            { label: 'Operating', value: formatDollarsFull(adopted.operatingBudget), citationIds: ['1'] },
            { label: 'Total', value: formatDollarsFull(adopted.totalBudget), citationIds: ['1'] },
          ],
      calculations: [],
      citations,
      caveats: [],
      relatedHref: `/department/${department.slug}`,
      relatedLabel: `Open ${department.name}`,
    }
  }
  const asksPositions = /\b(position|positions|employee|employees|staff|staffing|headcount)\b/.test(normalized)
  const proposedRows = departmentRows(
    department.name,
    'proposed',
    asksPositions
      ? ['funded positions', 'restated adopted positions']
      : ['operating budget', 'restated adopted operating'],
    'Proposed Volume 1'
  )
  const proposalCitation = citationFromRows('1', proposedRows)
  if (proposal && !proposalCitation) return unsupported(question)

  if (proposal && asksPositions && proposal.baselineEmployees != null && proposal.proposedEmployees != null) {
    if (
      !matchesAudit(proposedRows, 'funded positions', proposal.proposedEmployees) ||
      !matchesAudit(proposedRows, 'restated adopted positions', proposal.baselineEmployees)
    ) {
      return evidenceGap('The live department staffing values do not match the approved audit record.', 'No answer was released.', 'Refresh and review the number audit before relying on this result.')
    }
    const change = proposal.proposedEmployees - proposal.baselineEmployees
    return {
      status: 'answered',
      eyebrow: 'Restated proposal comparison',
      title: `${department.name} is proposed at ${proposal.proposedEmployees.toLocaleString('en-US')} positions.`,
      claims: [{
        text: `That is ${Math.abs(change).toLocaleString('en-US')} ${change < 0 ? 'fewer' : change > 0 ? 'more' : 'different'} than the proposal’s restated FY 2025-26 baseline.`,
        citationIds: ['1'],
      }],
      facts: [
        { label: 'FY 2026-27 proposed', value: proposal.proposedEmployees.toLocaleString('en-US'), citationIds: ['1'] },
        { label: 'Restated FY 2025-26 baseline', value: proposal.baselineEmployees.toLocaleString('en-US'), citationIds: ['1'] },
      ],
      calculations: [{ label: 'Position change', expression: `${proposal.proposedEmployees.toLocaleString('en-US')} − ${proposal.baselineEmployees.toLocaleString('en-US')} = ${signedNumber(change)}`, citationIds: ['1'] }],
      citations: [proposalCitation!],
      caveats: ['This is the proposal’s restated department baseline, which is the appropriate comparison after County reorganizations.'],
      relatedHref: `/department/${department.slug}`,
      relatedLabel: `Open ${department.name}`,
    }
  }

  if (proposal) {
    const baseline = BigInt(proposal.baselineOperating)
    const proposed = BigInt(proposal.proposedOperating)
    if (
      !matchesAudit(proposedRows, 'operating budget', proposed) ||
      !matchesAudit(proposedRows, 'restated adopted operating', baseline)
    ) {
      return evidenceGap('The live department budget values do not match the approved audit record.', 'No answer was released.', 'Refresh and review the number audit before relying on this result.')
    }
    const change = proposed - baseline
    const percentage = percentChange(baseline, proposed)
    const facts: AnswerFact[] = [
      { label: 'FY 2026-27 proposed operating', value: formatDollarsFull(proposed.toString()), citationIds: ['1'] },
      { label: 'Restated FY 2025-26 operating baseline', value: formatDollarsFull(baseline.toString()), citationIds: ['1'] },
    ]
    const capitalRows = departmentRows(department.name, 'proposed', ['capital budget'], 'Proposed Volume 1')
    const capitalCitation = citationFromRows('2', capitalRows)
    if (
      BigInt(proposal.proposedCapital) > BigInt(0) &&
      (!capitalCitation || !matchesAudit(capitalRows, 'capital budget', BigInt(proposal.proposedCapital)))
    ) {
      return evidenceGap('The live department capital value does not match the approved audit record.', 'No answer was released.', 'Refresh and review the number audit before relying on this result.')
    }
    if (
      BigInt(proposal.proposedCapital) > BigInt(0) &&
      capitalCitation
    ) {
      facts.push({ label: 'FY 2026-27 proposed capital', value: formatDollarsFull(proposal.proposedCapital), citationIds: ['2'] })
    }
    const asksChange = /\b(change|changes|changed|increase|increases|decrease|decreases|cut|cuts|gain|gains|lose|loses)\b/.test(normalized)
    const proposedTotal = proposed + BigInt(proposal.proposedCapital)
    if (!asksChange) {
      facts.unshift({
        label: 'FY 2026-27 proposed total',
        value: formatDollarsFull(proposedTotal.toString()),
        citationIds: capitalCitation && BigInt(proposal.proposedCapital) > BigInt(0) ? ['1', '2'] : ['1'],
      })
    }
    return {
      status: 'answered',
      eyebrow: 'Restated proposal comparison',
      title: asksChange
        ? `${department.name} operating funding changes by ${signedDollars(change)} in the proposal.`
        : `${department.name} is proposed at ${formatDollarsAbbreviated(proposedTotal.toString())} in total funding.`,
      claims: [{ text: `Proposed operating funding is ${formatDollarsFull(proposed.toString())}${percentage == null ? '' : `, a ${Math.abs(percentage).toFixed(1)}% ${percentage >= 0 ? 'increase' : 'decrease'} from the restated baseline`}.`, citationIds: ['1'] }],
      facts,
      calculations: [{ label: 'Operating change', expression: `${formatDollarsFull(proposed.toString())} − ${formatDollarsFull(baseline.toString())} = ${signedDollars(change, true)}`, citationIds: ['1'] }],
      citations: capitalCitation && BigInt(proposal.proposedCapital) > BigInt(0) ? [proposalCitation!, capitalCitation] : [proposalCitation!],
      caveats: capitalCitation && BigInt(proposal.proposedCapital) > BigInt(0)
        ? ['Capital is shown as a proposed amount only. The source does not publish a restated adopted capital baseline, so no capital change is claimed.']
        : ['The comparison uses the proposal’s restated FY 2025-26 operating baseline, not an unreconciled department row from the adopted release.'],
      relatedHref: `/department/${department.slug}`,
      relatedLabel: `Open ${department.name}`,
    }
  }

  const operatingRows = departmentRows(department.name, 'adopted', ['operating budget'], 'Appendix C')
  const capitalRows = departmentRows(department.name, 'adopted', ['capital budget'], 'Appendix J')
  const operatingCitation = citationFromRows('1', operatingRows)
  const capitalCitation = citationFromRows('2', capitalRows)
  if (!adopted || !operatingCitation) return unsupported(question)
  if (
    !matchesAudit(operatingRows, 'operating budget', BigInt(adopted.operatingBudget)) ||
    (BigInt(adopted.capitalBudget) > BigInt(0) && !matchesAudit(capitalRows, 'capital budget', BigInt(adopted.capitalBudget)))
  ) {
    return evidenceGap('The live adopted department values do not match the approved audit record.', 'No answer was released.', 'Refresh and review the number audit before relying on this result.')
  }
  const hasCapital = BigInt(adopted.capitalBudget) > BigInt(0)
  const citations = [operatingCitation, hasCapital ? capitalCitation : null].filter(Boolean) as AnswerCitation[]
  return {
    status: 'answered',
    eyebrow: 'Adopted department budget',
    title: `${department.name} has a ${formatDollarsAbbreviated(adopted.totalBudget)} FY 2025-26 adopted budget.`,
    claims: [{ text: hasCapital ? `That total combines ${formatDollarsFull(adopted.operatingBudget)} in operating funding and ${formatDollarsFull(adopted.capitalBudget)} in capital.` : `The audited total and operating amount are both ${formatDollarsFull(adopted.operatingBudget)}.`, citationIds: citations.map((citation) => citation.id) }],
    facts: hasCapital
      ? [
          { label: 'Operating', value: formatDollarsFull(adopted.operatingBudget), citationIds: ['1'] },
          { label: 'Capital', value: formatDollarsFull(adopted.capitalBudget), citationIds: ['2'] },
        ]
      : [
          { label: 'Operating', value: formatDollarsFull(adopted.operatingBudget), citationIds: ['1'] },
          { label: 'Total', value: formatDollarsFull(adopted.totalBudget), citationIds: ['1'] },
        ],
    calculations: [],
    citations,
    caveats: [],
    relatedHref: `/department/${department.slug}`,
    relatedLabel: `Open ${department.name}`,
  }
}

async function answerDepartment(question: string, department: DepartmentCandidate) {
  const normalized = normalize(question)
  const asksWhy = /\bwhy\b|\breason\b|\bexplain\b/.test(normalized)
  const asksHistory = asksWhy || /\bhistory\b|\btrend\b|\bover time\b|\bsince\b|\b2021\b|\b2022\b|\b2023\b|\b2024\b/.test(normalized)
  return asksHistory
    ? answerDepartmentHistory(question, department, asksWhy)
    : answerDepartmentProposal(question, department)
}

async function answerRanking(question: string): Promise<BudgetAnswer> {
  const overview = await getProposedBudgetOverview()
  if (!overview) return unsupported(question)
  const normalized = normalize(question)
  const positions = /\b(position|positions|employee|employees|staff|staffing|headcount)\b/.test(normalized)
  const capital = /\bcapital\b/.test(normalized)
  const decreases = /\b(decrease|decreases|cut|cuts|lose|loses|lost|fewer|decline|declines|reduction|reductions)\b/.test(normalized)
  if (capital && /\b(change|changes|increase|increases|decrease|decreases|cut|cuts|gain|gains|lose|loses)\b/.test(normalized)) {
    return evidenceGap(
      'The proposal does not publish a restated adopted capital baseline by department.',
      'I can rank proposed capital amounts, but I cannot support a department-level capital increase or decrease ranking.',
      'Ask “Which departments have the largest proposed capital budgets?” instead.'
    )
  }
  if (capital && /\badopted\b/.test(normalized)) {
    return evidenceGap(
      'The first research release ranks proposed capital only.',
      'No adopted capital ranking was generated from this question.',
      'Ask for a specific department’s adopted capital budget, or ask for the largest proposed capital budgets.'
    )
  }
  const ranked = overview.departmentChanges
    .filter((department) => positions ? department.employeeChange != null : true)
    .filter((department) => {
      if (capital) return BigInt(department.proposedCapital) > BigInt(0)
      const value = positions ? department.employeeChange! : Number(department.operatingChange)
      return decreases ? value < 0 : value > 0
    })
    .sort((left, right) => {
      const leftValue = capital ? Number(left.proposedCapital) : positions ? left.employeeChange! : Number(left.operatingChange)
      const rightValue = capital ? Number(right.proposedCapital) : positions ? right.employeeChange! : Number(right.operatingChange)
      if (capital) return rightValue - leftValue
      return decreases ? leftValue - rightValue : rightValue - leftValue
    })
    .slice(0, 5)
  if (ranked.length === 0) return unsupported(question)

  const rankingMatchesAudit = ranked.every((department) => {
    const auditRows = departmentRows(
      department.name,
      'proposed',
      capital
        ? ['capital budget']
        : positions
        ? ['funded positions', 'restated adopted positions']
        : ['operating budget', 'restated adopted operating'],
      'Proposed Volume 1'
    )
    return capital
      ? matchesAudit(auditRows, 'capital budget', BigInt(department.proposedCapital))
      : positions
      ? matchesAudit(auditRows, 'funded positions', department.proposedEmployees) &&
          matchesAudit(auditRows, 'restated adopted positions', department.baselineEmployees)
      : matchesAudit(auditRows, 'operating budget', BigInt(department.proposedOperating)) &&
          matchesAudit(auditRows, 'restated adopted operating', BigInt(department.baselineOperating))
  })
  if (!rankingMatchesAudit) {
    return evidenceGap('One or more ranked values do not match the approved audit record.', 'No ranking was released.', 'Refresh and review the number audit before relying on this result.')
  }

  const rows = ranked.flatMap((department) => departmentRows(
    department.name,
    'proposed',
    capital
      ? ['capital budget']
      : positions
      ? ['funded positions', 'restated adopted positions']
      : ['operating budget', 'restated adopted operating'],
    'Proposed Volume 1'
  ))
  const citation = citationFromRows('1', rows)
  if (!citation) return unsupported(question)

  const facts: AnswerFact[] = ranked.map((department) => capital
    ? {
        label: department.name,
        value: formatDollarsAbbreviated(department.proposedCapital),
        detail: 'FY 2026-27 proposed capital',
        citationIds: ['1'],
      }
    : positions
      ? {
        label: department.name,
        value: signedNumber(department.employeeChange!),
        detail: `${department.baselineEmployees?.toLocaleString('en-US')} → ${department.proposedEmployees?.toLocaleString('en-US')} positions`,
        citationIds: ['1'],
      }
      : {
        label: department.name,
        value: signedDollars(BigInt(department.operatingChange)),
        detail: `${formatDollarsAbbreviated(department.baselineOperating)} → ${formatDollarsAbbreviated(department.proposedOperating)} operating`,
        citationIds: ['1'],
      })

  return {
    status: 'answered',
    eyebrow: 'Ranked proposal changes',
    title: capital
      ? `${ranked[0].name} has the largest proposed capital budget.`
      : `${ranked[0].name} has the largest ${positions ? 'position' : 'operating'} ${decreases ? 'decrease' : 'increase'} in the proposal.`,
    claims: [{
      text: capital
        ? `The ranking shows the top ${ranked.length} FY 2026-27 proposed capital amounts.`
        : `The ranking uses the FY 2026-27 proposal against its restated FY 2025-26 department baseline and shows the top ${ranked.length}.`,
      citationIds: ['1'],
    }],
    facts,
    calculations: [],
    citations: [citation],
    caveats: capital
      ? ['This ranks FY 2026-27 proposed capital amounts. It does not claim a change because the source provides no restated adopted capital baseline.']
      : positions
      ? ['Department position changes may include transfers and reorganizations; a reduction is not automatically a service cut.']
      : ['This ranks operating changes only. Proposed capital is excluded because the source does not provide a restated adopted capital baseline.'],
    relatedHref: '/compare',
    relatedLabel: 'Open the full comparison',
  }
}

async function answerRevenue(question: string): Promise<BudgetAnswer> {
  const normalized = normalize(question)
  const stage = /\b(proposed|proposal|2026 27)\b/.test(normalized) ? 'proposed' : 'adopted'
  const label = stage === 'proposed' ? 'FY 2026-27 proposed' : 'FY 2025-26 adopted'
  const rows = await prisma.revenue_by_source.findMany({
    where: { stage, fiscal_years: { label: stage === 'proposed' ? 'FY 2026-27' : 'FY 2025-26' } },
    include: { revenue_sources: true },
    orderBy: { amount: 'desc' },
  })
  if (rows.length === 0) return unsupported(question)

  const normalizedTokens = tokens(normalized)
  const matched = rows.find((row) => {
    const name = normalize(row.revenue_sources.name)
    return normalized.includes(name) || tokens(name).every((token) => normalizedTokens.includes(token))
  })
  const selected = matched ? [matched] : rows.slice(0, 5)
  const ledgerRows = selected.flatMap((row) => sourceIndex.filter((source) =>
    source.stage === stage &&
    source.section === 'Revenue' &&
    source.entity === row.revenue_sources.name &&
    ['amount', 'published percentage'].includes(source.metric)
  ))
  const citation = citationFromRows('1', ledgerRows)
  if (!citation) return unsupported(question)
  const revenueMatchesAudit = selected.every((row) => {
    const sourceRows = ledgerRows.filter((source) => source.entity === row.revenue_sources.name)
    return matchesAudit(sourceRows, 'amount', row.amount)
  })
  if (!revenueMatchesAudit) {
    return evidenceGap('One or more revenue values do not match the approved audit record.', 'No answer was released.', 'Refresh and review the number audit before relying on this result.')
  }

  const facts = selected.map((row) => ({
    label: row.revenue_sources.name,
    value: formatDollarsFull(row.amount.toString()),
    detail: row.percentage == null ? undefined : `${Number(row.percentage).toFixed(0)}% as published`,
    citationIds: ['1'],
  }))
  return {
    status: 'answered',
    eyebrow: `${label} revenue`,
    title: matched
      ? `${matched.revenue_sources.name} provides ${formatDollarsAbbreviated(matched.amount.toString())}.`
      : `${selected[0].revenue_sources.name} is the largest published revenue source.`,
    claims: [{
      text: matched
        ? `The published share is ${matched.percentage == null ? 'not stated' : `${Number(matched.percentage).toFixed(0)}%`}.`
        : `These are the five largest revenue categories in the ${label.toLowerCase()} release.`,
      citationIds: ['1'],
    }],
    facts,
    calculations: [],
    citations: [citation],
    caveats: ['Published percentages are rounded and may not sum exactly. Dollar amounts are the audit-controlled values.'],
  }
}

function amendmentCitation(id: string, item: AmendmentItem): AnswerCitation | null {
  const source = amendments.sourceDocuments.find((document) => document.id === item.sourceId)
  if (!source) return null
  return {
    id,
    label: source.label,
    locator: item.sourcePages?.length
      ? `${item.sourcePages.length === 1 ? 'p.' : 'pp.'} ${item.sourcePages.join(', ')}`
      : item.sourceTime
        ? `hearing recording at ${item.sourceTime}`
        : 'source record',
    url: source.sourceUrl,
  }
}

function amendmentFact(item: AmendmentItem, citationId: string): AnswerFact {
  let value = item.classification ?? item.status
  if (item.amountCents != null) value = formatDollarsFull(item.amountCents)
  else if (item.rateChangePercent != null) value = `${item.rateChangePercent}% rate change`
  else if (item.positionChange != null) value = `${signedNumber(item.positionChange)} positions`
  const details = [item.status, item.classification, item.positionChange != null && item.amountCents != null ? `${signedNumber(item.positionChange)} positions` : null]
    .filter(Boolean)
    .join(' · ')
  return { label: item.title, value, detail: details, citationIds: [citationId] }
}

async function answerAmendments(question: string): Promise<BudgetAnswer> {
  const queryTokens = new Set(tokens(question))
  const allItems = [
    ...amendments.memoChanges,
    ...amendments.hearingActions,
    ...amendments.pendingItems,
    ...amendments.sourceCaveats,
  ]
  const generic = /\bwhat changed\b|\bchanges?\b|\bamendments?\b|\bfirst hearing\b/.test(normalize(question)) && queryTokens.size <= 5
  const matched = generic
    ? [...amendments.memoChanges.slice(0, 5), ...amendments.hearingActions.slice(0, 2)]
    : allItems
      .map((item) => ({ item, score: tokens(`${item.title} ${item.summary}`).filter((token) => queryTokens.has(token)).length }))
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5)
      .map((result) => result.item)
  if (matched.length === 0) return unsupported(question)

  const citations: AnswerCitation[] = []
  const citationBySource = new Map<string, string>()
  const facts = matched.map((item) => {
    let citationId = citationBySource.get(item.sourceId)
    if (!citationId) {
      citationId = String(citations.length + 1)
      const sameSourceItems = matched.filter((candidate) => candidate.sourceId === item.sourceId)
      const combined: AmendmentItem = {
        ...item,
        sourcePages: Array.from(new Set(sameSourceItems.flatMap((candidate) => candidate.sourcePages ?? []))).sort((a, b) => a - b),
        sourceTime: sameSourceItems.map((candidate) => candidate.sourceTime).filter(Boolean).join(', ') || undefined,
      }
      const citation = amendmentCitation(citationId, combined)
      if (citation) citations.push(citation)
      citationBySource.set(item.sourceId, citationId)
    }
    return amendmentFact(item, citationId)
  })

  return {
    status: 'answered',
    eyebrow: 'First-hearing record',
    title: generic ? 'The first-hearing record contains transfers, reallocations, reductions, and follow-up items.' : matched[0].title,
    claims: [{
      text: generic ? 'The largest dollar entries are mostly transfers between departments, not new Countywide spending.' : matched[0].summary,
      citationIds: Array.from(new Set(facts.flatMap((fact) => fact.citationIds))),
    }],
    facts,
    calculations: [],
    citations,
    caveats: ['The July 15 proposal remains the base release. Hearing actions and memorandum changes are shown separately until a fully restated adopted release is published.'],
    relatedHref: '/proposed#first-hearing-amendments',
    relatedLabel: 'Open the amendment ledger',
  }
}

function answerDistrict(question: string): BudgetAnswer {
  const match = normalize(question).match(/\bdistrict\s*(\d+)\b/)
  const district = match?.[1] ? `District ${match[1]}` : 'a commission district'
  return evidenceGap(
    `The adopted and proposed budget tables do not allocate department spending to ${district}.`,
    'Countywide department budgets can be verified, but assigning those totals to a commission district would require a separate geographic allocation or route/project-level dataset.',
    'Ask for a specific capital project, facility, route, grant, or service location. The research desk will not infer a district share from a department’s Countywide total.'
  )
}

export async function answerBudgetQuestion(question: string): Promise<BudgetAnswer> {
  const intent = classifyBudgetQuestion(question)
  if (intent === 'district') return answerDistrict(question)
  if (intent === 'amendments') return answerAmendments(question)
  if (intent === 'ranking') return answerRanking(question)
  if (intent === 'revenue') return answerRevenue(question)
  if (intent === 'release') return answerRelease(question)

  const department = await findDepartment(question)
  if (department) return answerDepartment(question, department)
  if (/\b(proposed|proposal|adopted) budget\b/.test(normalize(question))) return answerRelease(question)
  return unsupported(question)
}
