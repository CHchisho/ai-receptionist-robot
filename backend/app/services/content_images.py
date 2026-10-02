"""Check an uploaded photo before it is stored."""

from __future__ import annotations

MAX_IMAGE_BYTES = 48 * 1024 * 1024


class ImageRejected(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def validate_image(data: bytes) -> str:
    if not data:
        raise ImageRejected(400, "Image file is empty.")
    if len(data) > MAX_IMAGE_BYTES:
        raise ImageRejected(413, "Image must be 48 MB or smaller.")

    mime = _detect_mime(data)
    if mime is None:
        raise ImageRejected(415, "Use a JPEG, PNG, or WebP image.")
    return mime


def _detect_mime(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None
