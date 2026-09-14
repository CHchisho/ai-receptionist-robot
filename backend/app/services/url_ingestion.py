import httpx
from bs4 import BeautifulSoup


def fetch_url_content(url: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    response = httpx.get(
        url,
        headers=headers,
        timeout=10.0,
        follow_redirects=True,
    )

    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True)

    return text


def chunk_text(text: str, chunk_size: int = 1000) -> list[str]:
    return [
        text[i:i + chunk_size]
        for i in range(0, len(text), chunk_size)
    ]
