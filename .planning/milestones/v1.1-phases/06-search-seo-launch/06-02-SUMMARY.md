---
phase: 06-search-seo-launch
plan: 02
subsystem: seo
tags: [next-metadata, opengraph, sitemap, robots, seo, og-images]

# Dependency graph
requires:
  - phase: 06-01
    provides: "CANONICAL_DOMAIN constant, search page metadata"
  - phase: 02-01
    provides: "Design system tokens (mdc-blue, font-heading, text-primary, surface-secondary)"
  - phase: 01-03
    provides: "Prisma client, department and strategic_area models"
provides:
  - "metadataBase on root layout for absolute OG/canonical URL resolution"
  - "Root OG image (default branded card for all pages)"
  - "Dynamic OG images for 35 department pages and 9 strategic area pages"
  - "Dynamic sitemap.xml with 49 URLs from database"
  - "robots.txt allowing all crawlers with sitemap reference"
  - "Custom 404 page with branded design and navigation"
  - "Analytics TODO placeholder in root layout"
affects: [deployment, launch]

# Tech tracking
tech-stack:
  added: [next/og ImageResponse]
  patterns: [Next.js file-based OG image generation, dynamic sitemap from Prisma queries]

key-files:
  created:
    - budget-explorer-web/src/app/opengraph-image.tsx
    - budget-explorer-web/src/app/department/[slug]/opengraph-image.tsx
    - budget-explorer-web/src/app/explorer/[area-slug]/opengraph-image.tsx
    - budget-explorer-web/src/app/sitemap.ts
    - budget-explorer-web/src/app/robots.ts
    - budget-explorer-web/src/app/not-found.tsx
  modified:
    - budget-explorer-web/src/app/layout.tsx

key-decisions:
  - "Minimal text card design for OG images (white bg, centered text, domain branding at bottom)"
  - "Sitemap priorities: homepage 1.0, explorer 0.9, departments/areas 0.8, calculator 0.7, glossary 0.5, search 0.4"
  - "robots.txt allows all crawlers -- public transparency tool with no pages to hide"

patterns-established:
  - "OG image pattern: opengraph-image.tsx in route directory, exported size/alt/contentType constants"
  - "Dynamic OG images use same DB query functions as page components"
  - "CANONICAL_DOMAIN constant used for all SEO URLs (sitemap, robots, metadataBase)"

requirements-completed: [SEO-01, SEO-02]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 6 Plan 2: SEO & OG Images Summary

**SEO infrastructure with dynamic OG images, DB-driven sitemap (49 URLs), robots.txt, metadataBase, and custom 404 page**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T19:48:12Z
- **Completed:** 2026-03-01T19:50:05Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Root layout updated with metadataBase pointing to budgetexplorer.miami for absolute OG/canonical URL resolution
- Three OG image files: root default (branded card), department (dynamic from DB), strategic area (dynamic from DB)
- Dynamic sitemap.ts querying all 35 department + 9 area slugs from Prisma, producing 49 total URLs
- robots.txt allowing all crawlers with sitemap reference at canonical domain
- Custom 404 page with branded "page not found" message and navigation links
- Full build succeeds: 62 pages generated including all OG images, sitemap, and robots

## Task Commits

Each task was committed atomically:

1. **Task 1: Root layout update, OG images, and custom 404 page** - `67df4da` (feat)
2. **Task 2: Sitemap, robots.txt, and final build verification** - `fbdafdb` (feat)

## Files Created/Modified
- `budget-explorer-web/src/app/layout.tsx` - Added metadataBase, CANONICAL_DOMAIN import, analytics TODO comment
- `budget-explorer-web/src/app/opengraph-image.tsx` - Root default OG image (1200x630 branded card)
- `budget-explorer-web/src/app/department/[slug]/opengraph-image.tsx` - Dynamic OG image with department name from getDepartmentDetail()
- `budget-explorer-web/src/app/explorer/[area-slug]/opengraph-image.tsx` - Dynamic OG image with area name from getAreaWithDepartments()
- `budget-explorer-web/src/app/not-found.tsx` - Custom 404 with Go Home and Explore Budget buttons
- `budget-explorer-web/src/app/sitemap.ts` - Dynamic sitemap querying department and area slugs from DB
- `budget-explorer-web/src/app/robots.ts` - robots.txt with Allow: / and sitemap reference

## Decisions Made
- Minimal text card design for OG images: white background, title centered, domain branding at bottom -- matches user decision from research phase
- Sitemap priority tiers: homepage highest (1.0), explorer (0.9), departments/areas (0.8), calculator (0.7), glossary (0.5), search (0.4)
- robots.txt allows all crawlers with no disallow rules -- this is a public government transparency tool

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All SEO infrastructure is in place and verified via full build
- v1.1 milestone complete: all 10 plans across 6 phases executed
- App is ready for public launch deployment
- Umami analytics TODO in layout.tsx for post-launch addition

## Self-Check: PASSED

All 7 files verified present on disk. Both task commits (67df4da, fbdafdb) verified in git log.

---
*Phase: 06-search-seo-launch*
*Completed: 2026-03-01*
