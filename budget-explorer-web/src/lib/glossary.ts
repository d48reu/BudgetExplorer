export type GlossaryTerm = {
  term: string
  definition: string
  slug: string
}

/**
 * Budget terminology with plain-English definitions.
 * Used by the BudgetTerm tooltip component and the /glossary page.
 * Sorted alphabetically by term.
 */
export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Ad Valorem Tax',
    definition:
      'A property tax calculated from a property’s taxable value and the applicable millage rate.',
    slug: 'ad-valorem-tax',
  },
  {
    term: 'Adopted Budget',
    definition:
      'The spending plan approved by the Board of County Commissioners for a fiscal year. It sets authorized spending amounts for county departments and programs.',
    slug: 'adopted-budget',
  },
  {
    term: 'Capital Budget',
    definition:
      'Funding for long-term assets and projects such as roads, parks, buildings, equipment, and transit systems. Capital costs are separate from annual operating costs.',
    slug: 'capital-budget',
  },
  {
    term: 'Enterprise Fund',
    definition:
      'A fund for a county service financed mainly through charges to its users. County examples include Aviation and Water and Sewer.',
    slug: 'enterprise-fund',
  },
  {
    term: 'Fiscal Year',
    definition:
      'The County’s 12-month budget period, from October 1 through September 30. FY 2025–26 runs from October 2025 through September 2026.',
    slug: 'fiscal-year',
  },
  {
    term: 'Fringes',
    definition:
      'Employee costs in addition to salary, including health insurance, retirement contributions, Social Security, and workers’ compensation.',
    slug: 'fringes',
  },
  {
    term: 'General Fund',
    definition:
      'The County’s main operating fund for services that are not supported by a separate enterprise or dedicated revenue source.',
    slug: 'general-fund',
  },
  {
    term: 'Homestead Exemption',
    definition:
      'A reduction in taxable value for eligible Florida residents who own and occupy their primary home. The exemption is up to $50,000, with a smaller amount applying to school taxes.',
    slug: 'homestead-exemption',
  },
  {
    term: 'Millage Rate',
    definition:
      'A property-tax rate stated in dollars per $1,000 of taxable value. A rate of 5.0 mills equals $5 per $1,000.',
    slug: 'millage-rate',
  },
  {
    term: 'Operating Budget',
    definition:
      'The annual spending plan for recurring costs such as salaries, utilities, supplies, contracts, and maintenance.',
    slug: 'operating-budget',
  },
  {
    term: 'Strategic Area',
    definition:
      'One of nine service categories used in the FY 2025–26 adopted budget to organize departments and operating spending.',
    slug: 'strategic-area',
  },
]
