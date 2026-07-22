# BudgetExplorer

Miami-Dade County's $13.2B FY 2025-26 budget as an interactive, searchable, plain-English visualization.

**Live:** [budgetexplorer.miami](https://budgetexplorer.miami)

## What It Does

- Interactive treemap with drill-down into 9 strategic areas and more than 50 departments
- AI-generated plain-English descriptions of every department's budget
- Tax calculator showing how your property taxes are allocated
- Full-text search across all budget items
- Budget glossary for financial terms

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Prisma 7, D3.js + Recharts
- **Pipeline:** Python 3, pdfplumber (PDF extraction), Anthropic SDK (AI descriptions)
- **Database:** Neon Serverless PostgreSQL
- **Hosting:** Vercel

## Local Development

Prerequisites: Python 3.12+, Node.js 24+, pnpm 10+, and PostgreSQL 17 (or Docker).

```bash
# From the repository root
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
Copy-Item .env.example .env

# Optional local PostgreSQL, if Docker is installed
docker compose up -d postgres

# Create the schema and load the adopted source data
.venv/Scripts/python -m pipeline migrate
.venv/Scripts/python -m pipeline run-all

# Frontend (uses its own working-directory environment file)
Copy-Item budget-explorer-web/.env.example budget-explorer-web/.env.local
Set-Location budget-explorer-web
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Run `pnpm check` for the
same lint, unit-test, and type-check gate used by CI. A remote database can be
used instead by replacing `DATABASE_URL` in both local environment files.
On the first pipeline run, the official Budget in Brief and authoritative
Appendices C and J are downloaded automatically into the ignored `data/` folder.

Do not run migrations against a shared or production database until the target
and pending migration list have been audited.

## Environment Variables

- `DATABASE_URL` — Neon PostgreSQL connection string
- `ANTHROPIC_API_KEY` — Claude API for AI-generated descriptions

## License

All rights reserved. Abreu Data Works LLC.
