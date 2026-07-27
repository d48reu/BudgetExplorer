"""Tests for reproducible official appendix source resolution."""

from pathlib import Path

import click
import pytest

from pipeline.cli import _resolve_appendix


def test_existing_appendix_is_reused(tmp_path):
    appendix = tmp_path / "appendix.pdf"
    appendix.write_bytes(b"existing")
    downloader = lambda *args, **kwargs: pytest.fail("unexpected download")

    assert _resolve_appendix(
        None, str(appendix), "https://example.test/appendix.pdf",
        "Appendix C", downloader,
    ) == str(appendix)


def test_missing_default_appendix_is_downloaded(tmp_path):
    appendix = tmp_path / "appendix.pdf"
    calls = []

    def downloader(url, output_path):
        calls.append((url, output_path))
        return output_path

    result = _resolve_appendix(
        None, str(appendix), "https://example.test/appendix.pdf",
        "Appendix C", downloader,
    )

    assert result == str(appendix)
    assert calls == [("https://example.test/appendix.pdf", str(appendix))]


def test_missing_explicit_appendix_fails_instead_of_substituting(tmp_path):
    missing = Path(tmp_path) / "missing.pdf"

    with pytest.raises(click.ClickException, match="Appendix J not found"):
        _resolve_appendix(
            str(missing), "unused.pdf", "https://example.test/appendix.pdf",
            "Appendix J", lambda *args, **kwargs: None,
        )
