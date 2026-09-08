"""Monitor official Miami-Dade budget sources without changing site data.

The monitor has two jobs: detect when an already-cited PDF changes in place,
and flag newly published FY 2026-27 adoption material for human review. It
never imports or promotes new numbers automatically.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "budget-explorer-web" / "public" / "audit" / "source-manifest.json"
DEFAULT_AMENDMENTS = (
    ROOT
    / "budget-explorer-web"
    / "src"
    / "data"
    / "fy-2026-27-first-hearing-amendments.json"
)


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._href: str | None = None
        self._text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        self._href = next((value for key, value in attrs if key == "href"), None)
        self._text = []

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self._href is not None:
            self.links.append((self._href, " ".join(self._text).strip()))
            self._href = None
            self._text = []


@dataclass
class Check:
    kind: str
    source: str
    status: str
    detail: str


def _session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=1,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "HEAD"),
    )
    session.mount("https://", HTTPAdapter(max_retries=retry))
    session.headers["User-Agent"] = "Miami-Dade-Budget-Explorer-source-monitor/1.0"
    return session


def _normalise(value: str) -> str:
    return " ".join(value.lower().split())


def matching_publication_links(
    html: str, text_signals: Iterable[str], href_signals: Iterable[str]
) -> list[tuple[str, str]]:
    parser = LinkParser()
    parser.feed(html)
    normalised_text = tuple(_normalise(signal) for signal in text_signals)
    normalised_href = tuple(signal.lower() for signal in href_signals)
    return [
        (href, text)
        for href, text in parser.links
        if any(signal in _normalise(text) for signal in normalised_text)
        or any(signal in href.lower() for signal in normalised_href)
    ]


def check_known_pdfs(session: requests.Session, manifest: list[dict]) -> list[Check]:
    checks: list[Check] = []
    for source in manifest:
        digest = hashlib.sha256()
        size = 0
        try:
            with session.get(source["sourceUrl"], stream=True, timeout=60) as response:
                response.raise_for_status()
                for chunk in response.iter_content(1024 * 1024):
                    if chunk:
                        digest.update(chunk)
                        size += len(chunk)
            actual_hash = digest.hexdigest()
            if actual_hash != source["sha256"] or size != source["bytes"]:
                checks.append(
                    Check(
                        "fingerprint",
                        source["id"],
                        "attention",
                        f"Published file changed: SHA-256 {actual_hash}, {size} bytes.",
                    )
                )
            else:
                checks.append(
                    Check(
                        "fingerprint",
                        source["id"],
                        "pass",
                        "Published file matches the recorded SHA-256 and byte count.",
                    )
                )
        except requests.RequestException as exc:
            checks.append(Check("fingerprint", source["id"], "attention", str(exc)))
    return checks


def check_for_new_publications(
    session: requests.Session, monitor: dict, known_urls: set[str]
) -> list[Check]:
    checks: list[Check] = []
    for url in monitor["directCandidates"]:
        try:
            response = session.get(url, stream=True, timeout=30)
            status = response.status_code
            response.close()
            if status == 200:
                result = "attention"
                detail = "Expected publication is now available."
            elif status == 404:
                result = "pass"
                detail = "Not published at this URL (HTTP 404)."
            else:
                result = "attention"
                detail = f"Publication status could not be confirmed (HTTP {status})."
            checks.append(
                Check(
                    "candidate",
                    url,
                    result,
                    detail,
                )
            )
        except requests.RequestException as exc:
            checks.append(Check("candidate", url, "attention", str(exc)))

    for url in monitor["discoveryPages"]:
        try:
            response = session.get(url, timeout=30)
            response.raise_for_status()
            matches = matching_publication_links(
                response.text,
                monitor["linkTextSignals"],
                monitor["hrefSignals"],
            )
            new_matches = [match for match in matches if match[0] not in known_urls]
            if new_matches:
                detail = "; ".join(f"{text or 'untitled'} — {href}" for href, text in new_matches)
                checks.append(Check("discovery", url, "attention", detail))
            else:
                checks.append(Check("discovery", url, "pass", "No new matching links found."))
        except requests.RequestException as exc:
            checks.append(Check("discovery", url, "attention", str(exc)))
    return checks


def _markdown(checks: list[Check], checked_at: str) -> str:
    attention = [check for check in checks if check.status == "attention"]
    lines = [
        "# Budget source watch",
        "",
        f"Checked: {checked_at}",
        f"Result: {'ATTENTION REQUIRED' if attention else 'NO CHANGE'}",
        "",
        "| Status | Check | Source | Detail |",
        "|---|---|---|---|",
    ]
    for check in checks:
        detail = check.detail.replace("|", "\\|").replace("\n", " ")
        lines.append(f"| {check.status.upper()} | {check.kind} | {check.source} | {detail} |")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--amendments", type=Path, default=DEFAULT_AMENDMENTS)
    parser.add_argument("--json-report", type=Path, default=Path("budget-source-watch.json"))
    parser.add_argument("--markdown-report", type=Path, default=Path("budget-source-watch.md"))
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    amendment_data = json.loads(args.amendments.read_text(encoding="utf-8"))
    known_urls = {source["sourceUrl"] for source in manifest}
    known_urls.update(source["sourceUrl"] for source in amendment_data["sourceDocuments"])

    session = _session()
    checks = check_known_pdfs(session, manifest)
    checks.extend(
        check_for_new_publications(
            session,
            amendment_data["publicationMonitor"],
            known_urls,
        )
    )
    checked_at = datetime.now(timezone.utc).isoformat()
    attention = any(check.status == "attention" for check in checks)
    report = {
        "checkedAt": checked_at,
        "status": "attention-required" if attention else "no-change",
        "checks": [asdict(check) for check in checks],
    }
    args.json_report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    args.markdown_report.write_text(_markdown(checks, checked_at), encoding="utf-8")
    print(_markdown(checks, checked_at))
    return 1 if attention else 0


if __name__ == "__main__":
    raise SystemExit(main())
