from fastapi import APIRouter
from pydantic import BaseModel, HttpUrl

from app.services.url_ingestion import chunk_text, fetch_url_content

router = APIRouter()


class UrlIngestionRequest(BaseModel):
    url: HttpUrl


@router.get("/knowledge/sources")
def list_sources() -> dict:
    """Placeholder for content-owner knowledge management"""
    return {
        "items": [],
        "message": "Knowledge management is not implemented yet",
    }


@router.post("/knowledge/urls")
def ingest_url(request: UrlIngestionRequest):
    content = fetch_url_content(str(request.url))
    chunks = chunk_text(content)

    return {
        "url": str(request.url),
        "content_length": len(content),
        "chunk_count": len(chunks),
        "message": "URL fetched successfully",
    }
