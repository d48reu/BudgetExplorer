---
phase: 02-app-foundation-design-system
plan: 01
subsystem: database, ui
tags: [nextjs, prisma, tailwindcss, typescript, postgresql, bigint-serialization]

# Dependency graph
requires:
  - phase: 01-data-pipeline
    provides: "PostgreSQL database with 15 tables of budget data (fiscal_years, strategic_areas, departments, etc.)"
provides:
  - "Next.js 16 project scaffold at budget-explorer-web/"
  - "Prisma 7 introspected schema with 15 models matching existing PostgreSQL"
  - "Prisma singleton client with PrismaPg adapter and dev hot-reload protection"
  - "Data access layer (queries.ts) with BigInt-to-string serialization"
  - "Dollar formatting utilities (abbreviated and full formats)"
  - "TypeScript types for serialized budget data"
  - "Root layout with Inter font and semantic HTML"
  - "Working homepage displaying real budget data from database"
affects: [02-02-PLAN, 02-03-PLAN, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: [next@16.1.6, react@19.2.3, prisma@7.4.2, @prisma/client@7.4.2, @prisma/adapter-pg@7.4.2, pg@8.19.0, @floating-ui/react@0.27.18, react-countup@6.5.3, clsx@2.1.1, tailwindcss@4.2.1]
  patterns: [prisma-singleton-with-pg-adapter, bigint-to-string-data-access-layer, server-component-db-queries, tailwind-v4-theme-tokens]

key-files:
  created:
    - budget-explorer-web/prisma/schema.prisma
    - budget-explorer-web/prisma.config.ts
    - budget-explorer-web/src/lib/prisma.ts
    - budget-explorer-web/src/lib/db/queries.ts
    - budget-explorer-web/src/lib/format.ts
    - budget-explorer-web/src/types/budget.ts
  modified:
    - budget-explorer-web/package.json
    - budget-explorer-web/src/app/layout.tsx
    - budget-explorer-web/src/app/globals.css
    - budget-explorer-web/src/app/page.tsx
    - .gitignore

key-decisions:
  - "Prisma 7 with prisma-client generator (not prisma-client-js) -- Prisma 7 is the installed version, uses new driver adapter pattern"
  - "PrismaPg adapter with pg Pool required for Prisma 7 database connectivity (replaces direct connection string)"
  - "Next.js 16.1.6 installed (latest stable) instead of 15.x specified in research -- create-next-app installs latest"
  - "Homepage uses force-dynamic to avoid static generation requiring DB at build time"
  - "Minimal globals.css with font tokens only -- full design system deferred to Plan 02 as specified"

patterns-established:
  - "Prisma singleton: globalForPrisma pattern with PrismaPg adapter for dev hot-reload safety"
  - "BigInt serialization: all DB queries convert BigInt to string in data access layer before returning"
  - "Server Component data fetching: pages query DB directly via Prisma, pass serialized data to components"
  - "Dollar formatting: centralized formatDollarsAbbreviated and formatDollarsFull functions"

requirements-completed: [UX-03, UX-06]

# Metrics
duration: 7min
completed: 2026-02-28
---

# Phase 2 Plan 01: App Foundation Summary

**Next.js 16 with Prisma 7 data layer introspecting existing PostgreSQL, BigInt-safe query functions, and Inter font layout serving live budget data**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-28T20:46:56Z
- **Completed:** 2026-02-28T20:53:37Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Next.js 16 project scaffolded at budget-explorer-web/ with all required dependencies (Prisma, Floating UI, react-countup, clsx, Tailwind v4)
- Prisma 7 introspected the existing PostgreSQL database producing 15 typed models matching Phase 1 schema
- Data access layer safely converts all BigInt cents to strings, preventing JSON serialization errors
- Homepage displays "$13,233,238,000" and "FY 2025-26" queried live from the database

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project and install dependencies** - `e8d26ea` (feat)
2. **Task 2: Prisma introspection, data access layer, and formatting utilities** - `adfcb3a` (feat)

## Files Created/Modified
- `budget-explorer-web/package.json` - Project manifest with all dependencies
- `budget-explorer-web/prisma/schema.prisma` - Introspected schema with 15 models
- `budget-explorer-web/prisma.config.ts` - Prisma 7 configuration with dotenv
- `budget-explorer-web/src/lib/prisma.ts` - Singleton client with PrismaPg adapter
- `budget-explorer-web/src/lib/db/queries.ts` - Data access layer with BigInt serialization
- `budget-explorer-web/src/lib/format.ts` - Dollar formatting utilities (abbreviated, full, YoY change)
- `budget-explorer-web/src/types/budget.ts` - SerializedFiscalYear, SerializedStrategicArea, QuickStats types
- `budget-explorer-web/src/app/layout.tsx` - Root layout with Inter font, metadata, semantic HTML
- `budget-explorer-web/src/app/globals.css` - Tailwind v4 import with font tokens
- `budget-explorer-web/src/app/page.tsx` - Homepage displaying live budget data from PostgreSQL
- `.gitignore` - Added budget-explorer-web/node_modules, .next, .env.local

## Decisions Made
- **Prisma 7 (not 6.x):** `pnpm add prisma @prisma/client` installed v7.4.2 (current latest). Prisma 7 uses the `prisma-client` generator and requires a driver adapter (PrismaPg with pg Pool) instead of direct connection strings. The API for queries is identical.
- **Next.js 16.1.6 (not 15.x):** `create-next-app@latest` installed Next.js 16. The App Router, Server Components, and all patterns from the research document work identically.
- **Dynamic homepage:** Added `export const dynamic = 'force-dynamic'` to prevent Next.js from trying to statically prerender a page that queries the database.
- **Minimal globals.css:** Only font tokens defined in `@theme`. Full design system (colors, spacing, breakpoints) deferred to Plan 02.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma 7 requires driver adapter instead of direct PrismaClient()**
- **Found during:** Task 2 (Prisma client setup)
- **Issue:** Prisma 7 PrismaClient constructor requires an adapter argument. `new PrismaClient()` with no arguments fails with type error.
- **Fix:** Installed `@prisma/adapter-pg` and `pg`, created Pool-based adapter: `new PrismaClient({ adapter: new PrismaPg(pool) })`
- **Files modified:** src/lib/prisma.ts, package.json
- **Verification:** Build succeeds, homepage queries database correctly
- **Committed in:** adfcb3a (Task 2 commit)

**2. [Rule 3 - Blocking] Missing @types/pg TypeScript declarations**
- **Found during:** Task 2 (build after adding pg import)
- **Issue:** `import { Pool } from 'pg'` caused type error -- pg has no bundled type declarations
- **Fix:** Installed `@types/pg` as dev dependency
- **Files modified:** package.json
- **Verification:** Build passes TypeScript check
- **Committed in:** adfcb3a (Task 2 commit)

**3. [Rule 3 - Blocking] pnpm blocked Prisma build scripts**
- **Found during:** Task 1 (dependency installation)
- **Issue:** pnpm v10 requires explicit approval for package postinstall scripts. Prisma engine binaries were not downloaded.
- **Fix:** Added `pnpm.onlyBuiltDependencies` to package.json listing `@prisma/engines` and `prisma`
- **Files modified:** package.json
- **Verification:** `pnpm install` runs Prisma postinstall successfully
- **Committed in:** e8d26ea (Task 1 commit)

**4. [Rule 3 - Blocking] Homepage static generation fails with DB query**
- **Found during:** Task 2 (build verification)
- **Issue:** Next.js tried to statically prerender homepage during build, which requires database connection at build time
- **Fix:** Added `export const dynamic = 'force-dynamic'` to page.tsx
- **Files modified:** src/app/page.tsx
- **Verification:** Build succeeds, page marked as dynamic (f) in route table
- **Committed in:** adfcb3a (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (4 blocking issues)
**Impact on plan:** All auto-fixes necessary for Prisma 7 compatibility and build correctness. No scope creep. The research document was based on Prisma 6.x; the actual installed version (7.4.2) required adapter pattern changes.

## Issues Encountered
- Prisma 7 was a significant change from the 6.x documented in the research. The driver adapter pattern is different but the query API is identical. All changes were contained in the prisma.ts singleton file.
- `create-next-app` prompted for "React Compiler" choice interactively; resolved by piping `yes "No"` to the command.

## User Setup Required
None - no external service configuration required. The .env.local file with DATABASE_URL is already configured to match the existing Phase 1 pipeline database.

## Next Phase Readiness
- All foundation files are in place for Plan 02 (Design System): layout.tsx, globals.css, and the data layer
- Plan 02 will add the full Tailwind v4 @theme design tokens, UI components, navigation, and footer
- Plan 03 will replace the placeholder homepage with the real hero count-up, quick stats, and CTAs

## Self-Check: PASSED

All 10 key files verified present on disk. Both task commits (e8d26ea, adfcb3a) verified in git log.

---
*Phase: 02-app-foundation-design-system*
*Completed: 2026-02-28*
