export type NavItem = {
  label: string
  href: string
  icon: string
}

/**
 * Central navigation route definitions.
 * Shared by Navbar (desktop) and MobileTabBar (mobile).
 * Future pages just add entries here.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: '\u2302' },          // House symbol
  { label: 'Explorer', href: '/explorer', icon: '\u25A6' }, // Chart/grid symbol
  { label: 'Calculator', href: '/calculator', icon: '\u2261' }, // Calculator-like symbol
  { label: 'Glossary', href: '/glossary', icon: '\u2139' },  // Info symbol
]
