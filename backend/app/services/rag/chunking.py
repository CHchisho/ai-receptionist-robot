def chunk_text(text: str, size: int = 900, overlap: int = 150) -> list[str]:
    """Split cleaned text into overlapping windows for embedding."""
    cleaned = " ".join(text.split())
    if not cleaned:
        return []
    if len(cleaned) <= size:
        return [cleaned]

    chunks: list[str] = []
    start = 0
    while start < len(cleaned):
        end = min(start + size, len(cleaned))
        chunks.append(cleaned[start:end])
        if end >= len(cleaned):
            break
        start = max(0, end - overlap)
    return chunks
