"""Extract strategic area budget data from the Budget in Brief PDF.

The Budget in Brief is an infographic-style PDF. Strategic area capital
budgets appear on Page 6 (index 6) as text labels around a pie chart.

Uses word-level positioning to match area names to their dollar amounts.
"""

import re

import pdfplumber


# Page 6 (0-indexed) has capital breakdown by strategic area
CAPITAL_PAGE = 6

# Area name first-words that anchor the search, mapped to canonical names
# For multi-word areas, we match the first distinctive word then verify context
AREA_FIRST_WORDS = {
    "GENERAL": ("GOVERNMENT", "General Government"),
    "PUBLIC": ("SAFETY", "Public Safety"),
    "CONSTITUTIONAL": ("OFFICES", "Constitutional Offices"),
    "ECONOMIC": ("DEVELOPMENT", "Economic Development"),
    "TRANSPORTATION": (None, "Transportation & Mobility"),  # "&" or "AND" follows
    "HEALTH": (None, "Health & Society"),  # "AND" follows
    "RECREATION": (None, "Recreation & Culture"),  # "AND" follows
    "NEIGHBORHOOD": (None, "Neighborhood & Infrastructure"),  # "AND" follows
    "POLICY": ("FORMULATION", "Policy Formulation"),
}


def extract_strategic_areas(pdf_path: str) -> list[dict]:
    """Extract strategic area capital budget data from the Budget in Brief PDF.

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        List of dicts with {name, capital_budget} for each strategic area.
    """
    with pdfplumber.open(pdf_path) as pdf:
        if CAPITAL_PAGE >= len(pdf.pages):
            return []

        page = pdf.pages[CAPITAL_PAGE]
        words = page.extract_words(keep_blank_chars=False, x_tolerance=3, y_tolerance=3)

        # Find area anchor positions
        area_positions = _find_area_positions(words)

        # Find all dollar amounts (excluding the total)
        dollar_positions = []
        for w in words:
            if w["text"].startswith("$") and "," in w["text"] and w["top"] < 700:
                # Skip amounts in the intro text (y < 200)
                if w["top"] > 200:
                    dollar_positions.append((w["text"], w["x0"], w["top"]))

        # Match each area to nearest dollar amount below it
        return _match_areas(area_positions, dollar_positions)


def _find_area_positions(words: list[dict]) -> list[tuple]:
    """Find strategic area name positions by their anchor words.

    Returns list of (canonical_name, x, y) tuples.
    """
    positions = []
    used = set()

    for i, w in enumerate(words):
        if i in used or w["top"] < 200:  # Skip intro text
            continue

        text = w["text"].upper()
        if text == "TOTAL":  # Skip "TOTAL ADOPTED CAPITAL PLAN"
            continue

        if text in AREA_FIRST_WORDS:
            second_word, canonical = AREA_FIRST_WORDS[text]

            if second_word:
                # Verify the second word exists nearby
                found = False
                for j in range(max(0, i - 3), min(len(words), i + 5)):
                    if j != i and words[j]["text"].upper() == second_word:
                        # Check proximity
                        if abs(words[j]["x0"] - w["x0"]) < 80 and abs(words[j]["top"] - w["top"]) < 25:
                            found = True
                            used.add(j)
                            break
                if not found:
                    continue

            positions.append((canonical, w["x0"], w["top"]))
            used.add(i)

    return positions


def _match_areas(area_positions: list[tuple], dollar_positions: list[tuple]) -> list[dict]:
    """Match each area to its nearest dollar amount below and at similar X."""
    results = []
    used_dollars = set()

    for area_name, ax, ay in area_positions:
        best_amount = None
        best_dist = float("inf")
        best_idx = -1

        for i, (amount, dx, dy) in enumerate(dollar_positions):
            if i in used_dollars:
                continue

            x_diff = abs(dx - ax)
            y_diff = dy - ay  # positive = below

            # Must be below the area name, within 150pt vertically and 50pt horizontally
            if 5 < y_diff < 150 and x_diff < 50:
                dist = y_diff + x_diff * 0.3
                if dist < best_dist:
                    best_dist = dist
                    best_amount = amount
                    best_idx = i

        if best_amount:
            used_dollars.add(best_idx)
        results.append({
            "name": area_name,
            "capital_budget": best_amount or "$0",
        })

    return results
