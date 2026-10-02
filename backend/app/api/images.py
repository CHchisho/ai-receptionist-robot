from fastapi import HTTPException, UploadFile
from fastapi.responses import Response

from app.services.content_images import MAX_IMAGE_BYTES, ImageRejected, validate_image


async def read_upload(file: UploadFile) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Image must be 48 MB or smaller.")
        chunks.append(chunk)
    return b"".join(chunks)


def store_image(save, item_id: int, data: bytes, missing: str):
    try:
        mime = validate_image(data)
    except ImageRejected as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail) from error
    updated = save(item_id, data, mime)
    if updated is None:
        raise HTTPException(status_code=404, detail=missing)
    return updated


def image_response(image: tuple[str, bytes] | None) -> Response:
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    mime, data = image
    return Response(
        content=data,
        media_type=mime,
        headers={"Cache-Control": "private, max-age=86400"},
    )
