---
phase: 02-app-foundation-design-system
plan: 02
subsystem: ui
tags: [tailwindcss, design-system, floating-ui, responsive-layout, navigation, footer]

# Dependency graph
requires:
  - phase: 02-app-foundation-design-system
    plan: 01
    provides: "Next.js 16 scaffold with Prisma data layer, root layout with Inter font, globals.css with font tokens"
provides:
  - "Tailwind v4 @theme design tokens: MDC brand colors, neutral UI palette, fonts, spacing, z-index scale"
  - "Card component: flat design with subtle borders (Linear/Notion aesthetic)"
  - "Button component: primary/secondary variants with link support"
  - "Skeleton component: loading placeholder with pulse animation"
  - "BudgetTerm component: Floating UI tooltip with dotted underline for budget jargon"
  - "Glossary data: 11 budget terms with plain-English definitions"
  - "Navbar: desktop top navigation with active link highlighting"
  - "MobileTabBar: bottom tab bar for mobile with icon+label tabs"
  - "Footer: three-column resource footer with Budget in Brief PDF link (SEO-03)"
  - "Breadcrumbs: semantic breadcrumb navigation for detail pages"
  - "nav-config.ts: central navigation route definitions"
  - "Root layout: integrates Navbar, Footer, MobileTabBar with responsive padding"
affects: [02-03-PLAN, 03-interactive-budget-views, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [tailwind-v4-theme-design-tokens, floating-ui-tooltip, shared-nav-config, responsive-nav-desktop-mobile, flat-card-no-shadow]

key-files:
  created:
    - budget-explorer-web/src/components/ui/Card.tsx
    - budget-explorer-web/src/components/ui/Button.tsx
    - budget-explorer-web/src/components/ui/Skeleton.tsx
    - budget-explorer-web/src/components/ui/BudgetTerm.tsx
    - budget-explorer-web/src/components/layout/Navbar.tsx
    - budget-explorer-web/src/components/layout/MobileTabBar.tsx
    - budget-explorer-web/src/components/layout/Footer.tsx
    - budget-explorer-web/src/components/layout/Breadcrumbs.tsx
    - budget-explorer-web/src/lib/glossary.ts
    - budget-explorer-web/src/lib/nav-config.ts
  modified:
    - budget-explorer-web/src/app/globals.css
    - budget-explorer-web/src/app/layout.tsx

key-decisions:
  - "Flat card design with borders only (no shadows) per user decision for Linear/Notion aesthetic"
  - "Button component renders as <a> or <button> via href prop for flexible link/action usage"
  - "BudgetTerm tooltip uses z-tooltip (50) via FloatingPortal to render above z-nav (40) navigation"
  - "Nav icons use Unicode symbols to avoid icon library dependency"
  - "Navbar and MobileTabBar share NAV_ITEMS from centralized nav-config.ts"

patterns-established:
  - "Design tokens via @theme: all colors, fonts, spacing, z-index defined as CSS custom properties"
  - "Shared nav config: NAV_ITEMS array drives both desktop and mobile navigation"
  - "Responsive nav pattern: Navbar hidden below md, MobileTabBar hidden at md+"
  - "Card aesthetic: flat with border-border, no box-shadow, --spacing-card padding"
  - "Tooltip pattern: Floating UI with useHover/useFocus/useDismiss/useRole interactions"

requirements-completed: [UX-01, UX-02, UX-04, UX-05, SEO-03]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 2 Plan 02: Design System Summary

**Tailwind v4 design tokens with MDC brand colors, 4 UI components (Card/Button/Skeleton/BudgetTerm tooltip), responsive navigation (desktop navbar + mobile tab bar), and resource footer with budget PDF link**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T20:56:37Z
- **Completed:** 2026-02-28T20:58:44Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Full Tailwind v4 @theme design system with Miami-Dade brand colors, neutral UI palette, fonts, spacing, and z-index scale
- 4 reusable UI components: Card (flat/bordered), Button (primary/secondary), Skeleton (loading), BudgetTerm (Floating UI tooltip with dotted underline)
- 4 layout components: Navbar (desktop), MobileTabBar (mobile), Footer (PDF link + resources), Breadcrumbs (detail pages)
- Root layout integrates all layout components with responsive padding for fixed navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Design tokens, UI components, and glossary data** - `7613014` (feat)
2. **Task 2: Layout components and root layout integration** - `124da4c` (feat)

## Files Created/Modified
- `budget-explorer-web/src/app/globals.css` - Tailwind v4 @theme with all design tokens (colors, fonts, spacing, z-index)
- `budget-explorer-web/src/components/ui/Card.tsx` - Flat card with subtle border, optional header/footer slots
- `budget-explorer-web/src/components/ui/Button.tsx` - Primary/secondary button variants, renders as button or link
- `budget-explorer-web/src/components/ui/Skeleton.tsx` - Loading placeholder with pulse animation
- `budget-explorer-web/src/components/ui/BudgetTerm.tsx` - Floating UI tooltip for budget jargon with dotted underline
- `budget-explorer-web/src/lib/glossary.ts` - 11 budget terms with plain-English definitions
- `budget-explorer-web/src/lib/nav-config.ts` - Central NAV_ITEMS array with routes and icons
- `budget-explorer-web/src/components/layout/Navbar.tsx` - Fixed top navbar for desktop with active link highlighting
- `budget-explorer-web/src/components/layout/MobileTabBar.tsx` - Fixed bottom tab bar for mobile with icon+label tabs
- `budget-explorer-web/src/components/layout/Footer.tsx` - Three-column footer with Budget in Brief PDF link (SEO-03)
- `budget-explorer-web/src/components/layout/Breadcrumbs.tsx` - Semantic breadcrumb navigation for detail pages
- `budget-explorer-web/src/app/layout.tsx` - Updated to render Navbar, Footer, MobileTabBar with responsive padding

## Decisions Made
- **Flat card design:** No shadows, border-only per user decision for Linear/Notion aesthetic
- **Unicode nav icons:** Used Unicode symbols instead of an icon library to keep bundle size minimal
- **Button dual-render:** Component renders as `<a>` when `href` is provided, `<button>` otherwise, for flexible CTA usage
- **Z-index tokens:** Defined z-base(0), z-nav(40), z-tooltip(50), z-modal(60) scale to prevent stacking conflicts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All design tokens and components are in place for Plan 03 (Homepage with hero, quick stats, CTAs)
- Card, Button, and BudgetTerm components are ready for use in any page
- Navigation shell (Navbar + MobileTabBar + Footer) renders on every page automatically via root layout
- Glossary data powers both the BudgetTerm tooltip and the future /glossary page

---
*Phase: 02-app-foundation-design-system*
*Completed: 2026-02-28*
