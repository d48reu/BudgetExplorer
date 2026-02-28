"""PDF reader wrapper for opening and inspecting the Budget in Brief PDF.

Supports both local file paths and URL downloads. Includes visual debugging
utilities for tuning pdfplumber extraction settings per section.
"""

import os
from pathlib import Path

import pdfplumber
import requests

from pipeline.config import PDF_URL


def download_pdf(url: str = None, output_path: str = "data/budget-in-brief.pdf") -> str:
    """Download the Budget in Brief PDF from a URL to a local path.

    If the file already exists at output_path, skips the download.

    Args:
        url: URL to download from. Defaults to config PDF_URL.
        output_path: Local path to save the PDF.

    Returns:
        The local file path where the PDF was saved.
    """
    url = url or PDF_URL

    # Create output directory if needed
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    if os.path.exists(output_path):
        print(f"PDF already exists at {output_path}, skipping download.")
        return output_path

    print(f"Downloading PDF from {url}...")
    response = requests.get(url, timeout=60, stream=True)
    response.raise_for_status()

    with open(output_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Downloaded {file_size_mb:.1f} MB to {output_path}")
    return output_path


def open_pdf(pdf_path_or_url: str):
    """Open a PDF from a local path or URL.

    If the input looks like a URL (starts with http), downloads the PDF
    first, then opens it with pdfplumber.

    Args:
        pdf_path_or_url: Local file path or URL to the PDF.

    Returns:
        A pdfplumber.PDF object (use as context manager).
    """
    if pdf_path_or_url.startswith("http"):
        local_path = download_pdf(pdf_path_or_url)
    else:
        local_path = pdf_path_or_url

    if not os.path.exists(local_path):
        raise FileNotFoundError(f"PDF not found at {local_path}")

    return pdfplumber.open(local_path)


def inspect_pdf(pdf_path: str, max_pages: int = None):
    """Inspect a PDF and print page-level details for extraction tuning.

    For each page, prints dimensions, table count, and first few text lines.
    Saves debug images with table detection visualization to
    pipeline/data/debug/ for visual inspection.

    Args:
        pdf_path: Path to the local PDF file.
        max_pages: Maximum number of pages to inspect. None = all pages.
    """
    debug_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "data", "debug"
    )
    os.makedirs(debug_dir, exist_ok=True)

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"Total pages: {total_pages}")
        print(f"Debug images will be saved to: {debug_dir}")
        print()

        pages_to_inspect = pdf.pages[:max_pages] if max_pages else pdf.pages

        for i, page in enumerate(pages_to_inspect):
            print(f"--- Page {i} ---")
            print(f"  Dimensions: {page.width:.1f} x {page.height:.1f} points")

            tables = page.find_tables()
            print(f"  Tables found: {len(tables)}")

            for t_idx, table in enumerate(tables):
                print(f"    Table {t_idx}: bbox={table.bbox}")

            # Save debug image with table detection overlay
            try:
                im = page.to_image(resolution=150)
                im.debug_tablefinder()
                debug_path = os.path.join(debug_dir, f"page_{i:02d}.png")
                im.save(debug_path)
                print(f"  Debug image: {debug_path}")
            except Exception as e:
                print(f"  Debug image error: {e}")

            # Print first few text lines for context
            text = page.extract_text(layout=True)
            if text:
                lines = text.split("\n")
                print(f"  Text lines: {len(lines)}")
                for line in lines[:8]:
                    stripped = line.strip()
                    if stripped:
                        print(f"    {stripped[:120]}")
            else:
                print("  (no text extracted)")

            print()
