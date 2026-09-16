from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import unquote, urlparse

import httpx
from bs4 import BeautifulSoup, Tag
from pypdf import PdfReader

_MAX_BYTES = 2_000_000
_USER_AGENT = "LenaReceptionist/0.1 (local knowledge ingest)"

# Drop these Wikipedia/article tails — they are lists, not the page content.
_APPENDIX_HEADINGS = {
    "references",
    "notes",
    "footnotes",
    "citations",
    "bibliography",
    "sources",
    "external links",
    "further reading",
    "see also",
    "notes and references",
    "works cited",
}

_APPENDIX_SPLIT = re.compile(
    r"\n+(?:references|notes|footnotes|citations|bibliography|sources|"
    r"external links|further reading|see also|notes and references|works cited)\s*\n",
    re.IGNORECASE,
)


def extract_path(path: Path) -> str:
    suffix = path.suffix.lower()
    data = path.read_bytes()
    if suffix == ".pdf":
        return extract_pdf(data)
    if suffix in {".txt", ".md"}:
        return data.decode("utf-8", errors="replace")
    raise ValueError(f"Unsupported document type: {suffix}")


def extract_pdf(data: bytes) -> str:
    from io import BytesIO

    reader = PdfReader(BytesIO(data))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages)


def extract_html(data: bytes) -> tuple[str, str]:
    """Main article text only — not chrome, nav, or References."""
    soup = BeautifulSoup(data, "html.parser")
    title = _page_title(soup)
    root = (
        soup.select_one("#mw-content-text .mw-parser-output")
        or soup.select_one("#mw-content-text")
        or soup.select_one("article")
        or soup.select_one("main")
        or soup.body
        or soup
    )
    if isinstance(root, Tag):
        _strip_noise(root)
        _drop_appendix_sections(root)
    text = _clean_text(root.get_text("\n", strip=True) if root else "")
    return title, text


def fetch_url(url: str, timeout_seconds: float = 30.0) -> tuple[str, str]:
    """Return (title, text) from an approved URL. No JS rendering."""
    with httpx.Client(
        timeout=timeout_seconds,
        follow_redirects=True,
        headers={"User-Agent": _USER_AGENT, "Accept": "text/html,application/json"},
    ) as client:
        wiki = None
        try:
            wiki = _wikipedia_plain(client, url)
        except httpx.HTTPError:
            wiki = None
        if wiki is not None:
            return wiki

        response = client.get(url)
        response.raise_for_status()
        content = response.content[:_MAX_BYTES]
        content_type = response.headers.get("content-type", "").lower()

    if "pdf" in content_type or url.lower().endswith(".pdf"):
        return url, extract_pdf(content)
    if "html" in content_type or content.lstrip()[:32].lower().startswith((b"<!doctype", b"<html")):
        title, text = extract_html(content)
        return title or url, text
    return url, content.decode("utf-8", errors="replace")


def _wikipedia_plain(client: httpx.Client, url: str) -> tuple[str, str] | None:
    """Plain article body via MediaWiki extracts (same host, no references list)."""
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    if "wikipedia.org" not in host:
        return None
    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) < 2 or parts[0].lower() != "wiki":
        return None
    page_title = unquote(parts[-1]).replace("_", " ")
    api = f"{parsed.scheme}://{parsed.netloc}/w/api.php"
    response = client.get(
        api,
        params={
            "action": "query",
            "format": "json",
            "prop": "extracts",
            "explaintext": 1,
            "exsectionformat": "plain",
            "redirects": 1,
            "titles": page_title,
        },
    )
    response.raise_for_status()
    pages = (response.json().get("query") or {}).get("pages") or {}
    page = next(iter(pages.values()), None)
    if not page or page.get("missing") is not None:
        return None
    extract = (page.get("extract") or "").strip()
    if not extract:
        return None
    title = (page.get("title") or page_title).strip()
    return title, _cut_appendix(extract)


def _page_title(soup: BeautifulSoup) -> str:
    heading = soup.select_one("#firstHeading") or soup.find("h1")
    if heading and heading.get_text(strip=True):
        return heading.get_text(strip=True)
    if soup.title and soup.title.string:
        return re.sub(r"\s+—\s+Wikipedia$|\s+-\s+Wikipedia$", "", soup.title.string.strip())
    return ""


def _strip_noise(root: Tag) -> None:
    for tag in root.find_all(
        [
            "script",
            "style",
            "noscript",
            "nav",
            "footer",
            "header",
            "aside",
            "form",
            "iframe",
        ]
    ):
        tag.decompose()
    for selector in (
        ".mw-references-wrap",
        "ol.references",
        ".reflist",
        "sup.reference",
        ".navbox",
        ".sidebar",
        "#toc",
        ".toc",
        ".mw-editsection",
        ".hatnote",
        ".thumb",
        "#catlinks",
        ".printfooter",
        ".mw-empty-elt",
    ):
        for tag in root.select(selector):
            tag.decompose()


def _drop_appendix_sections(root: Tag) -> None:
    for heading in root.find_all(re.compile(r"^h[1-6]$")):
        name = re.sub(r"\[edit\]", "", heading.get_text(" ", strip=True), flags=re.I)
        name = re.sub(r"\s+", " ", name).strip().lower()
        if name not in _APPENDIX_HEADINGS:
            continue
        sibling = heading.next_sibling
        heading.decompose()
        while sibling is not None:
            nxt = sibling.next_sibling
            if isinstance(sibling, Tag):
                sibling.decompose()
            elif sibling.parent is not None:
                sibling.extract()
            sibling = nxt
        return


def _cut_appendix(text: str) -> str:
    match = _APPENDIX_SPLIT.search("\n" + text)
    if match:
        text = text[: match.start()]
    return _clean_text(text)


def _clean_text(text: str) -> str:
    text = re.sub(r"\[\d+\]", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
