"""Pipeline configuration loaded from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/budget_explorer",
)

# PDF source
PDF_PATH = os.getenv("PDF_PATH", "data/budget-in-brief.pdf")
PDF_URL = os.getenv(
    "PDF_URL",
    "https://www.miamidade.gov/resources/budget/adopted/fy2025-26/budget-in-brief.pdf",
)

# Verification tolerance: +/- $1,000 in cents
TOLERANCE_CENTS = 100_000

# Published budget totals for FY 2025-26 (all values in cents)
PUBLISHED_TOTAL_BUDGET_CENTS = 1_323_323_800_000   # $13,233,238,000
PUBLISHED_OPERATING_CENTS = 857_560_600_000         # $8,575,606,000
PUBLISHED_CAPITAL_CENTS = 465_763_200_000           # $4,657,632,000

# Published employee total
PUBLISHED_TOTAL_EMPLOYEES = 31_996

# Fiscal year label for current budget
CURRENT_FISCAL_YEAR = "FY 2025-26"

# Appendix PDF paths
APPENDIX_C_PATH = os.getenv("APPENDIX_C_PATH", "data/appendix-c.pdf")
APPENDIX_J_PATH = os.getenv("APPENDIX_J_PATH", "data/appendix-j.pdf")
APPENDIX_C_URL = os.getenv(
    "APPENDIX_C_URL",
    "https://www.miamidade.gov/resources/budget/adopted/fy2025-26/appendix-c.pdf",
)
APPENDIX_J_URL = os.getenv(
    "APPENDIX_J_URL",
    "https://www.miamidade.gov/resources/budget/adopted/fy2025-26/appendix-j.pdf",
)

# Debug mode (enables saving debug images during extraction)
DEBUG = os.getenv("PIPELINE_DEBUG", "false").lower() in ("true", "1", "yes")
