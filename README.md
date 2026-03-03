# BudgetExplorer

Miami-Dade County's $13.2B FY 2025-26 budget as an interactive, searchable, plain-English visualization.

**Live:** [budgetexplorer.miami](https://budgetexplorer.miami)

## What It Does

- Interactive treemap with drill-down into 9 strategic areas and 35 departments
- AI-generated plain-English descriptions of every department's budget
- Tax calculator showing how your property taxes are allocated
- Full-text search across all budget items
- Budget glossary for financial terms

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Prisma 7, D3.js + Recharts
- **Pipeline:** Python 3, pdfplumber (PDF extraction), Anthropic SDK (AI descriptions)
- **Database:** Neon Serverless PostgreSQL
- **Hosting:** Vercel

## Quick Start

```bash
# Frontend
cd budget-explorer-web
pnpm install
pnpm dev

# Pipeline
pip install -r requirements.txt
python -m pipeline run-all
```

## Environment Variables

- `DATABASE_URL` — Neon PostgreSQL connection string
- `ANTHROPIC_API_KEY` — Claude API for AI-generated descriptions

## License

All rights reserved. Abreu Data Works LLC.
