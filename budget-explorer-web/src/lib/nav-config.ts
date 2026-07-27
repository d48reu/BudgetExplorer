export type NavItem = {
  label: string
  href: string
  icon: string
  mobile?: boolean
}

/**
 * Central navigation route definitions.
 * Shared by Navbar (desktop) and MobileTabBar (mobile).
 * Future pages just add entries here.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: '\u2302' },
  { label: 'Explorer', href: '/explorer', icon: '\u25A6' },
  { label: 'Compare', href: '/compare', icon: '\u2194' },
  { label: 'Proposed', href: '/proposed', icon: '\u25C6', mobile: false },
  { label: 'Calculator', href: '/calculator', icon: '$' },
  { label: 'Search', href: '/search', icon: '\u2315' },
  { label: 'Glossary', href: '/glossary', icon: 'i', mobile: false },
]
